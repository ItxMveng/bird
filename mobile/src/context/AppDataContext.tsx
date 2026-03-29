import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { api } from '../services/api';
import { mockData } from '../services/api';
import { db, USE_MOCK } from '../services/firebase';
import { useAuth } from './AuthContext';
import {
  AppNotification,
  Auction,
  Bid,
  Dispute,
  Message,
  MessageThread,
  PublicProfile,
  Rating,
  Transaction,
  Wallet,
} from '../types';

type AddAuctionPayload = Omit<Auction, 'id' | 'currentPrice' | 'endAt' | 'sellerId'> & {
  startPrice: number;
  sellerId: string;
  durationHours: number;
};

type AppDataContextValue = {
  auctions: Auction[];
  bids: Bid[];
  profiles: Record<string, PublicProfile>;
  wallet: Wallet;
  transactions: Transaction[];
  notifications: AppNotification[];
  threads: MessageThread[];
  messages: Message[];
  disputes: Dispute[];
  ratings: Rating[];
  addAuctionLocal: (payload: AddAuctionPayload) => Promise<Auction>;
  placeBidLocal: (payload: { auctionId: string; amount: number; bidderId: string; bidderName?: string }) => Promise<void>;
  markDeliveredLocal: (transactionId: string) => Promise<void>;
  confirmTransactionLocal: (transactionId: string, secretCode: string) => Promise<void>;
  openDisputeLocal: (transactionId: string, reason: string) => Promise<Dispute>;
  resolveDisputeLocal: (disputeId: string, resolution: 'refund' | 'pay_seller') => Promise<void>;
  markNotificationReadLocal: (notificationId: string) => Promise<void>;
  topUpWalletLocal: (amount: number) => Promise<void>;
  addMessageLocal: (threadId: string, senderId: string, text: string) => Promise<void>;
  addRatingLocal: (payload: Omit<Rating, 'id'>) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const FALLBACK_AUCTION_IMAGE = 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80';

const toIsoString = (value: unknown, fallback = new Date().toISOString()) => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date.toISOString();
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>(mockData.auctions);
  const [bids, setBids] = useState<Bid[]>(mockData.bids);
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>(
    Object.fromEntries(mockData.profiles.map((profile) => [profile.uid, profile])),
  );
  const [wallet, setWallet] = useState<Wallet>(mockData.wallet);
  const [transactions, setTransactions] = useState<Transaction[]>(mockData.transactions);
  const [notifications, setNotifications] = useState<AppNotification[]>(
    mockData.notifications.map((n) => ({ ...n, read: false })),
  );
  const [threads, setThreads] = useState<MessageThread[]>(mockData.threads);
  const [messages, setMessages] = useState<Message[]>(mockData.messages);
  const [disputes, setDisputes] = useState<Dispute[]>(mockData.disputes);
  const [ratings, setRatings] = useState<Rating[]>(mockData.ratings);

  useEffect(() => {
    if (!user?.uid || USE_MOCK) return;

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, 'auctions'), where('status', '==', 'active'), orderBy('endAt', 'asc')),
        (snap) => {
          setAuctions(
            snap.docs.map((d) => ({
              id: d.id,
              title: d.get('title'),
              description: d.get('description'),
              category: d.get('category'),
              city: d.get('city'),
              currentPrice: d.get('currentPrice'),
              endAt: toIsoString(d.get('endAt')),
              sellerId: d.get('sellerId'),
              imageUrl: d.get('imageUrl') ?? FALLBACK_AUCTION_IMAGE,
            })),
          );
        },
      ),
    );

    unsubs.push(
      onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
        if (!snap.exists()) return;
        setWallet({
          balance: snap.get('balance') ?? 0,
          blocked: snap.get('blocked') ?? 0,
          currency: 'XAF',
        });
      }),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'transactions'), where('buyerId', '==', user.uid)), (snap) => {
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
      }),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'threads'), where('participants', 'array-contains', user.uid)), (snap) => {
        setThreads(
          snap.docs.map((d) => ({
            id: d.id,
            withUser: d.get('withUser') ?? 'Support',
            withUserId: d.get('withUserId') ?? undefined,
            participants: d.get('participants') ?? [],
            lastMessage: d.get('lastMessage') ?? '',
            updatedAt: toIsoString(d.get('updatedAt')),
          })),
        );
      }),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'messages'), where('participants', 'array-contains', user.uid)), (snap) => {
        const nextMessages = snap.docs.map((d) => ({
          id: d.id,
          threadId: d.get('threadId'),
          senderId: d.get('senderId'),
          participants: d.get('participants') ?? [],
          text: d.get('text'),
          createdAt: toIsoString(d.get('createdAt')),
        }));
        nextMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(nextMessages);
      }),
    );

    unsubs.push(
      onSnapshot(collection(db, 'disputes'), (snap) => {
        setDisputes(
          snap.docs.map((d) => ({
            id: d.id,
            transactionId: d.get('transactionId'),
            reason: d.get('reason'),
            status: d.get('status'),
          })),
        );
      }),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'bids'), orderBy('createdAt', 'desc')), (snap) => {
        setBids(
          snap.docs.map((d) => ({
            id: d.id,
            auctionId: d.get('auctionId'),
            bidderId: d.get('bidderId'),
            bidderName: d.get('bidderName'),
            amount: d.get('amount'),
            createdAt: toIsoString(d.get('createdAt')),
          })),
        );
      }),
    );

    unsubs.push(
      onSnapshot(collection(db, 'users'), (snap) => {
        setProfiles(
          Object.fromEntries(
            snap.docs.map((d) => [
              d.id,
              {
                uid: d.id,
                name: d.get('name'),
                city: d.get('city'),
                photoUrl: d.get('photoUrl'),
                isPro: Boolean(d.get('isPro')),
                rating: d.get('rating') ?? undefined,
              } as PublicProfile,
            ]),
          ),
        );
      }),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.uid)), (snap) => {
        const nextNotifications = snap.docs.map((d) => ({
          id: d.id,
          title: d.get('title'),
          body: d.get('body'),
          createdAt: toIsoString(d.get('createdAt')),
          read: Boolean(d.get('read')),
        }));
        nextNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(nextNotifications);
      }),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [user?.uid]);

  const value = useMemo<AppDataContextValue>(() => {
    const pushNotification = async (title: string, body: string) => {
      const local: AppNotification = {
        id: `n-${Date.now()}`,
        title,
        body,
        createdAt: new Date().toISOString(),
        read: false,
      };

      if (!USE_MOCK && user?.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title,
          body,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {
          setNotifications((prev) => [local, ...prev]);
        });
      } else {
        setNotifications((prev) => [local, ...prev]);
      }
    };

    return {
      auctions,
      bids,
      profiles,
      wallet,
      transactions,
      notifications,
      threads,
      messages,
      disputes,
      ratings,
      addAuctionLocal: async ({ title, description, category, city, startPrice, sellerId, durationHours, imageUrl }) => {
        const created: Auction = {
          id: `auc-${Date.now()}`,
          title: title.trim(),
          description: description.trim(),
          category,
          city: city.trim(),
          currentPrice: startPrice,
          endAt: new Date(Date.now() + durationHours * 3600 * 1000).toISOString(),
          sellerId,
          imageUrl: imageUrl.trim() || FALLBACK_AUCTION_IMAGE,
        };

        if (!USE_MOCK) {
          const response = await api.publishAuction({
            title: created.title,
            description: created.description,
            category: created.category,
            city: created.city,
            imageUrl: created.imageUrl,
            startPrice,
            durationHours: durationHours as 6 | 12 | 24 | 48,
          });
          if (response?.result?.auctionId) {
            created.id = response.result.auctionId;
          }
          setAuctions((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
        } else {
          setAuctions((prev) => [created, ...prev]);
        }

        await pushNotification('Enchère publiée', `${created.title} est maintenant visible.`);
        return created;
      },
      placeBidLocal: async ({ auctionId, amount, bidderId, bidderName }) => {
        const target = auctions.find((auction) => auction.id === auctionId);
        if (!target) throw new Error('Enchère introuvable.');
        if (!Number.isFinite(amount) || amount <= target.currentPrice) {
          throw new Error(`Le montant doit être supérieur à ${target.currentPrice.toLocaleString()} XAF.`);
        }

        const txId = `${auctionId}_${bidderId}`;
        const localBid: Bid = {
          id: `b-${Date.now()}`,
          auctionId,
          bidderId,
          bidderName: bidderName ?? profiles[bidderId]?.name ?? 'Acheteur',
          amount,
          createdAt: new Date().toISOString(),
        };

        if (!USE_MOCK) {
          await api.placeBid({
            auctionId,
            amount,
            idempotencyKey: `bid-${auctionId}-${bidderId}-${Date.now()}`,
          });
        } else {
          setBids((prev) => [localBid, ...prev]);
          setAuctions((prev) => prev.map((auction) => (auction.id === auctionId ? { ...auction, currentPrice: amount } : auction)));
        }

        await pushNotification('Enchère validée', `Vous menez sur "${target.title}" avec ${amount.toLocaleString()} XAF.`);
      },
      markDeliveredLocal: async (transactionId) => {
        const tx = transactions.find((item) => item.id === transactionId);
        if (!tx) throw new Error('Transaction introuvable.');

        if (!USE_MOCK) {
          await api.markDelivered({ transactionId });
        }
        setTransactions((prev) => prev.map((item) => (item.id === transactionId ? { ...item, status: 'delivered' } : item)));

        await pushNotification('Livraison signalée', `La transaction ${transactionId} est marquée livrée.`);
      },
      confirmTransactionLocal: async (transactionId, secretCode) => {
        if (secretCode.trim().length < 4) {
          throw new Error('Le code secret doit contenir au moins 4 caractères.');
        }

        const tx = transactions.find((item) => item.id === transactionId);
        if (!tx) throw new Error('Transaction introuvable.');

        if (!USE_MOCK) {
          await api.confirmSecretCode({
            transactionId,
            secretCode,
            idempotencyKey: `confirm-${transactionId}-${Date.now()}`,
          });
        }
        setTransactions((prev) => prev.map((item) => (item.id === transactionId ? { ...item, status: 'confirmed' } : item)));
        setWallet((prev) => ({ ...prev, blocked: Math.max(0, prev.blocked - tx.amount) }));

        await pushNotification('Paiement libéré', `Le paiement de ${tx.amount.toLocaleString()} XAF a été confirmé.`);
      },
      openDisputeLocal: async (transactionId, reason) => {
        const tx = transactions.find((item) => item.id === transactionId);
        if (!tx) throw new Error('Transaction introuvable.');

        const created: Dispute = {
          id: `d-${Date.now()}`,
          transactionId,
          reason: reason.trim(),
          status: 'open',
        };

        setDisputes((prev) => [created, ...prev]);
        setTransactions((prev) => prev.map((item) => (item.id === transactionId ? { ...item, status: 'dispute' } : item)));

        if (!USE_MOCK) {
          await api.openDispute({ transactionId, reason: created.reason });
        }

        await pushNotification('Litige ouvert', `Le litige ${created.id} a bien été enregistré.`);
        return created;
      },
      resolveDisputeLocal: async (disputeId, resolution) => {
        const dispute = disputes.find((item) => item.id === disputeId);
        if (!dispute) throw new Error('Litige introuvable.');
        const tx = transactions.find((item) => item.id === dispute.transactionId);

        setDisputes((prev) => prev.map((item) => (item.id === disputeId ? { ...item, status: 'resolved' } : item)));

        if (tx) {
          setTransactions((prev) => prev.map((item) => (item.id === tx.id ? { ...item, status: resolution === 'refund' ? 'refunded' : 'confirmed' } : item)));
          setWallet((prev) => ({
            ...prev,
            blocked: Math.max(0, prev.blocked - tx.amount),
            balance: resolution === 'refund' ? prev.balance + tx.amount : prev.balance,
          }));
        }

        if (!USE_MOCK) {
          await api.resolveDispute({ disputeId, resolution });
        }

        await pushNotification(
          'Litige résolu',
          resolution === 'refund'
            ? `Le litige ${disputeId} a été remboursé.`
            : `Le litige ${disputeId} a été validé en faveur du vendeur.`,
        );
      },
      markNotificationReadLocal: async (notificationId) => {
        setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
        if (!USE_MOCK) {
          await updateDoc(doc(db, 'notifications', notificationId), { read: true }).catch(() => undefined);
        }
      },
      topUpWalletLocal: async (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Montant de recharge invalide.');
        }
        const rounded = Math.round(amount);
        setWallet((prev) => ({ ...prev, balance: prev.balance + rounded }));

        if (!USE_MOCK && user?.uid) {
          await api.topUpWallet({ amount: rounded, idempotencyKey: `topup-${user.uid}-${Date.now()}` });
        }

        await pushNotification('Wallet rechargé', `${rounded.toLocaleString()} XAF ont été ajoutés.`);
      },
      addMessageLocal: async (threadId, senderId, text) => {
        const messageText = text.trim();
        if (!messageText) return;

        const existingThread = threads.find((thread) => thread.id === threadId);
        const partnerId = existingThread?.withUserId ?? existingThread?.participants?.find((id) => id !== senderId) ?? 'support';
        const participants = Array.from(new Set([senderId, partnerId]));
        const now = new Date().toISOString();
        const localMessage: Message = {
          id: `m-${Date.now()}`,
          threadId,
          senderId,
          participants,
          text: messageText,
          createdAt: now,
        };

        setMessages((prev) => [...prev, localMessage]);
        setThreads((prev) => {
          const found = prev.some((thread) => thread.id === threadId);
          if (!found) {
            return [
              {
                id: threadId,
                withUser: profiles[partnerId]?.name ?? partnerId,
                withUserId: partnerId,
                participants,
                lastMessage: messageText,
                updatedAt: now,
              },
              ...prev,
            ];
          }
          return prev.map((thread) =>
            thread.id === threadId ? { ...thread, lastMessage: messageText, updatedAt: now } : thread,
          );
        });

        if (!USE_MOCK) {
          await setDoc(
            doc(db, 'threads', threadId),
            {
              withUser: profiles[partnerId]?.name ?? partnerId,
              withUserId: partnerId,
              participants,
              lastMessage: messageText,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
          await addDoc(collection(db, 'messages'), {
            threadId,
            senderId,
            participants,
            text: messageText,
            createdAt: serverTimestamp(),
          });
        }
      },
      addRatingLocal: async (payload) => {
        const created = { ...payload, id: `r-${Date.now()}` };
        setRatings((prev) => [created, ...prev]);

        if (!USE_MOCK) {
          await addDoc(collection(db, 'ratings'), {
            ...payload,
            createdAt: serverTimestamp(),
          });
        }

        await pushNotification('Nouvelle note', `Votre note ${payload.score}/5 a été enregistrée.`);
      },
    };
  }, [auctions, bids, profiles, wallet, transactions, notifications, threads, messages, disputes, ratings, user?.uid]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
