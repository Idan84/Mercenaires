# Blood & Wages

**Manage your HR. Send them to die.**

Jeu tactique / gestion heroic-fantasy et laboratoire de game design, avec cible finale Unreal Engine.

Nom de dépôt / nom de code historique : `Mercenaires`.

## Prototype en ligne

https://mercenaires-s708.netlify.app

Le **Design Lab** est accessible depuis le prototype ou directement via `/design/`.

## Source de vérité

Depuis le 3 octobre 2026, **Git remplace Notion** pour le projet.

- `docs/design/` — règles, concepts, formules et chantiers.
- `data/reference/` — 22 référentiels structurés issus de l'export complet.
- `archive/notion-export/` — export Notion intégral figé (688 Markdown + 42 CSV).
- `prototype-web/design/` — interface de consultation des docs et tableaux.
- `game-core/` — futur noyau de logique indépendant de l'UI.

L'archive Notion est conservée uniquement pour vérifier l'historique. Toute nouvelle décision doit être écrite dans Git.

## Workflow

- `main` : version stable.
- branches de travail / PR : expérimentation et revue.
- Netlify : déploiement automatique du prototype et Deploy Previews.

Les agents doivent lire `AGENTS.md` avant de modifier la logique.
