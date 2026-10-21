#!/usr/bin/env python3
"""Découpe un fichier monolithique (test.html) en page + CSS + fichiers JS par rubrique.

Usage : python3 outils/decouper.py test.html test
Produit : test.html (page légère) et le dossier test/ (style.css + js/*.js).
Utilisé une seule fois pour le passage au découpage ; conservé pour mémoire.
"""
import hashlib, os, re, sys

src, dossier = sys.argv[1], sys.argv[2]
L = open(src, encoding="utf-8").read().split("\n")

def ligne(n):  # numéros de ligne 1-based
    return L[n - 1]

# Bornes vérifiées : <style> 16..613, <script> principal 709..10838
STYLE_DEB, STYLE_FIN = 16, 613
JS_DEB, JS_FIN = 709, 10838
assert ligne(STYLE_DEB) == "<style>" and ligne(STYLE_FIN) == "</style>"
assert ligne(JS_DEB) == "<script>" and ligne(JS_FIN) == "</script>"

# (première ligne, nom) — chaque coupure tombe sur un commentaire de section au niveau racine
PARTIES = [
    (710, "01-base"),                        # helpers, rôles, données, thème, test, sauvegardes, navigation, modales
    (1850, "02-clients"),                    # liste clients, kanban, glisser-déposer
    (2224, "03-agenda"),                     # agenda, équipe, itinéraire, synchro téléphone
    (2595, "04-stock-fournisseurs"),         # stock, BC et factures fournisseurs, catégories
    (3350, "05-factures-banque-caisse"),     # liste factures, banque Qonto, caisse, rapprochement, administration
    (4223, "06-paiements-relances"),         # paiements, RelancesCore + SigMail (copiés dans shared.js), niveaux de relance
    (4791, "07-tableau-de-bord-factures"),   # transmissions, tableau de bord modulable, édition des factures
    (5327, "08-pdf-prospects"),              # génération PDF factures/devis, pipeline prospects
    (5679, "09-devis-catalogue"),            # devis, sélecteur produits, catalogue, fiche produit
    (6267, "10-commandes-clients"),          # bons de commande clients et leurs règlements
    (6629, "11-signature-envoi"),            # signature en ligne, validation sans signature, envoi par e-mail
    (7227, "12-statistiques"),               # pilotage, graphiques, objectifs
    (7653, "13-grand-livre"),                # grand livre client
    (7872, "14-metiers"),                    # profils métier et vocabulaire (FICHE_DEF / FICHE_METIER)
    (8178, "15-parc-interventions"),         # parc installé, rapports d'intervention, photos, signature tactile
    (8737, "16-remise-fiche-client"),        # dossier de remise, fiche client
    (9084, "17-contrats"),                   # devis signés, contrats de maintenance, reconduction, PDF/Word
    (9973, "18-pages-reglages-demarrage"),   # renderPage, panneaux, utilisateurs, réglages, démarrage (bootApp)
]

os.makedirs(os.path.join(dossier, "js"), exist_ok=True)

def ecrire(chemin, texte):
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(texte)
    return hashlib.sha1(texte.encode("utf-8")).hexdigest()[:8]

css = "\n".join(L[STYLE_DEB:STYLE_FIN - 1]) + "\n"
v_css = ecrire(os.path.join(dossier, "style.css"), css)

balises = []
bornes = [p[0] for p in PARTIES] + [JS_FIN]
for (deb, nom), fin in zip(PARTIES, bornes[1:]):
    code = "\n".join(L[deb - 1:fin - 1]) + "\n"
    v = ecrire(os.path.join(dossier, "js", nom + ".js"), code)
    balises.append(f'<script src="{dossier}/js/{nom}.js?v={v}"></script>')

page = (
    L[:STYLE_DEB - 1]
    + [f'<link rel="stylesheet" href="{dossier}/style.css?v={v_css}"/>']
    + L[STYLE_FIN:JS_DEB - 1]
    + balises
    + L[JS_FIN:]
)
open(src, "w", encoding="utf-8").write("\n".join(page))
print("OK :", len(PARTIES), "fichiers JS,", sum(1 for _ in page), "lignes dans", src)
