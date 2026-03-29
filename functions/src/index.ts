import crypto from 'node:crypto';
import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import {
  assertAllowedDuration,
  assertBid,
  assertCanMarkDelivered,
  assertCanResolveDispute,
  canOpenDispute,
  computeCommission,
  DomainError,
} from './domain';

admin.initializeApp();
const db = admin.firestore();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const CONFIG = {
  commissionBps: 500,
  secretCodeSalt: process.env.SECRET_CODE_SALT ?? 'dev-salt',
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? '',
  webhookToleranceSec: Number(process.env.PAYMENT_WEBHOOK_TOLERANCE_SEC ?? '300'),
};

type UserRole = 'user' | 'admin';
type WalletTxType = 'recharge' | 'block' | 'release' | 'commission' | 'refund';

type AuctionDoc = {
  sellerId: string;
  title: string;
  description: string;
  category: 'phones' | 'electronics' | 'moto' | 'appliances';
  startPrice: number;
  currentPrice: number;
  status: 'draft' | 'active' | 'closed_unsold' | 'closed_sold' | 'cancelled';
  endAt: admin.firestore.Timestamp;
  city: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  winnerBidId?: string;
  winnerId?: string;
};

type WalletDoc = { balance: number; blocked: number };

type TransactionDoc = {
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: 'blocked' | 'delivered' | 'confirmed' | 'dispute' | 'refunded';
  secretCodeHash: string;
  expiresAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  deliveredAt?: admin.firestore.Timestamp;
};

type TransactionSecretDoc = {
  transactionId: string;
  buyerId: string;
  secretCode: string;
  expiresAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.FieldValue;
};

function hashSecretCode(secretCode: string): string {
  return crypto.createHash('sha256').update(`${CONFIG.secretCodeSalt}:${secretCode}`).digest('hex');
}

function hashWebhookPayload(timestamp: string, rawPayload: Buffer | string): string {
  const payload = Buffer.isBuffer(rawPayload) ? rawPayload : Buffer.from(rawPayload);
  return crypto.createHmac('sha256', CONFIG.webhookSecret).update(`${timestamp}.`).update(payload).digest('hex');
}

function safeEqualHex(expectedHex: string, candidateHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const candidate = Buffer.from(candidateHex, 'hex');
  if (expected.length === 0 || expected.length !== candidate.length) return false;
  return crypto.timingSafeEqual(expected, candidate);
}

function randomSecretCode(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function asDomainError(error: unknown): never {
  if (error instanceof DomainError) {
    throw new HttpsError('failed-precondition', `${error.code}: ${error.message}`);
  }
  if (error instanceof HttpsError) {
    throw error;
  }
  throw new HttpsError('internal', 'Unexpected error');
}

async function ensureAuthenticated(uid?: string): Promise<string> {
  if (!uid) throw new HttpsError('unauthenticated', 'Authentification requise');
  return uid;
}

async function getUserRole(uid: string): Promise<UserRole> {
  const userDoc = await db.collection('users').doc(uid).get();
  return (userDoc.data()?.role ?? 'user') as UserRole;
}

async function ensureAdmin(uid: string): Promise<void> {
  const role = await getUserRole(uid);
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Accès administrateur requis');
  }
}

function idempotencyRef(scope: string, key: string) {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return db.collection('idempotency').doc(`${scope}_${safe}`);
}

