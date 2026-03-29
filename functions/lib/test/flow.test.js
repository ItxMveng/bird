"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const domain_1 = require("../src/domain");
(0, node_test_1.default)('flow domain: bid -> close -> deliver -> confirm payout math', () => {
    const start = 100_000;
    const bid = 150_000;
    const buyerBalanceBefore = 300_000;
    const buyerBlockedBefore = 0;
    const sellerBalanceBefore = 10_000;
    strict_1.default.doesNotThrow(() => (0, domain_1.assertBid)({
        amount: bid,
        currentPrice: start,
        walletBalance: buyerBalanceBefore,
        sellerId: 'seller-1',
        bidderId: 'buyer-1',
        auctionStatus: 'active',
        endAtMs: Date.now() + 60_000,
        nowMs: Date.now(),
    }));
    const buyerBalanceAfterBlock = buyerBalanceBefore - bid;
    const buyerBlockedAfterBlock = buyerBlockedBefore + bid;
    strict_1.default.equal(buyerBalanceAfterBlock, 150_000);
    strict_1.default.equal(buyerBlockedAfterBlock, 150_000);
    const commission = (0, domain_1.computeCommission)(bid, 500);
    const sellerNet = bid - commission;
    const buyerBlockedAfterConfirm = buyerBlockedAfterBlock - bid;
    const sellerBalanceAfterConfirm = sellerBalanceBefore + sellerNet;
    strict_1.default.equal(commission, 7_500);
    strict_1.default.equal(sellerNet, 142_500);
    strict_1.default.equal(buyerBlockedAfterConfirm, 0);
    strict_1.default.equal(sellerBalanceAfterConfirm, 152_500);
});
(0, node_test_1.default)('flow domain: dispute can open only before final states', () => {
    strict_1.default.equal((0, domain_1.canOpenDispute)('blocked'), true);
    strict_1.default.equal((0, domain_1.canOpenDispute)('delivered'), true);
    strict_1.default.equal((0, domain_1.canOpenDispute)('confirmed'), false);
    strict_1.default.equal((0, domain_1.canOpenDispute)('refunded'), false);
});
