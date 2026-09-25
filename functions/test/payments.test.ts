import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPaymentAmount, handleFlutterwaveWebhook, paymentsEnabled, safeEqual } from '../src/payments';

test('safeEqual compare en temps constant et refuse les vides', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('', ''), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});

test('assertPaymentAmount borne le montant', () => {
  assert.doesNotThrow(() => assertPaymentAmount(1000));
  assert.throws(() => assertPaymentAmount(100));
  assert.throws(() => assertPaymentAmount(600000));
  assert.throws(() => assertPaymentAmount(1000.5));
  assert.throws(() => assertPaymentAmount('1000'));
});

test('sans configuration, le paiement est désactivé et le webhook refuse', async () => {
  delete process.env.FLW_SECRET_KEY;
  delete process.env.FLW_WEBHOOK_HASH;
  assert.equal(paymentsEnabled(), false);
  const r = await handleFlutterwaveWebhook({}, {});
  assert.equal(r.status, 503);
});

test('webhook : signature invalide refusée', async () => {
  process.env.FLW_SECRET_KEY = 'sk_test';
  process.env.FLW_WEBHOOK_HASH = 'secret-hash';
  const r = await handleFlutterwaveWebhook({ 'verif-hash': 'mauvais' }, { data: { tx_ref: 'x', id: 1, status: 'successful' } });
  assert.equal(r.status, 401);
});

test('webhook : événement non abouti ignoré sans appel réseau', async () => {
  process.env.FLW_SECRET_KEY = 'sk_test';
  process.env.FLW_WEBHOOK_HASH = 'secret-hash';
  const r = await handleFlutterwaveWebhook({ 'verif-hash': 'secret-hash' }, { data: { tx_ref: 'x', id: 1, status: 'failed' } });
  assert.equal(r.status, 200);
  assert.equal((r.body as { ignored?: string }).ignored, 'not_successful');
});
