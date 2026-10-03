# Déploiement

## GitHub

Le dépôt GitHub est la source de vérité du code.

Branche recommandée :
- `main` : version stable visible sur le site.
- branches de travail : changements Codex / Claude / humains.

## Netlify

Le fichier `netlify.toml` publie directement `prototype-web/` sans étape de build.

Workflow :
1. connecter le repo GitHub à Netlify ;
2. Netlify détecte `netlify.toml` ;
3. chaque push sur `main` redéploie la version principale ;
4. les pull requests peuvent bénéficier de previews de déploiement.
