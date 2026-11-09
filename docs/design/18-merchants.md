# Marchands

> Ouvert le 2026-10-30 (Idan / JC3). **Étape 2 en place (2026-10-31)** : le premier vrai marchand, **Thorval
> Poudredefeu**, remplace le marchand test ; étal de 10 articles, affinité qui évolue, achat, revente, aide de
> l'intendant, et « Rien que pour toi, capitaine ». Chiffres proposés par JC3 et validés par Idan (« Go »). Tous sont des
> constantes `merchants.*` de `formula-constants.json`.

## 1 — L'idée (Idan, 2026-10-30)

- **Chaque jour, un tirage** : pas de marchand, ou un marchand parmi la liste.
- **Chaque marchand a de vraies caractéristiques** : les objets qu'il vend, et son **affinité avec le capitaine**.
- Les prix dépendent de l'affinité ; **l'intendant aide**. Les tiers proposés **dépendent de la renommée**.
- Ils sont **réticents à racheter les grandes quantités** (« le lot de 300 lances usées ») : les prix baissent avec la
  quantité.
- On pourra **négocier** ; on aura bien d'autres objets, et ils ne s'arrêtent pas au T4.

## 2 — Le passage

- Chaque matin, un marchand passe au camp avec une probabilité de **30 % + 4 % par étoile de renommée** (15 niveaux) :
  38 à 42 % pour une compagnie neuve, 54 % à 1 étoile d'argent, 90 % à 5 étoiles d'or. Il reste **la journée** et repart
  le lendemain matin. Le marchand qui passe est tiré parmi la liste selon son `poids`.
- La **notification du jour** annonce son arrivée ; le bouton **Marchand** du camp porte son nom (grisé sans marchand).

## 3 — Un marchand (Idan, 2026-10-31)

- Un **nom fixe**, un **portrait** fait pour lui seul, une **culture** (son peuple et l'alignement par défaut de sa
  culture), et la **liste des objets qu'il vend** : on ne trouve **jamais** autre chose chez lui, sauf l'objet « rien que
  pour toi » (§9).
- **Thorval Poudredefeu** : Nain, Nains du chaos, Chaotique neutre. Il vend **Pistolet, Tromblon, Canon à main,
  Arquebuse**. Son portrait est à venir (`portrait` vide : l'écran montre ses initiales en attendant).
- **Durgan Battefer** (Idan, 2026-10-31 ; nom de JC3) : Nain, Nains des montagnes, Neutre bon (l'alignement principal
  des nains). Il vend **Armure de plates, Casque de constitution, Amulette de volonté, Bague du courage, Marteau de
  guerre, Hache de guerre**. Portrait à venir. Il hait les nains du chaos, et c'est réciproque (doc 02, « Cultures à
  part »).
- **Orvald Sans-Collier**, **Jiraya Senin** et **Ysolwen Chantesève** (Idan, 2026-10-31 ; noms d'Orvald et d'Ysolwen par
  JC3) : leurs listes au §12.
- **32 marchands, dont 16 marchandes : un par culture** (Idan, 2026-10-31 : « je te laisse faire ») ; les 27 derniers
  (noms, listes, répliques) sont de JC3, assortis à leur culture (`idees_bonus` de `cultures.json`, armes et armures du
  peuple). Chacun a l'alignement par défaut de sa culture et le même `poids`. Thorval reçoit en plus l'arbalète et la
  bague de la Foudre (Nains du chaos : arbalètes, Foudre).
- **Manuels de sorts** (doc 12) : chaque marchand d'une culture qui a une école de magie vend aussi **les manuels de cette
  école** (une ligne de sa liste) ; les sorts à venir de l'école y entrent d'eux-mêmes.
- **Objectifs** (Idan, 2026-10-31) : chaque objet vendu par **au moins deux marchands**, et chaque marchand vend **à peu
  près le même nombre d'objets** (6 ou 7 lignes) ; les cristaux viendront ensuite. La liste est tenue au §12 ; les tests
  bloquent si un objet ou une école de manuels a moins de deux marchands. Portraits à venir.

## 4 — L'étal

- **10 articles par passage**, pour tous les marchands (`merchants.stock.size`). Chacun est tiré au hasard dans sa liste
  (doublons possibles) et ne se vend qu'une fois.
