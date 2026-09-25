# Déploiement gratuit de Bird (sans plan Blaze)

Les Cloud Functions Firebase exigent le plan Blaze (carte bancaire). Pour rester gratuit, la même logique métier
(`functions/src/index.ts`) tourne derrière une petite passerelle HTTP sur Vercel (`functions/api/`), et le reste
utilise le plan Spark de Firebase.

| Élément | Où | Coût |
|---|---|---|
| Authentification email/mot de passe, Firestore + règles | Firebase (Spark) | gratuit |
| Application web (Expo export) | Firebase Hosting → https://bird-af69c.web.app | gratuit |
| API (`/placeBid`, `/publishAuction`, …) | Vercel, dossier `functions/` | gratuit |
| Clôture des enchères échues | GitHub Actions toutes les 5 min → `/cron` | gratuit |

## Variables d'environnement de l'API (Vercel)

| Variable | Rôle |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON complet d'une clé de compte de service (console Firebase → Paramètres → Comptes de service → Générer une clé) |
| `SECRET_CODE_SALT` | sel du hachage du code secret (chaîne aléatoire longue) |
| `DEMO_MODE` | `1` pour autoriser la recharge de démonstration (500 000 XAF max par recharge, solde plafonné à 2 000 000 XAF). Sans elle, la recharge n'est possible que par le webhook de paiement signé |
| `PAYMENT_WEBHOOK_SECRET` | secret HMAC du webhook de paiement (non exposé par la passerelle actuelle) |
| `CRON_SECRET` | (facultatif) protège `/cron` ; à répéter dans le secret GitHub `CRON_SECRET` |
| `ALLOWED_ORIGINS` | origines web supplémentaires autorisées (CORS), séparées par des virgules |

## Étapes

1. Vercel → Add New Project → dépôt `ItxMveng/bird`, **Root Directory : `functions`**, Framework : Other, Build Command vide.
2. Renseigner les variables ci-dessus. Vérifier `https://<projet>.vercel.app/health` → `{"ok":true}`.
3. GitHub → Settings → Secrets and variables → Actions : variable `BIRD_API_URL` (URL Vercel), secret `CRON_SECRET` si utilisé.
4. Construire le web avec `EXPO_PUBLIC_API_BASE_URL=<URL Vercel>` puis `firebase deploy --only hosting,firestore`.

## Limites assumées

- Le webhook de paiement (`paymentWebhook`) n'est pas exposé par la passerelle : pas de recharge réelle Mobile Money tant qu'un fournisseur n'est pas branché.
- La recharge de démonstration crédite des fonds fictifs : à désactiver (`DEMO_MODE` absent) avant tout usage avec de l'argent réel.


## Paiements réels (Flutterwave — Mobile Money et carte, XAF)

La recharge du portefeuille passe par une page de paiement Flutterwave ; le solde n'est crédité que par le webhook,
après une re-vérification de la transaction auprès de Flutterwave (idempotent par référence de paiement).

Variables Vercel de l'API :

| Variable | Valeur |
|---|---|
| `FLW_SECRET_KEY` | clé secrète Flutterwave (Settings → API) |
| `FLW_WEBHOOK_HASH` | « Secret hash » saisi dans Settings → Webhooks |
| `APP_URL` | `https://bird-af69c.web.app` (adresse de retour après paiement) |
| `DEMO_MODE` | **à supprimer** en production : sinon n'importe quel utilisateur pourrait se créditer des fonds fictifs |

Webhook à déclarer dans Flutterwave : `https://<api>/flutterwave-webhook` (événement « charge.completed »).
Tant que `FLW_SECRET_KEY` et `FLW_WEBHOOK_HASH` ne sont pas définies, la recharge affiche « Le paiement en ligne n'est pas encore activé ».
