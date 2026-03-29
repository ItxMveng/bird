import { useMemo, useState } from 'react';
import { Auction, MessageThread, Transaction } from '../types';

export type Route =
  | 'home'
  | 'auction'
  | 'wallet'
  | 'create'
  | 'transactions'
  | 'transactionDetail'
  | 'dispute'
  | 'profile'
  | 'search'
  | 'notifications'
  | 'messages'
  | 'conversation'
  | 'ratings'
  | 'admin';

export function useAppRouter() {
  const [route, setRoute] = useState<Route>('home');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);

  const api = useMemo(() => ({
    route,
    go: setRoute,
    selectedAuction,
    selectedTransaction,
    selectedThread,
    openAuction: (auction: Auction) => {
      setSelectedAuction(auction);
      setRoute('auction');
    },
    openTransaction: (tx: Transaction) => {
      setSelectedTransaction(tx);
      setRoute('transactionDetail');
    },
    openDispute: (tx: Transaction) => {
      setSelectedTransaction(tx);
      setRoute('dispute');
    },
    openThread: (thread: MessageThread) => {
      setSelectedThread(thread);
      setRoute('conversation');
    },
  }), [route, selectedAuction, selectedThread, selectedTransaction]);

  return api;
}