- **Tier** (pour l'instant T2 à T4) selon le niveau d'étoiles de la renommée (1 à 15) :
  T2 = 70 − 4 × niveau, T3 = 25 + 2 × niveau, T4 = 5 + 2 × niveau (en %, la somme fait 100).

| Renommée | T2 | T3 | T4 |
|---|---|---|---|
| 2 étoiles de bronze (compagnie neuve) | 62 % | 29 % | 9 % |
| 1 étoile d'argent | 46 % | 37 % | 17 % |
| 5 étoiles d'or | 10 % | 55 % | 35 % |

## 5 — L'affinité avec le marchand

- **Initiale** : comme celle d'un mercenaire avec le capitaine (doc 02 : peuple, culture, alignement). Exemples avec
  Thorval : capitaine nain du chaos +100, humain chaotique neutre +44, humain neutre +22, orc loyal bon −71, nain des
  montagnes chaotique neutre −29 (les Nains du chaos haïssent les autres nains : doc 02, « Cultures à part »).
- **Acquise** : **+2 par article acheté** ; **−3 à chaque passage sans aucun achat ni aucune vente** (quand il repart).
- Bornée de −100 à +100. **Elle n'est pas affichée.** Sauvegarde : `state.market.merchants[id].acquired`.

## 6 — L'intendant

Si l'affinité du marchand avec l'intendant (initiale) est d'au moins **+20**, l'intendant négocie : **1 % par tranche de
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

Ainsi, on gagne un peu en achetant un T3 ou un T4 là où l'affinité est bonne, pour le revendre à un autre marchand qui a
cette arme dans sa liste, tant que la compagnie est jeune.

**Exemples** (compagnie neuve, capitaine humain chaotique neutre : affinité +44, sans intendant) : Pistolet T2 739 PO à l'achat,
470 PO à la vente ; Tromblon T4 17 955 PO à l'achat, 15 667 PO à la vente (12 730 PO pour une compagnie à 1 étoile d'or ; qualité De luxe, × 2,5, depuis le 2026-11-01) ;
10 épées longues T1 : environ 133 PO en tout (25 PO la première).

## 9 — « Rien que pour toi, capitaine » (Idan, 2026-10-31)

- **Quand** : son affinité avec le capitaine est à **+100**, vérifiée pendant tout son passage (donc aussi juste après
  l'achat qui l'y porte). Avec Thorval, un capitaine nain du chaos y est d'emblée (+100) ; il faut 28 achats à un humain
  chaotique neutre (+44), 39 à un humain neutre (+22). S'il repart sans affaire (97), l'offre ne revient qu'une fois remonté à +100.
- **Une offre par passage**, qui reste jusqu'à son départ si on ne la prend pas tout de suite.
- **L'objet** : jamais dans sa liste ; une famille d'équipement au hasard (arme, armure, casque, bottes, ceinture,
  amulette, cape, gants, culotte, bague ; pas de fiole), puis un objet de cette famille ; **T3 ou T4**, avec les chances
  de l'étal ramenées à ces tiers (compagnie neuve : environ 76 % de T3, 24 % de T4).
- **Prix** : **50 %** de ce qu'il en demanderait normalement (à +100, 0,6 × la valeur) : un arc T3 à 720 PO au lieu de
  1 440. Revendu à un marchand qui vend des arcs, c'est un bon bénéfice : il ne sait pas l'estimer.
- **Dialogue** : le bouton **Parler**, à côté de son nom, s'allume ; sa réplique (`repliques.rien_que_pour_toi`, une
  phrase tirée parmi ses variantes, `{objet}` et `{prix}`), la carte de l'objet, « Je prends (… PO) » ou « Pas
  aujourd'hui ». Pas d'annonce dans la notification du jour : la surprise reste au camp.
- Constantes `merchants.special.*` (affinité 100, prix 0,5, tier minimal 3) ; sauvegarde `state.market.visit.special`.

## 10 — L'écran

Portrait et nom, la caisse ; onglets **Acheter** (l'étal, du plus cher au moins cher) et **Vendre** (le stock de
l'Intendance, deux objets identiques en une case « × 2 », ses armes d'abord avec un liseré doré) ; une case par objet,
la carte d'objet au survol, le prix dessous.

