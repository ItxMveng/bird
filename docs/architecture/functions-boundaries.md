# Cloud Functions boundaries

- `placeBid` (callable): valide entrée + crée bid + met à jour enchère.
- `closeExpiredAuctions` (scheduler): clôture automatique et détermination du gagnant.
- `createBlockedTransaction` (internal): orchestre wallet lock et transaction blocked.
- `confirmSecretCode` (callable): compare hash secret et libère fonds.
- `openDispute` (callable): ouvre litige et gèle transaction.
- `resolveDispute` (callable admin): résolution finale (refund/pay_seller).
- `paymentWebhook` (http): callback CinetPay/Dohone, idempotence forte.
- `notifyUsers` (trigger): push FCM sur événements majeurs.