async function ensureIdempotent(scope: string, key: string): Promise<boolean> {
  const ref = idempotencyRef(scope, key);
  try {
    await ref.create({
      scope,
      key,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch {
    return false;
  }
}

async function createWalletTx(data: {
  walletId: string;
  type: WalletTxType;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  reference: string;
  traceId: string;
}) {
  await db.collection('wallet_transactions').add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function logEvent(level: 'info' | 'warn' | 'error', event: string, payload: Record<string, unknown>) {
  const body = JSON.stringify({ level, event, ...payload });
  if (level === 'error') console.error(body);
  else if (level === 'warn') console.warn(body);
  else console.info(body);
}

async function settleToSeller(params: { transactionId: string; actorUid: string; allowStatuses: Array<TransactionDoc['status']>; traceId: string }) {
  const txRef = db.collection('transactions').doc(params.transactionId);
  const settlement = await db.runTransaction(async (tx) => {
    const txSnap = await tx.get(txRef);
    if (!txSnap.exists) throw new DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
    const txData = txSnap.data() as TransactionDoc;
    if (txData.buyerId !== params.actorUid && txData.sellerId !== params.actorUid) {
      throw new HttpsError('permission-denied', 'Accès refusé');
    }
    if (!params.allowStatuses.includes(txData.status)) {
      throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Transaction non confirmable');
    }

    const buyerWalletRef = db.collection('wallets').doc(txData.buyerId);
    const sellerWalletRef = db.collection('wallets').doc(txData.sellerId);
    const [buyerSnap, sellerSnap] = await Promise.all([tx.get(buyerWalletRef), tx.get(sellerWalletRef)]);
    const buyerWallet = buyerSnap.data() as WalletDoc | undefined;
    const sellerWallet = sellerSnap.data() as WalletDoc | undefined;
    if (!buyerWallet || buyerWallet.blocked < txData.amount) {
      throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Fonds bloqués insuffisants');
    }

    const commission = computeCommission(txData.amount, CONFIG.commissionBps);
    const netToSeller = txData.amount - commission;

    tx.update(buyerWalletRef, {
      blocked: buyerWallet.blocked - txData.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(
      sellerWalletRef,
      {
        uid: txData.sellerId,
        balance: (sellerWallet?.balance ?? 0) + netToSeller,
        blocked: sellerWallet?.blocked ?? 0,
        currency: 'XAF',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.update(txRef, { status: 'confirmed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return { ...txData, commission, netToSeller };
  });

  await Promise.all([
    createWalletTx({ walletId: settlement.buyerId, type: 'release', amount: settlement.amount, status: 'success', reference: params.transactionId, traceId: params.traceId }),
    createWalletTx({ walletId: settlement.sellerId, type: 'release', amount: settlement.netToSeller, status: 'success', reference: params.transactionId, traceId: params.traceId }),
    createWalletTx({ walletId: settlement.sellerId, type: 'commission', amount: settlement.commission, status: 'success', reference: params.transactionId, traceId: params.traceId }),
  ]);
}

export const publishAuction = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { title, description, category, startPrice, city, durationHours } = request.data as {
      title: string; description: string; category: AuctionDoc['category']; startPrice: number; city: string; durationHours: number;
    };
    assertAllowedDuration(Number(durationHours));

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
    } satisfies AuctionDoc);

    return { ok: true, auctionId: doc.id };
  } catch (error) {
    asDomainError(error);
  }
});

export const placeBid = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { auctionId, amount, idempotencyKey } = request.data as { auctionId: string; amount: number; idempotencyKey: string };
    if (!idempotencyKey) throw new DomainError('ERR_DUPLICATE_IDEMPOTENCY_KEY', 'idempotencyKey requis');
    const traceId = crypto.randomUUID();

    const first = await ensureIdempotent(`bid_${uid}_${auctionId}`, idempotencyKey);
    if (!first) return { ok: true, duplicate: true };

    const auctionRef = db.collection('auctions').doc(auctionId);
    const walletRef = db.collection('wallets').doc(uid);

    await db.runTransaction(async (tx) => {
      const [auctionSnap, walletSnap] = await Promise.all([tx.get(auctionRef), tx.get(walletRef)]);
      if (!auctionSnap.exists) throw new HttpsError('not-found', 'Enchère introuvable');
      const auction = auctionSnap.data() as AuctionDoc;
      const wallet = walletSnap.data() as WalletDoc | undefined;

      assertBid({
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
  } catch (error) {
    asDomainError(error);
  }
});

export const closeExpiredAuctions = onSchedule('every 5 minutes', async () => {
  const now = admin.firestore.Timestamp.now();
  const snapshot = await db.collection('auctions').where('status', '==', 'active').where('endAt', '<=', now).limit(100).get();

  for (const doc of snapshot.docs) {
    const auction = doc.data() as AuctionDoc;
    const traceId = crypto.randomUUID();

    if (!auction.winnerBidId || !auction.winnerId) {
      await doc.ref.update({ status: 'closed_unsold', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      continue;
    }

    await db.runTransaction(async (tx) => {
      const auctionSnap = await tx.get(doc.ref);
      const fresh = auctionSnap.data() as AuctionDoc;
      if (fresh.status !== 'active') return;
      if (!fresh.winnerId) return;

      const buyerWalletRef = db.collection('wallets').doc(fresh.winnerId);
      const buyerWalletSnap = await tx.get(buyerWalletRef);
      const buyerWallet = buyerWalletSnap.data() as WalletDoc | undefined;

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
      } satisfies TransactionSecretDoc);

      tx.set(
        buyerWalletRef,
        {
          uid: fresh.winnerId,
          balance: buyerWallet.balance - fresh.currentPrice,
          blocked: (buyerWallet.blocked ?? 0) + fresh.currentPrice,
          currency: 'XAF',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

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

export const markDelivered = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { transactionId } = request.data as { transactionId: string };
    const txRef = db.collection('transactions').doc(transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) throw new DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
    const txData = txSnap.data() as TransactionDoc;

    assertCanMarkDelivered(uid, txData.sellerId, txData.status);

    await txRef.update({
      status: 'delivered',
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (error) {
    asDomainError(error);
  }
});

export const confirmSecretCode = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { transactionId, secretCode, idempotencyKey } = request.data as { transactionId: string; secretCode: string; idempotencyKey?: string };
    if (!idempotencyKey) throw new DomainError('ERR_DUPLICATE_IDEMPOTENCY_KEY', 'idempotencyKey requis');
    const first = await ensureIdempotent(`confirm_${uid}_${transactionId}`, idempotencyKey);
    if (!first) return { ok: true, duplicate: true };

    const txRef = db.collection('transactions').doc(transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) throw new DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
    const txData = txSnap.data() as TransactionDoc;

    if (txData.buyerId !== uid && txData.sellerId !== uid) throw new HttpsError('permission-denied', 'Accès refusé');
    if (txData.status !== 'blocked' && txData.status !== 'delivered') throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Transaction non confirmable');
    if (txData.expiresAt.toMillis() < Date.now()) throw new DomainError('ERR_INVALID_SECRET_CODE', 'Code secret expiré');
    if (hashSecretCode(secretCode) !== txData.secretCodeHash) throw new DomainError('ERR_INVALID_SECRET_CODE', 'Code secret invalide');

    const traceId = crypto.randomUUID();
    await settleToSeller({ transactionId, actorUid: uid, allowStatuses: ['blocked', 'delivered'], traceId });
    logEvent('info', 'transaction_confirmed', { traceId, transactionId, actorUid: uid });

    return { ok: true };
  } catch (error) {
    asDomainError(error);
  }
});

export const openDispute = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { transactionId, reason } = request.data as { transactionId: string; reason: string };
    const traceId = crypto.randomUUID();
    const txRef = db.collection('transactions').doc(transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) throw new DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');

    const txData = txSnap.data() as TransactionDoc;
    if (txData.buyerId !== uid && txData.sellerId !== uid) throw new HttpsError('permission-denied', 'Accès refusé');
    if (!canOpenDispute(txData.status)) throw new DomainError('ERR_DISPUTE_NOT_ALLOWED', 'Litige non autorisé dans cet état');

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
  } catch (error) {
    asDomainError(error);
  }
});

export const resolveDispute = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const role = await getUserRole(uid);
    assertCanResolveDispute(role);

    const { disputeId, resolution } = request.data as { disputeId: string; resolution: 'refund' | 'pay_seller' };
    const disputeRef = db.collection('disputes').doc(disputeId);
    const disputeSnap = await disputeRef.get();
    if (!disputeSnap.exists) throw new HttpsError('not-found', 'Litige introuvable');

    const dispute = disputeSnap.data() as { transactionId: string; status: 'open' | 'resolved' };
    if (dispute.status !== 'open') throw new HttpsError('failed-precondition', 'Litige déjà résolu');

    const txRef = db.collection('transactions').doc(dispute.transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) throw new DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');

    const txData = txSnap.data() as TransactionDoc;
    const traceId = crypto.randomUUID();

    if (resolution === 'pay_seller') {
      await settleToSeller({ transactionId: dispute.transactionId, actorUid: txData.sellerId, allowStatuses: ['dispute'], traceId });
    } else {
      const buyerWalletRef = db.collection('wallets').doc(txData.buyerId);
      await db.runTransaction(async (tx) => {
        const walletSnap = await tx.get(buyerWalletRef);
        const wallet = walletSnap.data() as WalletDoc | undefined;
        if (!wallet || wallet.blocked < txData.amount) throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Impossible de rembourser');

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
  } catch (error) {
    asDomainError(error);
  }
});

export const paymentWebhook = onRequest(async (request, response) => {
  const traceId = crypto.randomUUID();
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

    const { uid, amount, providerReference, status } = request.body as {
      uid: string; amount: number; providerReference: string; status: 'success' | 'failed';
    };

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
      const wallet = walletSnap.data() as WalletDoc | undefined;
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
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'payment_webhook_error',
      traceId,
      message: (error as Error).message,
    }));
    response.status(500).json({ ok: false, error: 'internal_error' });
  }
});

export const topUpWallet = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { amount, idempotencyKey } = request.data as { amount: number; idempotencyKey: string };
    const traceId = crypto.randomUUID();
    if (!idempotencyKey) throw new DomainError('ERR_DUPLICATE_IDEMPOTENCY_KEY', 'idempotencyKey requis');
    if (!Number.isFinite(amount) || amount <= 0) throw new HttpsError('invalid-argument', 'Montant invalide');

    const first = await ensureIdempotent(`topup_${uid}`, idempotencyKey);
    if (!first) return { ok: true, duplicate: true };

    const walletRef = db.collection('wallets').doc(uid);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(walletRef);
      const wallet = snap.data() as WalletDoc | undefined;
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
  } catch (error) {
    asDomainError(error);
  }
});