## 11 — Comment c'est fait

- Règles : `game-core/merchants.js` (`morning`, `visitOf`, `buy`, `sell`, `sellPrice`, `buybackPrice`, `tierChances`,
  `stewardHelp`, `buySpecial`, `ensureSpecial`). Le marchand passe pendant le passage de la journée (`campaign.js`, `advanceOneDay`). Un article est
  créé par `createItemByName` (`mercenary-generator.js` : type, nom, tier).
- Données : `data/reference/merchants.json` (`nom`, `sexe`, `portrait`, `peuple`, `culture`, `alignement`, `poids`,
  `vend`, `repliques`) et les constantes `merchants.*`.
- Interface : `prototype-web/merchant-ui.js`.
- Sauvegarde : `state.market.visit` (marchand, jour, étal, ventes du passage, affaire faite, objet « rien que pour
  toi ») et
  `state.market.merchants` (affinité acquise).
- Tests : `tests/merchants.test.js`, `tests/merchant-ui.test.js`.

## 12 — Qui vend quoi (couverture)

Liste tenue par `scripts/merchant-coverage.js` à partir de `merchants.json` et des référentiels d'objets ; la publication
bloque si elle n'est plus à jour (`node scripts/merchant-coverage.js --check`). ⚠ : moins de deux marchands.

<!-- couverture:debut (généré par node scripts/merchant-coverage.js : ne pas modifier à la main) -->

**Bilan** : 99 objets ; **99** vendus par au moins 2 marchands (les montures : un marchand chacune), **0** par un seul, **0** par aucun.

**32 marchands**, dont 16 marchandes.

| Marchand | Culture | Vend | Lignes |
|---|---|---|---|
| Thorval Poudredefeu | Nains du chaos | Pistolet, Tromblon, Canon à main, Arquebuse, Arbalète, Bague de la Foudre, Manuels de Foudre | 7 |
| Durgan Battefer | Nains des montagnes | Armure de plates, Casque de constitution, Amulette de volonté, Bague du courage, Marteau de guerre, Hache de guerre | 6 |
| Orvald Sans-Collier | Nains réduits en esclavage dans les colonies | Pic de guerre, Hachette, Fouet, Ceinture de courage, Amulette de volonté, Bague de la chance | 6 |
| Jiraya Senin | Royaumes du Soleil Levant | Katana, Nunchaku, Sai, Bottes d’esquive, Cape de discrétion, String du Charisme, Manuels de Vie | 7 |
| Ysolwen Chantesève | Elfes sylvains | Arc, Bâton court, Bâton long, Slip d’Affinité, Cape d’esquive, Bottes de perception, Manuels de Vie, Licorne | 8 |
| Hroska Crocs-de-Neige | Tribus nordiques | Hache double, Écu, Trident, Cape de résistance physique, Ceinture d’endurance, Bague de l’Eau, Manuels d’Eau | 7 |
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
| Amar Rathore | Steppes désertiques | Sabre, Arc, Lance, Cuir renforcé, Gambison, Bague de Feu, Manuels de Feu, Destrier | 8 |
| Karg Brisenclume | Orcs noirs | Épée à deux mains, Hache double, Bardiche, Armure de plates, Armure d'écailles, Gants de force, Manuels de Transmutation | 7 |
| Ilyra Hauteverrière | Elfes des grandes cités | Estoc, Épée longue, Bâton long, Ceinture de mana, Amulette de puissance magique, Vêtements, Manuels d’Eau | 7 |
| Crik Fouillecrâne | Gobelins des cavernes | Dague, Kukri, Fronde, Bottes d’esquive, Gants de pièges, Bague de l’invocation, Manuels d’Invocation | 7 |
| Dottie Mielbruyère | Halflings des villages isolés | Bâton court, Potion de soins, Potion de mana, Slip d’Affinité, Bague du soigneur, Vêtements, Manuels d’Illusion, Papillon géant | 8 |
| Gasha Poing-de-Marché | Orcs des villes | Épée courte, Arbalète, Épée double, Pavois, Culotte d’Intimidation, Ceinture de courage, Manuels de Transmutation | 7 |
| Cairn Racinesombre | Tribus des forêts anciennes | Lance, Massue, Arme d’hast double, Armure de cuir, Chapeau du dresseur, Bague du nécromancien, Manuels de Nécromancie | 7 |
| Fizzi Doigts-Légers | Gobelins des villes | Dague, Épée courte, Cape de discrétion, Gants de dextérité, Slip d’Affinité, Bague de l’illusionniste, Manuels d’Illusion, Loup | 8 |
| Draz Crinsauvage | Orcs des steppes | Lance, Bague de la transmutation, Hachette, Bottes de vitesse, Cuir renforcé, Ceinture d’endurance, Manuels de Transmutation | 7 |
| Bruga Roc-Fendu | Ogres des montagnes | Massue, Marteau de guerre, Pavois, Armure d'écailles, Casque de constitution, Ceinture d’endurance, Cerbère | 7 |
| Bimble Lampeterne | Gnomes des cavernes | Pic de guerre, Fronde, Gants de pièges, Chapeau d’intelligence, Potion de mana, Bague du nécromancien, Manuels de Nécromancie | 7 |
| Azhiss Kaal'Thesh | Reptiliens des cités-temples | Trident, Bâton long, Gambison, Amulette de puissance magique, Ceinture de mana, Bague de l’invocation, Manuels d’Invocation | 7 |
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
| Montures | Molosse | Kippa | 1 |
| Montures | Papillon géant | Dottie | 1 |
| Montures | Papillon télépathe | Callie | 1 |
| Montures | Papillon vénéneux | Jasper | 1 |
| Montures | Pégase | Aymeric | 1 |
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

