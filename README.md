# Mercenaires

Prototype de game design et futur projet Unreal du jeu tactique / gestion de mercenaires.

## Prototype en ligne

https://mercenaires-s708.netlify.app

## Structure

- `prototype-web/` — laboratoire HTML/CSS/JS déployé sur Netlify.
- `docs/` — règles validées nécessaires au code.
- `data/` — futur référentiel de données portable vers Unreal.
- `game-core/` — futur noyau de logique détaché de l'interface.
- `netlify.toml` — déploiement automatique du prototype web.
- `AGENTS.md` — consignes pour Codex et autres agents.
- `CLAUDE.md` — consignes Claude Code.

## Prototype web

Aucun build nécessaire. Netlify publie directement `prototype-web/`.

Pour tester localement, ouvrir `prototype-web/index.html` dans un navigateur moderne.

## Philosophie technique

Le HTML/CSS sert à prototyper rapidement l'interface et les flux de gestion. Le jeu final sera porté dans Unreal Engine. Les règles, données et cas de test doivent rester indépendants de l'interface afin de faciliter le portage JS → C++ / Blueprint.


## Documentation Notion synchronisée

Une partie importante de la spécification Notion est maintenant miroir dans le dépôt :

- `docs/notion/` — pages de conception, combat, progression, camp, magie et formules V1 ;
- `data/notion/` — exports JSON des référentiels de génération et schémas des bases techniques ;
- `docs/notion/INDEX.md` — point d'entrée pour naviguer dans le snapshot.

Les agents de code doivent utiliser ces sources avant d'inventer ou de modifier une règle de jeu.
