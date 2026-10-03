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


## Sources de game design

Avant toute modification de logique métier :
1. lire les fichiers consolidés de `docs/` ;
2. consulter `docs/notion/INDEX.md` pour les règles et idées miroir de Notion ;
3. utiliser `data/notion/` pour les référentiels structurés (peuples, cultures, matrice, compétences, etc.) ;
4. ne jamais inventer silencieusement une valeur absente : marquer le point comme PROVISOIRE ou ouvert.

En cas de divergence :
- une règle explicitement validée et consolidée dans `docs/` prime pour l'implémentation courante ;
- le snapshot `docs/notion/` sert à retrouver le contexte, les détails et les chantiers ouverts ;
- signaler toute contradiction avant de modifier une mécanique existante.
