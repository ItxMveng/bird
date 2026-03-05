export type AuctionDurationHours = 6 | 12 | 24 | 48;

export type DomainErrorCode =
  | 'ERR_AUCTION_EXPIRED'
  | 'ERR_AUCTION_NOT_ACTIVE'
  | 'ERR_AUCTION_CANCEL_NOT_ALLOWED'
  | 'ERR_BID_TOO_LOW'
  | 'ERR_BIDDER_IS_SELLER'
  | 'ERR_WALLET_INSUFFICIENT'
  | 'ERR_INVALID_DURATION'
  | 'ERR_TRANSACTION_NOT_FOUND'
  | 'ERR_TRANSACTION_NOT_BLOCKED'
  | 'ERR_INVALID_SECRET_CODE'
  | 'ERR_DISPUTE_NOT_ALLOWED'
  | 'ERR_FORBIDDEN_ROLE'
  | 'ERR_DUPLICATE_IDEMPOTENCY_KEY';

export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export type AuctionStatus = 'draft' | 'active' | 'closed_unsold' | 'closed_sold' | 'cancelled';
export type TransactionStatus = 'blocked' | 'delivered' | 'confirmed' | 'dispute' | 'refunded';

export function assertAllowedDuration(hours: number): asserts hours is AuctionDurationHours {
  if (![6, 12, 24, 48].includes(hours)) {
    throw new DomainError('ERR_INVALID_DURATION', 'Durée d\'enchère invalide');
  }
}

export function assertBid(args: {
  amount: number;
  currentPrice: number;
  walletBalance: number;
  sellerId: string;
  bidderId: string;
  auctionStatus: AuctionStatus;
  endAtMs: number;
  nowMs: number;
}): void {
  const { amount, currentPrice, walletBalance, sellerId, bidderId, auctionStatus, endAtMs, nowMs } = args;

  if (auctionStatus !== 'active') {
    throw new DomainError('ERR_AUCTION_NOT_ACTIVE', 'Cette enchère n\'est plus active');
  }
  if (nowMs >= endAtMs) {
    throw new DomainError('ERR_AUCTION_EXPIRED', 'Cette enchère a expiré');
  }
  if (sellerId === bidderId) {
    throw new DomainError('ERR_BIDDER_IS_SELLER', 'Le vendeur ne peut pas enchérir sur son article');
  }
  if (amount <= currentPrice) {
    throw new DomainError('ERR_BID_TOO_LOW', 'Le montant doit être strictement supérieur au prix actuel');
  }
  if (walletBalance < amount) {
    throw new DomainError('ERR_WALLET_INSUFFICIENT', 'Solde insuffisant pour enchérir');
  }
}

export function computeCommission(amount: number, commissionBps: number): number {
  return Math.floor((amount * commissionBps) / 10_000);
}

export function canOpenDispute(status: TransactionStatus): boolean {
  return status === 'blocked' || status === 'delivered';
}

export function assertCanResolveDispute(actorRole: string): void {
  if (actorRole !== 'admin') {
    throw new DomainError('ERR_FORBIDDEN_ROLE', 'Action réservée aux administrateurs');
  }
}

export function assertCanMarkDelivered(actorId: string, sellerId: string, status: TransactionStatus): void {
  if (actorId !== sellerId) {
    throw new DomainError('ERR_FORBIDDEN_ROLE', 'Seul le vendeur peut marquer livré');
  }
  if (status !== 'blocked') {
    throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Livraison possible seulement en statut blocked');
  }
}
