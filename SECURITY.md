# SECURITY — Bird (baseline Milestone 1)

## Surfaces critiques protégées
- Cloud Functions critiques: `placeBid`, `closeExpiredAuctions`, `confirmSecretCode`, `openDispute`, `resolveDispute`, `paymentWebhook`.
- Mutations financières (`wallets`, `transactions`, `wallet_transactions`, `idempotency`) sont server-only.
- Mutations critiques enchères/bids sont backend-only (via Functions), pas via client Firestore.
- `transaction_secrets` est lisible uniquement par l'acheteur concerné.

## Webhook paiement (durcissement M1)
- Signature HMAC SHA-256 obligatoire sur payload brut (`x-bird-signature`).
- Timestamp obligatoire (`x-bird-timestamp`) avec fenêtre de validité configurable (`PAYMENT_WEBHOOK_TOLERANCE_SEC`, défaut 300s).
- Anti-replay basé sur empreinte `timestamp:signature` stockée en idempotency.
- Requête invalide => rejet explicite (401/409/400), sans fuite d'information sensible.
- Journaux structurés JSON avec `traceId` et `reason`.

## Principes d'autorisation
- `resolveDispute` réservé au rôle admin (`users/{uid}.role == admin`).
- `openDispute`/`confirmSecretCode` vérifient l'appartenance buyer/seller sur la transaction ciblée.
- Les règles Firestore empêchent la lecture litige par des tiers non concernés.
- Le code secret transaction est récupérable uniquement via Cloud Function authentifiée côté buyer.

## Règles de non-mutation côté client
- `wallets`: lecture owner, écriture interdite client.
- `transactions`: lecture parties concernées, écriture interdite client.
- `auctions`: lecture publique, création/update client interdites.
- `bids`: lecture authentifiée, création/update/delete client interdits.
- `disputes`: création/update/delete client interdits; lecture limitée aux parties + admin.
- `transaction_secrets`: lecture buyer uniquement, écriture client interdite.

## Variables d'environnement sécurité
- `SECRET_CODE_SALT` (existant)
- `PAYMENT_WEBHOOK_SECRET` (obligatoire en production)
- `PAYMENT_WEBHOOK_TOLERANCE_SEC` (optionnel)
