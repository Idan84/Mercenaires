# Instructions agents — Mercenaires

Lire ensuite `docs/TEAM.md` : rôles, zones, chantiers en cours et circuit de travail de l'équipe.

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
6. La qualité visuelle avant le poids des fichiers (Idan, 2026-11-14 : « l'idée c'est de faire un jeu Unreal, pas de
   gagner sur Google Speed ») : images en haute définition, compression légère ; le prototype web prépare le jeu Unreal.

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
- Interface joueur (Idan, 2026-10-30) : jamais de tier (T1, T2…) ; un objet s'affiche sous son nom public (`item-titles.json`) et son cadre de couleur dit la qualité. Peu de texte : ce qui est évident ne s'écrit pas.
- Éviter les dépendances externes inutiles.
- Ne jamais réimporter automatiquement Notion par-dessus Git.
