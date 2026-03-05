# Spécification exécutable — Domaine Enchères & Escrow (V1)

## 1) États et transitions

### 1.1 Enchères (`auctions`)

| État source | Événement | Acteur | Préconditions | État cible | Effets |
|---|---|---|---|---|---|
| `draft` | `publishAuction` | vendeur | compte actif, profil complété, limite non atteinte (ou PRO) | `active` | fixe `startAt`, `endAt`, journalise |
| `active` | `autoCloseWithoutBids` | system | `now >= endAt`, 0 bid valide | `closed_unsold` | aucune transaction créée |
| `active` | `autoCloseWithWinner` | system | `now >= endAt`, >= 1 bid valide | `closed_sold` | crée `transactions` en `blocked` |
| `draft` | `cancelAuction` | vendeur | aucune enchère | `cancelled` | journalise motif |

Règle stricte : le vendeur ne peut pas clôturer manuellement une enchère active.

### 1.2 Transactions (`transactions`)

| État source | Événement | Acteur | Préconditions | État cible | Effets |
|---|---|---|---|---|---|
| N/A | `createBlockedTransaction` | system | enchère `closed_sold`, winner valide, solde acheteur suffisant | `blocked` | débit wallet dispo + crédit wallet bloqué |
| `blocked` | `markDelivered` | vendeur | transaction existante, pas de litige | `delivered` | horodate livraison |
| `blocked` / `delivered` | `confirmSecretCode` | acheteur/vendeur via preuve code | hash code valide, non expiré | `confirmed` | libère fonds vendeur, applique commission |
| `blocked` / `delivered` | `openDispute` | acheteur/vendeur | délai livraison dépassé ou incident déclaré | `dispute` | gèle fonds, crée dossier litige |
| `dispute` | `resolveRefund` | admin | litige `open`, décision remboursement | `refunded` | débloque et recrédite acheteur |
| `dispute` | `resolvePaySeller` | admin | litige `open`, décision paiement | `confirmed` | libère fonds vendeur + commission |

## 2) Invariants domaine

1. Aucune opération financière critique n'est autorisée côté client.
2. Un bid est irrétractable après validation.
3. Les fonds ne sont bloqués qu'à la clôture (`closed_sold`) pour le meilleur enchérisseur.
4. Toute mutation financière crée une ligne `wallet_transactions`.
5. Le `secretCode` est stocké uniquement hashé.

## 3) Paramètres V1

- Durées autorisées enchère : `6h`, `12h`, `24h`, `48h`.
- `deliveryMaxDays`: `5` (plage admise 3-7).
- `disputeOpenAfterDays`: `deliveryMaxDays`.
- `secretCodeTTLHours`: `168` (7 jours).

## 4) Erreurs métier normalisées

- `ERR_AUCTION_EXPIRED`
- `ERR_AUCTION_NOT_ACTIVE`
- `ERR_BID_TOO_LOW`
- `ERR_BIDDER_IS_SELLER`
- `ERR_WALLET_INSUFFICIENT`
- `ERR_DUPLICATE_IDEMPOTENCY_KEY`
- `ERR_TRANSACTION_NOT_BLOCKED`
- `ERR_INVALID_SECRET_CODE`
- `ERR_DISPUTE_NOT_ALLOWED`
- `ERR_FORBIDDEN_ROLE`

## 5) Cas limites obligatoires

1. **Égalité d'enchère**: refusée (strictement supérieure au `currentPrice`).
2. **Double soumission bid**: dédupliquée via `idempotencyKey`.
3. **Webhook paiement tardif**: accepté seulement si statut pas final.
4. **Utilisateur suspendu**: blocage création enchère/bid/recharge.
5. **Course de clôture**: une seule transaction créée via lock transactionnel.
