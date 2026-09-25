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
exports.paymentsEnabled = exports.PAYMENT_MAX = exports.PAYMENT_MIN = void 0;
exports.assertPaymentAmount = assertPaymentAmount;
exports.safeEqual = safeEqual;
exports.createPaymentLink = createPaymentLink;
exports.handleFlutterwaveWebhook = handleFlutterwaveWebhook;
const node_crypto_1 = __importDefault(require("node:crypto"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
/**
 * Recharge du portefeuille par Mobile Money / carte via Flutterwave (XAF).
 * - createPaymentLink : crée une session de paiement et renvoie le lien de la page sécurisée.
 * - handleFlutterwaveWebhook : reçoit la notification, la RE-VÉRIFIE auprès de Flutterwave, puis crédite
 *   le portefeuille une seule fois (idempotent par référence de paiement).
 * Variables : FLW_SECRET_KEY, FLW_WEBHOOK_HASH (le « secret hash » saisi dans le tableau de bord Flutterwave), APP_URL.
 */
const FLW_API = 'https://api.flutterwave.com/v3';
exports.PAYMENT_MIN = 500;
exports.PAYMENT_MAX = 500_000;
const paymentsEnabled = () => Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_HASH);
exports.paymentsEnabled = paymentsEnabled;
function assertPaymentAmount(amount) {
    if (!Number.isInteger(amount) || amount < exports.PAYMENT_MIN || amount > exports.PAYMENT_MAX) {
        throw new https_1.HttpsError('invalid-argument', `Montant : entier entre ${exports.PAYMENT_MIN} et ${exports.PAYMENT_MAX} XAF`);
    }
}
function safeEqual(a, b) {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length > 0 && x.length === y.length && node_crypto_1.default.timingSafeEqual(x, y);
}
async function createPaymentLink(p) {
    if (!(0, exports.paymentsEnabled)())
        throw new https_1.HttpsError('failed-precondition', 'Le paiement en ligne n’est pas encore activé.');
    assertPaymentAmount(p.amount);
    const amount = p.amount;
    const db = admin.firestore();
    const txRef = `bird-${p.uid.slice(0, 8)}-${Date.now()}-${node_crypto_1.default.randomBytes(4).toString('hex')}`;
    const payRef = db.collection('payments').doc(txRef);
    await payRef.set({ uid: p.uid, amount, currency: 'XAF', status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const appUrl = (process.env.APP_URL || 'https://bird-af69c.web.app').replace(/\/$/, '');
    let json;
    try {
        const res = await fetch(`${FLW_API}/payments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tx_ref: txRef,
                amount,
                currency: 'XAF',
                redirect_url: `${appUrl}/?paiement=retour`,
                payment_options: 'mobilemoneyfranco,card',
                customer: { email: p.email, name: p.name || 'Membre Bird' },
                customizations: { title: 'Bird', description: 'Recharge du portefeuille' },
            }),
        });
        json = await res.json();
        if (!res.ok || json?.status !== 'success' || !json?.data?.link)
            throw new Error(json?.message ?? `HTTP ${res.status}`);
    }
    catch (error) {
        await payRef.update({ status: 'failed', error: String(error.message).slice(0, 200) });
        console.error(JSON.stringify({ event: 'payment_link_error', message: error.message }));
        throw new https_1.HttpsError('unavailable', 'Le service de paiement est momentanément indisponible.');
    }
    return { link: String(json.data.link), reference: txRef };
}
async function handleFlutterwaveWebhook(headers, body) {
    if (!(0, exports.paymentsEnabled)())
        return { status: 503, body: { ok: false, error: 'not_configured' } };
    const signature = String(headers['verif-hash'] ?? '');
    if (!safeEqual(signature, String(process.env.FLW_WEBHOOK_HASH)))
        return { status: 401, body: { ok: false, error: 'invalid_signature' } };
    const data = body?.data;
    if (!data?.tx_ref || !data?.id)
        return { status: 200, body: { ok: true, ignored: 'no_reference' } };
    if (data.status !== 'successful')
        return { status: 200, body: { ok: true, ignored: 'not_successful' } };
    // Ne jamais se fier au contenu du webhook : on interroge Flutterwave.
    let verified;
    try {
        const res = await fetch(`${FLW_API}/transactions/${encodeURIComponent(String(data.id))}/verify`, {
            headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
        });
        verified = await res.json();
    }
    catch {
        return { status: 502, body: { ok: false, error: 'verify_unreachable' } }; // Flutterwave réessaiera
    }
    const v = verified?.data;
    if (verified?.status !== 'success' || v?.status !== 'successful' || v?.tx_ref !== data.tx_ref || v?.currency !== 'XAF') {
        console.warn(JSON.stringify({ event: 'payment_verify_rejected', txRef: data.tx_ref }));
        return { status: 200, body: { ok: true, ignored: 'verification_failed' } };
    }
    const db = admin.firestore();
    const payRef = db.collection('payments').doc(String(v.tx_ref));
    let credited = false;
    await db.runTransaction(async (tx) => {
        const paySnap = await tx.get(payRef);
        if (!paySnap.exists)
            return;
        const pay = paySnap.data();
        if (pay.status === 'completed')
            return; // déjà crédité : idempotent
        if (Number(v.amount) < pay.amount) {
            tx.update(payRef, { status: 'amount_mismatch', paidAmount: Number(v.amount) });
            return;
        }
        const walletRef = db.collection('wallets').doc(pay.uid);
        const walletSnap = await tx.get(walletRef);
        const wallet = walletSnap.data();
        tx.set(walletRef, { uid: pay.uid, balance: (wallet?.balance ?? 0) + pay.amount, blocked: wallet?.blocked ?? 0, currency: 'XAF', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.update(payRef, { status: 'completed', providerId: String(v.id), completedAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.set(db.collection('wallet_transactions').doc(), {
            walletId: pay.uid,
            type: 'recharge',
            amount: pay.amount,
            status: 'success',
            reference: String(v.tx_ref),
            traceId: node_crypto_1.default.randomUUID(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        credited = true;
    });
    return { status: 200, body: { ok: true, credited } };
}
