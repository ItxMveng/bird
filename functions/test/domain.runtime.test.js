const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DomainError,
  assertAllowedDuration,
  assertBid,
  computeCommission,
  canOpenDispute,
  assertCanResolveDispute,
} = require('../src/domain.runtime');

test('allowed durations', () => {
  [6, 12, 24, 48].forEach((d) => assert.doesNotThrow(() => assertAllowedDuration(d)));
  assert.throws(() => assertAllowedDuration(10), (e) => e instanceof DomainError && e.code === 'ERR_INVALID_DURATION');
});

test('bid guards', () => {
  assert.doesNotThrow(() =>
    assertBid({
      amount: 70000,
      currentPrice: 60000,
      walletBalance: 80000,
      sellerId: 's1',
      bidderId: 'b1',
      auctionStatus: 'active',
      endAtMs: Date.now() + 1000,
      nowMs: Date.now(),
    }),
  );
  assert.throws(() =>
    assertBid({
      amount: 70000,
      currentPrice: 60000,
      walletBalance: 80000,
      sellerId: 's1',
      bidderId: 's1',
      auctionStatus: 'active',
      endAtMs: Date.now() + 1000,
      nowMs: Date.now(),
    }),
  );
});

test('commission and dispute guards', () => {
  assert.equal(computeCommission(10000, 500), 500);
  assert.equal(canOpenDispute('blocked'), true);
  assert.equal(canOpenDispute('confirmed'), false);
  assert.doesNotThrow(() => assertCanResolveDispute('admin'));
  assert.throws(() => assertCanResolveDispute('user'));
});
