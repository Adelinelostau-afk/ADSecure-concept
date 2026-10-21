#!/usr/bin/env python3
"""Vérifie la syntaxe de tout le code d'une page (fichiers JS séparés + scripts restés dans la page).

Usage : python3 outils/verifier.py test.html
Chaque fichier doit se lire seul : une erreur indique le fichier fautif.
"""
import re, subprocess, sys, tempfile

page = sys.argv[1]
html = open(page, encoding="utf-8").read()
fichiers = re.findall(r'<script src="((?:test|app)/[^"?]+)', html)
inline = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)

def lire(code, nom):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
        t.write(code)
    r = subprocess.run(["node", "-e", 'new Function(require("fs").readFileSync(process.argv[1],"utf8"))', t.name],
                       capture_output=True, text=True)
    if r.returncode:
        print("ERREUR", nom, r.stderr.strip().splitlines()[-1][:200])
        return False
    return True

ok = all([lire(open(f, encoding="utf-8").read(), f) for f in fichiers] +
         [lire(c, f"{page} (script {i})") for i, c in enumerate(inline)])
print(f"{len(fichiers)} fichiers + {len(inline)} script(s) dans la page :", "syntaxe OK" if ok else "ÉCHEC")
sys.exit(0 if ok else 1)
