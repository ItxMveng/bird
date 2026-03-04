# Event Flow V1

1. `publishAuction` -> validation vendeur -> `auctions.status=active`.
2. `placeBid` -> vérification statut enchère + montant + solde wallet -> création `bids` -> mise à jour `currentPrice`.
3. `closeExpiredAuctions` (scheduler) -> détecte enchères expirées.
   - sans bid: `closed_unsold`
   - avec bid: `closed_sold` + `createBlockedTransaction`
4. `createBlockedTransaction` -> débit balance acheteur, crédit blocked, création transaction `blocked`.
5. `markDelivered` -> `transactions.status=delivered`.
6. `confirmSecretCode` -> hash match -> payout vendeur + commission + `confirmed`.
7. `openDispute` -> `transactions.status=dispute` + `disputes.open`.
8. `resolveDispute` (admin) -> `refund` ou `pay_seller`.
9. `paymentWebhook` -> recharge wallet idempotente (`wallet_transactions.recharge`).
