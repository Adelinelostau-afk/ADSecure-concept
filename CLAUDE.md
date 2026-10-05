# AD Management — règles de travail

## Version de test obligatoire
- `app.html` = version en production (utilisée par Adeline et Daniel). `test.html` = version de test.
- Les deux fichiers ont le même code. Le mode test s'active tout seul quand la page s'appelle `test*.html` (constante `AD_TEST`).
- Toute modification se fait d'abord dans `test.html`. Elle n'est recopiée dans `app.html` (`cp test.html app.html`) qu'après validation explicite d'Adeline.
- En mode test : données dans la table `app_data_test` (copie, bouton « Repartir des vraies données »), clé locale séparée, pas de sauvegardes, pas de relances clients, pas de lien de signature, pas de gestion des utilisateurs, e-mails redirigés vers l'utilisateur connecté.
- Toute nouvelle fonction qui écrit dans une table partagée ou qui contacte un client doit être neutralisée en mode test (`testBloque(...)`).

## Supabase
- Projet « AD Secure » (`tcszogqlvqpxrtdirkto`, région UE). Isolation entre entreprises par RLS + trigger `profiles_guard` (pas d'auto-promotion, pas de changement de tenant).
- Le rôle `anon` n'a aucun droit sur les tables ; les pages publiques passent par des fonctions Edge.
