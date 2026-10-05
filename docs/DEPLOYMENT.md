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

`prototype-web/.htaccess` porte les en-têtes de sécurité (Apache).

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

## Netlify (abandonné)

Netlify a hébergé le prototype jusqu'au 2026-10-05 et a été abandonné faute de crédits (décision d'Idan, voir `docs/TEAM.md`). `netlify.toml` reste dans le dépôt tant que le projet Netlify n'est pas supprimé, pour qu'une reprise automatique des builds ne publie pas la racine du dépôt.
