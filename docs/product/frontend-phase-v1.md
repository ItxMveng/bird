# Frontend phase V1 (Expo mobile)

## Ce qui est livré

Un socle mobile Expo est ajouté dans `mobile/` avec les écrans principaux du parcours utilisateur:

1. Connexion OTP simulée (`LoginScreen`)
2. Liste d'enchères (`HomeScreen`)
3. Détail enchère + placement d'enchère (`AuctionDetailScreen`)
4. Création d'enchère (`CreateAuctionScreen`)
5. Wallet (`WalletScreen`)
6. Liste transactions (`TransactionsScreen`)
7. Détail transaction (`TransactionDetailScreen`)
8. Ouverture litige (`DisputeScreen`)
9. Profil (`ProfileScreen`)

## Intégration backend

Le frontend consomme les Cloud Functions via `mobile/src/services/api.ts`:
- `publishAuction`
- `placeBid`
- `markDelivered`
- `confirmSecretCode`
- `openDispute`

Variable d'environnement:
- `EXPO_PUBLIC_API_BASE_URL` (par défaut: `https://us-central1-bird-af69c.cloudfunctions.net`)

## Limitations de cette phase

- Auth OTP encore simulée localement (pas de binding Firebase Auth réel).
- Données liste/wallet/transactions en mode mock local pour accélérer l'itération UI.
- Navigation locale simple (state-based), migration vers router/navigation complet prévue en V2.
