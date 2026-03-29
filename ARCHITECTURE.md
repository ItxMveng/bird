# ARCHITECTURE — état réel (2026-03-29)

## Backend (Cloud Functions)
- `publishAuction`: publication enchère active.
- `placeBid`: validation invariants + idempotency bid.
- `closeExpiredAuctions`: clôture automatique + création transaction escrow + blocage wallet dans la même transaction Firestore.
- `markDelivered`: transition `blocked -> delivered` (seller).
- `confirmSecretCode`: validation hash + expiration + release seller.
- Settlement seller (`confirm` / `pay_seller`) atomique sur wallets + statut transaction.
- `openDispute` / `resolveDispute`: cycle litige sécurisé.
- `paymentWebhook`: signature/timestamp/anti-replay/idempotence.
- `topUpWallet`: recharge wallet idempotente callable.
- `getTransactionSecretCode`: récupération code secret buyer-only.

## Firestore
- Client read-only sur `auctions`.
- Client interdit en write sur `bids`, `auctions`, `transactions`, `wallets`, `disputes`, `transaction_secrets`.
- `disputes` read: buyer/seller/admin uniquement.
- `transaction_secrets` read: buyer uniquement.

## Mobile
- Les actions critiques passent via `mobile/src/services/api.ts` vers Cloud Functions.
- Les listeners temps réel restent côté Firestore pour lecture/synchronisation.
- Navigation structurée via `mobile/src/navigation/router.ts` (socle router interne sans dépendance externe).

## Invariants clés
- Pas de blocage fonds au bid.
- Blocage à la clôture uniquement.
- Pas de mutation financière sensible côté client.
- Idempotence sur bid/confirm/webhook/topup.

## Tests
- Domaine: unit tests + tests de flux (`functions/test/flow.test.ts`).
