import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { mockData } from '../services/api';
import { db, USE_MOCK } from '../services/firebase';
import { useAuth } from './AuthContext';
import { AppNotification, Auction, Dispute, Message, MessageThread, Rating, Transaction, Wallet } from '../types';

type AppDataContextValue = {
  auctions: Auction[];
  wallet: Wallet;
  transactions: Transaction[];
  notifications: AppNotification[];
  threads: MessageThread[];
  messages: Message[];
  disputes: Dispute[];
  ratings: Rating[];
  addAuctionLocal: (payload: Omit<Auction, 'id' | 'currentPrice' | 'endAt' | 'sellerId'> & { startPrice: number; sellerId: string; durationHours: number }) => Promise<Auction>;
  addMessageLocal: (threadId: string, senderId: string, text: string) => Promise<void>;
  addRatingLocal: (payload: Omit<Rating, 'id'>) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>(mockData.auctions);
  const [wallet, setWallet] = useState<Wallet>(mockData.wallet);
  const [transactions, setTransactions] = useState<Transaction[]>(mockData.transactions);
  const [notifications, setNotifications] = useState<AppNotification[]>(mockData.notifications);
  const [threads, setThreads] = useState<MessageThread[]>(mockData.threads);
  const [messages, setMessages] = useState<Message[]>(mockData.messages);
  const [disputes, setDisputes] = useState<Dispute[]>(mockData.disputes);
  const [ratings, setRatings] = useState<Rating[]>(mockData.ratings);

  useEffect(() => {
    if (!user?.uid || USE_MOCK) return;

    const unsubAuctions = onSnapshot(query(collection(db, 'auctions'), where('status', '==', 'active'), orderBy('endAt', 'asc')), (snap) => {
      setAuctions(
        snap.docs.map((d) => ({
          id: d.id,
          title: d.get('title'),
          description: d.get('description'),
          category: d.get('category'),
          city: d.get('city'),
          currentPrice: d.get('currentPrice'),
          endAt: d.get('endAt')?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
          sellerId: d.get('sellerId'),
        })),
      );
    });

    const unsubWallet = onSnapshot(collection(db, 'wallets'), (snap) => {
      const mine = snap.docs.find((d) => d.id === user.uid);
      if (!mine) return;
      setWallet({
        balance: mine.get('balance') ?? 0,
        blocked: mine.get('blocked') ?? 0,
        currency: 'XAF',
      });
    });

    const txQuery = query(collection(db, 'transactions'), where('buyerId', '==', user.uid));
    const unsubTx = onSnapshot(txQuery, (snap) => {
      setTransactions(
        snap.docs.map((d) => ({
          id: d.id,
          auctionId: d.get('auctionId'),
          amount: d.get('amount'),
          status: d.get('status'),
          buyerId: d.get('buyerId'),
          sellerId: d.get('sellerId'),
        })),
      );
    });

    return () => {
      unsubAuctions();
      unsubWallet();
      unsubTx();
    };
  }, [user?.uid]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      auctions,
      wallet,
      transactions,
      notifications,
      threads,
      messages,
      disputes,
      ratings,
      addAuctionLocal: async ({ title, description, category, city, startPrice, sellerId, durationHours }) => {
        const created: Auction = {
          id: `auc-${Date.now()}`,
          title,
          description,
          category,
          city,
          currentPrice: startPrice,
          endAt: new Date(Date.now() + durationHours * 3600 * 1000).toISOString(),
          sellerId,
        };

        if (!USE_MOCK) {
          await addDoc(collection(db, 'auctions'), {
            sellerId,
            title,
            description,
            category,
            city,
            startPrice,
            currentPrice: startPrice,
            status: 'active',
            endAt: new Date(created.endAt),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        setAuctions((prev) => [created, ...prev]);
        setNotifications((prev) => [{ id: `n-${Date.now()}`, title: 'Enchère publiée', body: `${title} est en ligne.`, createdAt: new Date().toISOString() }, ...prev]);
        return created;
      },
      addMessageLocal: async (threadId, senderId, text) => {
        const msg: Message = { id: `m-${Date.now()}`, threadId, senderId, text, createdAt: new Date().toISOString() };
        setMessages((prev) => [...prev, msg]);
        setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, lastMessage: text, updatedAt: msg.createdAt } : t)));
      },
      addRatingLocal: async (payload) => {
        const created = { ...payload, id: `r-${Date.now()}` };
        setRatings((prev) => [created, ...prev]);
      },
    }),
    [auctions, wallet, transactions, notifications, threads, messages, disputes, ratings],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
