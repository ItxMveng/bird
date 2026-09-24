"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const domain_1 = require("../src/domain");
(0, node_test_1.default)('assertAllowedDuration accepte durées V1', () => {
    strict_1.default.doesNotThrow(() => (0, domain_1.assertAllowedDuration)(6));
    strict_1.default.doesNotThrow(() => (0, domain_1.assertAllowedDuration)(12));
    strict_1.default.doesNotThrow(() => (0, domain_1.assertAllowedDuration)(24));
    strict_1.default.doesNotThrow(() => (0, domain_1.assertAllowedDuration)(48));
});
(0, node_test_1.default)('assertAllowedDuration rejette valeur non supportée', () => {
    strict_1.default.throws(() => (0, domain_1.assertAllowedDuration)(10), (error) => {
        return error instanceof domain_1.DomainError && error.code === 'ERR_INVALID_DURATION';
    });
});
(0, node_test_1.default)('assertBid valide bid conforme', () => {
    strict_1.default.doesNotThrow(() => (0, domain_1.assertBid)({
        amount: 70000,
        currentPrice: 60000,
        walletBalance: 80000,
        sellerId: 'seller-a',
        bidderId: 'buyer-b',
        auctionStatus: 'active',
        endAtMs: Date.now() + 10000,
        nowMs: Date.now(),
    }));
});
(0, node_test_1.default)('assertBid rejette auto-enchère vendeur', () => {
    strict_1.default.throws(() => (0, domain_1.assertBid)({
        amount: 70000,
        currentPrice: 60000,
        walletBalance: 90000,
        sellerId: 'seller-a',
        bidderId: 'seller-a',
        auctionStatus: 'active',
        endAtMs: Date.now() + 10000,
        nowMs: Date.now(),
    }), (error) => error instanceof domain_1.DomainError && error.code === 'ERR_BIDDER_IS_SELLER');
});
(0, node_test_1.default)('computeCommission calcule correctement', () => {
    strict_1.default.equal((0, domain_1.computeCommission)(10000, 500), 500);
    strict_1.default.equal((0, domain_1.computeCommission)(9999, 500), 499);
});
(0, node_test_1.default)('canOpenDispute autorise blocked/delivered uniquement', () => {
    strict_1.default.equal((0, domain_1.canOpenDispute)('blocked'), true);
    strict_1.default.equal((0, domain_1.canOpenDispute)('delivered'), true);
    strict_1.default.equal((0, domain_1.canOpenDispute)('confirmed'), false);
});
(0, node_test_1.default)('assertCanResolveDispute réservé admin', () => {
    strict_1.default.doesNotThrow(() => (0, domain_1.assertCanResolveDispute)('admin'));
    strict_1.default.throws(() => (0, domain_1.assertCanResolveDispute)('user'));
});
(0, node_test_1.default)('assertCanMarkDelivered autorise uniquement vendeur en statut blocked', () => {
    strict_1.default.doesNotThrow(() => (0, domain_1.assertCanMarkDelivered)('seller-a', 'seller-a', 'blocked'));
    strict_1.default.throws(() => (0, domain_1.assertCanMarkDelivered)('buyer-b', 'seller-a', 'blocked'));
    strict_1.default.throws(() => (0, domain_1.assertCanMarkDelivered)('seller-a', 'seller-a', 'delivered'));
});
(0, node_test_1.default)('minBidIncrement applique les paliers XAF', () => {
    strict_1.default.equal((0, domain_1.minBidIncrement)(5_000), 500);
    strict_1.default.equal((0, domain_1.minBidIncrement)(60_000), 1_000);
    strict_1.default.equal((0, domain_1.minBidIncrement)(200_000), 5_000);
    strict_1.default.equal((0, domain_1.minBidIncrement)(800_000), 10_000);
});
(0, node_test_1.default)("assertBid rejette une enchère sous l'incrément minimum", () => {
    const base = {
        currentPrice: 60_000,
        walletBalance: 500_000,
        sellerId: 'seller-a',
        bidderId: 'buyer-b',
        auctionStatus: 'active',
        endAtMs: Date.now() + 10_000,
        nowMs: Date.now(),
    };
    strict_1.default.throws(() => (0, domain_1.assertBid)({ ...base, amount: 60_500 }), (error) => error instanceof domain_1.DomainError && error.code === 'ERR_BID_TOO_LOW');
    strict_1.default.doesNotThrow(() => (0, domain_1.assertBid)({ ...base, amount: 61_000 }));
});
(0, node_test_1.default)('anti-sniping prolonge de 2 min une enchère posée dans la dernière fenêtre', () => {
    const now = 1_000_000;
    const res = (0, domain_1.computeAntiSnipeEnd)({ endAtMs: now + 30_000, nowMs: now, extensions: 0 });
    strict_1.default.equal(res.extended, true);
    strict_1.default.equal(res.endAtMs, now + 120_000);
    strict_1.default.equal(res.extensions, 1);
});
(0, node_test_1.default)('anti-sniping ne touche pas une enchère posée bien avant la fin', () => {
    const now = 1_000_000;
    const res = (0, domain_1.computeAntiSnipeEnd)({ endAtMs: now + 3_600_000, nowMs: now, extensions: 0 });
    strict_1.default.equal(res.extended, false);
    strict_1.default.equal(res.endAtMs, now + 3_600_000);
});
(0, node_test_1.default)('anti-sniping est plafonné à 10 prolongations', () => {
    const now = 1_000_000;
    const res = (0, domain_1.computeAntiSnipeEnd)({ endAtMs: now + 30_000, nowMs: now, extensions: 10 });
    strict_1.default.equal(res.extended, false);
    strict_1.default.equal(res.endAtMs, now + 30_000);
});
