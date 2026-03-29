import test from 'node:test';
import assert from 'node:assert/strict';
import { assertBid, canOpenDispute, computeCommission } from '../src/domain';

test('flow domain: bid -> close -> deliver -> confirm payout math', () => {
  const start = 100_000;
  const bid = 150_000;
  const buyerBalanceBefore = 300_000;
  const buyerBlockedBefore = 0;
  const sellerBalanceBefore = 10_000;

  assert.doesNotThrow(() =>
    assertBid({
      amount: bid,
      currentPrice: start,
      walletBalance: buyerBalanceBefore,
      sellerId: 'seller-1',
      bidderId: 'buyer-1',
      auctionStatus: 'active',
      endAtMs: Date.now() + 60_000,
      nowMs: Date.now(),
    }),
  );

  const buyerBalanceAfterBlock = buyerBalanceBefore - bid;
  const buyerBlockedAfterBlock = buyerBlockedBefore + bid;
  assert.equal(buyerBalanceAfterBlock, 150_000);
  assert.equal(buyerBlockedAfterBlock, 150_000);

  const commission = computeCommission(bid, 500);
  const sellerNet = bid - commission;

  const buyerBlockedAfterConfirm = buyerBlockedAfterBlock - bid;
  const sellerBalanceAfterConfirm = sellerBalanceBefore + sellerNet;

  assert.equal(commission, 7_500);
  assert.equal(sellerNet, 142_500);
  assert.equal(buyerBlockedAfterConfirm, 0);
  assert.equal(sellerBalanceAfterConfirm, 152_500);
});

test('flow domain: dispute can open only before final states', () => {
  assert.equal(canOpenDispute('blocked'), true);
  assert.equal(canOpenDispute('delivered'), true);
  assert.equal(canOpenDispute('confirmed'), false);
  assert.equal(canOpenDispute('refunded'), false);
});
