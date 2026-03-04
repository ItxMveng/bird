import crypto from 'node:crypto';
import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import {
  assertAllowedDuration,
  assertBid,
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
};

type UserRole = 'user' | 'admin';

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
};

function hashSecretCode(secretCode: string): string {
  return crypto.createHash('sha256').update(`${CONFIG.secretCodeSalt}:${secretCode}`).digest('hex');
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
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentification requise');
  }
  return uid;
}

async function getUserRole(uid: string): Promise<UserRole> {
  const userDoc = await db.collection('users').doc(uid).get();
  return (userDoc.data()?.role ?? 'user') as UserRole;
}

async function createWalletTx(data: {
  walletId: string;
  type: 'recharge' | 'block' | 'release' | 'commission' | 'refund';
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

async function blockBuyerFunds(params: {
  buyerId: string;
  amount: number;
  reference: string;
  traceId: string;
}) {
  const walletRef = db.collection('wallets').doc(params.buyerId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(walletRef);
    const wallet = snap.data() as { balance: number; blocked: number } | undefined;
    if (!wallet || wallet.balance < params.amount) {
      throw new DomainError('ERR_WALLET_INSUFFICIENT', 'Fonds insuffisants au moment du blocage');
    }

    tx.update(walletRef, {
      balance: wallet.balance - params.amount,
      blocked: (wallet.blocked ?? 0) + params.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await createWalletTx({
    walletId: params.buyerId,
    type: 'block',
    amount: params.amount,
    status: 'success',
    reference: params.reference,
    traceId: params.traceId,
  });
}

async function releaseFundsToSeller(params: {
  buyerId: string;
  sellerId: string;
  amount: number;
  transactionId: string;
  traceId: string;
}) {
  const buyerWalletRef = db.collection('wallets').doc(params.buyerId);
  const sellerWalletRef = db.collection('wallets').doc(params.sellerId);
  const commission = computeCommission(params.amount, CONFIG.commissionBps);
  const netToSeller = params.amount - commission;

  await db.runTransaction(async (tx) => {
    const [buyerSnap, sellerSnap] = await Promise.all([tx.get(buyerWalletRef), tx.get(sellerWalletRef)]);
    const buyerWallet = buyerSnap.data() as { balance: number; blocked: number } | undefined;
    const sellerWallet = sellerSnap.data() as { balance: number; blocked: number } | undefined;

    if (!buyerWallet || buyerWallet.blocked < params.amount) {
      throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Fonds bloqués insuffisants');
    }

    tx.update(buyerWalletRef, {
      blocked: buyerWallet.blocked - params.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(
      sellerWalletRef,
      {
        uid: params.sellerId,
        balance: (sellerWallet?.balance ?? 0) + netToSeller,
        blocked: sellerWallet?.blocked ?? 0,
        currency: 'XAF',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await Promise.all([
    createWalletTx({
      walletId: params.buyerId,
      type: 'release',
      amount: params.amount,
      status: 'success',
      reference: params.transactionId,
      traceId: params.traceId,
    }),
    createWalletTx({
      walletId: params.sellerId,
      type: 'release',
      amount: netToSeller,
      status: 'success',
      reference: params.transactionId,
      traceId: params.traceId,
    }),
    createWalletTx({
      walletId: params.sellerId,
      type: 'commission',
      amount: commission,
      status: 'success',
      reference: params.transactionId,
      traceId: params.traceId,
    }),
  ]);
}

export const publishAuction = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const {
      title,
      description,
      category,
      startPrice,
      city,
      durationHours,
    }: {
      title: string;
      description: string;
      category: AuctionDoc['category'];
      startPrice: number;
      city: string;
      durationHours: number;
    } = request.data;

    assertAllowedDuration(Number(durationHours));

    const now = admin.firestore.Timestamp.now();
    const endAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + durationHours * 3600 * 1000);

    const auction: AuctionDoc = {
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
    };

    const doc = await db.collection('auctions').add(auction);
    return { ok: true, auctionId: doc.id };
  } catch (error) {
    asDomainError(error);
  }
});

export const placeBid = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { auctionId, amount, idempotencyKey } = request.data as {
      auctionId: string;
      amount: number;
      idempotencyKey: string;
    };

    const auctionRef = db.collection('auctions').doc(auctionId);
    const walletRef = db.collection('wallets').doc(uid);

    await db.runTransaction(async (tx) => {
      const [auctionSnap, walletSnap] = await Promise.all([tx.get(auctionRef), tx.get(walletRef)]);
      if (!auctionSnap.exists) {
        throw new HttpsError('not-found', 'Enchère introuvable');
      }

      const auction = auctionSnap.data() as AuctionDoc;
      const wallet = walletSnap.data() as { balance: number } | undefined;

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

    return { ok: true };
  } catch (error) {
    asDomainError(error);
  }
});

export const closeExpiredAuctions = onSchedule('every 5 minutes', async () => {
  const now = admin.firestore.Timestamp.now();
  const snapshot = await db
    .collection('auctions')
    .where('status', '==', 'active')
    .where('endAt', '<=', now)
    .limit(100)
    .get();

  for (const doc of snapshot.docs) {
    const auction = doc.data() as AuctionDoc;
    const traceId = crypto.randomUUID();

    if (!auction.winnerBidId || !auction.winnerId) {
      await doc.ref.update({
        status: 'closed_unsold',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      continue;
    }

    await db.runTransaction(async (tx) => {
      const auctionSnap = await tx.get(doc.ref);
      const fresh = auctionSnap.data() as AuctionDoc;
      if (fresh.status !== 'active') {
        return;
      }

      tx.update(doc.ref, {
        status: 'closed_sold',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const secretCode = randomSecretCode();
      const transactionRef = db.collection('transactions').doc();
      tx.set(transactionRef, {
        auctionId: doc.id,
        buyerId: fresh.winnerId,
        sellerId: fresh.sellerId,
        amount: fresh.currentPrice,
        status: 'blocked',
        secretCodeHash: hashSecretCode(secretCode),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } satisfies TransactionDoc);

      tx.set(
        db.collection('logs').doc(),
        {
          actorId: 'system',
          action: 'auction_closed_with_winner',
          targetType: 'auction',
          targetId: doc.id,
          traceId,
          note: `Secret code generated for tx ${transactionRef.id}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    await blockBuyerFunds({
      buyerId: auction.winnerId,
      amount: auction.currentPrice,
      reference: doc.id,
      traceId,
    });
  }
});

export const confirmSecretCode = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { transactionId, secretCode } = request.data as { transactionId: string; secretCode: string };

    const txRef = db.collection('transactions').doc(transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) {
      throw new DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
    }

    const txData = txSnap.data() as TransactionDoc;
    if (txData.buyerId !== uid && txData.sellerId !== uid) {
      throw new HttpsError('permission-denied', 'Accès refusé');
    }
    if (txData.status !== 'blocked' && txData.status !== 'delivered') {
      throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Transaction non confirmable');
    }

    const isValid = hashSecretCode(secretCode) === txData.secretCodeHash;
    if (!isValid) {
      throw new DomainError('ERR_INVALID_SECRET_CODE', 'Code secret invalide');
    }

    const traceId = crypto.randomUUID();
    await releaseFundsToSeller({
      buyerId: txData.buyerId,
      sellerId: txData.sellerId,
      amount: txData.amount,
      transactionId,
      traceId,
    });

    await txRef.update({
      status: 'confirmed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (error) {
    asDomainError(error);
  }
});

export const openDispute = onCall(async (request) => {
  try {
    const uid = await ensureAuthenticated(request.auth?.uid);
    const { transactionId, reason } = request.data as { transactionId: string; reason: string };
    const txRef = db.collection('transactions').doc(transactionId);
    const txSnap = await txRef.get();

    if (!txSnap.exists) {
      throw new DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
    }

    const txData = txSnap.data() as TransactionDoc;
    if (txData.buyerId !== uid && txData.sellerId !== uid) {
      throw new HttpsError('permission-denied', 'Accès refusé');
    }
    if (!canOpenDispute(txData.status)) {
      throw new DomainError('ERR_DISPUTE_NOT_ALLOWED', 'Litige non autorisé dans cet état');
    }

    await Promise.all([
      txRef.update({
        status: 'dispute',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      db.collection('disputes').add({
        transactionId,
        openedBy: txData.buyerId === uid ? 'buyer' : 'seller',
        reason,
        status: 'open',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    ]);

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

    const { disputeId, resolution } = request.data as {
      disputeId: string;
      resolution: 'refund' | 'pay_seller';
    };

    const disputeRef = db.collection('disputes').doc(disputeId);
    const disputeSnap = await disputeRef.get();
    if (!disputeSnap.exists) {
      throw new HttpsError('not-found', 'Litige introuvable');
    }

    const dispute = disputeSnap.data() as {
      transactionId: string;
      status: 'open' | 'resolved';
    };

    if (dispute.status !== 'open') {
      throw new HttpsError('failed-precondition', 'Litige déjà résolu');
    }

    const txRef = db.collection('transactions').doc(dispute.transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) {
      throw new DomainError('ERR_TRANSACTION_NOT_FOUND', 'Transaction introuvable');
    }

    const txData = txSnap.data() as TransactionDoc;
    const traceId = crypto.randomUUID();

    if (resolution === 'pay_seller') {
      await releaseFundsToSeller({
        buyerId: txData.buyerId,
        sellerId: txData.sellerId,
        amount: txData.amount,
        transactionId: dispute.transactionId,
        traceId,
      });

      await txRef.update({
        status: 'confirmed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      const buyerWalletRef = db.collection('wallets').doc(txData.buyerId);
      await db.runTransaction(async (tx) => {
        const buyerWalletSnap = await tx.get(buyerWalletRef);
        const buyerWallet = buyerWalletSnap.data() as { balance: number; blocked: number } | undefined;
        if (!buyerWallet || buyerWallet.blocked < txData.amount) {
          throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Impossible de rembourser');
        }

        tx.update(buyerWalletRef, {
          blocked: buyerWallet.blocked - txData.amount,
          balance: buyerWallet.balance + txData.amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await createWalletTx({
        walletId: txData.buyerId,
        type: 'refund',
        amount: txData.amount,
        status: 'success',
        reference: dispute.transactionId,
        traceId,
      });

      await txRef.update({
        status: 'refunded',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await disputeRef.update({
      status: 'resolved',
      resolution,
      resolvedBy: uid,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (error) {
    asDomainError(error);
  }
});

export const paymentWebhook = onRequest(async (request, response) => {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const { uid, amount, providerReference, status } = request.body as {
      uid: string;
      amount: number;
      providerReference: string;
      status: 'success' | 'failed';
    };

    if (status !== 'success') {
      response.status(200).json({ ok: true, skipped: true });
      return;
    }

    const dedupRef = db.collection('wallet_transactions').where('reference', '==', providerReference).limit(1);
    const existing = await dedupRef.get();
    if (!existing.empty) {
      response.status(200).json({ ok: true, duplicate: true });
      return;
    }

    const walletRef = db.collection('wallets').doc(uid);
    await db.runTransaction(async (tx) => {
      const walletSnap = await tx.get(walletRef);
      const wallet = walletSnap.data() as { balance: number; blocked: number } | undefined;
      tx.set(
        walletRef,
        {
          uid,
          balance: (wallet?.balance ?? 0) + amount,
          blocked: wallet?.blocked ?? 0,
          currency: 'XAF',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    await createWalletTx({
      walletId: uid,
      type: 'recharge',
      amount,
      status: 'success',
      reference: providerReference,
      traceId: crypto.randomUUID(),
    });

    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(500).json({ ok: false, error: 'internal_error', detail: (error as Error).message });
  }
});
