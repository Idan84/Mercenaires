# Notes provisoires — changements à venir

Fichier de travail, pas une source canonique : chaque point rejoindra `docs/design/` (et les données) quand il sera
fait, puis sera retiré d'ici.

## Butin : accessoires sur les ennemis morts (Idan, 2026-11-08)

Décidé (« règle simple à ajouter après ») :

- Sur chaque ennemi mort, **2 % de chance par emplacement d'accessoire** de récupérer un accessoire de ce type, du
  **tier de l'ennemi**. Exemple : un gobelin T2 a 2 % de chance d'avoir un anneau T2 pour chacun des 6 emplacements
  d'anneau, 2 % pour un casque T2, etc.
- Seulement sur les **humanoïdes** : rien sur un loup ou une chauve-souris de la Cour de sang, par exemple ; les
  goules, zombies, spectres et trolls (vivants ou morts-vivants) en laissent (Idan : « La règle, c'est plutôt humanoïde
  ou non »).
- Aujourd'hui (doc 17 §16) : les ennemis ne laissent que l'arme et l'armure de leur fiche (90 / 80 / 70 / 60 % selon
  le tier) ; les accessoires ne viennent que du coffre.
- Ordre de grandeur : 13 emplacements × 2 % ≈ 0,26 accessoire par ennemi (dont 0,12 anneau) ; un camp de 22 ennemis
  ≈ 5,7 accessoires.

Mise en œuvre : une colonne « humanoïde » (ou son contraire) dans `enemy-archetypes.json` ; aujourd'hui, seuls les
loups et les chauves-souris de la Cour de sang n'en sont pas.

## Observations de la partie n°3 (non décidées, pour discussion)

- Un mercenaire qui panique fuit, puis meurt souvent d'une attaque d'opportunité ; en fuite, il ne boit jamais sa
  potion de soins (missionAiPotion n'est pas appelée pour un fuyard).
- Accessoires : 13 emplacements par mercenaire (6 anneaux), mais peu d'objets trouvés ; au jour 40, la capitaine
  porte les 13, la plupart des autres 0 à 3.
- Le nom d'un objet ne dit pas toujours sa famille (« Lanière de charretier » est un fouet).
