#!/usr/bin/env python3
"""Mise en production : recopie la version de test dans la vraie appli.

Usage : python3 outils/publier.py
- test/  → app/   (le dossier app/ est remplacé entièrement)
- test.html → app.html (les chemins test/… deviennent app/…)
À lancer uniquement après le « valide » d'Adeline (voir CLAUDE.md).
"""
import os, re, shutil, subprocess

racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(racine)

if os.path.isdir("app"):
    shutil.rmtree("app")
shutil.copytree("test", "app")

html = open("test.html", encoding="utf-8").read()
html = re.sub(r'(src|href)="test/', r'\1="app/', html)
open("app.html", "w", encoding="utf-8").write(html)

subprocess.run(["python3", "outils/versions.py", "app.html"], check=True)
print("app.html et app/ = version de test")
