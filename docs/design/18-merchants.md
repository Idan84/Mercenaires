# Marchands

> Décisions d'Idan des 2026-10-30 et 2026-10-31 ; chiffres validés par Idan (« Go »).

## 1 — L'idée (Idan, 2026-10-30)

Chaque jour, un tirage : pas de marchand, ou un marchand qui a ses objets et son **affinité avec le capitaine**. Les
prix dépendent de l'affinité et de **l'intendant**, les tiers de la **renommée** ; il rachète mal les grandes quantités
(« le lot de 300 lances usées »). Plus tard : négocier, d'autres objets, au-delà du T4.

## 2 — Le passage

- Chaque matin, un marchand passe au camp avec une probabilité de **30 % + 4 % par étoile de renommée** (15 niveaux) :
  38 à 42 % pour une compagnie neuve, 54 % à 1 étoile d'argent, 90 % à 5 étoiles d'or. Il reste **la journée** et repart
  le lendemain matin. Il est tiré dans la liste selon son poids.
- La **notification du jour** annonce son arrivée ; le bouton **Marchand** du camp porte son nom (grisé sans marchand).

## 3 — Un marchand (Idan, 2026-10-31)

- Un **nom fixe**, un **portrait** pour lui seul (sans portrait, l'écran montre ses initiales), une **culture** (son
  peuple et l'alignement par défaut de sa culture) et la **liste des objets qu'il vend** : on ne trouve **jamais** autre
  chose chez lui, sauf l'objet « rien que pour toi » (§9).
- **32 marchands, dont 16 marchandes : un par culture**, tous au même poids. Leurs listes (§12) sont assorties à leur
  culture (ses idées de bonus, les armes et armures du peuple).
- **Thorval Poudredefeu** : Nain, Nains du chaos, Chaotique neutre ; Pistolet, Tromblon, Canon à main, Arquebuse, plus
  l'arbalète et la bague de la Foudre (Nains du chaos : arbalètes, Foudre).
- **Durgan Battefer** : Nain, Nains des montagnes, Neutre bon (l'alignement principal des nains). Il hait les nains du
  chaos, et c'est réciproque (doc 02, « Cultures à part »).
- **Manuels de sorts** (doc 12) : chaque marchand d'une culture qui a une école de magie vend aussi **les manuels de
  cette école** (une ligne de sa liste) ; les sorts à venir de l'école y entrent d'eux-mêmes.
- **Objectifs** : chaque objet vendu par **au moins deux marchands** (sauf les montures, §12 bis), et chaque marchand
  vend **à peu près le même nombre d'objets** (6 ou 7 lignes) ; les cristaux viendront ensuite.

## 4 — L'étal

- **10 articles par passage**, pour tous les marchands. Chacun est tiré au hasard dans sa liste (doublons possibles) et
  ne se vend qu'une fois.
- **Tier** (pour l'instant T2 à T4) selon le niveau d'étoiles de la renommée (1 à 15) :
  T2 = 70 − 4 × niveau, T3 = 25 + 2 × niveau, T4 = 5 + 2 × niveau (en %, la somme fait 100).

| Renommée | T2 | T3 | T4 |
|---|---|---|---|
| 2 étoiles de bronze (compagnie neuve) | 62 % | 29 % | 9 % |
| 1 étoile d'argent | 46 % | 37 % | 17 % |
| 5 étoiles d'or | 10 % | 55 % | 35 % |

## 5 — L'affinité avec le marchand

- **Initiale** : comme celle d'un mercenaire avec le capitaine (doc 02 : peuple, culture, alignement). Avec Thorval :
  capitaine nain du chaos +100, humain chaotique neutre +44, humain neutre +22, orc loyal bon −71, nain des montagnes
  chaotique neutre −29 (les Nains du chaos haïssent les autres nains).
- **Acquise** : **+2 par article acheté** ; **−3 à chaque passage sans aucun achat ni aucune vente** (quand il repart).
- Bornée de −100 à +100. **Elle n'est pas affichée.**

## 6 — L'intendant

Si l'affinité (initiale) du marchand avec l'intendant est d'au moins **+20**, l'intendant négocie : **1 % par tranche de
10 points d'Intendance** (jusqu'à 10 %), en moins sur vos achats et en plus sur vos ventes. L'écran montre seulement son
visage (« … négocie pour vous »).

## 7 — Vous achetez

Prix = valeur cachée (doc 05) × **1,5** × (1 − **0,2** × Affinité / 100) × (1 − bonus de l'intendant), arrondi. L'or de
la compagnie doit suffire ; l'objet rejoint l'**Intendance**, sans propriétaire.

## 8 — Vous vendez (depuis l'Intendance)

Prix = valeur × **0,8** × (1 + **0,2** × Affinité / 100) × (1 + bonus de l'intendant), puis :

- **Hors de sa liste** : × **0,4**.
- **Quantité** : × **0,85** par exemplaire du même objet au même tier déjà vendu pendant ce passage (10 exemplaires
  rapportent environ 5,3 fois le prix d'un seul).
- **Rareté**, sur sa liste : **+20 % pour un T3, +40 % pour un T4** à 1 étoile de bronze, qui diminue linéairement
  jusqu'à 0 à 5 étoiles d'or : une compagnie neuve vend très cher un T4.
- **Plafond** : jamais plus de **90 %** du prix qu'il en demanderait lui-même (pas d'aller-retour gagnant chez le même
  marchand).
- Ce qu'il rachète disparaît.

Tant que la compagnie est jeune, on gagne un peu à acheter un T3 ou un T4 là où l'affinité est bonne pour le revendre
à un marchand qui a cette arme dans sa liste.

**Exemples** (compagnie neuve, capitaine humain chaotique neutre : affinité +44, sans intendant) : Pistolet T2 739 PO à
l'achat, 470 PO à la vente ; Tromblon T4 (qualité De luxe, × 2,5) 17 955 PO à l'achat, 15 667 PO à la vente (12 730 PO
pour une compagnie à 1 étoile d'or) ; 10 épées longues T1 : environ 133 PO en tout (25 PO la première).

## 9 — « Rien que pour toi, capitaine » (Idan, 2026-10-31)

- **Quand** : son affinité avec le capitaine est à **+100**, vérifiée pendant tout son passage (aussi juste après l'achat
  qui l'y porte). Avec Thorval, un capitaine nain du chaos y est d'emblée ; il faut 28 achats à un humain
  chaotique neutre (+44), 39 à un humain neutre (+22). S'il repart sans affaire (97), l'offre ne revient qu'une fois
  remonté à +100.
- **Une offre par passage**, qui reste jusqu'à son départ si on ne la prend pas tout de suite.
- **L'objet** : jamais dans sa liste ; une famille d'équipement au hasard (arme, armure, casque, bottes, ceinture,
  amulette, cape, gants, culotte, bague ; pas de fiole), puis un objet de cette famille ; **T3 ou T4**, avec les chances
  de l'étal ramenées à ces tiers (compagnie neuve : environ 76 % de T3, 24 % de T4).
- **Prix** : **50 %** de son prix normal (à +100, 0,6 × la valeur) : un arc T3 à 720 PO au lieu de 1 440. Revendu à un
  marchand qui vend des arcs, c'est un bon bénéfice : il ne sait pas l'estimer.
- **Dialogue** : le bouton **Parler**, à côté de son nom, s'allume ; sa réplique (une phrase tirée parmi ses variantes,
  avec l'objet et le prix), la carte de l'objet, « Je prends (… PO) » ou « Pas aujourd'hui ». Pas d'annonce dans la
  notification du jour : la surprise reste au camp.

## 10 — L'écran

Portrait et nom, la caisse ; onglets **Acheter** (l'étal, du plus cher au moins cher) et **Vendre** (le stock de
l'Intendance, deux objets identiques en une case « × 2 », ses armes d'abord avec un liseré doré) ; une case par objet,
la carte d'objet au survol, le prix dessous.

## 11 — Données

Marchands (nom, sexe, portrait, peuple, culture, alignement, poids, liste, répliques) : `data/reference/merchants.json` ;
chiffres : `data/reference/formula-constants.json`.

## 12 — Qui vend quoi (couverture)

Liste générée par `scripts/merchant-coverage.js` à partir de `merchants.json` et des référentiels d'objets ; la
publication bloque si elle n'est plus à jour, et les tests si un objet ou une école de manuels a moins de deux
marchands. ⚠ : moins de deux marchands.

<!-- couverture:debut (généré par node scripts/merchant-coverage.js : ne pas modifier à la main) -->

**Bilan** : 102 objets ; **102** vendus par au moins 2 marchands (les montures : un marchand chacune), **0** par un seul, **0** par aucun.

**32 marchands**, dont 16 marchandes.

| Marchand | Culture | Vend | Lignes |
|---|---|---|---|
| Thorval Poudredefeu | Nains du chaos | Pistolet, Tromblon, Canon à main, Arquebuse, Arbalète, Bague de la Foudre, Manuels de Foudre | 7 |
| Durgan Battefer | Nains des montagnes | Armure de plates, Casque de constitution, Amulette de volonté, Bague du courage, Marteau de guerre, Hache de guerre | 6 |
| Orvald Sans-Collier | Nains esclaves | Pic de guerre, Hachette, Fouet, Ceinture de courage, Amulette de volonté, Bague de la chance | 6 |
| Jiraya Senin | Royaumes du Soleil Levant | Katana, Nunchaku, Sai, Bottes d’esquive, Cape de discrétion, String du Charisme, Manuels de Vie | 7 |
| Ysolwen Chantesève | Elfes sylvains | Arc, Bâton court, Bâton long, Slip d’Affinité, Cape d’esquive, Bottes de perception, Manuels de Vie, Licorne | 8 |
| Hroska Crocs-de-Neige | Tribus nordiques | Hache double, Écu, Trident, Cape de résistance physique, Ceinture d’endurance, Bague de l’Eau, Manuels d’Eau, Mammouth de guerre | 8 |
| Drusk Sabot-de-Poussière | Clans des grandes steppes | Arc, Lance, Sabre, Bottes de vitesse, Bague du courage, Ceinture de courage, Manuels de Feu | 7 |
| Gorma Porte-Tonneau | Ogres des cités humaines | Hallebarde, Masse d’armes, Brigandine, Gants de force, Culotte d’Intimidation, Potion de soins | 6 |
| Rasz Tzel'Varr | Reptiliens des villes | Estoc, Sarbacane, Cuir renforcé, Chapeau d’intelligence, Bague de la télékinésie, Amulette de puissance magique, Manuels de Télékinésie | 7 |
| Gudrun Isfjell | Montagnes du Nord | Hache double, Épée à deux mains, Hache de guerre, Cotte de mailles, Cape de résistance physique, Bague du nécromancien, Manuels de Nécromancie | 7 |
| Isska Ssul'Varek | Reptiliens des marécages | Trident, Sarbacane, Armure d'écailles, Fiole de poison, Bague de l’Eau, Potion de soins, Manuels d’Eau | 7 |
| Calaena Ombrevenin | Elfes noirs | Dague, Arbalète, Fouet, Cape de discrétion, Fiole de poison, Bague de la Foudre, Manuels de Foudre | 7 |
| Jasper Bonnebourse | Halflings des cités humaines | Dague, Fronde, Rondache, String du Charisme, Gants de dextérité, Bague de la télékinésie, Manuels de Télékinésie, Papillon vénéneux | 8 |
| Malaika Ilunga | Tribus de la jungle | Lance, Sarbacane, Kukri, Armure de cuir, Fiole de poison, Bague de la transmutation, Manuels de Transmutation | 7 |
| Aymeric Belcomptoir | Cités libres | Épée longue, Écu, Rondache, Cotte de mailles, Brigandine, Bague du soigneur, Manuels de Vie, Pégase | 8 |
| Flek Visseclou | Caravanes de ferrailleurs | Amulette de chance, Tromblon, Canon à main, Fléau d’armes, Gants de pièges, Bague de la chance, Manuels de Télékinésie | 7 |
| Lirri Feuillecoque | Gnomes des forêts | Fronde, Bâton court, Cape d’esquive, Gants de dextérité, Bottes d’esquive, Bague de l’illusionniste, Manuels d’Illusion | 7 |
| Callie Loincompas | Explorateurs | Katana, Sai, Nunchaku, Bottes de perception, Chapeau du dresseur, Amulette de chance, Manuels d’Invocation, Papillon télépathe | 8 |
| Amar Rathore | Terres des Deux Fleuves | Sabre, Arc, Lance, Cuir renforcé, Gambison, Bague de Feu, Manuels de Feu, Destrier | 8 |
| Karg Brisenclume | Orcs noirs | Épée à deux mains, Hache double, Bardiche, Armure de plates, Armure d'écailles, Gants de force, Manuels de Transmutation | 7 |
| Ilyra Hauteverrière | Elfes des grandes cités | Estoc, Épée longue, Bâton long, Ceinture de mana, Amulette de puissance magique, Vêtements, Manuels d’Eau | 7 |
| Crik Fouillecrâne | Gobelins des cavernes | Dague, Kukri, Fronde, Bottes d’esquive, Gants de pièges, Bague de l’invocation, Manuels d’Invocation | 7 |
| Dottie Mielbruyère | Halflings des villages isolés | Bâton court, Potion de soins, Potion de mana, Slip d’Affinité, Bague du soigneur, Vêtements, Manuels d’Illusion, Papillon géant | 8 |
| Gasha Poing-de-Marché | Orcs des villes | Épée courte, Arbalète, Épée double, Pavois, Culotte d’Intimidation, Ceinture de courage, Manuels de Transmutation | 7 |
| Cairn Racinesombre | Tribus des forêts anciennes | Lance, Massue, Arme d’hast double, Armure de cuir, Chapeau du dresseur, Bague du nécromancien, Manuels de Nécromancie | 7 |
| Fizzi Doigts-Légers | Gobelins des villes | Dague, Épée courte, Cape de discrétion, Gants de dextérité, Slip d’Affinité, Bague de l’illusionniste, Manuels d’Illusion, Loup | 8 |
| Draz Crinsauvage | Orcs des steppes | Lance, Bague de la transmutation, Hachette, Bottes de vitesse, Cuir renforcé, Ceinture d’endurance, Manuels de Transmutation, Sanglier de combat | 8 |
| Bruga Roc-Fendu | Ogres des montagnes | Massue, Marteau de guerre, Pavois, Armure d'écailles, Casque de constitution, Ceinture d’endurance, Cerbère | 7 |
| Bimble Lampeterne | Gnomes des cavernes | Pic de guerre, Fronde, Gants de pièges, Chapeau d’intelligence, Potion de mana, Bague du nécromancien, Manuels de Nécromancie | 7 |
| Azhiss Kaal'Thesh | Reptiliens des cités-temples | Trident, Bâton long, Gambison, Amulette de puissance magique, Ceinture de mana, Bague de l’invocation, Manuels d’Invocation, Tricératops | 8 |
| Kippa Ressortdor | Gnomes des villes | Pistolet, Arquebuse, Épée double, Chapeau d’intelligence, Potion de mana, Bague de l’illusionniste, Manuels d’Illusion, Molosse | 8 |
| Krosh Grand-Galop | Ogres des steppes | Masse d’armes, Fléau d’armes, Arme d’hast double, Hallebarde, Bardiche, Bague de Feu, Manuels de Feu | 7 |

| Famille | Objet | Marchands | Nombre |
|---|---|---|---|
| Armes | Arbalète | Thorval, Calaena, Gasha | 3 |
| Armes | Arc | Ysolwen, Drusk, Amar | 3 |
| Armes | Arme d’hast double | Cairn, Krosh | 2 |
| Armes | Arquebuse | Thorval, Kippa | 2 |
| Armes | Bardiche | Karg, Krosh | 2 |
| Armes | Bâton court | Ysolwen, Lirri, Dottie | 3 |
| Armes | Bâton long | Ysolwen, Ilyra, Azhiss | 3 |
| Armes | Canon à main | Thorval, Flek | 2 |
| Armes | Dague | Calaena, Jasper, Crik, Fizzi | 4 |
| Armes | Écu | Hroska, Aymeric | 2 |
| Armes | Épée à deux mains | Gudrun, Karg | 2 |
| Armes | Épée courte | Gasha, Fizzi | 2 |
| Armes | Épée double | Gasha, Kippa | 2 |
| Armes | Épée longue | Aymeric, Ilyra | 2 |
| Armes | Estoc | Rasz, Ilyra | 2 |
| Armes | Fléau d’armes | Flek, Krosh | 2 |
| Armes | Fouet | Orvald, Calaena | 2 |
| Armes | Fronde | Jasper, Lirri, Crik, Bimble | 4 |
| Armes | Hache de guerre | Durgan, Gudrun | 2 |
| Armes | Hache double | Hroska, Gudrun, Karg | 3 |
| Armes | Hachette | Orvald, Draz | 2 |
| Armes | Hallebarde | Gorma, Krosh | 2 |
| Armes | Katana | Jiraya, Callie | 2 |
| Armes | Kukri | Malaika, Crik | 2 |
| Armes | Lance | Drusk, Malaika, Amar, Cairn, Draz | 5 |
| Armes | Marteau de guerre | Durgan, Bruga | 2 |
| Armes | Masse d’armes | Gorma, Krosh | 2 |
| Armes | Massue | Cairn, Bruga | 2 |
| Armes | Nunchaku | Jiraya, Callie | 2 |
| Armes | Pavois | Gasha, Bruga | 2 |
| Armes | Pic de guerre | Orvald, Bimble | 2 |
| Armes | Pistolet | Thorval, Kippa | 2 |
| Armes | Rondache | Jasper, Aymeric | 2 |
| Armes | Sabre | Drusk, Amar | 2 |
| Armes | Sai | Jiraya, Callie | 2 |
| Armes | Sarbacane | Rasz, Isska, Malaika | 3 |
| Armes | Trident | Hroska, Isska, Azhiss | 3 |
| Armes | Tromblon | Thorval, Flek | 2 |
| Armures | Armure d'écailles | Isska, Karg, Bruga | 3 |
| Armures | Armure de cuir | Malaika, Cairn | 2 |
| Armures | Armure de plates | Durgan, Karg | 2 |
| Armures | Brigandine | Gorma, Aymeric | 2 |
| Armures | Cotte de mailles | Gudrun, Aymeric | 2 |
| Armures | Cuir renforcé | Rasz, Amar, Draz | 3 |
| Armures | Gambison | Amar, Azhiss | 2 |
| Armures | Vêtements | Ilyra, Dottie | 2 |
| Casques | Casque de constitution | Durgan, Bruga | 2 |
| Casques | Chapeau d’intelligence | Rasz, Bimble, Kippa | 3 |
| Casques | Chapeau du dresseur | Callie, Cairn | 2 |
| Bottes | Bottes d’esquive | Jiraya, Lirri, Crik | 3 |
| Bottes | Bottes de perception | Ysolwen, Callie | 2 |
| Bottes | Bottes de vitesse | Drusk, Draz | 2 |
| Ceintures | Ceinture d’endurance | Hroska, Draz, Bruga | 3 |
| Ceintures | Ceinture de courage | Orvald, Drusk, Gasha | 3 |
| Ceintures | Ceinture de mana | Ilyra, Azhiss | 2 |
| Amulettes | Amulette de chance | Flek, Callie | 2 |
| Amulettes | Amulette de puissance magique | Rasz, Ilyra, Azhiss | 3 |
| Amulettes | Amulette de volonté | Durgan, Orvald | 2 |
| Capes | Cape d’esquive | Ysolwen, Lirri | 2 |
| Capes | Cape de discrétion | Jiraya, Calaena, Fizzi | 3 |
| Capes | Cape de résistance physique | Hroska, Gudrun | 2 |
| Gants | Gants de dextérité | Jasper, Lirri, Fizzi | 3 |
| Gants | Gants de force | Gorma, Karg | 2 |
| Gants | Gants de pièges | Flek, Crik, Bimble | 3 |
| Culottes | Culotte d’Intimidation | Gorma, Gasha | 2 |
| Culottes | Slip d’Affinité | Ysolwen, Dottie, Fizzi | 3 |
| Culottes | String du Charisme | Jiraya, Jasper | 2 |
| Bagues | Bague de Feu | Amar, Krosh | 2 |
| Bagues | Bague de l’Eau | Hroska, Isska | 2 |
| Bagues | Bague de l’illusionniste | Lirri, Fizzi, Kippa | 3 |
| Bagues | Bague de l’invocation | Crik, Azhiss | 2 |
| Bagues | Bague de la chance | Orvald, Flek | 2 |
| Bagues | Bague de la Foudre | Thorval, Calaena | 2 |
| Bagues | Bague de la télékinésie | Rasz, Jasper | 2 |
| Bagues | Bague de la transmutation | Malaika, Draz | 2 |
| Bagues | Bague du courage | Durgan, Drusk | 2 |
| Bagues | Bague du nécromancien | Gudrun, Cairn, Bimble | 3 |
| Bagues | Bague du soigneur | Aymeric, Dottie | 2 |
| Fioles | Fiole de poison | Isska, Calaena, Malaika | 3 |
| Fioles | Potion de mana | Dottie, Bimble, Kippa | 3 |
| Fioles | Potion de soins | Gorma, Isska, Dottie | 3 |
| Montures | Cerbère | Bruga | 1 |
| Montures | Destrier | Amar | 1 |
| Montures | Licorne | Ysolwen | 1 |
| Montures | Loup | Fizzi | 1 |
| Montures | Mammouth de guerre | Hroska | 1 |
| Montures | Molosse | Kippa | 1 |
| Montures | Papillon géant | Dottie | 1 |
| Montures | Papillon télépathe | Callie | 1 |
| Montures | Papillon vénéneux | Jasper | 1 |
| Montures | Pégase | Aymeric | 1 |
| Montures | Sanglier de combat | Draz | 1 |
| Montures | Tricératops | Azhiss | 1 |
| Manuels | Manuels de Vie | Jiraya, Ysolwen, Aymeric | 3 |
| Manuels | Manuels de Feu | Drusk, Amar, Krosh | 3 |
| Manuels | Manuels d’Eau | Hroska, Isska, Ilyra | 3 |
| Manuels | Manuels de Transmutation | Malaika, Karg, Gasha, Draz | 4 |
| Manuels | Manuels de Foudre | Thorval, Calaena | 2 |
| Manuels | Manuels de Télékinésie | Rasz, Jasper, Flek | 3 |
| Manuels | Manuels d’Illusion | Lirri, Dottie, Fizzi, Kippa | 4 |
| Manuels | Manuels de Nécromancie | Gudrun, Cairn, Bimble | 3 |
| Manuels | Manuels d’Invocation | Callie, Crik, Azhiss | 3 |

<!-- couverture:fin -->

## 12 bis — Les montures (Idan, 2026-11-07)

On achète et on vend des montures comme les autres biens. **Valeur = 300 × entretien** (`data/reference/mounts.json`),
puis les prix habituels (achat × 1,5, revente × 0,8, × 0,4 hors de sa liste…) ; sans tier ni qualité, donc sans rareté.
Un seul marchand par monture : l'exception à la règle des deux marchands.

- **Amar Rathore** (Terres des Deux Fleuves) : **destrier**, 3 000 PO.
- **Ysolwen Chantesève** (Elfes sylvains) : **licorne**, 9 000 PO.
- **Aymeric Belcomptoir** (Cités libres) : **pégase**, 12 000 PO (40 PO d'entretien ; 2026-11-09).
- **Bruga Roc-Fendu** (Ogres des montagnes) : **cerbère**, 10 500 PO (35 PO ; 2026-11-09).
- **Kippa Ressortdor** (Gnomes des villes) : **molosse de guerre**, 1 500 PO (5 PO ; 2026-11-09).
- Les papillons, qui logent à la Serre (2026-11-09) : **Callie Loincompas** (Explorateurs) le **papillon télépathe**,
  900 PO (3 PO) ; **Jasper Bonnebourse** (Halflings des cités humaines) le **papillon vénéneux**, 1 200 PO (4 PO) ;
  **Dottie Mielbruyère** (Halflings des villages isolés) le **papillon géant**, 3 000 PO (10 PO).
- **Draz Crinsauvage** (Orcs des steppes) : **sanglier de combat**, 4 500 PO (15 PO), loge à la Souille (2026-11-16).
- **Hroska Crocs-de-Neige** (Tribus nordiques) : **mammouth de guerre**, 15 000 PO (50 PO), 2 places à la Souille
  (2026-11-16).
- **Azhiss Kaal'Thesh** (Reptiliens des cités-temples) : **tricératops**, 21 000 PO (70 PO), 2 places à la Souille
  (2026-11-17).
- **Fizzi Doigts-Légers** (Gobelins des villes) : **loup**, 3 000 PO (10 PO).
- **Acheter** demande une place libre dans son logement (doc 11 §8 : les Écuries, le Chenil pour un loup) ; la monture
  rejoint l'Intendance (onglet **Montures**).
- **Vendre** : depuis l'Intendance, comme tout objet ; une monture donnée à un mercenaire n'y est plus : on ne peut pas
  la vendre.

## 13 — Étapes suivantes

- **Négociation**, sur le modèle de celle de la Taverne (doc 14 §9).
