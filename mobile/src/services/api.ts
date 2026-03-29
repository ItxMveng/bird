import { AppNotification, Auction, Bid, Dispute, Message, MessageThread, PublicProfile, Rating, Transaction, Wallet } from '../types';
import { auth } from './firebase';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://us-central1-bird-af69c.cloudfunctions.net';

async function post<T>(fn: string, data: Record<string, unknown>): Promise<T> {
  const token = await auth.currentUser?.getIdToken?.();
  const response = await fetch(`${BASE_URL}/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  async publishAuction(payload: {
    title: string;
    description: string;
    category: Auction['category'];
    startPrice: number;
    city: string;
    imageUrl: string;
    durationHours: 6 | 12 | 24 | 48;
  }) {
    return post<{ result: { ok: boolean; auctionId?: string } }>('publishAuction', payload);
  },

  async placeBid(payload: { auctionId: string; amount: number; idempotencyKey: string }) {
    return post<{ result: { ok: boolean; duplicate?: boolean } }>('placeBid', payload);
  },

  async markDelivered(payload: { transactionId: string }) {
    return post<{ result: { ok: boolean } }>('markDelivered', payload);
  },

  async confirmSecretCode(payload: { transactionId: string; secretCode: string; idempotencyKey: string }) {
    return post<{ result: { ok: boolean; duplicate?: boolean } }>('confirmSecretCode', payload);
  },

  async openDispute(payload: { transactionId: string; reason: string }) {
    return post<{ result: { ok: boolean } }>('openDispute', payload);
  },

  async resolveDispute(payload: { disputeId: string; resolution: 'refund' | 'pay_seller' }) {
    return post<{ result: { ok: boolean } }>('resolveDispute', payload);
  },

  async topUpWallet(payload: { amount: number; idempotencyKey: string }) {
    return post<{ result: { ok: boolean; duplicate?: boolean } }>('topUpWallet', payload);
  },

  async getTransactionSecretCode(payload: { transactionId: string }) {
    return post<{ result: { ok: boolean; secretCode: string; expiresAt: string } }>('getTransactionSecretCode', payload);
  },
};

export const mockData = {
  auctions: [
    {
      id: 'auc-1',
      title: 'iPhone 13 Pro 128GB',
      description: 'Très bon état, batterie 88%, vendu avec chargeur.',
      category: 'phones',
      city: 'Douala',
      currentPrice: 290000,
      endAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      sellerId: 'seller-1',
      imageUrl: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'auc-2',
      title: 'PC Gamer RTX 3060',
      description: '16GB RAM, SSD 1To, état neuf.',
      category: 'electronics',
      city: 'Yaoundé',
      currentPrice: 500000,
      endAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      sellerId: 'seller-2',
      imageUrl: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'auc-3',
      title: 'Moto Haojue 150',
      description: 'Très propre, papiers à jour.',
      category: 'moto',
      city: 'Bafoussam',
      currentPrice: 620000,
      endAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      sellerId: 'seller-3',
      imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
    },
  ] as Auction[],
  wallet: {
    balance: 150000,
    blocked: 20000,
    currency: 'XAF',
  } as Wallet,
  transactions: [
    {
      id: 'tx-1',
      auctionId: 'auc-1',
      amount: 290000,
      status: 'blocked',
      buyerId: 'user-demo',
      sellerId: 'seller-1',
    },
  ] as Transaction[],
  notifications: [
    {
      id: 'n-1',
      title: 'Nouvelle enchère dépassée',
      body: 'Votre enchère sur iPhone 13 a été dépassée.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'n-2',
      title: 'Transaction prête',
      body: 'Saisissez le code secret pour finaliser.',
      createdAt: new Date().toISOString(),
    },
  ] as AppNotification[],
  threads: [
    {
      id: 'th-1',
      withUser: 'seller-1',
      withUserId: 'seller-1',
      participants: ['user-demo', 'seller-1'],
      lastMessage: 'On se voit à Akwa demain',
      updatedAt: new Date().toISOString(),
    },
  ] as MessageThread[],
  messages: [
    {
      id: 'm-1',
      threadId: 'th-1',
      senderId: 'user-demo',
      participants: ['user-demo', 'seller-1'],
      text: 'Bonsoir, article dispo ?',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'm-2',
      threadId: 'th-1',
      senderId: 'seller-1',
      participants: ['user-demo', 'seller-1'],
      text: 'Oui, dispo.',
      createdAt: new Date().toISOString(),
    },
  ] as Message[],
  bids: [
    {
      id: 'b-1',
      auctionId: 'auc-1',
      bidderId: 'user-demo',
      bidderName: 'Vous',
      amount: 290000,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ] as Bid[],
  profiles: [
    { uid: 'seller-1', name: 'M. Nkoa', city: 'Douala', isPro: true, rating: 4.7 },
    { uid: 'seller-2', name: 'Tech Store CM', city: 'Yaoundé', isPro: true, rating: 4.9 },
    { uid: 'seller-3', name: 'Bikes Baf', city: 'Bafoussam', isPro: false, rating: 4.4 },
  ] as PublicProfile[],
  ratings: [] as Rating[],
  disputes: [{ id: 'd-1', transactionId: 'tx-1', reason: 'Produit non conforme', status: 'open' }] as Dispute[],
};
