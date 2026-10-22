# AD Management — règles de travail

## Version de test obligatoire
- `app.html` = version en production (utilisée par Adeline et Daniel). `test.html` = version de test.
- Les deux ont le même code. Le mode test s'active tout seul quand la page s'appelle `test*.html` (constante `AD_TEST`).
- Toute modification se fait d'abord dans la version de test (`test.html` + dossier `test/`). Elle n'est recopiée en production qu'après validation explicite d'Adeline, avec `python3 outils/publier.py` (test/ → app/, test.html → app.html).

## Organisation du code (découpé le 21/10/2026)
- La page (`test.html`) ne contient que le HTML et le petit script du bandeau test. Le style est dans `test/style.css`, le code dans `test/js/NN-rubrique.js`, chargés dans l'ordre des numéros (scripts classiques, portée globale partagée : comme l'ancien script unique).
- Fichiers : 01-base (helpers, rôles, données, thème, mode test, sauvegardes, navigation, modales), 02-clients, 03-agenda, 04-stock-fournisseurs, 05-factures-banque-caisse, 06-paiements-relances (`SigMail` + `RelancesCore`), 07-tableau-de-bord-factures (tableau de bord + édition factures), 08-pdf-prospects, 09-devis-catalogue, 10-commandes-clients, 11-signature-envoi, 12-statistiques, 13-grand-livre, 14-metiers, 15-parc-interventions, 16-remise-fiche-client, 17-contrats, 18-pages-reglages-demarrage (renderPage, panneaux, utilisateurs, `bootApp()` en dernier).
- Règle : le code exécuté au chargement d'un fichier ne doit utiliser que ce qui est défini dans ce fichier ou un fichier précédent (le reste ne sert qu'après `bootApp()`). Un nouveau fichier = l'ajouter dans la page à sa place.
- Après chaque modification : `python3 outils/verifier.py test.html` (syntaxe de chaque fichier) puis `python3 outils/versions.py test.html` (met à jour les `?v=` pour que l'iPad ne garde pas l'ancien fichier en cache).
- Découpage vérifié : code recollé identique octet pour octet, mêmes 1 850 noms globaux, 12 pages + 12 panneaux + contrat/courrier/dossier de remise rendus à l'identique.
- En mode test : données dans la table `app_data_test` (copie, bouton « Repartir des vraies données »), clé locale séparée, pas de sauvegardes, pas de relances clients, pas de lien de signature, pas de gestion des utilisateurs, e-mails redirigés vers l'utilisateur connecté.
- Toute nouvelle fonction qui écrit dans une table partagée ou qui contacte un client doit être neutralisée en mode test (`testBloque(...)`).

