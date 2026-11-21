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

L'envoi **ajoute et remplace** des fichiers. Il **n'efface que ce qu'il avait lui-même envoyé** et qui a quitté le site (Idan, 2026-11-15 : « Tu peux virer des dossiers ou des fichiers inutiles ? » — « Go ») : les fichiers du manifeste du dernier envoi absents du site assemblé, et ceux de `scripts/deploy-obsolete.txt` (les restes d'avant ce nettoyage), puis leurs dossiers s'ils sont vides (`scripts/deploy-obsolete.sh`). Un fichier déposé directement sur Hostinger (`media/`, un média, la musique de la Taverne) n'est jamais dans le manifeste : il n'est jamais touché. Un effacement raté est signalé (avertissement dans Actions) sans arrêter l'envoi.

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

### Réglages des cultures : `media/reglages/`

L'onglet **Cultures** du Design Lab (https://bloodandwages.idanwizen.com/design/#cultures ; Idan, 2026-11-18) règle, culture par culture, les trois panneaux du kit graphique : barres du camp, fiche au survol, fiche complète en plein écran. L'aperçu est le jeu lui-même (`index.html?apercu`, `prototype-web/apercu-ui.js` : une partie de démonstration jamais sauvegardée, sans musique), à la résolution choisie. « Enregistrer » range les réglages dans `media/reglages/<id>/reglage.json` (`design/api/reglages.php`, mêmes gardes que les dépôts d'images ; `media/reglages/index.json` les liste) . Le jeu les lit en direct (Idan, 2026-11-21 ; `prototype-web/reference-data.js`, `loadCultureSettings`) : au chargement, pour chaque culture et chaque panneau, le dernier enregistrement par-dessus le kit de `data/reference/culture-kits.json`, seulement les réglages que le kit connaît, du même type. Il suffit de recharger le jeu. Sans index (serveur local, tests), le kit du dépôt. JC reporte de temps en temps les derniers réglages dans `culture-kits.json`, pour que le dépôt reste à jour.

### Pictos : `media/pictos/`

Idan y dépose ses masters de pictos sur fond blanc, rangés par famille : `media/pictos/Culture/` (une image par culture, 2026-10-22). `api/pictos.php` liste le dossier et ses sous-dossiers (même bibliothèque que les avatars) : https://bloodandwages.idanwizen.com/api/pictos.php. Les masters sont ensuite copiés dans `assets-src/Picto/Culture/` sous le nom de leur culture (le fichier d'origine est noté dans le `README.md` du dossier), détourés par `scripts/build-pictos.sh`, comme ceux des peuples et des ascendances, et les versions web vont dans `prototype-web/assets/pictos/culture-<culture>.webp`. Le dossier Hostinger n'est lu que pour cette étape : le jeu n'en dépend pas.

### Barres du camp : `media/hud-pack/`

Idan y dépose les packs de la barre du haut du camp (2026-11-13) : un pack par culture du capitaine, 32 en tout, qui arrivent petit à petit (doc 16). Le dossier n'est pas listable de l'extérieur (403) : `api/hud-pack.php` le liste, sous-dossiers compris, avec la même bibliothèque que les avatars : https://bloodandwages.idanwizen.com/api/hud-pack.php

Rangement : `media/hud-pack/<Peuple>/<culture>/` avec `left`, `center`, `right` (et `full`, l'aperçu d'Idan, que le jeu n'utilise pas), et `ornement_central` quand Idan a dessiné l'anneau de la barre du bas pour cette culture (2026-11-14) ; une autre version de la barre va dans un sous-dossier `v2`, `v3`… du pack (sans anneau, c'est celui du pack qui sert), et `scripts/hud-bars-reglages.json` dit laquelle le jeu prend ; à la racine, `next.png`, le bouton Jour suivant, et les pictos de la barre du bas (`<nom>-<n>.png`, reconnus par un mot de leur nom : à gauche les six lieux, château, chope (Taverne), lit (Dortoir), balance (Marchand), caisse (Intendance), maison (Construction) ; à droite les quatre actions, épée (Combat), pigeon (Nouvelles), journal, bulle (Discussions)), communs à toutes les cultures. Quand des packs arrivent, `node scripts/build-hud-bars.js` les télécharge, reconnaît leur culture (le dossier du peuple, puis les mots du dossier ; les cas ambigus sont fixés dans `PACK_CULTURE`), les mesure (pour l'anneau : son trou, où se loge le bouton, et son bord, contre lequel se rangent les pictos), les convertit en WebP dans `prototype-web/assets/hud/barres/<culture>/` (l'anneau : `ornement.webp`), recadre le bouton sur son disque (`prototype-web/assets/hud/next.webp`) et les pictos (`prototype-web/assets/hud/pictos-bas/`), applique les réglages d'Idan par culture (`scripts/hud-bars-reglages.json`, exportés de l'Atelier des barres) et réécrit `prototype-web/hud-bars.js`. Comme pour les pictos, le dossier Hostinger n'est lu que pour cette étape : le jeu n'en dépend pas.

### Décors : `media/background/`

Idan y dépose les décors des lieux (2026-11-14) : `media/background/Taverne/`, dont les dossiers des variantes, sur un fond uni de n'importe quelle couleur vive (« alternate tavernier », « alternate table 1 », « alternate table 2 »). Le dossier n'est pas listable de l'extérieur (403) : `api/background.php` le liste, sous-dossiers compris, avec la même bibliothèque que les avatars : https://bloodandwages.idanwizen.com/api/background.php ; `node scripts/build-tavern.js` télécharge tout `Taverne/` (le décor, les calques, les variantes), les détoure, les range dans le jeu en WebP qualité 95 (`prototype-web/assets/taverne/`) et écrit `prototype-web/tavern-layers.js` (Playwright pour le détourage et le WebP — ImageMagick ignorait la qualité du WebP —, ImageMagick pour les ombres). Une image déposée en plusieurs tailles (`…_2K.jpg`) : la plus grande compte. Les gravures des annonces de mission (2026-11-14) sont dans `media/background/Taverne/Missions/` (ignoré par `build-tavern.js`) : on les trie à la main (gardées et écartées, avec la raison, en tête de `scripts/build-mission-art.js`), puis `node scripts/build-mission-art.js` les télécharge, rogne les marges, ramène le fond au blanc et les range en WebP dans `prototype-web/assets/missions/` ; les camps les déclarent dans `data/reference/one-shot-missions.json` (`camps[].illustrations`). Comme pour les barres, le dossier Hostinger n'est lu que pour cette étape.

**Le CDN de Hostinger réduit les grandes images** (constaté le 2026-11-14) : une image de plus de 1600 px de large est servie en 1600 px (en-tête `server: hcdn`), aussi bien pour les téléchargements des scripts que pour les joueurs. Pour la haute définition (AGENTS.md : « la qualité avant le poids »), l'optimisation des images du CDN doit être coupée dans hPanel ; sinon, les images du jeu restent à 1600 px au plus. Les calques de la taverne eux-mêmes viennent de `media/video/Taverne.zip`, détourés dans l'artefact « Taverne en calques » (doc 11).

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

Déposée par Idan le 2026-10-21 directement dans `public_html/bloodandwages/assets/audio/`, à côté des musiques suivies par Git. La mise en ligne automatique n'efface que ce qu'elle avait elle-même envoyé (son manifeste) : ce fichier, qui n'existe que sur Hostinger, ne risque donc rien. Le jeu la joue en boucle à la Taverne (`prototype-web/music-ui.js`, qui gère aussi la musique du menu et le thème du camp) ; sans fichier, la Taverne reste silencieuse.

### Thèmes des cultures : `assets/audio/`

Un thème par culture et par sexe du capitaine (64 à terme ; Idan, 2026-11-16), déposé au même endroit que `tavern.mp3`. Au camp, ils jouent au hasard avec le thème et la musique du menu ; celui de la culture et du sexe du capitaine passe en premier. Chaque thème est déclaré dans `MUSIC_TRACKS.camp` (`prototype-web/music-ui.js`) avec sa culture et son sexe. Un fichier manquant (pas encore déposé, nom différent) est sauté : le jeu passe au morceau suivant.

- Elfes noirs, capitaine homme : `Filthy Velvet Theme Elfe Noir M.mp3`
- Elfes noirs, capitaine femme : `Double Wages - Theme Elfe Noir F.mp3`

## Netlify (abandonné)

Netlify a hébergé le prototype jusqu'au 2026-10-05 et a été abandonné faute de crédits (décision d'Idan, voir `docs/TEAM.md`). `netlify.toml` a été retiré le 2026-10-20 à la demande d'Idan, et le projet Netlify `mercenaires-s708` a été supprimé par Idan le 2026-11-21 ([issue #64](https://github.com/Idan84/Mercenaires/issues/64)) : plus de build ni d'aperçu Netlify sur les PR.
