import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAllowedDuration, assertBid, DomainError } from '../src/domain';

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

test('assertBid valide bid strictement supérieur et solde suffisant', () => {
  assert.doesNotThrow(() => assertBid(70000, 60000, 80000));
  assert.throws(() => assertBid(60000, 60000, 80000));
  assert.throws(() => assertBid(70000, 60000, 65000));
});
