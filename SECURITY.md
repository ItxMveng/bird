# SECURITY — Bird final

## Principes non négociables
- Aucune logique financière côté client.
- Toute mutation critique passe par Cloud Functions.
- Vérification stricte des rôles (admin/user) côté backend.
- Séparation stricte app user vs dashboard admin.

## Webhook paiement
- Signature HMAC obligatoire (`PAYMENT_WEBHOOK_SECRET`).
- Timestamp signé + fenêtre de tolérance (`PAYMENT_WEBHOOK_TOLERANCE_SEC`).
- Anti-replay par idempotency signature.
- Rejets explicites + logs structurés.

## RBAC / accès
- `resolveDispute` et endpoints `admin*` protégés par contrôle admin backend.
- `transaction_secrets` lisible buyer-only.
- Litiges visibles uniquement parties concernées + admin.

## Surfaces client verrouillées
- App mobile user: pas de route admin, pas d’écran admin, pas d’actions admin.
- Writes client interdits sur `wallets`, `transactions`, `bids`, `auctions`, `disputes`, `transaction_secrets`.

## Observabilité
- Logs JSON avec `traceId` sur bids, close/block escrow, confirmations, litiges, topups, webhooks, actions admin.

## Variables d’environnement critiques
- `SECRET_CODE_SALT`
- `PAYMENT_WEBHOOK_SECRET`
- `PAYMENT_WEBHOOK_TOLERANCE_SEC`
