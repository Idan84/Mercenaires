# Règles de jeu — état consolidé

## Concept

Jeu tactique heroic-fantasy inspiré de XCOM avec gestion d'une compagnie de mercenaires, blessures, mort permanente, salaires, réputation et château évolutif.

## Capitaine

Le capitaine représente l'identité de la compagnie. Sa mort entraîne un Game Over : pas de succession.

## Hiérarchie

Capitaine → Lieutenants → Mercenaires.

## Temps

La couche stratégique fonctionne en jours. Le combat ne consomme pas de jour en lui-même. Une mission de distance `D` immobilise normalement l'équipe `2D` jours aller-retour.

## Réputation

Chaque personnage peut avoir une réputation personnelle calculée. Les ennemis peuvent être générés à partir du même noyau de génération que les mercenaires, avec contraintes de faction / rôle / budget de mission.
