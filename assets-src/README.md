# Sources graphiques et audio

Dépôt des fichiers **bruts** (masters) d'Idan et de Jean-Mimi. Ce dossier n'est **pas mis en ligne** : JC3 en tire des versions optimisées pour le jeu dans `prototype-web/assets/`.

| Dossier | Contenu |
|---|---|
| `fonds/` | Fonds d'écran : château du camp (menu principal et home du camp), autres décors |
| `logo/` | Logo Blood & Wages : master sur fond blanc, variantes |
| `avatars/` | Avatars des mercenaires : un plein pied et un portrait par personnage |
| `Picto/Peuple/`, `Picto/Ascendance/` | Pictos des peuples et des ascendances. Après un ajout ou une retouche, `scripts/build-pictos.sh` régénère les versions du jeu (`prototype-web/assets/pictos/`) |
| `audio/` | Musiques, ambiances, bruitages |
| `divers/` | Tout le reste, ou en cas de doute |

## Déposer des fichiers depuis le site GitHub

1. Ouvrir le dossier voulu sur la branche `test`, par exemple https://github.com/Idan84/Mercenaires/tree/test/assets-src/fonds
2. **Add file** → **Upload files**, puis glisser les fichiers (ou un dossier entier).
3. En bas de la page, choisir **Create a new branch for this commit and start a pull request**. Le nom de branche n'a pas d'importance.
4. **Propose changes**, puis **Create pull request**. JC3 prend le relais : vérification, optimisation, intégration, fusion.

Bon à savoir :
- 25 Mo maximum par fichier depuis le site.
- Images : PNG, JPG ou WEBP. Audio : WAV, MP3 ou OGG.
- Les noms de fichiers peuvent rester tels quels. Pour les avatars, des tags (peuple, sexe, profil…) dans le nom ou dans un petit fichier texte à côté font gagner du temps ; sinon JC3 trie.
