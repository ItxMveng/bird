# Ledger & Escrow

## Mouvements standards

- `recharge`: +`balance`
- `block`: -`balance`, +`blocked`
- `release`: -`blocked` acheteur / +`balance` vendeur
- `commission`: -`balance` vendeur (ou retenue sur release)
- `refund`: -`blocked` acheteur / +`balance` acheteur

## Idempotence

Chaque commande critique porte un `idempotencyKey` unique:
- `placeBid`
- `paymentWebhook`
- `confirmSecretCode`

Un registre empêche le retraitement d'une même clé.

## Cohérence comptable

- Invariant wallet : `balance >= 0`, `blocked >= 0`
- Toute transaction financière doit avoir:
  - une ligne `wallet_transactions`
  - un `traceId`
  - un lien vers objet métier (`auctionId`, `transactionId`, etc.)

## Checklist anti double-débit

1. Transaction Firestore atomique pour modification wallet + transaction métier.
2. Vérification statut non-final avant mutation.
3. Rejeu d'événement sans effet (idempotent).
