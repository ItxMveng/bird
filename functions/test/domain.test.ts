import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAllowedDuration,
  assertBid,
  assertCanResolveDispute,
  canOpenDispute,
  computeCommission,
  DomainError,
} from '../src/domain';

test('assertAllowedDuration accepte durées V1', () => {
  assert.doesNotThrow(() => assertAllowedDuration(6));
  assert.doesNotThrow(() => assertAllowedDuration(12));
  assert.doesNotThrow(() => assertAllowedDuration(24));
  assert.doesNotThrow(() => assertAllowedDuration(48));
});

test('assertAllowedDuration rejette valeur non supportée', () => {
  assert.throws(() => assertAllowedDuration(10), (error: unknown) => {
    return error instanceof DomainError && error.code === 'ERR_INVALID_DURATION';
  });
});

test('assertBid valide bid conforme', () => {
  assert.doesNotThrow(() =>
    assertBid({
      amount: 70000,
      currentPrice: 60000,
      walletBalance: 80000,
      sellerId: 'seller-a',
      bidderId: 'buyer-b',
      auctionStatus: 'active',
      endAtMs: Date.now() + 10000,
      nowMs: Date.now(),
    }),
  );
});

test('assertBid rejette auto-enchère vendeur', () => {
  assert.throws(
    () =>
      assertBid({
        amount: 70000,
        currentPrice: 60000,
        walletBalance: 90000,
        sellerId: 'seller-a',
        bidderId: 'seller-a',
        auctionStatus: 'active',
        endAtMs: Date.now() + 10000,
        nowMs: Date.now(),
      }),
    (error: unknown) => error instanceof DomainError && error.code === 'ERR_BIDDER_IS_SELLER',
  );
});

test('computeCommission calcule correctement', () => {
  assert.equal(computeCommission(10000, 500), 500);
  assert.equal(computeCommission(9999, 500), 499);
});

test('canOpenDispute autorise blocked/delivered uniquement', () => {
  assert.equal(canOpenDispute('blocked'), true);
  assert.equal(canOpenDispute('delivered'), true);
  assert.equal(canOpenDispute('confirmed'), false);
});

test('assertCanResolveDispute réservé admin', () => {
  assert.doesNotThrow(() => assertCanResolveDispute('admin'));
  assert.throws(() => assertCanResolveDispute('user'));
});
