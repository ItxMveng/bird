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

export type Transaction = {
  id: string;
  auctionId: string;
  amount: number;
  status: 'blocked' | 'delivered' | 'confirmed' | 'dispute' | 'refunded';
  sellerId: string;
  buyerId: string;
};

export type AppUser = {
  uid: string;
  phone: string;
  name?: string;
  city?: string;
};
