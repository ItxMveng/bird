# Bird — Plateforme mobile d'enchères sécurisées avec escrow (XAF)

Bird est un projet **mobile-first** (React Native / Expo) adossé à **Firebase** pour gérer des enchères locales, un wallet interne et un flux transactionnel avec **blocage de fonds (escrow)**, confirmation par code secret et gestion des litiges.

Ce dépôt contient :
- un **frontend mobile V1**,
- des **Cloud Functions Firebase** (logique métier/financière),
- des **règles Firestore**,
- et une documentation produit/architecture/opérations assez complète.

---

## 1) Contexte et objectif produit

Le produit vise des transactions C2C/C2B sur un marché local (villes, catégories, profils), avec un niveau de confiance renforcé par :
- la montée d'enchère,
- un wallet interne,
- un escrow pour sécuriser la livraison,
- un mécanisme de litige administrable,
- une séparation claire entre opérations client et opérations serveur sensibles.

Références conceptuelles : event-flow, schéma Firestore, security model, et spécification domaine V1 dans `docs/architecture/*` et `docs/specs/*`.

---

## 2) Analyse de la structure du dépôt

## Racine

- `mobile/` : application Expo (UI + état applicatif + intégration Firebase/API).
- `functions/` : backend Cloud Functions TypeScript (logique d'enchères, escrow, litiges, recharge).
- `firebase/` : `firestore.rules` + `firestore.indexes.json`.
- `docs/` : specs métier, architecture, setup, roadmap, sécurité & conformité.
- `scripts/firebase-deploy.sh` : déploiement rules/indexes/functions.
- `firebase.json` : configuration Firebase.

## Documentation (`docs/`)

Le dossier est structuré par intention :
- **product/** : modules fonctionnels et périmètre frontend V1.
- **architecture/** : flux d'événements, schéma de données, frontières functions, sécurité, ledger.
- **specs/** : règles métier exécutables (états/transitions/invariants/erreurs).
- **ops/** : sécurité/compliance et KPI de confiance.
- **planning/** : roadmap agile V1.
- **setup/** : onboarding Firebase et checklist production mobile.

---

## 3) Stack technique et outils

## Frontend mobile

- **React Native + Expo SDK 51** (`expo`, `react-native 0.74`, `react 18`).
- **TypeScript**.
- **Firebase Web SDK** (Auth + Firestore).
- Stockage local via **AsyncStorage**.

Scripts principaux :
- `npm run start` (offline),
- `npm run android`, `npm run ios`, `npm run web`.

## Backend

- **Firebase Cloud Functions v2**.
- **TypeScript** compilé vers `functions/lib`.
- **firebase-admin** + **firebase-functions**.
- Tests unitaires domaine via **node:test**.

Scripts principaux :
- `npm run build`,
- `npm run test`,
- `npm run check` (build + test).

## Données et sécurité

- **Cloud Firestore** (collections métier + idempotency + logs/wallet tx).
- **Firestore Security Rules** avec contrôle auth/ownership + champs server-only.
- Indexes Firestore déclarés dans `firebase/firestore.indexes.json`.

---

## 4) Logique métier actuelle (ce qui existe réellement)

## Parcours enchère/escrow (backend)

Fonctions implémentées :
- `publishAuction`: publie une enchère active avec durée autorisée (`6/12/24/48h`).
- `placeBid`: valide enchère/montant/solde/rôles + idempotence + mise à jour `currentPrice`.
- `closeExpiredAuctions` (scheduler): clôture automatique et création de transaction `blocked` si gagnant.
- `markDelivered`: vendeur marque livré (`blocked -> delivered`).
- `confirmSecretCode`: vérifie le hash du code secret puis libère les fonds vendeur (avec commission).
- `openDispute`: ouvre un litige et place transaction en `dispute`.
- `resolveDispute` (admin): arbitre en `refund` ou `pay_seller`.
- `paymentWebhook` (HTTP): recharge wallet idempotente.

## Moteur domaine (pur)

Le module domaine fournit des gardes et calculs testables :
- validation durées,
- validation bid,
- commission,
- contraintes de litiges,
- droits de résolution admin,
- droits de transition livraison.

## Frontend V1

- Auth Email/Password Firebase + création/complétion profil.
- Session locale (AsyncStorage), feedback UX, permissions notifications Android.
- Écrans principaux présents : home, détail enchère, création, wallet, transactions, litige, profil, recherche, messages, notifications, notation, admin.
- Navigation locale (state-based), non basée sur un router dédié.
- Mode hybride : données mock + listeners Firestore (selon `USE_MOCK`).

---

## 5) Méthodologies et principes d'ingénierie observés

- **Architecture orientée domaine**: règles critiques isolées dans `functions/src/domain.ts` et testées séparément.
- **Idempotence** sur événements critiques (`placeBid`, `confirmSecretCode`, `paymentWebhook`).
- **Transactionnalité Firestore** pour mutations financières sensibles (blocage/libération/remboursement).
- **RBAC** documenté (visitor/user/admin/system-function) avec enforcement rules + backend.
- **Approche itérative (Agile V1)** avec découpage par sprints et scope progressif (auth -> enchères -> escrow -> litiges -> hardening).
- **Stratégie dual-mode frontend** (mock offline vs cloud réel) pour accélérer l'itération UI.

---

## 6) État actuel du projet (synthèse objective)

## Maturité

Le projet est en **phase V1 avancée** :
- les briques cœur (enchère + escrow + litige + recharge) existent côté backend,
- la couche mobile couvre la majorité des parcours,
- la documentation est riche,
- mais plusieurs éléments restent à finaliser pour une production robuste.

## Ce qui est prêt

- Contrôles métier principaux backend.
- Règles Firestore de base.
- Tests unitaires domaine.
- Parcours UI larges côté mobile.
- Déploiement Firebase scripté.

## Ce qui reste partiellement implémenté

- Intégration temps réel complète/fiable de tous modules,
- sécurité renforcée webhook,
- observabilité/monitoring,
- durcissement des règles d'accès sur certaines collections,
- expérience de navigation mobile plus structurée.

---

## 7) Cartographie des fichiers clés

## Backend (`functions/`)

- `src/index.ts` : orchestration Cloud Functions, accès Firestore, idempotence, wallet ops.
- `src/domain.ts` : invariants métier et erreurs normalisées.
- `src/domain.runtime.js` : version runtime JS du domaine.
- `test/domain.test.ts` et `test/domain.runtime.test.js` : tests de logique métier.

## Mobile (`mobile/`)

- `App.tsx` : navigation locale et composition providers.
- `src/context/AuthContext.tsx` : authentification, session, profil, permissions.
- `src/context/AppDataContext.tsx` : état métier global, listeners Firestore, mutations locales.
- `src/services/firebase.ts` : initialisation Firebase + flag mock.
- `src/services/api.ts` : appels Cloud Functions + jeu de données mock.
- `src/screens/*` : écrans fonctionnels.

## Firebase / Docs

- `firebase/firestore.rules` : politique d'accès collections.
- `firebase/firestore.indexes.json` : indexes Firestore.
- `docs/**` : référentiel produit/technique/ops.

---

## 8) Limites, écarts et fonctionnalités manquantes

## Écarts fonctionnels

1. **Code secret non exposé aux acteurs métier** : la transaction stocke un hash, mais aucun flux explicite de génération/transmission sécurisée du code en clair n'est implémenté côté produit.
2. **Frontend encore partiellement mocké** : plusieurs modules s'appuient sur des données locales selon le mode, ce qui limite la validation end-to-end.
3. **Navigation mobile V1 simple** : pas encore de stack/router avancé (deep-links, guards structurés, historique).
4. **Pas de suite d'intégration Firebase Emulator** documentée en exécution automatisée.
5. **Notifications push FCM** documentées dans l'architecture mais pas matérialisées par un trigger dédié dans le code functions.

## Risques sécurité / cohérence

1. `disputes` lisible globalement pour tout utilisateur authentifié via rules (potentiel problème de confidentialité).
2. Certains contrôles de conformité (KYC/anti-fraude avancée) sont davantage documentés qu'opérationnels en code.
3. Le webhook paiement est idempotent mais la vérification cryptographique/signature provider n'est pas visible dans cette V1.

## Dette technique

- duplication TS/JS du moteur domaine (`domain.ts` vs `domain.runtime.js`), utile pour runtime/tests mais coûteuse en maintenance.
- coupling élevé UI/state local dans `App.tsx` (navigation maison + nombreux écrans).
- standardisation des logs/audit à renforcer (structure, corrélation, observabilité runtime).

---

## 9) Erreurs potentielles / points de vigilance

- **Course logique possible** : `closeExpiredAuctions` crée une transaction `blocked` puis appelle le blocage wallet ; en cas d'échec wallet après création transaction, un état intermédiaire incohérent est possible sans compensation explicite.
- **Synchronisation état mobile** : en mode non mock, multiples `onSnapshot` peuvent complexifier cohérence locale sans couche de normalisation stricte.
- **Contrats API/Callable** : le client appelle des endpoints HTTP style `/functionName` avec payload `{data}` ; c'est compatible avec wrappers choisis, mais toute migration callable/native devra être homogénéisée.

---

## 10) Exécution locale

## Backend functions

```bash
cd functions
npm install
npm run check
```

## Mobile

```bash
cd mobile
npm install
npm run start
```

## Déploiement Firebase

```bash
export FIREBASE_TOKEN='YOUR_LOGIN_CI_TOKEN'
./scripts/firebase-deploy.sh bird-af69c
```

---

## 11) Plan de renforcement recommandé (priorisé)

1. **Sécurité paiements**: signer/vérifier webhook provider + horodatage + replay-window stricte.
2. **Escrow robuste**: mécanisme de compensation/rollback quand blocage wallet échoue après création transaction.
3. **Rules disputes**: restreindre lecture litiges aux parties concernées + admin.
4. **E2E tests**: ajouter tests intégration Emulator (enchère -> clôture -> escrow -> litige -> résolution).
5. **Observabilité**: traces corrélées (`traceId`), métriques opérationnelles, alerting fraude.
6. **Navigation mobile V2**: migration vers routeur complet et meilleure séparation présentation/domain state.
7. **Consolidation données**: réduire dépendance mock et basculer progressivement vers data réelle partout.

---

## 12) Références internes à consulter

- `docs/specs/domain-auction-escrow-v1.md`
- `docs/architecture/event-flow.md`
- `docs/architecture/firestore-schema-v1.md`
- `docs/architecture/security-model.md`
- `docs/product/frontend-phase-v1.md`
- `docs/setup/mobile-production.md`
- `docs/ops/security-and-compliance-v1.md`

---

## 13) Statut résumé (TL;DR)

Bird dispose d'une base V1 sérieuse (backend métier + app mobile + docs), avec une bonne direction architecture/sécurité/idempotence. Le projet n'est toutefois pas encore à un niveau production strict : il reste des chantiers critiques sur sécurité paiement, robustesse transactionnelle, restrictions d'accès litiges, intégration temps réel complète et tests end-to-end.
