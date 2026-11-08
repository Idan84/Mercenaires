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

## Progression et réputation (Idan, 2026-11-08)

Constat (parties n°3 et n°4, simulateur) : en 69 jours, les armes gagnent 0 à 0,6 point et les caractéristiques ne
bougent pas, alors que la réputation double (≈ une étoile par mission) et fait monter les salaires et le niveau des
contrats (≈ 5 ennemis de plus par étoile).

Décidé :

- **XP gagnée × 2 à nouveau** : toutes les sources d'XP (combat, entraînement, médecine, magie…), comme le doublement
  du bêta-test (les 36 constantes `progression.*_xp`, `medic.xp.per_wound_day`, `school.training.*_xp`,
  `spell_study.*_xp`).
- **Réputation, 4 leviers** :
  1. Une **réputation propre à chaque fiche d'ennemi**, selon son rang (aujourd'hui : celle du personnage tiré sous la
     fiche, 100 à 180, même pour un gobelin novice ; tuer rapporte 10 % de cette réputation).
  2. **Réduire le bonus de retour de mission** (aujourd'hui +20 indemne ou fatigué, +10 blessé).
  3. **Écarter les seuils d'étoiles** (aujourd'hui 93 / 113 / 137 / 160 / 200 / 256 / 320 / 400 : 23 à 56 points entre
     deux étoiles, ≈ une mission).
  4. **Brancher le recalcul** de la part calculée de la réputation après progression (doc 09 : « pas encore branché »).

Valeurs choisies par Idan :

- Levier 1 : réputation d'une fiche = **3 × ses points de combat** (gobelin novice 18 → tué +1,8 ; chef gobelin 1
  90 → +9 ; troll d'élite 540 → +54).
- Levier 2 : **+10** indemne ou fatigué, **+5** blessé.
- Levier 3 : chaque seuil **× 1,5** du précédent à partir de 2★ = 93 (93, 140, 209, 314, 471, 706, 1 059…), la
  renommée de la compagnie suivant (× 4).

## Observations de la partie n°3 (non décidées, pour discussion)

- Un mercenaire qui panique fuit, puis meurt souvent d'une attaque d'opportunité ; en fuite, il ne boit jamais sa
  potion de soins (missionAiPotion n'est pas appelée pour un fuyard).
- Accessoires : 13 emplacements par mercenaire (6 anneaux), mais peu d'objets trouvés ; au jour 40, la capitaine
  porte les 13, la plupart des autres 0 à 3.
- Le nom d'un objet ne dit pas toujours sa famille (« Lanière de charretier » est un fouet).
