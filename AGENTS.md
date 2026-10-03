# Instructions agents — Mercenaires

## Source de vérité

Git est la source de vérité du game design. **Ne pas utiliser Notion.**

Avant toute modification de logique métier :
1. lire `docs/design/README.md` puis le document de domaine concerné ;
2. lire les tables correspondantes dans `data/reference/` ;
3. consulter `docs/design/formulas/` pour les formules détaillées ;
4. consulter `archive/notion-export/` uniquement pour lever une ambiguïté historique.

## Priorités

1. Ne pas inventer de règle manquante.
2. Préserver les formules et valeurs validées.
3. Marquer explicitement tout élément provisoire ou à définir.
4. Garder logique métier, données et interface séparées.
5. Préférer des changements petits, testables et lisibles.

## Architecture cible

- `docs/design/` : règles humaines canoniques.
- `data/reference/` : référentiels structurés canoniques.
- `game-core/` : génération, RNG, réputation, progression, combat abstrait.
- `prototype-web/` : prototype UI et Design Lab.
- `archive/notion-export/` : archive figée, jamais source active.
- `unreal/` : futur projet Unreal.

## Règles de contribution

- Une formule modifiée doit mettre à jour la documentation et les données concernées.
- Une valeur de table utilisée par le code doit provenir de `data/reference/` ou d'une donnée dérivée documentée.
- Le HTML/CSS ne doit pas contenir de règle de gameplay.
- Éviter les dépendances externes inutiles.
- Ne jamais réimporter automatiquement Notion par-dessus Git.
