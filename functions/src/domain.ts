export type AuctionDurationHours = 6 | 12 | 24 | 48;

export type DomainErrorCode =
  | 'ERR_AUCTION_EXPIRED'
  | 'ERR_BID_TOO_LOW'
  | 'ERR_WALLET_INSUFFICIENT'
  | 'ERR_INVALID_DURATION';

export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export function assertAllowedDuration(hours: number): asserts hours is AuctionDurationHours {
  if (![6, 12, 24, 48].includes(hours)) {
    throw new DomainError('ERR_INVALID_DURATION', 'Durée d\'enchère invalide');
  }
}

export function assertBid(amount: number, currentPrice: number, walletBalance: number): void {
  if (amount <= currentPrice) {
    throw new DomainError('ERR_BID_TOO_LOW', 'Le montant doit être strictement supérieur au prix actuel');
  }
  if (walletBalance < amount) {
    throw new DomainError('ERR_WALLET_INSUFFICIENT', 'Solde insuffisant pour enchérir');
  }
}
