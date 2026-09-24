import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAllowedDuration,
  assertBid,
  assertCanMarkDelivered,
  assertCanResolveDispute,
  canOpenDispute,
  computeAntiSnipeEnd,
  computeCommission,
  DomainError,
  minBidIncrement,
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

test('assertCanMarkDelivered autorise uniquement vendeur en statut blocked', () => {
  assert.doesNotThrow(() => assertCanMarkDelivered('seller-a', 'seller-a', 'blocked'));
  assert.throws(() => assertCanMarkDelivered('buyer-b', 'seller-a', 'blocked'));
  assert.throws(() => assertCanMarkDelivered('seller-a', 'seller-a', 'delivered'));
});

test('minBidIncrement applique les paliers XAF', () => {
  assert.equal(minBidIncrement(5_000), 500);
  assert.equal(minBidIncrement(60_000), 1_000);
  assert.equal(minBidIncrement(200_000), 5_000);
  assert.equal(minBidIncrement(800_000), 10_000);
});

test("assertBid rejette une enchère sous l'incrément minimum", () => {
  const base = {
    currentPrice: 60_000,
    walletBalance: 500_000,
    sellerId: 'seller-a',
    bidderId: 'buyer-b',
    auctionStatus: 'active' as const,
    endAtMs: Date.now() + 10_000,
    nowMs: Date.now(),
  };
  assert.throws(
    () => assertBid({ ...base, amount: 60_500 }),
    (error: unknown) => error instanceof DomainError && error.code === 'ERR_BID_TOO_LOW',
  );
  assert.doesNotThrow(() => assertBid({ ...base, amount: 61_000 }));
});

test('anti-sniping prolonge de 2 min une enchère posée dans la dernière fenêtre', () => {
  const now = 1_000_000;
  const res = computeAntiSnipeEnd({ endAtMs: now + 30_000, nowMs: now, extensions: 0 });
  assert.equal(res.extended, true);
  assert.equal(res.endAtMs, now + 120_000);
  assert.equal(res.extensions, 1);
});

test('anti-sniping ne touche pas une enchère posée bien avant la fin', () => {
  const now = 1_000_000;
  const res = computeAntiSnipeEnd({ endAtMs: now + 3_600_000, nowMs: now, extensions: 0 });
  assert.equal(res.extended, false);
  assert.equal(res.endAtMs, now + 3_600_000);
});

test('anti-sniping est plafonné à 10 prolongations', () => {
  const now = 1_000_000;
  const res = computeAntiSnipeEnd({ endAtMs: now + 30_000, nowMs: now, extensions: 10 });
  assert.equal(res.extended, false);
  assert.equal(res.endAtMs, now + 30_000);
});
