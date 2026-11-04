# Déploiement

## GitHub

Le dépôt GitHub est la source de vérité du code.

- `main` : la version officielle, en ligne sur https://bloodandwages.idanwizen.com.
- `test` : l'atelier d'intégration.
- Branches de travail : une par chantier, créées à partir de `test`.

## Hostinger

Le prototype est un site statique (HTML, JS, JSON, images, sons) : pas de base de données, pas de code serveur.

### Assemblage

`scripts/build-site.sh` assemble le site dans `site/`, sans aucun traitement des fichiers :

| Source | En ligne |
|---|---|
| `prototype-web/` | racine du site |
| `data/reference/` | `data/` |
| `docs/design/` | `docs/` |
| `game-core/` | `core/` |

Le jeu charge ses fichiers depuis la racine (`/core/`, `/data/`) : il doit être servi à la racine d'un domaine ou d'un sous-domaine, pas dans un sous-dossier.

`prototype-web/.htaccess` porte les en-têtes de sécurité (Apache) et demande de toujours revérifier les pages HTML.

Le CDN de Hostinger et les navigateurs gardent les scripts et les styles 7 jours. Pour que chaque mise en ligne soit vue tout de suite, le script ajoute dans les pages HTML un numéro de version aux scripts et styles locaux (`ui.js?v=<commit>`) : une nouvelle version a une nouvelle adresse.

### Mise en ligne automatique

Le workflow `.github/workflows/deploy-hostinger.yml` se lance à chaque mise à jour de `main`, ou à la main depuis l'onglet **Actions** de GitHub (« Mise en ligne Hostinger » → **Run workflow**). Il :

1. assemble le site ;
2. l'envoie par FTP chiffré dans le dossier du sous-domaine, **seulement ce qui a changé** depuis le dernier envoi réussi
   (`scripts/deploy-ftp.sh`, Idan, 2026-11-04) ;
3. vérifie que le site répond.

L'envoi **ajoute et remplace** des fichiers, il **n'en efface jamais**. Un fichier déposé directement sur Hostinger (un média, par exemple) n'est jamais touché ; un fichier supprimé de Git reste sur le serveur jusqu'à ce qu'on l'y supprime à la main.

**Seulement ce qui a changé.** Chaque envoi réussi laisse dans le dossier du site un manifeste, `.deploy-manifest` :
l'empreinte (SHA-1) de chaque fichier envoyé. L'envoi suivant le lit, compare avec le site assemblé
(`scripts/deploy-changes.sh`) et n'envoie que les fichiers nouveaux ou modifiés ; le manifeste n'est remplacé qu'une fois
tous les fichiers passés : après un envoi raté, le suivant renvoie ce qui manquait. Sans manifeste (le premier envoi), tout
part. Chaque fichier est **remplacé sans être effacé d'abord** (`mirror --overwrite`) : un envoi interrompu laisse
l'ancienne version en place, au lieu d'un fichier manquant. Avant, chaque mise en ligne renvoyait les quelque 950 fichiers
du site ; quand le FTP de Hostinger ralentissait, un gros fichier pouvait dépasser le délai, l'envoi réessayait et Hostinger
gardait un fichier temporaire caché (`.in.<nom>.`) qui bloquait les envois suivants de ce fichier (2026-11-04).

**Tout renvoyer.** Si un fichier a disparu chez Hostinger (le manifeste ne le sait pas) : Actions → « Mise en ligne
Hostinger » → **Run workflow**, case « complet » cochée.

### Prérequis

- hPanel : sous-domaine `bloodandwages.idanwizen.com`, dossier `public_html/bloodandwages`.
- hPanel → Comptes FTP : un compte FTP limité à ce dossier.
- GitHub → Settings → Secrets and variables → Actions → **Secrets** :
  - `HOSTINGER_FTP_HOST` : serveur FTP (affiché dans hPanel) ;
  - `HOSTINGER_FTP_USER` : identifiant du compte FTP ;
  - `HOSTINGER_FTP_PASSWORD` : son mot de passe.
