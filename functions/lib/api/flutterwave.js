"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
require("../src/index"); // initialise firebase-admin
const payments_1 = require("../src/payments");
/** Webhook Flutterwave : URL à renseigner dans le tableau de bord → https://<api>/flutterwave-webhook */
async function handler(req, res) {
    if (req.method !== 'POST')
        return res.status(405).json({ ok: false });
    try {
        const result = await (0, payments_1.handleFlutterwaveWebhook)(req.headers, req.body);
        return res.status(result.status).json(result.body);
    }
    catch (e) {
        console.error(JSON.stringify({ event: 'flw_webhook_error', message: e.message }));
        return res.status(500).json({ ok: false });
    }
}
