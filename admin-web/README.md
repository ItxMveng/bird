# Bird Admin Web

Dashboard admin web indépendant de l'app mobile user.

## Démarrage local
Servir le dossier en statique (exemples):

```bash
cd admin-web
python3 -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Variables runtime (optionnel)
Définir avant chargement page:
- `window.BIRD_API_BASE_URL`
- `window.BIRD_FIREBASE_API_KEY`
- `window.BIRD_FIREBASE_AUTH_DOMAIN`
- `window.BIRD_FIREBASE_PROJECT_ID`
- `window.BIRD_FIREBASE_APP_ID`

## Endpoints requis
- `adminOverview`
- `adminListDisputes`
- `adminListAuctions`
- `adminListUsers`
- `adminSetUserStatus` (backend prêt, UI action à étendre)
