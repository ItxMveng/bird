"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainError = void 0;
exports.assertAllowedDuration = assertAllowedDuration;
exports.assertBid = assertBid;
exports.computeCommission = computeCommission;
exports.canOpenDispute = canOpenDispute;
exports.assertCanResolveDispute = assertCanResolveDispute;
exports.assertCanMarkDelivered = assertCanMarkDelivered;
class DomainError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'DomainError';
    }
}
exports.DomainError = DomainError;
function assertAllowedDuration(hours) {
    if (![6, 12, 24, 48].includes(hours)) {
        throw new DomainError('ERR_INVALID_DURATION', 'Durée d\'enchère invalide');
    }
}
function assertBid(args) {
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
function computeCommission(amount, commissionBps) {
    return Math.floor((amount * commissionBps) / 10_000);
}
function canOpenDispute(status) {
    return status === 'blocked' || status === 'delivered';
}
function assertCanResolveDispute(actorRole) {
    if (actorRole !== 'admin') {
        throw new DomainError('ERR_FORBIDDEN_ROLE', 'Action réservée aux administrateurs');
    }
}
function assertCanMarkDelivered(actorId, sellerId, status) {
    if (actorId !== sellerId) {
        throw new DomainError('ERR_FORBIDDEN_ROLE', 'Seul le vendeur peut marquer livré');
    }
    if (status !== 'blocked') {
        throw new DomainError('ERR_TRANSACTION_NOT_BLOCKED', 'Livraison possible seulement en statut blocked');
    }
}
