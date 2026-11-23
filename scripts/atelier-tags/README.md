# Atelier des tags

Outil de conception des tags des mercenaires (Idan, 2026-11-20 à 22 ; doc 20, §11 et §12). C'est une page web autonome,
en deux versions : l'artefact claude.ai privé d'Idan (ses données vivent dans la base de l'artefact), et la page du
Design Lab, `design/atelier/` (ses données sont sur Hostinger, `media/atelier/`, lues aussi par le jeu ; docs/DEPLOYMENT.md).
La copie des données du dépôt : `data/reference/tag-workshop.json`.

- `atelier.src.html` : la page (catalogue des tags à plusieurs parents, tests rangés en arbre, constantes, essai sur une
  recrue). Le langage des calculs, l'arbre et les tags affichés sont ceux du moteur des tags du jeu
  (`game-core/tag-engine.js`, le même que le jeu) : un petit langage sûr (aucun code exécuté) : variables du profil,
  constantes, `et`, `ou`, `non`, comparaisons, `+ - * /`, `contient`, `max`, `min`, `abs`, `arrondi`, `nombre`, `somme`.
- `profils.js` : tire des recrues avec le vrai générateur du jeu (`game-core`) et les aplatit en variables.
  `node scripts/atelier-tags/profils.js [nombre]` écrit `profils.json` ici (non versionné, tirage fixe).
- `construit.js` : `node scripts/atelier-tags/construit.js <page.html> [--site]` assemble la page, le moteur et les
  profils en un seul fichier (sans option : l'artefact ; `--site` : le Design Lab, fait par `scripts/build-site.sh`).
