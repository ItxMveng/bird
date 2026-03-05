export type AuctionCategory = 'phones' | 'electronics' | 'moto' | 'appliances';

export type Auction = {
  id: string;
  title: string;
  description: string;
  category: AuctionCategory;
  city: string;
  currentPrice: number;
  endAt: string;
  sellerId: string;
};

export type Wallet = {
  balance: number;
  blocked: number;
  currency: 'XAF';
};

export type TransactionStatus = 'blocked' | 'delivered' | 'confirmed' | 'dispute' | 'refunded';

export type Transaction = {
  id: string;
  auctionId: string;
  amount: number;
  status: TransactionStatus;
  sellerId: string;
  buyerId: string;
};

export type AppUser = {
  uid: string;
  phone: string;
  name?: string;
  city?: string;
  role?: 'user' | 'admin';
  isPro?: boolean;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export type MessageThread = {
  id: string;
  withUser: string;
  lastMessage: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export type Rating = {
  id: string;
  transactionId: string;
  fromUser: string;
  toUser: string;
  score: number;
  comment: string;
};

export type Dispute = {
  id: string;
  transactionId: string;
  reason: string;
  status: 'open' | 'resolved';
};
