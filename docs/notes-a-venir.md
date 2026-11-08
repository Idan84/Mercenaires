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
4. **Qualité du dortoir** (« La qualité du dortoir réduit la fatigue de 10 % par niveau ») : −10 % de jours de fatigue
   par niveau de qualité (1 à 10), **arrondi au jour supérieur** ; **au niveau 10, plus de fatigue du tout**. **Cumul
   avec les Bains chauds** : le dortoir d'abord, puis −1 jour par niveau des Bains, au moins 1 jour (sauf au niveau 10
   du dortoir). Aujourd'hui, chaque niveau donne +50 de renommée, +5 d'affinité à chaque membre le jour où il est
   atteint, et un quartier du lieutenant tous les deux niveaux.
5. **Courbe d'XP** (Idan, 2026-11-08 : « je voudrais une augmentation peut-être moins linéaire ») — proposition :
   même courbe quadratique, coût de chaque point divisé selon la zone : **0–50 ÷ 4**, **51–100 ÷ 2**, **101–150 comme
   aujourd'hui**, **151–200 ÷ 0,75** (× 1,33, plus dur). **Caractéristiques et compétences restent alignées** (« ça
   c'est certain »). Repères : atteindre 50 = 6 250 XP (25 000 aujourd'hui), 100 = 43 750 (100 000), 150 = 168 750
   (225 000), 200 ≈ 402 000 (400 000). Sur un an de la partie n°5 : Zizza 64 → 79 (72 aujourd'hui), le capitaine
   55 → ≈ 106 (88). **Décidé** : on lisse le tout (« option 1, on lisse le tout, fais les maths ») : pas de marche à
   51 ni à 101, le multiplicateur glisse d'une zone à l'autre ; **au-delà de 200, on durcit encore un peu**. La
   régression des autres compétences suit la courbe (elle fond plus vite sous 50) : **on laisse comme ça**.
6. **XP de combat** : on garde le système à l'action (Idan : « j'aime globalement l'idée »).
   - **Multiplicateur d'étoiles** (décidé) : toute l'XP gagnée pendant une mission × (1 + 0,25 par étoile au-delà
     de 1) : 1★ × 1, 3★ × 1,5, 5★ × 2, 10★ × 3,25, 15★ × 4,5 (« le plus rapide à équilibrer et ça boostera tout le
     monde »). Pas de multiplicateur par tier d'ennemi.
   - **Nouvelles actions** (décidé) : Vitesse +1 par case parcourue en combat (pas seulement en fuite) ; Constitution +2
     par PV de dégâts encaissés et survécus ; Endurance +10 par tour passé au contact d'un ennemi ; Perception +20 par
     tir qui touche au-delà de la moitié de la portée ; Volonté +80 par sort ennemi résisté (Sommeil, Choc
     psychique…) ; Charisme +40 quand un allié proche réussit son test de Courage grâce à son aura (capitaine et
     lieutenants seulement ; l'aura existe : combat-engine.js, captainAuraBonus, lieutenant à 50 %).
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
