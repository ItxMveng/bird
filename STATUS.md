# STATUS — Bird

Date: 2026-03-29

## Milestone 2 — Escrow & transactions
- ✅ Blocage déplacé dans la transaction de clôture (atomicité auction + wallet + transaction + wallet_tx).
- ✅ Suppression de la création locale de transaction `blocked` au moment du bid côté mobile.

## Milestone 3 — Code secret complet
- ✅ Génération backend du code en clair à la clôture.
- ✅ Hash conservé dans `transactions.secretCodeHash`.
- ✅ Stockage du code en clair dans `transaction_secrets/{transactionId}` (lecture buyer uniquement) + expiration.
- ✅ Endpoint `getTransactionSecretCode` pour récupération sécurisée côté buyer.

## Milestone 4 — Disputes robustes
- ✅ Litiges privés via rules (buyer/seller/admin uniquement).
- ✅ Création litige client direct interdite, backend-only.

## Milestone 5 — Wallet + webhook robuste
- ✅ Signature HMAC, timestamp window, anti-replay, idempotence providerReference.
- ✅ `topUpWallet` callable ajouté (idempotent) pour éviter mutation wallet client direct.

## Milestone 6 — Firestore Rules avancées
- ✅ Mutations financières server-only maintenues.
- ✅ Bids et auctions verrouillés côté client.
- ✅ `transaction_secrets` ajouté avec ACL buyer-only.

## Milestone 7 — Mobile temps réel
- ✅ Flux critiques (bid, delivery, confirm, dispute, resolve, topup) passent par API Functions.
- ✅ Suppression des écritures Firestore client sur `bids`, `auctions`, `transactions`, `disputes`, `wallets` pour flux critiques.

## Milestone 8 — Navigation V2
- ⚠️ Non finalisé dans ce lot (inchangé pour éviter refactor massif hors sécurité/fiabilité).

## Milestone 9 — Observabilité
- ✅ Logs structurés `paymentWebhook` avec `traceId` et raisons de rejet.

## Milestone 10 — Tests E2E Emulator
- ⚠️ Non implémenté dans ce lot (préparation backend/mobile faite).

## Milestone 11 — Suppression mock critique
- ✅ Flux critiques basculés backend réel.
- ⚠️ Mock résiduel encore présent sur modules non critiques/messages/données de démo.

## Milestone 12 — Hardening production
- ⚠️ Partiel: documentation sécurité/plan/statut mise à jour.
- ⚠️ Reste à finaliser: architecture doc exhaustive, E2E, optimisation coûts et runbooks.
