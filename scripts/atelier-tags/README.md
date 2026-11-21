# Atelier des tags

Outil de conception des tags des mercenaires (Idan, 2026-11-20 et 21 ; doc 20, §11). C'est une page web autonome, publiée
comme artefact claude.ai privé d'Idan ; ses données (tags, tests, constantes) vivent dans la base de l'artefact. Ce
dossier garde de quoi la reconstruire et une copie des données.

- `atelier.src.html` : la page (catalogue des tags à plusieurs parents, tests rangés en arbre, constantes, essai sur une
  recrue). Les calculs utilisent un petit langage sûr (aucun code exécuté) : variables du profil, constantes, `et`, `ou`,
  `non`, comparaisons, `+ - * /`, `contient`, `max`, `min`, `abs`, `arrondi`, `nombre`, `somme`.
- `profils.js` : tire des recrues avec le vrai générateur du jeu (`game-core`) et les aplatit en variables.
  `node scripts/atelier-tags/profils.js [nombre]` écrit `profils.json` ici (non versionné, tirage fixe).
- `construit.js` : `node scripts/atelier-tags/construit.js <page.html>` assemble la page et les profils en un seul fichier.
- `donnees/` : les copies datées des données de l'atelier (export de la base de l'artefact).
