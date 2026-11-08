# Notes provisoires — changements à venir

Fichier de travail, pas une source canonique : chaque point rejoindra `docs/design/` (et les données) quand il sera
fait, puis sera retiré d'ici.

## À appliquer (Idan, 2026-11-08, après la partie n°5 de 365 jours)

Décidé :

1. **Chefs** (« PC du chef au max 50 % du PC total. Les missions jusqu'à 3★ peuvent ne pas avoir de chef ») : les
   points de combat du chef ne dépassent pas la moitié du budget du camp. Jusqu'à 3★ (niveau de mission 1 à 3), un chef
   trop fort est retiré : le camp n'a que sa troupe, et le plus fort de la troupe porte le nom du chef de la lettre. Au-
   delà, le chef du cran en dessous (chef 3, 2, 1) s'il tient dans la moitié du budget. Constat : en 1★, le budget est
   de 40 à 60 points et un chef 1 en vaut 30 à 42 ; 11 des 13 morts de la partie n°5 sont tombés dans ces camps.
2. **Gardes du corps** : renommée de la compagnie +3 par garde (au lieu de +5). Constat : environ 92 gardes ont donné
   460 points de renommée sur 1 938 à J365, les contrats gagnés aucun.
3. **Classement de la renommée** (« on descend d'un cran ») : le capitaine est le 1er et compte toujours à 100 % ; le
   mercenaire le plus réputé est 2e (÷ 2^1,5 ≈ 2,8), le suivant 3e (÷ 5,2), etc. Avant : le meilleur mercenaire comptait
   à 100 % (Aerendyl, 542, faisait 28 % de la renommée à J365).
4. **Design Lab** (`/design/graph/`) : la renommée y montre 3 des 6 parts (capitaine, mercenaires, héritage) ; ajouter
   les points de mission (gardes, échecs), le dortoir et le médecin, et le nouveau classement.

## En réflexion (propositions du 2026-11-08, non décidées)

- **Progression au combat** : XP de victoire partagée (selon les points du camp ÷ la taille de l'escouade) ;
  entraînement fiable (affecter un mercenaire à une salle sans tirage, facteur Intelligence adouci, entraînement des
  fatigués à mi-gain) ; moins de fatigue après une mission sans dégâts.
- **Niveau des missions** : tableau en trois tiers (facile / à sa mesure / ambitieux) ; ou niveau selon la force réelle
  de la compagnie ; héritage des morts qui ne compte plus dans la renommée.
- **Gardes du corps de haut rang** : 300 à 800 PO par personne et par jour sans risque à 5★–7★ (28 600 PO pour 2
  personnes et 19 jours) ; elles dominent l'économie à partir de J250.

## Observations de la partie n°3 (non décidées, pour discussion)

- Un mercenaire qui panique fuit, puis meurt souvent d'une attaque d'opportunité ; en fuite, il ne boit jamais sa
  potion de soins (missionAiPotion n'est pas appelée pour un fuyard).
- Accessoires : 13 emplacements par mercenaire (6 anneaux), mais peu d'objets trouvés ; au jour 40, la capitaine
  porte les 13, la plupart des autres 0 à 3.
- Le nom d'un objet ne dit pas toujours sa famille (« Lanière de charretier » est un fouet).
