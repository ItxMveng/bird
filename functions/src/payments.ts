import crypto from 'node:crypto';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Recharge du portefeuille par Mobile Money / carte via Flutterwave (XAF).
 * - createPaymentLink : crée une session de paiement et renvoie le lien de la page sécurisée.
 * - handleFlutterwaveWebhook : reçoit la notification, la RE-VÉRIFIE auprès de Flutterwave, puis crédite
 *   le portefeuille une seule fois (idempotent par référence de paiement).
 * Variables : FLW_SECRET_KEY, FLW_WEBHOOK_HASH (le « secret hash » saisi dans le tableau de bord Flutterwave), APP_URL.
 */
const FLW_API = 'https://api.flutterwave.com/v3';
export const PAYMENT_MIN = 500;
export const PAYMENT_MAX = 500_000;

export const paymentsEnabled = () => Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_WEBHOOK_HASH);

export function assertPaymentAmount(amount: unknown): asserts amount is number {
  if (!Number.isInteger(amount) || (amount as number) < PAYMENT_MIN || (amount as number) > PAYMENT_MAX) {
    throw new HttpsError('invalid-argument', `Montant : entier entre ${PAYMENT_MIN} et ${PAYMENT_MAX} XAF`);
  }
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function createPaymentLink(p: { uid: string; email: string; name: string; amount: unknown }) {
  if (!paymentsEnabled()) throw new HttpsError('failed-precondition', 'Le paiement en ligne n’est pas encore activé.');
  assertPaymentAmount(p.amount);
  const amount = p.amount;
  const db = admin.firestore();
  const txRef = `bird-${p.uid.slice(0, 8)}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const payRef = db.collection('payments').doc(txRef);
  await payRef.set({ uid: p.uid, amount, currency: 'XAF', status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp() });

  const appUrl = (process.env.APP_URL || 'https://bird-af69c.web.app').replace(/\/$/, '');
  let json: any;
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
    if (!res.ok || json?.status !== 'success' || !json?.data?.link) throw new Error(json?.message ?? `HTTP ${res.status}`);
  } catch (error) {
    await payRef.update({ status: 'failed', error: String((error as Error).message).slice(0, 200) });
    console.error(JSON.stringify({ event: 'payment_link_error', message: (error as Error).message }));
    throw new HttpsError('unavailable', 'Le service de paiement est momentanément indisponible.');
  }
  return { link: String(json.data.link), reference: txRef };
}

type WebhookResult = { status: number; body: Record<string, unknown> };

export async function handleFlutterwaveWebhook(headers: Record<string, unknown>, body: any): Promise<WebhookResult> {
  if (!paymentsEnabled()) return { status: 503, body: { ok: false, error: 'not_configured' } };
  const signature = String(headers['verif-hash'] ?? '');
  if (!safeEqual(signature, String(process.env.FLW_WEBHOOK_HASH))) return { status: 401, body: { ok: false, error: 'invalid_signature' } };

  const data = body?.data;
  if (!data?.tx_ref || !data?.id) return { status: 200, body: { ok: true, ignored: 'no_reference' } };
  if (data.status !== 'successful') return { status: 200, body: { ok: true, ignored: 'not_successful' } };

  // Ne jamais se fier au contenu du webhook : on interroge Flutterwave.
  let verified: any;
  try {
    const res = await fetch(`${FLW_API}/transactions/${encodeURIComponent(String(data.id))}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
    });
    verified = await res.json();
  } catch {
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
    if (!paySnap.exists) return;
    const pay = paySnap.data() as { uid: string; amount: number; status: string };
    if (pay.status === 'completed') return; // déjà crédité : idempotent
    if (Number(v.amount) < pay.amount) {
      tx.update(payRef, { status: 'amount_mismatch', paidAmount: Number(v.amount) });
      return;
    }
    const walletRef = db.collection('wallets').doc(pay.uid);
    const walletSnap = await tx.get(walletRef);
    const wallet = walletSnap.data() as { balance?: number; blocked?: number } | undefined;
    tx.set(walletRef, { uid: pay.uid, balance: (wallet?.balance ?? 0) + pay.amount, blocked: wallet?.blocked ?? 0, currency: 'XAF', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    tx.update(payRef, { status: 'completed', providerId: String(v.id), completedAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.set(db.collection('wallet_transactions').doc(), {
      walletId: pay.uid,
      type: 'recharge',
      amount: pay.amount,
      status: 'success',
      reference: String(v.tx_ref),
      traceId: crypto.randomUUID(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    credited = true;
  });
  return { status: 200, body: { ok: true, credited } };
}
