"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const fns = __importStar(require("../src/index"));
const CALLABLES = [
    'publishAuction',
    'placeBid',
    'markDelivered',
    'confirmSecretCode',
    'openDispute',
    'resolveDispute',
    'topUpWallet',
    'getTransactionSecretCode',
];
const DEFAULT_ORIGINS = ['https://bird-af69c.web.app', 'https://bird-af69c.firebaseapp.com', 'http://localhost:8081', 'http://localhost:19006'];
function allowedOrigins() {
    const extra = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    return [...DEFAULT_ORIGINS, ...extra];
}
function applyCors(req, res) {
    const origin = req.headers.origin;
    if (origin && allowedOrigins().includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
}
// Balayage opportuniste : le cron GitHub Actions est bridé (quelques passages par jour) ; toute activité
// sur l'API clôture aussi les enchères échues, au plus une fois par minute et par instance.
let lastSweep = 0;
async function sweepExpired() {
    if (Date.now() - lastSweep < 60_000)
        return;
    lastSweep = Date.now();
    try {
        await fns.closeExpiredAuctions.run({});
    }
    catch (e) {
        console.error(JSON.stringify({ event: 'sweep_error', message: e.message }));
    }
}
async function handler(req, res) {
    applyCors(req, res);
    if (req.method === 'OPTIONS')
        return res.status(204).end();
    const name = String(req.query.fn ?? '');
    if (name === 'health')
        return res.status(200).json({ ok: true, service: 'bird-api', commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7) });
    if (!CALLABLES.includes(name))
        return res.status(404).json({ error: { message: 'Fonction inconnue', status: 'NOT_FOUND' } });
    if (req.method !== 'POST')
        return res.status(405).json({ error: { message: 'POST requis', status: 'METHOD_NOT_ALLOWED' } });
    const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    let auth;
    if (token) {
        try {
            const decoded = await admin.auth().verifyIdToken(token);
            auth = { uid: decoded.uid, token: decoded };
        }
        catch {
            return res.status(401).json({ error: { message: 'Session expirée, reconnectez-vous', status: 'UNAUTHENTICATED' } });
        }
    }
    await sweepExpired();
    try {
        const fn = fns[name];
        const result = await fn.run({ data: req.body?.data ?? {}, auth, rawRequest: req, acceptsStreaming: false });
        return res.status(200).json({ result });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError) {
            return res.status(e.httpErrorCode.status).json({ error: { message: e.message, status: e.code } });
        }
        console.error(JSON.stringify({ event: 'api_error', fn: name, message: e.message }));
        return res.status(500).json({ error: { message: 'Erreur interne', status: 'INTERNAL' } });
    }
}
