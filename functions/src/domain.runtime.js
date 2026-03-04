class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

function assertAllowedDuration(hours) {
  if (![6, 12, 24, 48].includes(hours)) {
    throw new DomainError('ERR_INVALID_DURATION', "Durée d'enchère invalide");
  }
}

function assertBid(args) {
  const { amount, currentPrice, walletBalance, sellerId, bidderId, auctionStatus, endAtMs, nowMs } = args;
  if (auctionStatus !== 'active') throw new DomainError('ERR_AUCTION_NOT_ACTIVE', "Cette enchère n'est plus active");
  if (nowMs >= endAtMs) throw new DomainError('ERR_AUCTION_EXPIRED', 'Cette enchère a expiré');
  if (sellerId === bidderId) throw new DomainError('ERR_BIDDER_IS_SELLER', "Le vendeur ne peut pas enchérir");
  if (amount <= currentPrice) throw new DomainError('ERR_BID_TOO_LOW', 'Montant trop faible');
  if (walletBalance < amount) throw new DomainError('ERR_WALLET_INSUFFICIENT', 'Solde insuffisant');
}

function computeCommission(amount, commissionBps) {
  return Math.floor((amount * commissionBps) / 10000);
}

function canOpenDispute(status) {
  return status === 'blocked' || status === 'delivered';
}

function assertCanResolveDispute(role) {
  if (role !== 'admin') throw new DomainError('ERR_FORBIDDEN_ROLE', 'Action réservée aux admins');
}

function assertCanMarkDelivered(actorId, sellerId, status) {
  if (actorId !== sellerId) throw new DomainError('ERR_FORBIDDEN_ROLE', 'Seul le vendeur peut marquer livré');
  if (status !== 'blocked') throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Livraison possible seulement en blocked');
}

module.exports = {
  DomainError,
  assertAllowedDuration,
  assertBid,
  computeCommission,
  canOpenDispute,
  assertCanResolveDispute,
  assertCanMarkDelivered,
};
