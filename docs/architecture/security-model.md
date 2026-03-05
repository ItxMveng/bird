# Security model (RBAC)

## Matrice simplifiée

- **visitor**: lecture enchères publiques uniquement.
- **user/pro**: lecture/écriture sur `profiles/{uid}`, création enchère, place bid, ouvre litige, lecture wallet personnel.
- **admin**: accès global lecture/écriture modération, litiges, supervision.
- **system-function**: seule entité autorisée à modifier soldes et statuts financiers.

## Principes

1. Vérification `request.auth.uid` systématique.
2. Vérification rôle `users/{uid}.role` côté rules + backend.
3. Champs financiers non éditables côté client.
4. Logs d'audit de toutes opérations critiques.
