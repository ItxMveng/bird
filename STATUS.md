# STATUS — Bird final (user/admin)

Date: 2026-03-29

## Finalisé côté USER mobile
- Surface admin retirée de l’app user (route/bouton/import/screen).
- Navigation user centralisée via router interne.
- Flux critiques user via backend Functions uniquement.
- Initial state orienté réel (mock réduit au mode explicite).

## Créé côté ADMIN web
- Nouveau dashboard web indépendant (`admin-web/`).
- Auth Firebase + chargement dashboard via endpoints admin.
- Modules disponibles (MVP):
  - overview KPI
  - litiges
  - enchères
  - utilisateurs

## Backend admin complémentaire
- Endpoints ajoutés: `adminOverview`, `adminListDisputes`, `adminListAuctions`, `adminListUsers`, `adminSetUserStatus`.
- Vérification admin stricte centralisée (`ensureAdmin`).

## Qualité / tests
- Build + tests functions passent.
- Typecheck mobile passe.
- Test de flux domaine ajouté.
- E2E Emulator complet reste à compléter (multi-acteurs + cas fraude avancés).
