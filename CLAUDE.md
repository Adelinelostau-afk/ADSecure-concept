# AD Management — règles de travail

## Version de test obligatoire
- `app.html` = version en production (utilisée par Adeline et Daniel). `test.html` = version de test.
- Les deux fichiers ont le même code. Le mode test s'active tout seul quand la page s'appelle `test*.html` (constante `AD_TEST`).
- Toute modification se fait d'abord dans `test.html`. Elle n'est recopiée dans `app.html` (`cp test.html app.html`) qu'après validation explicite d'Adeline.
- En mode test : données dans la table `app_data_test` (copie, bouton « Repartir des vraies données »), clé locale séparée, pas de sauvegardes, pas de relances clients, pas de lien de signature, pas de gestion des utilisateurs, e-mails redirigés vers l'utilisateur connecté.
- Toute nouvelle fonction qui écrit dans une table partagée ou qui contacte un client doit être neutralisée en mode test (`testBloque(...)`).

## Historique des mises en production
- 09/10/2026 : app.html = test.html (profils métier, inscription/connexion, devis sans signature + bouton unique BC, dossier de remise par e-mail, correctifs PDF/Apparence, factures fournisseurs reçues dans Administration avec fichier joint + catégorie, rapprochement bancaire fournisseurs). Contrats et dossiers de remise AD Secure vérifiés identiques (rendu comparé).
- La liste `FOURNISSEURS` est désormais enregistrée avec les données (avant : jamais sauvegardée, reconstituée au chargement depuis COMMANDES/FACFOURN).
- Inscription publique pas encore ouverte : noindex d'inscription.html et bouton « Essai gratuit » de logiciel.html laissés en l'état (CGV/médiateur et passage Supabase Pro à faire d'abord).

## Supabase
- Projet « AD Secure » (`tcszogqlvqpxrtdirkto`, région UE). Isolation entre entreprises par RLS + trigger `profiles_guard` (pas d'auto-promotion, pas de changement de tenant).
- Le rôle `anon` n'a aucun droit sur les tables ; les pages publiques passent par des fonctions Edge.

## Profils métier
- Registre `METIERS` dans l'appli (sécurité, électricité, plomberie/CVC, bâtiment, services, générique). `TH.metier` = profil choisi ; `TH.metierPerso` = listes personnalisées par l'abonné ; `MP()` = profil effectif ; `appliquerMetier()` recalcule `PARC_TYPES`, `PARC_ICON`, `PARC_CAT_TYPE`, `RI_CHECK` et écrit `TH.systemeLibelle` / `TH.accesMateriel` (lus par les relances).
- AD Secure est forcé sur `securite` (ADS_TH). Ses contrats et dossiers de remise doivent rester identiques au mot près : vérifier par comparaison avant toute mise en production.
- Ajouter un métier = ajouter un objet dans `METIERS` + son id dans `METIER_ORDRE`.
- À faire : la fonction Edge `relances-auto` (shared.js) contient encore « système de vidéosurveillance » et « l'accès au matériel (enregistreur, caméras) » en dur ; les remplacer par `TH.systemeLibelle || …` et `TH.accesMateriel || …` avant le premier abonné d'un autre métier.

## Inscription et connexion
- `inscription.html` (publique, noindex tant que non validée) appelle la fonction Edge `inscription` (verify_jwt false) : crée tenant (statut `essai`, `essai_fin` = +14 j, `metier`, `plan` 1-3/4-7/8+), `app_data` initial, profil admin, envoie l'invitation (redirection app.html ou test.html si `?test`) et prévient contact@. Anti-abus : champ piège + 5 inscriptions/IP/jour (`inscriptions_log`).
- Connexion : « Mot de passe oublié », écran de choix du mot de passe à l'arrivée d'un lien invite/recovery (`AUTH_LIEN`), blocage à la fin de l'essai (`essai_fin` dépassée).
- Après validation : promouvoir test.html → app.html, retirer le noindex d'inscription.html et ajouter le bouton « Essai gratuit » sur logiciel.html.
