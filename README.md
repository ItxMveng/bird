# Bird - Plateforme d'enchères sécurisées (Cameroun)

Implémentation initiale du socle V1 pour une application mobile d'enchères sécurisées avec wallet interne, escrow et gestion des litiges.

## Structure

- `docs/`: spécifications métier, architecture, roadmap.
- `firebase/`: règles Firestore et indexes.
- `functions/`: Cloud Functions TypeScript (squelette opérationnel orienté domaine).

## Prochaines étapes

1. Brancher Firebase project (`dev/staging/prod`).
2. Connecter Expo mobile + panel admin.
3. Intégrer passerelle de paiement (CinetPay/Dohone) via webhook sécurisé.
4. Ajouter tests d'intégration avec Firebase Emulator Suite.
