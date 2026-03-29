# ARCHITECTURE — finalisation user/admin (2026-03-29)

## 1) Backend unique partagé (Firebase Functions)
- Le backend métier reste unique pour user + admin.
- Cycle escrow conservé: `bid -> close -> block -> deliver -> confirm -> release`.
- Opérations critiques/financières uniquement côté Functions.

### Endpoints user principaux
- `publishAuction`, `placeBid`, `markDelivered`, `confirmSecretCode`, `openDispute`, `topUpWallet`, `getTransactionSecretCode`.

### Endpoints admin principaux
- `resolveDispute` (existant, admin only)
- `adminOverview`
- `adminListDisputes`
- `adminListAuctions`
- `adminListUsers`
- `adminSetUserStatus`

## 2) Mobile USER app
- Aucune surface admin exposée.
- Navigation user structurée via `mobile/src/navigation/router.ts`.
- Actions critiques via `mobile/src/services/api.ts` (pas de logique financière client).
- Mock non prioritaire limité; chemin réel privilégié.

## 3) Dashboard WEB ADMIN (indépendant)
- Nouveau frontend séparé: `admin-web/`.
- Auth admin Firebase obligatoire.
- Vue KPI + listes litiges/enchères/users via endpoints admin backend.
- Séparation stricte vis-à-vis de l’app mobile user.

## 4) Firestore / RBAC
- Écritures client interdites sur collections sensibles (`wallets`, `transactions`, `bids`, `auctions`, `disputes`, `transaction_secrets`).
- Lecture disputes limitée aux parties concernées + admin.
- Actions admin validées côté backend (`ensureAdmin`).
