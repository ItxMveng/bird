"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const payments_1 = require("../src/payments");
(0, node_test_1.default)('safeEqual compare en temps constant et refuse les vides', () => {
    strict_1.default.equal((0, payments_1.safeEqual)('abc', 'abc'), true);
    strict_1.default.equal((0, payments_1.safeEqual)('abc', 'abd'), false);
    strict_1.default.equal((0, payments_1.safeEqual)('', ''), false);
    strict_1.default.equal((0, payments_1.safeEqual)('abc', 'abcd'), false);
});
(0, node_test_1.default)('assertPaymentAmount borne le montant', () => {
    strict_1.default.doesNotThrow(() => (0, payments_1.assertPaymentAmount)(1000));
    strict_1.default.throws(() => (0, payments_1.assertPaymentAmount)(100));
    strict_1.default.throws(() => (0, payments_1.assertPaymentAmount)(600000));
    strict_1.default.throws(() => (0, payments_1.assertPaymentAmount)(1000.5));
    strict_1.default.throws(() => (0, payments_1.assertPaymentAmount)('1000'));
});
(0, node_test_1.default)('sans configuration, le paiement est désactivé et le webhook refuse', async () => {
    delete process.env.FLW_SECRET_KEY;
    delete process.env.FLW_WEBHOOK_HASH;
    strict_1.default.equal((0, payments_1.paymentsEnabled)(), false);
    const r = await (0, payments_1.handleFlutterwaveWebhook)({}, {});
    strict_1.default.equal(r.status, 503);
});
(0, node_test_1.default)('webhook : signature invalide refusée', async () => {
    process.env.FLW_SECRET_KEY = 'sk_test';
    process.env.FLW_WEBHOOK_HASH = 'secret-hash';
    const r = await (0, payments_1.handleFlutterwaveWebhook)({ 'verif-hash': 'mauvais' }, { data: { tx_ref: 'x', id: 1, status: 'successful' } });
    strict_1.default.equal(r.status, 401);
});
(0, node_test_1.default)('webhook : événement non abouti ignoré sans appel réseau', async () => {
    process.env.FLW_SECRET_KEY = 'sk_test';
    process.env.FLW_WEBHOOK_HASH = 'secret-hash';
    const r = await (0, payments_1.handleFlutterwaveWebhook)({ 'verif-hash': 'secret-hash' }, { data: { tx_ref: 'x', id: 1, status: 'failed' } });
    strict_1.default.equal(r.status, 200);
    strict_1.default.equal(r.body.ignored, 'not_successful');
});