## Historique des mises en production
- 09/10/2026 : app.html = test.html (profils métier, inscription/connexion, devis sans signature + bouton unique BC, dossier de remise par e-mail, correctifs PDF/Apparence, factures fournisseurs reçues dans Administration avec fichier joint + catégorie, rapprochement bancaire fournisseurs). Contrats et dossiers de remise AD Secure vérifiés identiques (rendu comparé).
- 10/10/2026 : isolation des données entre entreprises sur un même appareil (copie locale par tenant `cleLocale()`, `viderDonnees()` avant tout chargement, `CLOUD_OK` bloque l'envoi tant que les données du tenant connecté n'ont pas été lues). Ne jamais réintroduire de cache commun à tous les comptes.
- 21/10/2026 : correctif centimes seul reporté dans app.html (fMoney à 2 décimales, TTC des factures au centime, step="any" sur les champs décimaux). Le nouvel agenda reste en test, en attente de validation.
- 21/10/2026 : app.html = test.html (nouvel agenda jour/semaine/mois/liste + équipe, vocabulaire par métier `FICHE_DEF`/`FICHE_METIER`). Contrat, courrier de reconduction et dossier de remise AD Secure comparés au rendu : identiques. `RelancesCore` de app.html = shared.js déployé.
- La liste `FOURNISSEURS` est désormais enregistrée avec les données (avant : jamais sauvegardée, reconstituée au chargement depuis COMMANDES/FACFOURN).
- Inscription publique pas encore ouverte : noindex d'inscription.html et bouton « Essai gratuit » de logiciel.html laissés en l'état (CGV/médiateur et passage Supabase Pro à faire d'abord).

## Supabase
- Projet « AD Secure » (`tcszogqlvqpxrtdirkto`, région UE). Isolation entre entreprises par RLS + trigger `profiles_guard` (pas d'auto-promotion, pas de changement de tenant).
- Le rôle `anon` n'a aucun droit sur les tables ; les pages publiques passent par des fonctions Edge.

## Profils métier
- Registre `METIERS` dans l'appli (sécurité, électricité, plomberie/CVC, bâtiment, services, générique). `TH.metier` = profil choisi ; `TH.metierPerso` = listes personnalisées par l'abonné ; `MP()` = profil effectif ; `appliquerMetier()` recalcule `PARC_TYPES`, `PARC_ICON`, `PARC_CAT_TYPE`, `RI_CHECK` et écrit `TH.systemeLibelle` / `TH.accesMateriel` (lus par les relances).
- AD Secure est forcé sur `securite` (ADS_TH). Ses contrats et dossiers de remise doivent rester identiques au mot près : vérifier par comparaison avant toute mise en production.
- Ajouter un métier = ajouter un objet dans `METIERS` + son id dans `METIER_ORDRE`.
- Vocabulaire par métier : `FICHE_DEF` (valeurs AD Secure, ne pas modifier) + `FICHE_METIER` (surcharges), lu avec `FV(clé)`. `appliquerMetier()` écrit aussi dans TH les libellés lus par les relances (`contratLibelle`, `visiteLibelle`, `contratPrestation`, `contratClauseVisites`, `equipeLibelle`, `visitePrev`) et remplace les catégories du catalogue sécurité par celles du métier.
- Fonction Edge `relances-auto` : code versionné dans `supabase/functions/relances-auto/`. `shared.js` = copie exacte de `SigMail` + `RelancesCore` de `test/js/06-paiements-relances.js` (préfixe `export`). index.ts l'importe via jsDelivr figé sur un commit : après toute modification de `RelancesCore`, régénérer shared.js, committer, puis redéployer index.ts avec le nouveau hash.

## Pipeline et statistiques
- Prospect : `{id:"p"+uid(),name,company,email,phone,amount,temp,stage,date(relance),notes,creeLe,etapeLe,clientId?}`. Tout changement d'étape passe par `pipeChangerEtape()` ; passage en « gagné » → proposition de créer la fiche client (`pipeCreerClient`, lien `clientId` / `prospectId`). Textes saisis toujours échappés (`pipeEsc`).
- Statistiques : CA facturé, clients, marge en HT ; encaissements et graphique mensuel en TTC. Aucun objectif inventé : `getObjectif()` = 0 tant qu'Adeline n'en a pas saisi (bouton « Définir mes objectifs »).

## Agenda
- Événement : `{id,type,titre,client,clientId,adresse,date,heure,fin,assignes:[userId],notes}` (+ `contratId`, `visiteNum`, `riId` pour les visites). `evFin(e)` = fin ou début + 1 h (anciens événements).
- Équipe : `TH.equipe` [{id,nom,couleur}] recopiée depuis `profiles` par un admin à la connexion (`syncEquipe`) — les utilisateurs simples ne peuvent pas lire `profiles` (RLS).
- Synchro téléphone : `TH.icsTokens` {jeton48hex: {uid,nom,portee:"moi"|"tous"}} ; fonction Edge `agenda-ics` (verify_jwt false, code dans `supabase/functions/agenda-ics/`), `&test=1` lit app_data_test. Fuseau : `TH.fuseau` (défaut America/Martinique).

## Inscription et connexion
- `inscription.html` (publique, noindex tant que non validée) appelle la fonction Edge `inscription` (verify_jwt false) : crée tenant (statut `essai`, `essai_fin` = +14 j, `metier`, `plan` 1-3/4-7/8+), `app_data` initial, profil admin, envoie l'invitation (redirection app.html ou test.html si `?test`) et prévient contact@. Anti-abus : champ piège + 5 inscriptions/IP/jour (`inscriptions_log`).
- Connexion : « Mot de passe oublié », écran de choix du mot de passe à l'arrivée d'un lien invite/recovery (`AUTH_LIEN`), blocage à la fin de l'essai (`essai_fin` dépassée).
- Après validation : promouvoir test.html → app.html, retirer le noindex d'inscription.html et ajouter le bouton « Essai gratuit » sur logiciel.html.
