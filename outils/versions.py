#!/usr/bin/env python3
"""Met à jour les numéros de version (?v=…) des fichiers CSS/JS chargés par une page.

Usage : python3 outils/versions.py test.html
À lancer après chaque modification d'un fichier de test/ : le navigateur (iPad compris)
recharge alors la nouvelle version au lieu de garder l'ancienne en cache.
"""
import hashlib, re, sys

page = sys.argv[1]
html = open(page, encoding="utf-8").read()

def maj(m):
    attr, chemin = m.group(1), m.group(2)
    v = hashlib.sha1(open(chemin, "rb").read()).hexdigest()[:8]
    return f'{attr}="{chemin}?v={v}"'

nouveau = re.sub(r'(src|href)="((?:test|app)/[^"?]+)(?:\?v=[0-9a-f]+)?"', maj, html)
open(page, "w", encoding="utf-8").write(nouveau)
print("Versions à jour dans", page)
