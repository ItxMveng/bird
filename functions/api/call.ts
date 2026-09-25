import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import * as fns from '../src/index';

const CALLABLES = [
  'publishAuction',
  'placeBid',
  'markDelivered',
  'confirmSecretCode',
  'openDispute',
  'resolveDispute',
  'topUpWallet',
  'createPayment',
  'getTransactionSecretCode',
] as const;

const DEFAULT_ORIGINS = ['https://bird-af69c.web.app', 'https://bird-af69c.firebaseapp.com', 'http://localhost:8081', 'http://localhost:19006'];

function allowedOrigins(): string[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
}

// Balayage opportuniste : le cron GitHub Actions est bridé (quelques passages par jour) ; toute activité
// sur l'API clôture aussi les enchères échues, au plus une fois par minute et par instance.
let lastSweep = 0;
async function sweepExpired() {
  if (Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  try {
    await (fns.closeExpiredAuctions as unknown as { run: (r: unknown) => Promise<unknown> }).run({});
  } catch (e) {
    console.error(JSON.stringify({ event: 'sweep_error', message: (e as Error).message }));
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const name = String(req.query.fn ?? '');
  if (name === 'health') return res.status(200).json({ ok: true, service: 'bird-api', commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7) });
  if (!(CALLABLES as readonly string[]).includes(name)) return res.status(404).json({ error: { message: 'Fonction inconnue', status: 'NOT_FOUND' } });
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'POST requis', status: 'METHOD_NOT_ALLOWED' } });

  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  let auth: { uid: string; token: admin.auth.DecodedIdToken } | undefined;
  if (token) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      auth = { uid: decoded.uid, token: decoded };
    } catch {
      return res.status(401).json({ error: { message: 'Session expirée, reconnectez-vous', status: 'UNAUTHENTICATED' } });
    }
  }

  await sweepExpired();

  try {
    const fn = (fns as unknown as Record<string, { run: (r: unknown) => Promise<unknown> }>)[name];
    const result = await fn.run({ data: req.body?.data ?? {}, auth, rawRequest: req, acceptsStreaming: false });
    return res.status(200).json({ result });
  } catch (e) {
    if (e instanceof HttpsError) {
      return res.status(e.httpErrorCode.status).json({ error: { message: e.message, status: e.code } });
    }
    console.error(JSON.stringify({ event: 'api_error', fn: name, message: (e as Error).message }));
    return res.status(500).json({ error: { message: 'Erreur interne', status: 'INTERNAL' } });
  }
}
