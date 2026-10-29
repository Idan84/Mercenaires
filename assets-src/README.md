# Sources graphiques et audio

Dépôt des fichiers **bruts** (masters) d'Idan et de Jean-Mimi. Ce dossier n'est **pas mis en ligne** : JC3 en tire des versions optimisées pour le jeu dans `prototype-web/assets/`.

| Dossier | Contenu |
|---|---|
| `fonds/` | Fonds d'écran : château du camp (menu principal et home du camp), autres décors. `fonds/Dortoirs/` : un fond par niveau de qualité du dortoir (Jean-Mimi, `dortoir-0.jpg` à `dortoir-10.jpg`) ; `scripts/build-dormitory.sh` régénère les versions du jeu (`prototype-web/assets/dormitory/`) |
| `logo/` | Logo Blood & Wages : master sur fond blanc, variantes |
| `avatars/` | Vocabulaire des mots-clés Bridge des avatars (`avatars/mots-cles-bridge.txt`). **Les avatars eux-mêmes sont sur Hostinger, dans `media/avatars/`** (voir `docs/DEPLOYMENT.md`) : depuis le 2026-10-21, c'est leur seul emplacement (décision d'Idan) ; les anciens avatars de Git ont été retirés. |
| `Picto/Peuple/`, `Picto/Ascendance/` | Pictos des peuples et des ascendances. Après un ajout ou une retouche, `scripts/build-pictos.sh` régénère les versions du jeu (`prototype-web/assets/pictos/`) |
| `Equipements/Armures/`, `Equipements/Armes/`, `Equipements/Frames/` | Images des objets par tier (T1 à T4, fond noir) et cadres de tier. Noms : `<Nom>_<tier>.jpg` (voir `Equipements/README.md`). Après un ajout, `node scripts/build-equipment.js` régénère les versions du jeu (`prototype-web/assets/equipment/`) |
| `Sorts/<École>/` | Icônes des sorts (Idan, 2026-10-25) : un parchemin par sort, nommé par le code du sort (`quick_heal.jpg`…, voir `data/reference/spells.json`), et `cadre.jpg`, le cadre commun de l'école. `scripts/build-spells.sh` régénère les versions du jeu (`prototype-web/assets/spells/`) et détoure le centre du cadre |
| `Ennemis/`, `Invocations/` | Portraits des ennemis types et des créatures invoquées, nommés par leur code (voir le README de chaque dossier). Pas encore affichés dans le jeu : branchés à l'arrivée des images |
| `audio/` | Musiques, ambiances, bruitages |
| `divers/` | Tout le reste, ou en cas de doute |

Ce qui manque (hors avatars) : Design Lab, onglet **Images**.

## Déposer des fichiers depuis le site GitHub

1. Ouvrir le dossier voulu sur la branche `test`, par exemple https://github.com/Idan84/Mercenaires/tree/test/assets-src/fonds
2. **Add file** → **Upload files**, puis glisser les fichiers (ou un dossier entier).
3. En bas de la page, choisir **Create a new branch for this commit and start a pull request**. Le nom de branche n'a pas d'importance.
4. **Propose changes**, puis **Create pull request**. JC3 prend le relais : vérification, optimisation, intégration, fusion.

Bon à savoir :
- 25 Mo maximum par fichier depuis le site.
- Images : PNG, JPG ou WEBP. Audio : WAV, MP3 ou OGG.
- Les noms de fichiers peuvent rester tels quels. Pour les avatars, des tags (peuple, sexe, profil…) dans le nom ou dans un petit fichier texte à côté font gagner du temps ; sinon JC3 trie.