- Facultatif, dans **Variables** :
  - `HOSTINGER_FTP_DIR` : dossier distant, si le compte FTP ne s'ouvre pas directement dans le dossier du site ;
  - `HOSTINGER_SITE_URL` : adresse du site, si elle change.

Les identifiants ne s'écrivent jamais dans le dépôt, une Issue ou une conversation : seuls les secrets GitHub les contiennent.

## Médias déposés sur Hostinger

Idan dépose ses médias directement sur Hostinger (gestionnaire de fichiers de hPanel, ou un client FTP avec le compte du site), dans `public_html/bloodandwages/media/`. Ce dossier n'est pas dans Git et la mise en ligne automatique n'y touche jamais. Les fichiers sont servis tels quels : aucun redimensionnement, aucune compression.

### Avatars : `media/avatars/`

- Majuscules indifférentes : `Media/Avatars/` convient aussi. S'il existe plusieurs variantes, celle qui contient des images l'emporte ; `api/avatars.php` indique dans `base` le dossier retenu.
- Un sous-dossier par peuple, au choix (`Ogres/`, `Halflings/`…).
- Un avatar = deux images de même peuple et même numéro : le plein pied `Ogre_12_….jpg` et le portrait carré `Ogre_12_Square_….jpg`. Le tiret bas avant le numéro est facultatif : `Halfling001.jpg` et `Halfling001_square.jpg` conviennent aussi. JPG, PNG ou WEBP.
- Les tags sont les mots-clés Bridge (IPTC / XMP), avec le vocabulaire de `assets-src/avatars/mots-cles-bridge.txt`. Les mots-clés des deux images s'additionnent : **taguer le plein pied suffit**.
- Attention aux exports (Photoshop « Exporter sous », « Enregistrer pour le web »…) : ils peuvent retirer les mots-clés. Vérifier dans Bridge que l'image exportée les a gardés.

Comment le jeu les trouve :

1. `api/avatars.php` liste `media/avatars/` et lit les dimensions et les mots-clés de chaque image. Un cache (`api/.cache/`) évite de relire les images inchangées. Il ne modifie aucun fichier.
2. Le jeu en tire son catalogue avec `game-core/avatar-catalog.js` (même logique que `scripts/build-avatars.js`). Depuis le 2026-10-21, `media/avatars/` est le **seul emplacement des avatars** (décision d'Idan) : les anciens avatars de Git ont été retirés et `data/reference/avatars.json` est vide. Le jeu sait toujours le réunir avec le catalogue de Hostinger ; à identifiant égal (`ogre-012`), Hostinger l'emporte.
3. Une image ajoutée, retaguée ou supprimée est prise en compte au prochain chargement du jeu. Une partie sauvegardée garde ses visages ; leurs fichiers suivent le catalogue.

Pour vérifier un dépôt : https://bloodandwages.idanwizen.com/api/avatars.php montre chaque image vue par le serveur, avec ses mots-clés.

Pour savoir quoi retaguer : en haut du même onglet, la liste **« Affiner les tags »** donne la référence et le fichier de chaque avatar dont les tags gênent l'attribution (aucun tag, sexe, profil, arme ou école de magie manquants). Une ligne disparaît d'elle-même quand l'image retaguée est redéposée ; le bouton « Fait » la masque tout de suite, dans ce navigateur.

Pour savoir quoi produire : l'onglet **Avatars** du Design Lab (https://bloodandwages.idanwizen.com/design/#avatars) donne, **culture par culture**, le besoin en avatars (`game-core/avatar-demand.js`, doc 02 ; Idan, 2026-10-30) : pour 50 mercenaires d'une culture, les avatars nécessaires par culture × ascendance × arme tenue en main ou école, en vert, orange ou rouge, et la liste **à produire**. Les remarques (mot-clé inconnu, portrait manquant…) s'affichent dans la console du navigateur au chargement du jeu. Le besoin en avatars par culture (`game-core/avatar-demand.js`, doc 02) repose sur des mesures figées du générateur, `data/reference/avatar-demand.json` : quand la génération change (matrice, armes, compétences, ascendances), les refaire avec `node scripts/build-avatar-demand.js` (un quart d'heure environ, un processus par cœur).

