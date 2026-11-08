# Notes provisoires — changements à venir

Fichier de travail, pas une source canonique : chaque point rejoindra `docs/design/` (et les données) quand il sera
fait, puis sera retiré d'ici.

## À appliquer (Idan, 2026-11-08, après la partie n°5 de 365 jours)

Décidé :

7. **La Cantine** (Idan, 2026-11-08) : **une salle de la Taverne**, pas un bâtiment du camp ; le **tavernier** (personnage
   du décor) y cuisine. Elle s'ouvre au niveau 1 pour 500 PO ; niveaux 1 à 10 au prix des autres bâtiments,
   500 × niveau² PO (500, 2 000, 4 500… 50 000). Chaque jour, elle donne **40 × niveau XP** (40 au niveau 1… 400 au
   niveau 10) dans la caractéristique du plat cuisiné à **tous les mercenaires au camp, blessés et fatigués compris**,
   pas à ceux qui sont dehors (mission, garde). Dix plats, un par peuple :
   Force — Ragoût de Mamie Ogresse (Ogre) ; Endurance — Fromage au lait de poule (Nain) ; Vitesse — Hérisson rôti à
   la sauce des bois (Reptilien) ; Perception — Poêlée de champignons (Gnome) ; Esquive — Lapin rôti et ses carottes
   confites (Gobelin) ; Chance — Tourte aux trèfles (Halfling) ; Constitution — Soupe de Géant Vert (Orc) ;
   Intelligence — Têtes de harengs (Elfe) ; Courage — Chili aux piments doux (Homme-bête) ; Dextérité — Tataki
   d'hirondelle (Humain). Le plat du peuple du capitaine est inclus à l'ouverture de la Cantine. Ensuite, **un
   nouveau plat par niveau du Labo d'alchimie à partir du niveau 2** (niveaux 2 à 10 : les 9 autres plats), proposé
   par le tavernier, **gratuit** ; on ne connaît son effet qu'une fois débloqué. On choisit le plat du jour parmi
   les plats débloqués (effet affiché : « augmente la Force »).
8. **Design Lab** (`/design/graph/`) : la renommée y montre 3 des 6 parts (capitaine, mercenaires, héritage) ; ajouter
   les points de mission (gardes, échecs), le dortoir et le médecin, et le nouveau classement (capitaine 1er).

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
