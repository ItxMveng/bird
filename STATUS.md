# STATUS — Bird (final polish)

Date: 2026-03-29

## UX user finalisée (ciblée)
- Empty states ajoutés: home, wallet, messages, notifications.
- Feedback litige simplifié et cohérent (plus de double appel API).
- Surface admin confirmée absente côté app user.

## Dashboard admin web V2
- Recherche locale par onglet.
- Actions inline: resolve dispute (refund/pay_seller), suspension/réactivation user.
- Feedback global loading/succès/erreur + états vides tableaux.
- Auth admin requise (échec propre si non-admin).

## Tests
- `functions`: tests unit/domain + flow tests + scénario e2e simulé.
- `mobile`: typecheck OK.

## Ready for production
- Docs mises à jour: architecture, sécurité, plan, statut, README admin-web.
- Checklist production finale ajoutée dans `SECURITY.md`.

## Reste éventuel
- E2E Firebase Emulator multi-acteurs réels (setup complet emulators + data fixtures).
