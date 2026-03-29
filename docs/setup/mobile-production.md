# Mobile production readiness checklist

## 1. Variables d'environnement Expo

Copier `mobile/.env.example` vers `.env` puis compléter toutes les clés Firebase.

## 2. Auth OTP réel

- `EXPO_PUBLIC_USE_MOCK=0`
- `AuthContext` utilise `signInWithPhoneNumber` (Firebase Auth) et vérification OTP.
- Session utilisateur persistée sur device via `AsyncStorage` (`bird.session.v1`).

## 3. Données temps réel Firestore

`AppDataContext` écoute en `onSnapshot`:
- `auctions` actives
- `wallet` utilisateur
- `transactions` de l'utilisateur

## 4. Appels backend sécurisés

Le client envoie automatiquement le token Firebase ID dans l'en-tête `Authorization` pour les endpoints cloud functions.

## 5. Bascules

- Mode mock (`EXPO_PUBLIC_USE_MOCK=1`) pour démo offline.
- Mode production (`EXPO_PUBLIC_USE_MOCK=0`) pour environnement réel.
