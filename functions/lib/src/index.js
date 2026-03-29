"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionSecretCode = exports.topUpWallet = exports.paymentWebhook = exports.resolveDispute = exports.openDispute = exports.confirmSecretCode = exports.markDelivered = exports.closeExpiredAuctions = exports.placeBid = exports.publishAuction = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const options_1 = require("firebase-functions/v2/options");
const domain_1 = require("./domain");
admin.initializeApp();
const db = admin.firestore();
(0, options_1.setGlobalOptions)({ region: 'us-central1', maxInstances: 10 });
const CONFIG = {
    commissionBps: 500,
    secretCodeSalt: process.env.SECRET_CODE_SALT ?? 'dev-salt',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? '',
    webhookToleranceSec: Number(process.env.PAYMENT_WEBHOOK_TOLERANCE_SEC ?? '300'),
};
function hashSecretCode(secretCode) {
    return node_crypto_1.default.createHash('sha256').update(`${CONFIG.secretCodeSalt}:${secretCode}`).digest('hex');
}
function hashWebhookPayload(timestamp, rawPayload) {
    const payload = Buffer.isBuffer(rawPayload) ? rawPayload : Buffer.from(rawPayload);
    return node_crypto_1.default.createHmac('sha256', CONFIG.webhookSecret).update(`${timestamp}.`).update(payload).digest('hex');
}
function safeEqualHex(expectedHex, candidateHex) {
    const expected = Buffer.from(expectedHex, 'hex');
    const candidate = Buffer.from(candidateHex, 'hex');
    if (expected.length === 0 || expected.length !== candidate.length)
        return false;
    return node_crypto_1.default.timingSafeEqual(expected, candidate);
}
function randomSecretCode() {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
}
function asDomainError(error) {
    if (error instanceof domain_1.DomainError) {
        throw new https_1.HttpsError('failed-precondition', `${error.code}: ${error.message}`);
    }
    if (error instanceof https_1.HttpsError) {
        throw error;
    }
    throw new https_1.HttpsError('internal', 'Unexpected error');
}
async function ensureAuthenticated(uid) {
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Authentification requise');
    return uid;
}
async function getUserRole(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    return (userDoc.data()?.role ?? 'user');
}
function idempotencyRef(scope, key) {
    const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    return db.collection('idempotency').doc(`${scope}_${safe}`);
}
async function ensureIdempotent(scope, key) {
    const ref = idempotencyRef(scope, key);
    try {
        await ref.create({
            scope,
            key,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
    }
    catch {
        return false;
    }
}
async function createWalletTx(data) {
    await db.collection('wallet_transactions').add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
function logEvent(level, event, payload) {
    const body = JSON.stringify({ level, event, ...payload });
    if (level === 'error')
        console.error(body);
    else if (level === 'warn')
        console.warn(body);
    else
        console.info(body);
}
async function settleToSeller(params) {
    const txRef = db.collection('transactions').doc(params.transactionId);
    const settlement = await db.runTransaction(async (tx) => {
        const txSnap = await tx.get(txRef);
        if (!txSnap.exists)
            throw new domain_1.DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
        const txData = txSnap.data();
        if (txData.buyerId !== params.actorUid && txData.sellerId !== params.actorUid) {
            throw new https_1.HttpsError('permission-denied', 'Accès refusé');
        }
        if (!params.allowStatuses.includes(txData.status)) {
            throw new domain_1.DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Transaction non confirmable');
        }
        const buyerWalletRef = db.collection('wallets').doc(txData.buyerId);
        const sellerWalletRef = db.collection('wallets').doc(txData.sellerId);
        const [buyerSnap, sellerSnap] = await Promise.all([tx.get(buyerWalletRef), tx.get(sellerWalletRef)]);
        const buyerWallet = buyerSnap.data();
        const sellerWallet = sellerSnap.data();
        if (!buyerWallet || buyerWallet.blocked < txData.amount) {
            throw new domain_1.DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Fonds bloqués insuffisants');
        }
        const commission = (0, domain_1.computeCommission)(txData.amount, CONFIG.commissionBps);
        const netToSeller = txData.amount - commission;
        tx.update(buyerWalletRef, {
            blocked: buyerWallet.blocked - txData.amount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(sellerWalletRef, {
            uid: txData.sellerId,
            balance: (sellerWallet?.balance ?? 0) + netToSeller,
            blocked: sellerWallet?.blocked ?? 0,
            currency: 'XAF',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.update(txRef, { status: 'confirmed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ...txData, commission, netToSeller };
    });
    await Promise.all([
        createWalletTx({ walletId: settlement.buyerId, type: 'release', amount: settlement.amount, status: 'success', reference: params.transactionId, traceId: params.traceId }),
        createWalletTx({ walletId: settlement.sellerId, type: 'release', amount: settlement.netToSeller, status: 'success', reference: params.transactionId, traceId: params.traceId }),
        createWalletTx({ walletId: settlement.sellerId, type: 'commission', amount: settlement.commission, status: 'success', reference: params.transactionId, traceId: params.traceId }),
    ]);
}
exports.publishAuction = (0, https_1.onCall)(async (request) => {
    try {
        const uid = await ensureAuthenticated(request.auth?.uid);
        const { title, description, category, startPrice, city, durationHours } = request.data;
        (0, domain_1.assertAllowedDuration)(Number(durationHours));
        const now = admin.firestore.Timestamp.now();
        const endAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + durationHours * 3600 * 1000);
        const doc = await db.collection('auctions').add({
            sellerId: uid,
            title,
            description,
            category,
            startPrice,
            currentPrice: startPrice,
            status: 'active',
            endAt,
            city,
            createdAt: now,
            updatedAt: now,
        });
        return { ok: true, auctionId: doc.id };
    }
    catch (error) {
        asDomainError(error);
    }
});
exports.placeBid = (0, https_1.onCall)(async (request) => {
    try {
        const uid = await ensureAuthenticated(request.auth?.uid);
        const { auctionId, amount, idempotencyKey } = request.data;
        if (!idempotencyKey)
            throw new domain_1.DomainError('ERR_DUPLICATE_IDEMPOTENCY_KEY', 'idempotencyKey requis');
        const traceId = node_crypto_1.default.randomUUID();
        const first = await ensureIdempotent(`bid_${uid}_${auctionId}`, idempotencyKey);
        if (!first)
            return { ok: true, duplicate: true };
        const auctionRef = db.collection('auctions').doc(auctionId);
        const walletRef = db.collection('wallets').doc(uid);
        await db.runTransaction(async (tx) => {
            const [auctionSnap, walletSnap] = await Promise.all([tx.get(auctionRef), tx.get(walletRef)]);
            if (!auctionSnap.exists)
                throw new https_1.HttpsError('not-found', 'Enchère introuvable');
            const auction = auctionSnap.data();
            const wallet = walletSnap.data();
            (0, domain_1.assertBid)({
                amount,
                currentPrice: auction.currentPrice,
                walletBalance: wallet?.balance ?? 0,
                sellerId: auction.sellerId,
                bidderId: uid,
                auctionStatus: auction.status,
                endAtMs: auction.endAt.toMillis(),
                nowMs: Date.now(),
            });
            const bidRef = db.collection('bids').doc();
            tx.set(bidRef, {
                auctionId,
                bidderId: uid,
                amount,
                idempotencyKey,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.update(auctionRef, {
                currentPrice: amount,
                winnerBidId: bidRef.id,
                winnerId: uid,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        logEvent('info', 'bid_placed', { traceId, uid, auctionId, amount });
        return { ok: true };
    }
    catch (error) {
        asDomainError(error);
    }
});
exports.closeExpiredAuctions = (0, scheduler_1.onSchedule)('every 5 minutes', async () => {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db.collection('auctions').where('status', '==', 'active').where('endAt', '<=', now).limit(100).get();
    for (const doc of snapshot.docs) {
        const auction = doc.data();
        const traceId = node_crypto_1.default.randomUUID();
        if (!auction.winnerBidId || !auction.winnerId) {
            await doc.ref.update({ status: 'closed_unsold', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            continue;
        }
        await db.runTransaction(async (tx) => {
            const auctionSnap = await tx.get(doc.ref);
            const fresh = auctionSnap.data();
            if (fresh.status !== 'active')
                return;
            if (!fresh.winnerId)
                return;
            const buyerWalletRef = db.collection('wallets').doc(fresh.winnerId);
            const buyerWalletSnap = await tx.get(buyerWalletRef);
            const buyerWallet = buyerWalletSnap.data();
            if (!buyerWallet || buyerWallet.balance < fresh.currentPrice) {
                tx.update(doc.ref, {
                    status: 'closed_unsold',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                logEvent('warn', 'auction_closed_unsold_insufficient_wallet', { traceId, auctionId: doc.id, winnerId: fresh.winnerId });
                return;
            }
            tx.update(doc.ref, { status: 'closed_sold', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            const transactionRef = db.collection('transactions').doc();
            const secretCode = randomSecretCode();
            const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000);
            tx.set(transactionRef, {
                auctionId: doc.id,
                buyerId: fresh.winnerId,
                sellerId: fresh.sellerId,
                amount: fresh.currentPrice,
                status: 'blocked',
                secretCodeHash: hashSecretCode(secretCode),
                expiresAt,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.set(db.collection('transaction_secrets').doc(transactionRef.id), {
                transactionId: transactionRef.id,
                buyerId: fresh.winnerId,
                secretCode,
                expiresAt,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.set(buyerWalletRef, {
                uid: fresh.winnerId,
                balance: buyerWallet.balance - fresh.currentPrice,
                blocked: (buyerWallet.blocked ?? 0) + fresh.currentPrice,
                currency: 'XAF',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            tx.set(db.collection('wallet_transactions').doc(), {
                walletId: fresh.winnerId,
                type: 'block',
                amount: fresh.currentPrice,
                status: 'success',
                reference: transactionRef.id,
                traceId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        logEvent('info', 'auction_closed_sold_blocked', { traceId, auctionId: doc.id, winnerId: auction.winnerId, amount: auction.currentPrice });
    }
});
exports.markDelivered = (0, https_1.onCall)(async (request) => {
    try {
        const uid = await ensureAuthenticated(request.auth?.uid);
        const { transactionId } = request.data;
        const txRef = db.collection('transactions').doc(transactionId);
        const txSnap = await txRef.get();
        if (!txSnap.exists)
            throw new domain_1.DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
        const txData = txSnap.data();
        (0, domain_1.assertCanMarkDelivered)(uid, txData.sellerId, txData.status);
        await txRef.update({
            status: 'delivered',
            deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true };
    }
    catch (error) {
        asDomainError(error);
    }
});
exports.confirmSecretCode = (0, https_1.onCall)(async (request) => {
    try {
        const uid = await ensureAuthenticated(request.auth?.uid);
        const { transactionId, secretCode, idempotencyKey } = request.data;
        if (!idempotencyKey)
            throw new domain_1.DomainError('ERR_DUPLICATE_IDEMPOTENCY_KEY', 'idempotencyKey requis');
        const first = await ensureIdempotent(`confirm_${uid}_${transactionId}`, idempotencyKey);
        if (!first)
            return { ok: true, duplicate: true };
        const txRef = db.collection('transactions').doc(transactionId);
        const txSnap = await txRef.get();
        if (!txSnap.exists)
            throw new domain_1.DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
        const txData = txSnap.data();
        if (txData.buyerId !== uid && txData.sellerId !== uid)
            throw new https_1.HttpsError('permission-denied', 'Accès refusé');
        if (txData.status !== 'blocked' && txData.status !== 'delivered')
            throw new domain_1.DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Transaction non confirmable');
        if (txData.expiresAt.toMillis() < Date.now())
            throw new domain_1.DomainError('ERR_INVALID_SECRET_CODE', 'Code secret expiré');
        if (hashSecretCode(secretCode) !== txData.secretCodeHash)
            throw new domain_1.DomainError('ERR_INVALID_SECRET_CODE', 'Code secret invalide');
        const traceId = node_crypto_1.default.randomUUID();
        await settleToSeller({ transactionId, actorUid: uid, allowStatuses: ['blocked', 'delivered'], traceId });
        logEvent('info', 'transaction_confirmed', { traceId, transactionId, actorUid: uid });
        return { ok: true };
    }
    catch (error) {
        asDomainError(error);
    }
});
exports.openDispute = (0, https_1.onCall)(async (request) => {
    try {
        const uid = await ensureAuthenticated(request.auth?.uid);
        const { transactionId, reason } = request.data;
        const traceId = node_crypto_1.default.randomUUID();
        const txRef = db.collection('transactions').doc(transactionId);
        const txSnap = await txRef.get();
        if (!txSnap.exists)
            throw new domain_1.DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
        const txData = txSnap.data();
        if (txData.buyerId !== uid && txData.sellerId !== uid)
            throw new https_1.HttpsError('permission-denied', 'Accès refusé');
        if (!(0, domain_1.canOpenDispute)(txData.status))
            throw new domain_1.DomainError('ERR_DISPUTE_NOT_ALLOWED', 'Litige non autorisé dans cet état');
        await Promise.all([
            txRef.update({ status: 'dispute', updatedAt: admin.firestore.FieldValue.serverTimestamp() }),
            db.collection('disputes').add({
                transactionId,
                openedBy: txData.buyerId === uid ? 'buyer' : 'seller',
                reason,
                status: 'open',
                traceId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }),
        ]);
        logEvent('info', 'dispute_opened', { traceId, transactionId, openedBy: uid });
        return { ok: true };
    }
    catch (error) {
        asDomainError(error);
    }
});
exports.resolveDispute = (0, https_1.onCall)(async (request) => {
    try {
        const uid = await ensureAuthenticated(request.auth?.uid);
        const role = await getUserRole(uid);
        (0, domain_1.assertCanResolveDispute)(role);
        const { disputeId, resolution } = request.data;
        const disputeRef = db.collection('disputes').doc(disputeId);
        const disputeSnap = await disputeRef.get();
        if (!disputeSnap.exists)
            throw new https_1.HttpsError('not-found', 'Litige introuvable');
        const dispute = disputeSnap.data();
        if (dispute.status !== 'open')
            throw new https_1.HttpsError('failed-precondition', 'Litige déjà résolu');
        const txRef = db.collection('transactions').doc(dispute.transactionId);
        const txSnap = await txRef.get();
        if (!txSnap.exists)
            throw new domain_1.DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
        const txData = txSnap.data();
        const traceId = node_crypto_1.default.randomUUID();
        if (resolution === 'pay_seller') {
            await settleToSeller({ transactionId: dispute.transactionId, actorUid: txData.sellerId, allowStatuses: ['dispute'], traceId });
        }
        else {
            const buyerWalletRef = db.collection('wallets').doc(txData.buyerId);
            await db.runTransaction(async (tx) => {
                const walletSnap = await tx.get(buyerWalletRef);
                const wallet = walletSnap.data();
                if (!wallet || wallet.blocked < txData.amount)
                    throw new domain_1.DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Impossible de rembourser');
                tx.update(buyerWalletRef, {
                    blocked: wallet.blocked - txData.amount,
                    balance: wallet.balance + txData.amount,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                tx.update(txRef, { status: 'refunded', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            });
            await createWalletTx({ walletId: txData.buyerId, type: 'refund', amount: txData.amount, status: 'success', reference: dispute.transactionId, traceId });
        }
        await disputeRef.update({
            status: 'resolved',
            resolution,
            resolvedBy: uid,
            resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logEvent('info', 'dispute_resolved', { traceId, disputeId, resolution, resolvedBy: uid });
        return { ok: true };
    }
    catch (error) {
        asDomainError(error);
    }
});
exports.paymentWebhook = (0, https_1.onRequest)(async (request, response) => {
    const traceId = node_crypto_1.default.randomUUID();
    try {
        if (request.method !== 'POST') {
            response.status(405).json({ ok: false, error: 'Method not allowed' });
            return;
        }
        if (!CONFIG.webhookSecret) {
            console.error(JSON.stringify({
                level: 'error',
                event: 'payment_webhook_rejected',
                reason: 'missing_webhook_secret',
                traceId,
            }));
            response.status(500).json({ ok: false, error: 'webhook_not_configured' });
            return;
        }
        const timestampHeader = request.header('x-bird-timestamp') ?? '';
        const signatureHeader = request.header('x-bird-signature') ?? '';
        if (!timestampHeader || !signatureHeader) {
            console.warn(JSON.stringify({
                level: 'warn',
                event: 'payment_webhook_rejected',
                reason: 'missing_signature_or_timestamp',
                traceId,
            }));
            response.status(401).json({ ok: false, error: 'invalid_signature' });
            return;
        }
        const parsedTimestamp = Number.parseInt(timestampHeader, 10);
        const nowSec = Math.floor(Date.now() / 1000);
        const ageSec = Math.abs(nowSec - parsedTimestamp);
        if (!Number.isFinite(parsedTimestamp) || ageSec > CONFIG.webhookToleranceSec) {
            console.warn(JSON.stringify({
                level: 'warn',
                event: 'payment_webhook_rejected',
                reason: 'expired_timestamp',
                traceId,
                ageSec,
            }));
            response.status(401).json({ ok: false, error: 'expired_request' });
            return;
        }
        const rawPayload = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
        const expectedSignature = hashWebhookPayload(timestampHeader, rawPayload);
        if (!safeEqualHex(expectedSignature, signatureHeader)) {
            console.warn(JSON.stringify({
                level: 'warn',
                event: 'payment_webhook_rejected',
                reason: 'signature_mismatch',
                traceId,
            }));
            response.status(401).json({ ok: false, error: 'invalid_signature' });
            return;
        }
        const antiReplayKey = `${timestampHeader}:${signatureHeader}`;
        const firstSignature = await ensureIdempotent('webhook_sig', antiReplayKey);
        if (!firstSignature) {
            console.warn(JSON.stringify({
                level: 'warn',
                event: 'payment_webhook_rejected',
                reason: 'replay_detected',
                traceId,
            }));
            response.status(409).json({ ok: false, error: 'replay_detected' });
            return;
        }
        const { uid, amount, providerReference, status } = request.body;
        if (!uid || !providerReference || !Number.isFinite(amount) || amount <= 0 || (status !== 'success' && status !== 'failed')) {
            console.warn(JSON.stringify({
                level: 'warn',
                event: 'payment_webhook_rejected',
                reason: 'invalid_payload',
                traceId,
            }));
            response.status(400).json({ ok: false, error: 'invalid_payload' });
            return;
        }
        if (status !== 'success') {
            response.status(200).json({ ok: true, skipped: true });
            return;
        }
        const first = await ensureIdempotent('webhook_provider_ref', providerReference);
        if (!first) {
            response.status(200).json({ ok: true, duplicate: true });
            return;
        }
        const walletRef = db.collection('wallets').doc(uid);
        await db.runTransaction(async (tx) => {
            const walletSnap = await tx.get(walletRef);
            const wallet = walletSnap.data();
            tx.set(walletRef, {
                uid,
                balance: (wallet?.balance ?? 0) + amount,
                blocked: wallet?.blocked ?? 0,
                currency: 'XAF',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
        await createWalletTx({ walletId: uid, type: 'recharge', amount, status: 'success', reference: providerReference, traceId });
        console.info(JSON.stringify({
            level: 'info',
            event: 'payment_webhook_processed',
            traceId,
            uid,
            providerReference,
            amount,
        }));
        response.status(200).json({ ok: true });
    }
    catch (error) {
        console.error(JSON.stringify({
            level: 'error',
            event: 'payment_webhook_error',
            traceId,
            message: error.message,
        }));
        response.status(500).json({ ok: false, error: 'internal_error' });
    }
});
exports.topUpWallet = (0, https_1.onCall)(async (request) => {
    try {
        const uid = await ensureAuthenticated(request.auth?.uid);
        const { amount, idempotencyKey } = request.data;
        const traceId = node_crypto_1.default.randomUUID();
        if (!idempotencyKey)
            throw new domain_1.DomainError('ERR_DUPLICATE_IDEMPOTENCY_KEY', 'idempotencyKey requis');
        if (!Number.isFinite(amount) || amount <= 0)
            throw new https_1.HttpsError('invalid-argument', 'Montant invalide');
        const first = await ensureIdempotent(`topup_${uid}`, idempotencyKey);
        if (!first)
            return { ok: true, duplicate: true };
        const walletRef = db.collection('wallets').doc(uid);
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(walletRef);
            const wallet = snap.data();
            tx.set(walletRef, {
                uid,
                balance: (wallet?.balance ?? 0) + amount,
                blocked: wallet?.blocked ?? 0,
                currency: 'XAF',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
        await createWalletTx({ walletId: uid, type: 'recharge', amount, status: 'success', reference: idempotencyKey, traceId });
        logEvent('info', 'wallet_topup', { traceId, uid, amount });
        return { ok: true };
    }
    catch (error) {
        asDomainError(error);
    }
});
exports.getTransactionSecretCode = (0, https_1.onCall)(async (request) => {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { transactionId } = request.data;
    if (!transactionId)
        throw new https_1.HttpsError('invalid-argument', 'transactionId requis');
    const txRef = db.collection('transactions').doc(transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists)
        throw new https_1.HttpsError('not-found', 'Transaction introuvable');
    const txData = txSnap.data();
    if (txData.buyerId !== uid)
        throw new https_1.HttpsError('permission-denied', 'Accès refusé');
    const secretSnap = await db.collection('transaction_secrets').doc(transactionId).get();
    if (!secretSnap.exists)
        throw new https_1.HttpsError('not-found', 'Code secret indisponible');
    const secretData = secretSnap.data();
    if (secretData.expiresAt.toMillis() < Date.now())
        throw new https_1.HttpsError('failed-precondition', 'Code expiré');
    return {
        ok: true,
        secretCode: secretData.secretCode,
        expiresAt: secretData.expiresAt.toDate().toISOString(),
    };
});
