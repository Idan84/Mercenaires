# Instructions agents — Mercenaires

## Priorité

1. Ne pas inventer de règle de game design manquante.
2. Préserver les formules validées dans `docs/FORMULAS.md`.
3. Le prototype web est un laboratoire, pas le runtime final Unreal.
4. Garder la logique métier séparée de l'UI dès qu'un refactor est engagé.
5. Préférer des changements petits, testables et lisibles.

## Architecture cible

- `data/` : données portables et sérialisables.
- `game-core/` : génération, formules, RNG, progression, combat abstrait.
- `prototype-web/` : présentation HTML/CSS/JS uniquement.
- `unreal/` : futur projet Unreal, non présent pour l'instant.

## Règles de contribution

- Toute modification d'une formule validée doit mettre à jour `docs/FORMULAS.md`.
- Toute modification du pipeline de génération doit mettre à jour `docs/GENERATION.md`.
- Ne pas casser le déploiement statique Netlify.
- Éviter les dépendances externes tant qu'elles ne sont pas nécessaires.
- Les parties provisoires doivent être explicitement marquées `PROVISOIRE` dans le code ou la documentation.
- Quand un comportement existe dans le prototype uniquement pour tester une idée, le documenter comme tel.
