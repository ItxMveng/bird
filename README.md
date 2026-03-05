# Bird — Plateforme d'enchères sécurisées (Cameroun)

Backend V1 orienté Firebase pour une application mobile d'enchères avec wallet interne, escrow et litiges.

## Ce qui est implémenté

- Spécifications et architecture produit/technique dans `docs/`.
- Règles Firestore de base avec contraintes de sécurité.
- Index Firestore pour requêtes clés.
- Cloud Functions TypeScript :
  - `publishAuction`
  - `placeBid`
  - `closeExpiredAuctions` (scheduler)
  - `confirmSecretCode`
  - `openDispute`
  - `resolveDispute`
  - `paymentWebhook` (HTTP)
- Moteur domaine (validations bid/durée, commission, contrôle litige/role).

## Structure

- `docs/` : specs métier, architecture, ops, roadmap.
- `firebase/` : règles et indexes Firestore.
- `functions/` : code Cloud Functions + tests unitaires domaine.
- `mobile/` : application Expo (phase frontend V1).

## Lancer en local (quand accès npm disponible)

```bash
cd functions
npm install
npm run check
```


## Firebase projet

Le projet Firebase est préconfiguré sur `bird-af69c` via `.firebaserc` et `firebase.json`.
Le script `scripts/firebase-deploy.sh` permet de déployer rules/indexes/functions avec `FIREBASE_TOKEN`.

## Étapes suivantes

1. Brancher Firebase Emulator Suite pour tests d'intégration.
2. Connecter l'application Expo et le panel admin.
3. Sécuriser la signature webhook passerelle de paiement.
4. Ajouter observabilité (alerting fraude + métriques SLA litige).


## Lancer le frontend mobile

```bash
cd mobile
npm install
npm run start
```


- Auth/session frontend V1: flux téléphone -> OTP -> profil avec état d'application partagé pour les parcours principaux.


Voir aussi: `docs/setup/mobile-production.md` pour le passage en mode production mobile (OTP réel + session persistée + temps réel Firestore).
