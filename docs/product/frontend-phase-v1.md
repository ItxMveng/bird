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
10. Recherche avancée (`SearchScreen`)
11. Notifications (`NotificationsScreen`)
12. Messagerie (`MessagesScreen`, `ConversationScreen`)
13. Notation (`RatingsScreen`)
14. Abonnement PRO (`ProSubscriptionScreen`)
15. Dashboard admin litiges (`AdminDashboardScreen`)

## Intégration backend

Le frontend consomme les Cloud Functions via `mobile/src/services/api.ts`:
- `publishAuction`
- `placeBid`
- `markDelivered`
- `confirmSecretCode`
- `openDispute`
- `resolveDispute`

Variable d'environnement:
- `EXPO_PUBLIC_API_BASE_URL` (par défaut: `https://us-central1-bird-af69c.cloudfunctions.net`)

## Parcours couverts dans cette phase

- Acheteur : authentification, recherche, enchère, suivi transaction, confirmation code, litige.
- Vendeur : publication enchère, suivi transaction, marquage livré.
- Utilisateur PRO : page d'upsell abonnement.
- Admin : résolution de litiges (UI connectée à `resolveDispute`).

## Limitations de cette phase

- Auth OTP encore simulée localement (pas de binding Firebase Auth réel).
- Données liste/wallet/transactions/messages/notifications majoritairement en mode mock local pour accélérer l'itération UI.
- Navigation locale simple (state-based), migration vers router/navigation complet prévue en V2.


## États/session/auth

- Gestion d'état d'auth multi-étapes: téléphone -> OTP -> profil -> session authentifiée (`AuthContext`).
- Session UI persistée en mémoire applicative et gating des routes tant que l'étape n'est pas `authenticated`.
- État métier partagé (enchères, wallet, transactions, notifications, messages, litiges, ratings) via `AppDataContext`.
- Parcours inscription/connexion complet en UI (OTP démo `000000`).