export const getTransactionSecretCode = onCall(async (request) => {
  const uid = await ensureAuthenticated(request.auth?.uid);
  const { transactionId } = request.data as { transactionId: string };
  if (!transactionId) throw new HttpsError('invalid-argument', 'transactionId requis');

  const txRef = db.collection('transactions').doc(transactionId);
  const txSnap = await txRef.get();
  if (!txSnap.exists) throw new HttpsError('not-found', 'Transaction introuvable');
  const txData = txSnap.data() as TransactionDoc;
  if (txData.buyerId !== uid) throw new HttpsError('permission-denied', 'Accès refusé');

  const secretSnap = await db.collection('transaction_secrets').doc(transactionId).get();
  if (!secretSnap.exists) throw new HttpsError('not-found', 'Code secret indisponible');
  const secretData = secretSnap.data() as { secretCode: string; expiresAt: admin.firestore.Timestamp };
  if (secretData.expiresAt.toMillis() < Date.now()) throw new HttpsError('failed-precondition', 'Code expiré');

  return {
    ok: true,
    secretCode: secretData.secretCode,
    expiresAt: secretData.expiresAt.toDate().toISOString(),
  };
});

export const adminOverview = onCall(async (request) => {
  const uid = await ensureAuthenticated(request.auth?.uid);
  await ensureAdmin(uid);

  const [activeAuctions, openDisputes, blockedTransactions, recentWalletTx] = await Promise.all([
    db.collection('auctions').where('status', '==', 'active').count().get(),
    db.collection('disputes').where('status', '==', 'open').count().get(),
    db.collection('transactions').where('status', 'in', ['blocked', 'delivered', 'dispute']).count().get(),
    db.collection('wallet_transactions').orderBy('createdAt', 'desc').limit(10).get(),
  ]);

  return {
    ok: true,
    kpis: {
      activeAuctions: activeAuctions.data().count,
      openDisputes: openDisputes.data().count,
      inFlightTransactions: blockedTransactions.data().count,
    },
    recentWalletTransactions: recentWalletTx.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
});

export const adminListDisputes = onCall(async (request) => {
  const uid = await ensureAuthenticated(request.auth?.uid);
  await ensureAdmin(uid);
  const limit = Math.min(Number(request.data?.limit ?? 50), 100);
  const snapshot = await db.collection('disputes').orderBy('createdAt', 'desc').limit(limit).get();
  return { ok: true, disputes: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

export const adminListAuctions = onCall(async (request) => {
  const uid = await ensureAuthenticated(request.auth?.uid);
  await ensureAdmin(uid);
  const limit = Math.min(Number(request.data?.limit ?? 50), 100);
  const snapshot = await db.collection('auctions').orderBy('createdAt', 'desc').limit(limit).get();
  return { ok: true, auctions: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

export const adminListUsers = onCall(async (request) => {
  const uid = await ensureAuthenticated(request.auth?.uid);
  await ensureAdmin(uid);
  const limit = Math.min(Number(request.data?.limit ?? 50), 100);
  const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(limit).get();
  return { ok: true, users: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

export const adminSetUserStatus = onCall(async (request) => {
  const uid = await ensureAuthenticated(request.auth?.uid);
  await ensureAdmin(uid);
  const { targetUid, status } = request.data as { targetUid: string; status: 'active' | 'suspended' };
  if (!targetUid || (status !== 'active' && status !== 'suspended')) {
    throw new HttpsError('invalid-argument', 'Paramètres invalides');
  }
  await db.collection('users').doc(targetUid).set({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  logEvent('info', 'admin_user_status_updated', { adminUid: uid, targetUid, status, traceId: crypto.randomUUID() });
  return { ok: true };
});
