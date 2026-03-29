# ARCHITECTURE — final product polish (2026-03-29)

## Backend unique partagé (Firebase Functions)
- Le backend métier reste unique (user + admin) avec RBAC strict.
- Cycle escrow: `bid -> close -> block -> deliver -> confirm -> release`.
- Endpoints user: `publishAuction`, `placeBid`, `markDelivered`, `confirmSecretCode`, `openDispute`, `topUpWallet`, `getTransactionSecretCode`.
- Endpoints admin: `resolveDispute`, `adminOverview`, `adminListDisputes`, `adminListAuctions`, `adminListUsers`, `adminSetUserStatus`.

## App mobile USER
- Surface admin supprimée.
- Navigation user via router interne (`mobile/src/navigation/router.ts`).
- Actions critiques via API Functions (pas de mutation financière cliente).
- UX: empty states/feedbacks renforcés sur écrans clés.

## Dashboard WEB ADMIN (indépendant)
- Frontend séparé: `admin-web/`.
- Auth Firebase obligatoire.
- Modules V2:
  - KPI overview
  - Litiges (recherche + actions refund/pay_seller)
  - Enchères (recherche)
  - Utilisateurs (recherche + suspend/reactivate)

## Données / sécurité
- Writes client interdits sur collections sensibles.
- Litiges visibles parties concernées + admin.
- `transaction_secrets` lisible buyer-only.
- Logs structurés avec `traceId` sur opérations critiques.
