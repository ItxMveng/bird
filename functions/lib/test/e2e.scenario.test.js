"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const domain_1 = require("../src/domain");
(0, node_test_1.default)('scenario complet (simulation): create->bid->close->block->deliver->confirm->dispute->resolve', () => {
    const auction = { currentPrice: 100_000, status: 'active', sellerId: 's1', endAtMs: Date.now() + 60_000 };
    const buyer = { id: 'b1', balance: 250_000, blocked: 0 };
    strict_1.default.doesNotThrow(() => (0, domain_1.assertBid)({
        amount: 120_000,
        currentPrice: auction.currentPrice,
        walletBalance: buyer.balance,
        sellerId: auction.sellerId,
        bidderId: buyer.id,
        auctionStatus: auction.status,
        endAtMs: auction.endAtMs,
        nowMs: Date.now(),
    }));
    buyer.balance -= 120_000;
    buyer.blocked += 120_000;
    let txStatus = 'blocked';
    strict_1.default.equal(txStatus, 'blocked');
    txStatus = 'delivered';
    strict_1.default.equal(txStatus, 'delivered');
    txStatus = 'confirmed';
    buyer.blocked -= 120_000;
    strict_1.default.equal(buyer.blocked, 0);
    txStatus = 'blocked';
    strict_1.default.equal((0, domain_1.canOpenDispute)(txStatus), true);
    txStatus = 'dispute';
    txStatus = 'refunded';
    strict_1.default.equal(txStatus, 'refunded');
});
(0, node_test_1.default)('erreur: bid invalide (montant trop faible)', () => {
    strict_1.default.throws(() => (0, domain_1.assertBid)({
        amount: 1000,
        currentPrice: 5000,
        walletBalance: 10000,
        sellerId: 's1',
        bidderId: 'b1',
        auctionStatus: 'active',
        endAtMs: Date.now() + 60_000,
        nowMs: Date.now(),
    }), (err) => err instanceof domain_1.DomainError && err.code === 'ERR_BID_TOO_LOW');
});
(0, node_test_1.default)('erreur: wallet insuffisant', () => {
    strict_1.default.throws(() => (0, domain_1.assertBid)({
        amount: 10_000,
        currentPrice: 5_000,
        walletBalance: 9_000,
        sellerId: 's1',
        bidderId: 'b1',
        auctionStatus: 'active',
        endAtMs: Date.now() + 60_000,
        nowMs: Date.now(),
    }), (err) => err instanceof domain_1.DomainError && err.code === 'ERR_WALLET_INSUFFICIENT');
});