> « On ajoute pour le marchand des humains des steppes, l'achat et la vente du cheval. Je te propose que la valeur d'un animal soit de 300 x coût d'entretien. On peut donc acheter et vendre des chevaux comme les autres biens. » « Le marchand elfe Sylvain en vend et en achète. »

- **Amar Rathore** (Steppes désertiques) vend des **destriers** ; **Ysolwen Chantesève** (Elfes sylvains) des **licornes** (`merchants.json`, type `mount`). Un marchand chacune : l'exception à la règle des deux marchands (`scripts/merchant-coverage.js`).
- **Valeur** = 300 × entretien (`economy.mount_value_per_upkeep`, `mounts.json`) : destrier **3 000 PO**, licorne **9 000 PO** ; puis les prix habituels (achat × 1,5, revente × 0,8, × 0,4 hors de sa liste…). Sans tier ni qualité : pas de rareté.
- **Aymeric Belcomptoir** (Cités libres) vend des **pégases** (Idan, 2026-11-09 : « Il est vendu par le marchand humain des
  cités libres ») : **12 000 PO** de valeur (40 PO d'entretien).
- **Bruga Roc-Fendu** (Ogres des montagnes) vend des **cerbères** (10 500 PO de valeur, 35 PO d'entretien) ; **Kippa
  Ressortdor** (Gnomes des villes) des **molosses de guerre** (1 500 PO, 5 PO) (Idan, 2026-11-09).
- Les papillons (Idan, 2026-11-09) : **Callie Loincompas** (Explorateurs) le **papillon télépathe** (900 PO de valeur, 3 PO
  d'entretien), **Jasper Bonnebourse** (Halflings des cités humaines) le **papillon vénéneux** (1 200 PO, 4 PO), **Dottie
  Mielbruyère** (Halflings des villages isolés) le **papillon géant** (3 000 PO, 10 PO) ; ils logent à la Serre.
- **Fizzi Doigts-Légers** (Gobelins des villes) vend des **loups** (Idan, 2026-11-07 : « Marchand gobelin », « Gobelin des villes ! ») : 3 000 PO de valeur (10 PO d'entretien).
- **Acheter** demande une place libre dans son logement (doc 11 §8 : les Écuries, le Chenil pour un loup) ; la monture rejoint l'Intendance (onglet **Montures**).
- **Vendre** : depuis l'Intendance, comme tout objet ; une monture donnée à un mercenaire n'y est plus, on ne peut pas la vendre.

## 13 — Étapes suivantes

1. Les autres marchands (Idan prépare leurs personae).
2. **Négociation**, sur le modèle de celle de la Taverne (doc 14 §9).