### Pictos : `media/pictos/`

Idan y dépose ses masters de pictos sur fond blanc, rangés par famille : `media/pictos/Culture/` (une image par culture, 2026-10-22). `api/pictos.php` liste le dossier et ses sous-dossiers (même bibliothèque que les avatars) : https://bloodandwages.idanwizen.com/api/pictos.php. Les masters sont ensuite copiés dans `assets-src/Picto/Culture/` sous le nom de leur culture (le fichier d'origine est noté dans le `README.md` du dossier), détourés par `scripts/build-pictos.sh`, comme ceux des peuples et des ascendances, et les versions web vont dans `prototype-web/assets/pictos/culture-<culture>.webp`. Le dossier Hostinger n'est lu que pour cette étape : le jeu n'en dépend pas.

### Images d'équipement : `media/equipements/`

Premier dépôt des images des objets (2026-10-23) : `media/equipements/armures/` (une image par armure et par tier, T1 à T4 ; le T4 n'est pas encore en jeu) et `media/equipements/Frames/` (les cadres de tier). Le dossier n'est pas listable de l'extérieur (403) : `api/equipment.php` le liste, sous-dossiers compris, avec la même bibliothèque que les avatars : https://bloodandwages.idanwizen.com/api/equipment.php. **Le jeu ne lit pas ce dossier** : depuis le même jour, les masters sont dans Git (`assets-src/Equipements/`, plus simple pour Idan comme pour JC3) et les versions du jeu sont tirées par `scripts/build-equipment.js`.

### Silhouettes d'équipement : `media/Avatars_Equipements/`

Décision d'Idan du 2026-10-21. Il s'agit d'une silhouette par peuple et par sexe, soit 20 images. Elle remplace le mannequin de l'onglet Équipement de la fiche et s'affiche en multiply : le blanc disparaît sur le fond beige, sans détourage.

- Majuscules indifférentes, comme pour les avatars.
- Le peuple et le sexe se lisent dans le nom du fichier, un sous-dossier ou les mots-clés Bridge. Pour les images générées dont le nom ne les donne pas (« Gnome_character_sketch_….jpg »), ils sont dans `data/reference/equipment-silhouettes.json`. Exemples : `Orc_Femme.jpg`, `Homme-bete_H.jpg`, `Nains/Nain_M.png`. Sexe : `F`, `Femme`, `H`, `M` ou `Homme`.
- `api/silhouettes.php` liste le dossier, et `game-core/avatar-catalog.js` (`buildSilhouetteCatalog`) range chaque image.
- Une image dont le peuple ou le sexe manque est ignorée et signalée dans la console du navigateur. Un mercenaire sans sexe connu, ou dont la silhouette manque, garde l'ancien mannequin.

Pour vérifier un dépôt : https://bloodandwages.idanwizen.com/api/silhouettes.php

### Musique de la Taverne : `assets/audio/tavern.mp3`

Déposée par Idan le 2026-10-21 directement dans `public_html/bloodandwages/assets/audio/`, à côté des musiques suivies par Git. La mise en ligne automatique (`mirror --reverse`, sans `--delete`) ajoute et remplace des fichiers mais n'efface jamais ceux qui n'existent que sur Hostinger : ce fichier ne risque donc rien. Le jeu la joue en boucle à la Taverne (`prototype-web/music-ui.js`, qui gère aussi la musique du menu et le thème du camp) ; sans fichier, la Taverne reste silencieuse.

## Netlify (abandonné)

Netlify a hébergé le prototype jusqu'au 2026-10-05 et a été abandonné faute de crédits (décision d'Idan, voir `docs/TEAM.md`). `netlify.toml` a été retiré le 2026-10-20 à la demande d'Idan. Tant que le projet Netlify `mercenaires-s708` n'est pas supprimé ([issue #64](https://github.com/Idan84/Mercenaires/issues/64)), une reprise de ses builds publierait la racine du dépôt (public de toute façon) sur l'ancienne adresse Netlify ; Hostinger n'est pas concerné.
