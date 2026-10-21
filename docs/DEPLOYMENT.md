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
2. l'envoie par FTP chiffré dans le dossier du sous-domaine ;
3. vérifie que le site répond.

L'envoi **ajoute et remplace** des fichiers, il **n'en efface jamais**. Un fichier déposé directement sur Hostinger (un média, par exemple) n'est jamais touché ; un fichier supprimé de Git reste sur le serveur jusqu'à ce qu'on l'y supprime à la main.

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

Pour savoir quoi produire : l'onglet **Avatars** du Design Lab (https://bloodandwages.idanwizen.com/design/#avatars) compare, pour chaque peuple, les avatars aux mercenaires que le jeu génère (`game-core/avatar-coverage.js`) : besoin, cultures, profils, armes, magie et ascendances sous-représentés, avatars sans tags. Les remarques (mot-clé inconnu, portrait manquant…) s'affichent dans la console du navigateur au chargement du jeu.

### Silhouettes d'équipement : `media/Avatars_Equipements/`

Décision d'Idan du 2026-10-21. Il s'agit d'une silhouette par peuple et par sexe, soit 20 images. Elle remplace le mannequin de l'onglet Équipement de la fiche et s'affiche en multiply : le blanc disparaît sur le fond beige, sans détourage.

- Majuscules indifférentes, comme pour les avatars.
- Le peuple et le sexe se lisent dans le nom du fichier, un sous-dossier ou les mots-clés Bridge. Exemples : `Orc_Femme.jpg`, `Homme-bete_H.jpg`, `Nains/Nain_M.png`. Sexe : `F`, `Femme`, `H`, `M` ou `Homme`.
- `api/silhouettes.php` liste le dossier, et `game-core/avatar-catalog.js` (`buildSilhouetteCatalog`) range chaque image.
- Une image dont le peuple ou le sexe manque est ignorée et signalée dans la console du navigateur. Un mercenaire sans sexe connu, ou dont la silhouette manque, garde l'ancien mannequin.

Pour vérifier un dépôt : https://bloodandwages.idanwizen.com/api/silhouettes.php

## Netlify (abandonné)

Netlify a hébergé le prototype jusqu'au 2026-10-05 et a été abandonné faute de crédits (décision d'Idan, voir `docs/TEAM.md`). `netlify.toml` a été retiré le 2026-10-20 à la demande d'Idan. Tant que le projet Netlify `mercenaires-s708` n'est pas supprimé ([issue #64](https://github.com/Idan84/Mercenaires/issues/64)), une reprise de ses builds publierait la racine du dépôt (public de toute façon) sur l'ancienne adresse Netlify ; Hostinger n'est pas concerné.
