import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { assertAllowedDuration, assertBid, DomainError } from './domain';

function wrapDomainError(error: unknown): never {
  if (error instanceof DomainError) {
    throw new HttpsError('failed-precondition', `${error.code}: ${error.message}`);
  }
  throw new HttpsError('internal', 'Unexpected error');
}

export const placeBid = onCall((request) => {
  try {
    const { amount, currentPrice, walletBalance } = request.data;
    assertBid(Number(amount), Number(currentPrice), Number(walletBalance));
    return { ok: true };
  } catch (error) {
    wrapDomainError(error);
  }
});

export const publishAuction = onCall((request) => {
  try {
    const { durationHours } = request.data;
    assertAllowedDuration(Number(durationHours));
    return { ok: true };
  } catch (error) {
    wrapDomainError(error);
  }
});

export const closeExpiredAuctions = onSchedule('every 5 minutes', async () => {
  return;
});

export const createBlockedTransaction = onCall(async () => ({ ok: true }));
export const confirmSecretCode = onCall(async () => ({ ok: true }));
export const openDispute = onCall(async () => ({ ok: true }));
export const resolveDispute = onCall(async () => ({ ok: true }));
export const paymentWebhook = onCall(async () => ({ ok: true }));
