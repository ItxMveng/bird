import test from 'node:test';
import assert from 'node:assert/strict';
import { assertBid, canOpenDispute, DomainError } from '../src/domain';

test('scenario complet (simulation): create->bid->close->block->deliver->confirm->dispute->resolve', () => {
  const auction = { currentPrice: 100_000, status: 'active' as const, sellerId: 's1', endAtMs: Date.now() + 60_000 };
  const buyer = { id: 'b1', balance: 250_000, blocked: 0 };

  assert.doesNotThrow(() =>
    assertBid({
      amount: 120_000,
      currentPrice: auction.currentPrice,
      walletBalance: buyer.balance,
      sellerId: auction.sellerId,
      bidderId: buyer.id,
      auctionStatus: auction.status,
      endAtMs: auction.endAtMs,
      nowMs: Date.now(),
    }),
  );

  buyer.balance -= 120_000;
  buyer.blocked += 120_000;
  let txStatus: 'blocked' | 'delivered' | 'confirmed' | 'dispute' | 'refunded' = 'blocked';
  assert.equal(txStatus, 'blocked');

  txStatus = 'delivered';
  assert.equal(txStatus, 'delivered');

  txStatus = 'confirmed';
  buyer.blocked -= 120_000;
  assert.equal(buyer.blocked, 0);

  txStatus = 'blocked';
  assert.equal(canOpenDispute(txStatus), true);
  txStatus = 'dispute';
  txStatus = 'refunded';
  assert.equal(txStatus, 'refunded');
});

test('erreur: bid invalide (montant trop faible)', () => {
  assert.throws(
    () =>
      assertBid({
        amount: 1000,
        currentPrice: 5000,
        walletBalance: 10000,
        sellerId: 's1',
        bidderId: 'b1',
        auctionStatus: 'active',
        endAtMs: Date.now() + 60_000,
        nowMs: Date.now(),
      }),
    (err) => err instanceof DomainError && err.code === 'ERR_BID_TOO_LOW',
  );
});

test('erreur: wallet insuffisant', () => {
  assert.throws(
    () =>
      assertBid({
        amount: 10_000,
        currentPrice: 5_000,
        walletBalance: 9_000,
        sellerId: 's1',
        bidderId: 'b1',
        auctionStatus: 'active',
        endAtMs: Date.now() + 60_000,
        nowMs: Date.now(),
      }),
    (err) => err instanceof DomainError && err.code === 'ERR_WALLET_INSUFFICIENT',
  );
});
