import { Auction, Transaction, Wallet } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://us-central1-bird-af69c.cloudfunctions.net';

async function post<T>(fn: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${BASE_URL}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
};
