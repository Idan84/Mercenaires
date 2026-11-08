# Notes provisoires — changements à venir

Fichier de travail, pas une source canonique : chaque point rejoindra `docs/design/` (et les données) quand il sera
fait, puis sera retiré d'ici.

## Missions (Idan, 2026-11-08)

Rappel (Idan) : bronze, argent, or ne sont que de l'affichage. Les étoiles vont de 1 à 15 ; 1★ argent, c'est
6 étoiles.

Décidé :

- **Cases du tableau** : 3 + nombre d'étoiles de la compagnie, de 1 à 15 (renommée 812 = 6 étoiles → 9 cases ;
  aujourd'hui : 5 cases fixes, `tavern.missions.slots`).
- **Écart de niveau** : −4 / +1 autour du niveau de renommée de la compagnie, pour les 3 types de missions
  (aujourd'hui : contrat −3 / +2, chasse −2 / +2 ; garde du corps tirée à part : 1★ 10 %, 2★ 30 %, 3★ 30 %, 4★ 20 %,
  5★ 10 %, + max(0, niveau du meilleur mercenaire − 4)).
- **Types équiprobables** : contrat, garde du corps, chasse, chacun 1 chance sur 3 (aujourd'hui : poids 2 / 2 / 1) ;
  dans les chasses, loups et licornes à égalité (aujourd'hui : loups 3, licornes 1).

## Observations de la partie n°3 (non décidées, pour discussion)

- Un mercenaire qui panique fuit, puis meurt souvent d'une attaque d'opportunité ; en fuite, il ne boit jamais sa
  potion de soins (missionAiPotion n'est pas appelée pour un fuyard).
- Accessoires : 13 emplacements par mercenaire (6 anneaux), mais peu d'objets trouvés ; au jour 40, la capitaine
  porte les 13, la plupart des autres 0 à 3.
- Le nom d'un objet ne dit pas toujours sa famille (« Lanière de charretier » est un fouet).
