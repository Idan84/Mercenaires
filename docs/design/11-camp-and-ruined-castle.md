> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Camp & château en ruines

<aside>
🏰

**Camp = château en ruines à restaurer.** La couche stratégique est une interface **2D cliquable**, façon XCOM / jeu de gestion mobile. Le joueur ne se promène pas librement en 3D dans le château.

</aside>

## 1 — État initial

La partie commence avec le château en ruines comme future base de la compagnie.

Éléments de départ retenus :

- **Taverne** à proximité / « au coin de la rue » ;
- **Dortoir : capacité 25** (portée de 20 à 40 par Idan le 2026-10-03, ramenée à 25 le 2026-11-01) ;
- **10 000 pièces d’or** (portées de 1 000 à 10 000 par Idan le 2026-10-03, les salaires ayant été multipliés par 10 ; l’or de départ et les revenus seront recalés ensemble plus tard) ;
- l’**Initial Squad** générée par la fonction déjà existante.

Les constructions et améliorations doivent progresser en **jours**.

## 2 — Taverne

La taverne est le **cœur du début de partie**.

Elle est tenue par un **vieux nain caustique**, personnage récurrent et aide volontaire : il n’est pas un assistant omniprésent qui dit au joueur où cliquer ; le joueur vient lui parler quand il le souhaite.

Fonctions validées :

- recrutement de mercenaires ;
- consultation des missions proposées ;
- améliorations permettant davantage de candidats et davantage de missions ;
- achat de renseignements supplémentaires sur les missions.

<aside>
🍺

**Un candidat est généré avant son recrutement.** Les mercenaires présents à la taverne sont de vrais objets `Mercenary` déjà générés et peuvent rester disponibles pendant plusieurs jours / semaines. Ils ne sont pas régénérés au moment où le joueur clique sur « recruter ». Cela permet notamment les candidats qui traînent longtemps à la taverne faute de succès.

</aside>

### La Cantine (Idan, 2026-11-08)

> « On ajoute également un autre bâtiment ! La cantine ! On la construit pour 500Po comme les autres. On monte le niveau de la cantine (de 1 à 10) qui multiplie l'effet. Niveau 1 : 40. L'effet fait monter l'XP d'une carac en fonction du plat que l'on cuisine. Cela touche automatiquement tous les mercenaires au camp (blessé et fatigués compris) mais pas ceux à l'exterieur (en mission). On va avoir 10 plats. […] A partir du niveau 2 du laboratoire d'alchimie, […] le cantinier nous propose de débloquer un nouveau plat. On ne sait pas ce qu'il fait avant de l'avoir débloqué. Ensuite, on peut choisir le plat de la cantine » ; « 40 × niveau : oui » ; « 500 × n² : oui » ; « Débloquage gratuit. Le premier est inclus dans la construction du bâtiment » ; « Perso du décor. En fait, mieux. C'est le tavernier. Et c'est pas un bâtiment, mais une salle à la taverne. »

- **Une salle de la Taverne**, où cuisine le tavernier : le bouton **La Cantine** de la Taverne (`camp-buildings.json`, ligne `canteen`, `lieu` taverne ; elle n'apparaît pas dans Ma Compagnie). Elle se construit et monte comme les autres bâtiments : **10 niveaux, 500 × n² PO** (500, 2 000, 4 500… 50 000) et 4 × n jours de chantier.
- **Chaque matin**, le **plat du jour** donne **40 × niveau XP** (`canteen.xp_per_level`) dans sa caractéristique à **chaque mercenaire présent au camp** : blessés, fatigués et prisonniers du Cachot compris ; pas à ceux qui sont partis (contrat, chasse, garde du corps). Pas de multiplicateur.
- **Dix plats**, un par peuple (`canteen-dishes.json`) : Force — Ragoût de Mamie Ogresse (Ogre) ; Endurance — Fromage au lait de poule (Nain) ; Vitesse — Hérisson rôti à la sauce des bois (Reptilien) ; Perception — Poêlée de champignons (Gnome) ; Esquive — Lapin rôti et ses carottes confites (Gobelin) ; Chance — Tourte aux trèfles (Halfling) ; Constitution — Soupe de Géant Vert (Orc) ; Intelligence — Têtes de harengs (Elfe) ; Courage — Chili aux piments doux (Homme-bête) ; Dextérité — Tataki d'hirondelle (Humain).
- **À l'ouverture**, le plat du **peuple du capitaine** est au menu. Ensuite, **un nouveau plat par niveau du Labo d'alchimie à partir du niveau 2** (`canteen.unlock_from_lab_level` ; au niveau 10 du Labo, les dix plats) : le tavernier en propose un, tiré au hasard parmi les autres, dont on ne voit que le nom ; on le **goûte gratuitement**, et son effet est alors connu. Le plat du jour se choisit parmi les plats goûtés (« augmente la Force ») ; il ne change pas tout seul.
- Journal du matin : « La Cantine sert … : +40 XP de … pour N mercenaires (M gagnent un point). »
- Code : `game-core/canteen.js` (règles), `campaign.js` (le matin), `prototype-web/canteen-ui.js` (écran). Test : `tests/canteen.test.js`.

### Renseignements sur les missions

Au lieu d’une salle des cartes dédiée, l’information supplémentaire passe par **un vieux type louche qui connaît un mec qui connaît un mec…**

Les renseignements sont **payants** et peuvent révéler progressivement des informations normalement cachées sur une mission : ennemis, terrain, effectifs, danger, objectif secondaire, butin, etc. La liste exacte d’informations et les tarifs restent à définir.

## 3 — Bureau du Capitaine

Lieu de gestion administrative de la compagnie.

Fonctions envisagées / retenues :

- budget ;
- affectation des mercenaires ;
- politiques de compagnie ;
- éventuellement exposition d’une partie des trophées.

## 4 — Dortoir

Le dortoir fixe la **capacité maximale de mercenaires** hébergés.

- capacité initiale : `25` (Idan, 2026-11-01 : « on est tranquille pour tout le monde » ; constante `camp.dormitory.initial_capacity`). L'escouade initiale prend 22 places au plus (humains, nains, orcs, garde-fou des domaines compris) ;
- places occupées (Idan, 2026-10-24) : un **ogre prend deux places** ; un **halfling, un gnome ou un gobelin une demi-place** ; tout autre mercenaire **une** (`peoples.json`, colonne `places_dortoir`) ; le **capitaine** et l'**intendant** n'en prennent pas ;
- dortoir plein (moins de places libres que n'en demande le candidat) : **impossible de recruter** ; de même, l'intendant ne peut pas **revenir sur le terrain** s'il n'y a plus de place pour lui ;
- **agrandissement** (Idan, 2026-10-25) : **+5 places** à chaque fois, **sans limite** ; chaque agrandissement coûte plus d'or et de jours que le précédent. Le k-ième (k = 1 pour passer de 25 à 30 places) coûte **100 × 1,2^(k−1) PO**, arrondi à 10, et dure **2 + ⌊(k−1)/3⌋ jours** (constantes `camp.dormitory.expansion_*`, formule de JC). Un chantier à la fois au dortoir (agrandissement ou qualité) ; l'or est payé au lancement ; les places sont prêtes le matin du jour où le chantier se termine. Interface (Idan, 2026-10-25) : **Ma Compagnie** montre le dortoir (places, qualité, chantier en cours) et un bouton « Aller au dortoir » ; l'**écran Dortoir** propose d'agrandir ou d'améliorer, sur un **fond plein écran qui dépend du niveau de qualité** (onze images de Jean-Mimi, une par niveau, colonne `image` de `dormitory-quality.json`) ;

  | Places | Ce palier | Total depuis 25 places |
  |---:|---|---|
  | 30 | 100 PO, 2 jours | 100 PO, 2 jours |
  | 40 | 140 PO, 2 jours | 360 PO, 6 jours |
  | 60 | 300 PO, 4 jours | 1 290 PO, 19 jours |
  | 80 | 620 PO, 5 jours | 3 220 PO, 37 jours |
  | 100 | 1 280 PO, 6 jours | 7 200 PO, 60 jours |
  | 150 | 7 950 PO, 10 jours | 47 180 PO, 142 jours |
  | 200 | 49 220 PO, 13 jours | 294 820 PO, 257 jours |

- **qualité** (Idan, 2026-10-25) : **dix niveaux** au-dessus du niveau 0 (`data/reference/dormitory-quality.json`, modifiable niveau par niveau). Atteindre le niveau n coûte **500 × n² PO** et **3 × n jours** (formule de JC). Chaque niveau atteint donne **+50 de Renommée** à la compagnie, pour de bon (part « dortoir » de la Renommée, doc 09 §2), et **+5 d'affinité** avec le capitaine à **chaque membre de la compagnie** ce jour-là, en expédition compris, capitaine exclu ; les recrues arrivées après n'ont rien. **Fatigue** (Idan, 2026-11-08 : « La qualité du dortoir réduit la fatigue de 10 % par niveau » ; colonne `fatigue`) : chaque niveau retire **10 % des jours de fatigue** au retour d'une mission ou d'une garde du corps (doc 10 §5), **arrondi au jour supérieur** ; **au niveau 10, plus de fatigue du tout**. Puis les **Bains chauds** (§9) retirent 1 jour par niveau, au moins 1 jour. Exemple : 7 jours de fatigue, dortoir 3 et Bains 2 → ⌈7 × 0,7⌉ − 2 = 3 jours. Nos animaux, qui logent aux Écuries et au Chenil, n'ont que les Bains. **Un seul chantier à la fois au dortoir** : agrandissement ou qualité. Noms des niveaux proposés par JC, validés par Idan ;

  | Niveau | Nom | Prix | Jours | Total investi | Renommée |
  |---:|---|---:|---:|---:|---:|
  | 0 | Paille humide | — | — | — | — |
  | 1 | Paillasses | 500 | 3 | 500 | +50 |
  | 2 | Châlits de bois | 2 000 | 6 | 2 500 | +100 |
  | 3 | Lits et couvertures | 4 500 | 9 | 7 000 | +150 |
  | 4 | Chambrées | 8 000 | 12 | 15 000 | +200 |
  | 5 | Chambrées chauffées | 12 500 | 15 | 27 500 | +250 |
  | 6 | Matelas de laine | 18 000 | 18 | 45 500 | +300 |
  | 7 | Bains et chambrées | 24 500 | 21 | 70 000 | +350 |
  | 8 | Chambres de quatre | 32 000 | 24 | 102 000 | +400 |
  | 9 | Quartiers de vétérans | 40 500 | 27 | 142 500 | +450 |
  | 10 | Quartiers de seigneur | 50 000 | 30 | 192 500 | +500 |

- piste pour plus tard (non retenue) : un prix de qualité qui dépend aussi de la taille du dortoir.
- **quartiers du lieutenant** (Idan, 2026-10-25) : ils se construisent au dortoir, **un par niveau pair de qualité** — le premier dès le niveau 0, le deuxième au niveau 2… le sixième au niveau 10. Le k-ième coûte **1 000 × k² PO** et dure **5 × k jours** (constantes `camp.lieutenant_quarter.*`, formule de JC validée par Idan). Même chantier que le dortoir : un seul à la fois. Un quartier loge un lieutenant.

  | Quartier | Dortoir requis | Prix | Jours |
  |---:|---:|---:|---:|
  | 1 | 0 | 1 000 | 5 |
  | 2 | 2 | 4 000 | 10 |
  | 3 | 4 | 9 000 | 15 |
  | 4 | 6 | 16 000 | 20 |
  | 5 | 8 | 25 000 | 25 |
  | 6 | 10 | 36 000 | 30 |

### Le lieutenant (Idan, 2026-10-25)

Règles validées par Idan ; formules proposées par JC et validées. En jeu : les quartiers (ci-dessus), la promotion (renégociation, refus définitif, affinité), l'aura, l'encart et le cadre, les demandes et le rapport du lendemain (`game-core/lieutenants.js`, `prototype-web/lieutenant-ui.js`, textes `lieutenant-dialogue.json`, constantes `lieutenant.*`).

- **Combien** : il faut **10 mercenaires par lieutenant** (20 pour le deuxième…) et **un quartier construit** par lieutenant. Le capitaine et l'intendant ne comptent pas dans les 10 ; les lieutenants, oui. Si l'effectif baisse ensuite, le lieutenant garde son grade, mais on ne peut pas en nommer d'autre. Le capitaine et l'intendant ne peuvent pas être lieutenant ; un lieutenant, qui reste sur le terrain, ne peut pas devenir intendant (JC, à confirmer).
- **Promotion** : on propose le poste à un mercenaire. Il accepte forcément, mais **renégocie son salaire** selon son Intelligence : il demande **salaire × (1 + Intelligence / 100)** (à 100 d'Intelligence, le double). **La prime de mission ne bouge pas.** On négocie comme avec une recrue (doc 14 §9, sur le salaire seul), sans pouvoir offrir moins que son salaire actuel ; il ne quitte pas la compagnie. Là où une recrue partirait, lui **refuse définitivement** de devenir lieutenant. Affinité : **+10** s'il est promu, **−10** s'il refuse.
- **Aura** : la formule du capitaine sur ses propres caractéristiques, divisée par deux : **17,5 % de son Courage + 12,5 % de son Charisme**, équipement compris, aux alliés à 10 cases ou moins. Les auras **ne s'additionnent pas** : un allié prend la plus forte à portée (capitaine ou lieutenant).
- **Interface** : un encart « Lieutenants » dans Ma Compagnie (le lieutenant, son aura et son salaire ; le poste libre avec « Proposer le poste à… », ou ce qui manque pour l'ouvrir) ; la promotion se négocie dans une boîte de dialogue, comme à la Taverne (on peut partir et reprendre) ; le lieutenant reste dans Mes mercenaires, avec un cadre doré et son grade ; au combat, le journal dit « aura du lieutenant » quand c'est la sienne qui joue.
- **Demandes** (lieutenant au camp, **une demande par jour**) : « rendre tel mercenaire un peu plus courageux » ou « un peu plus respectueux ». Chance de réussite = **10 + 80 / (1 + e^(−Δ/20))**, avec Δ = moyenne (Charisme, Intelligence) du lieutenant − Volonté du mercenaire (25 % à Δ = −30, 50 % à 0, 75 % à +30). Gain = **20 % de l'écart** entre le lieutenant et le mercenaire (Courage contre Courage, ou affinité avec le capitaine contre affinité avec le capitaine), au moins +1 et au plus +10. **Si le lieutenant n'a pas plus de Courage (ou d'affinité) que le mercenaire, la demande échoue forcément.** Le lendemain, le lieutenant donne le résultat dans une pop-up : échec, il ne se passe rien ; succès, la valeur pour le courage, et pour l'affinité seulement « il vous respecte un peu plus ». **30 jours** entre deux demandes du même type pour un même mercenaire. En jeu (JC, à confirmer) : on parle au lieutenant depuis l'encart de Ma Compagnie (bouton « Parler », pas quand il est en mission) ; la cible est n'importe quel membre de la compagnie au camp, sauf le capitaine et le lieutenant lui-même ; la chance compte le Charisme, l'Intelligence et la Volonté **équipement compris** (chapeau, culotte, amulette…) ; le Courage comparé et gagné est le Courage de base, gagné pour de bon ; une demande échouée compte pour les 30 jours ; plusieurs rapports le même matin s'affichent l'un après l'autre et entrent au journal.

## 5 — Salle de sport / terrain d’entraînement / cour intérieure

Un **seul concept de bâtiment** regroupe ces fonctions.

Il sert aux entraînements :

- physiques ;
- techniques ;
- martiaux / maîtrise d’armes.

Il doit accueillir une partie du système d’XP choisie au camp.

## 6 — Petit salon

Lieu d’entraînement et de travail des **capacités mentales**.

Le décor peut assumer le gag du beau canapé / divan de psychanalyse.

## 7 — Tours de magie

Fonctions :

- apprentissage des sorts ;
- entraînement des écoles de magie ;
- développement des capacités magiques.

**École de magie et ses salles** (Idan, 2026-11-01 : « on commence simple et sans graphisme » ; données
`camp-buildings.json`, code `game-core/campaign.js`, encart dans **Ma Compagnie**) :

- **un seul bâtiment, l'École de magie**, à construire puis **10 niveaux** ;
- **une salle par école de magie** (Feu, Eau, Foudre, Vie, Nécromancie, Illusion, Invocation, Transmutation,
  Télékinésie), chacune avec ses **10 niveaux**, et **au plus au niveau atteint par l'École** : une École de niveau 3
  permet des salles jusqu'au niveau 3 ; le niveau de l'École encore en chantier ne compte pas ;
- même barème que les autres bâtiments du camp (JC3, en attendant les prix d'Idan) : le niveau n coûte **500 × n² PO**
  et **4 × n jours** (niveau 10 : 100 000 PO et 40 jours ; 385 000 PO pour les dix niveaux) ; **un chantier par bâtiment
  et par salle**, en parallèle les uns des autres et du dortoir ; l'or est payé au lancement, le niveau est atteint le
  matin du dernier jour ;
- **places** (Idan, 2026-11-01) : **1 place, +1 tous les 2 niveaux** (1 + ⌊niveau ÷ 2⌋), pour l'École elle-même (la
  salle généraliste : Puissance magique, Réserve de mana) comme pour chaque salle d'école ; 6 au niveau 10, **60 places**
  quand tout est au niveau 10 (`camp-buildings.json`, colonnes `places_base` et `places_pas`). Affichées dans chaque
  encart (« Niveau 3 · 2 places ») ; elles serviront aux mercenaires qui viennent s'y entraîner ;
- **pas encore d'effet** : l'apprentissage des sorts, l'entraînement (Puissance magique, Réserve de mana, sorts,
  écoles) et le rôle des niveaux sont en discussion. Déjà retenu par Idan : chaque niveau de l'École réduira le temps
  d'apprentissage (par exemple −10 %) ;
- interface : l'encart de l'École (niveau, bouton du prochain niveau avec son prix) ; une fois l'École construite, ses
  neuf salles dedans, une ligne chacune ; le bouton d'une salle est grisé tant que l'École n'a pas le niveau voulu
  (« École de magie niveau 3 requise »). Pas d'écran à part ni d'image pour l'instant.

**Directeur de l'École** (Idan, 2026-11-01 : « même mécanisme pour la nomination que l'intendant » ; règles
`game-core/school-director.js`, panneau `prototype-web/school-director-ui.js`, textes `school-director-dialogue.json`) :

- on peut nommer un directeur **une fois l'École construite** (le premier niveau en chantier ne suffit pas) ; un seul ;
  ni le capitaine, ni un lieutenant, ni l'intendant, ni le médecin ;
- **il peut refuser, même règle que l'intendant** (doc 14) : même envie (40 − 0,6 × Courage + 2 × Missions + 8 ×
  Blessures, de 2 à 95 %), même retour sur le terrain (60 − envie + 1 par jour en poste), même effet d'un refus sur
  l'affinité (± (Intelligence − Courage) / 10, flatté une seule fois), une proposition par jour ;
- c'est un **mercenaire hors mission, comme l'intendant et le médecin** (Idan : « tu as tout bon ») : il reste au camp,
  vit à l'École (pas de place au dortoir), ne part ni en mission ni en garde du corps, ne devient pas lieutenant et ne
  compte pas pour les 10 mercenaires d'un lieutenant ; il passe dans Ma Compagnie ;
- pas de Renommée ni de bonus en dehors de l'**entraînement libre** (ci-dessous), où son Charisme, son affinité avec
  l'élève, son niveau et sa Transmission du savoir comptent ;
- **interface** : en haut de l'Intendance, à côté de l'intendant et du médecin ; « Nommer un directeur de l'École »
  (la meilleure école de chaque candidat, les meilleurs d'abord), puis sa fiche compacte (sa meilleure école et depuis
  quand il est en poste au survol) et « Le renvoyer sur le terrain » ; fiche du mercenaire : « Jours à la tête de
  l'École » et son historique.

**Entraînement libre** (Idan, 2026-11-02 : « un mercenaire hors mission, pas blessé pas fatigué ne restera pas oisif au
camp […] il faut tous les jours un ordre de tirage pour tous les mercenaires dispo » ; règles
`game-core/school-training.js`, matin du camp `game-core/campaign.js`, constantes `school.training.*`) :

- **chaque matin**, une fois l'École construite : d'abord le **capitaine**, à la place choisie par le joueur (Idan : « on
  choisit pour le cap et on est prioritaire »), **sans test** ; puis les mercenaires **disponibles** (au camp, ni
  blessés, ni fatigués, ni en mission — même programmée —, ni intendant, médecin ou directeur), **dans un ordre tiré au
  hasard** ;
- chacun vise **la salle de sa meilleure école** si elle est construite et a une place libre, **sinon la salle
  généraliste** (l'École elle-même) ; plus de place : il passe la journée à la taverne, sans test ;
- **test** : chance = **100 / (1 + e^(−Δ/15))**, de 2 à 95 %, avec **Δ = (Volonté − 50) / 2 + (meilleure école − 70) +
  Charisme du directeur / 10 + affinité avec le directeur / 10** (affinité calculée comme avec le capitaine : peuple,
  culture, alignement ; −100 à +100). Réussi : il prend la place ; raté : la taverne. La meilleure école d'une recrue
  vaut 78 en médiane (600 recrues mesurées) : doué (Volonté 50, école 100) 88 % ; recrue moyenne (50, 78) 63 % ; peu
  doué (40, 40) 9 % ; sans école 2 % ;
- **gain par jour** = **80 × Intelligence / 50 (20 avant le bêta-test, puis 40 : XP doublée deux fois, Idan, 2026-11-07 et 2026-11-08) × (1 + 0,1 × niveau de la salle) × (1 + niveau du directeur / 100) ×
  (1 + Transmission du savoir du directeur / 100)**, arrondi ; niveau du directeur : son école dans la salle de cette
  école, sa Puissance magique dans la salle généraliste ; sans directeur, ces deux facteurs valent 1. Exemples :
  salle 1 sans directeur (Intelligence 54) **95 XP** ; salle 3, directeur à 100 et Transmission 48 **332 XP** ;
  salle 10, directeur à 120 et Transmission 70 (Intelligence 70) **838 XP** ;
- **salle d'une école** : l'XP va à cette école ; ses **deux écoles opposées perdent chacune un quart** du gain (comme sur
  le terrain, doc 12) ; **salle généraliste** : l'XP va à la **Puissance magique** ;
- **le directeur** gagne **20 XP de Transmission du savoir par élève et par jour** (doublé deux fois après le bêta-test, Idan, 2026-11-07 et 2026-11-08) ;
- l'entraînement ne bloque rien : un élève reste disponible pour partir en mission ;
- **interface** : dans l'encart de l'École, chaque salle montre ses places prises (« 1/2 places », les élèves et leur
  XP au survol) ; sous les salles, « Le capitaine » (À la taverne, Salle généraliste ou une salle construite), valable
  dès le lendemain matin ; une ligne au journal du matin (« École de magie : 3 élèves aujourd'hui. ») ; dans la fiche,
  onglet Camp, la carte « Aujourd'hui » (la salle et l'XP, ou « À la taverne »).
- À venir : le ludus (entraînement au combat), et le choix du mercenaire entre la magie et le combat selon ses goûts.

**Apprendre un sort** (Idan, 2026-11-02) : avec le manuel, dans la salle de l'école du sort, l'élève y prend une place
avant l'entraînement libre et reste au camp jusqu'à ce qu'il connaisse le sort ; un professeur facultatif ; règles et
chiffres au doc 12 (« Apprendre un sort à l'École »).

### Bâtiments d'entraînement (conception en cours, Idan, 2026-11-02 et 2026-11-03)

Sur le modèle de l'École de magie : un bâtiment, un maître nommé, une **salle principale** (ce qu'on y travaille sans
aile construite) et des **ailes**. **En jeu** (Idan, 2026-11-03 : « Je te laisse coder Ludus / Survie / Fines Lames »)
: les trois bâtiments se construisent puis montent de 1 à 10, au même barème que les autres (niveau n = 500 × n² PO et
4 × n jours) ; leurs ailes montent au plus au niveau de leur bâtiment ; dans Ma Compagnie, chacun montre ce qu'il
travaille devant son état, l'info-bulle au survol du nom (`camp-buildings.json`, colonne `entraine`). Test :
`tests/training-buildings.test.js`.

**Entraînement libre dans tous les bâtiments** (Idan, 2026-11-03 : « Là où il est le plus doué à 75 % de chance, sinon au
hasard » ; « Le reste, c'est nickel ») — remplace le choix de l'École (sa meilleure école, sinon la salle généraliste) :

- chaque matin, le capitaine d'abord, dans la salle ou l'aile choisie par le joueur, de n'importe quel bâtiment
  d'entraînement (« Le capitaine », sous les bâtiments, les salles rangées par bâtiment), sans test ;
- puis chacun, dans un ordre tiré au hasard : à **75 %** (`camp.training.talent_share`), il va là où il **se classe le
  mieux dans la compagnie** (la part de ses camarades qu'il dépasse, pour ce que travaille la salle ; les échelles ne se
  comparent pas : résistances 4 à 8, caractéristiques 55, armes 28, meilleure école 75 en médiane), parmi les salles et
  ailes qui ont une place libre ; sinon **au hasard** parmi elles ; plus de place nulle part : la taverne ;
- **test** : à l'École, celui de l'École ; ailleurs, 100 / (1 + e^(−Δ/15)), de 2 à 95 %, Δ = (Volonté − 50) / 2 (une chance
  sur deux pour un mercenaire moyen sans maître) + Charisme du maître / 10 + affinité avec le maître / 10 ;
- **gain** : 20 × carac / 50 × (1 + 0,1 × niveau) × (1 + niveau du maître / 100) × (1 + Transmission du savoir du maître
  / 100), la carac de chaque bâtiment (`apprend_avec`) : **Intelligence** (École), **Endurance** (Ludus), **Volonté**
  (Académie), **Dextérité** (Cercle) ; caractéristiques et résistances montent ; une arme, une catégorie ou un style fait
  reculer les autres comme en combat (doc 08) ;
- **places** : 1, +1 tous les 2 niveaux, pour chaque salle principale et chaque aile ;
- journal du matin : une ligne par bâtiment (« Ludus : 2 élèves aujourd'hui. ») ; fiche, onglet Camp, « Aujourd'hui » :
  la salle, l'XP et ce qu'elle travaille ;
- **maîtres** (Idan, 2026-11-03 : « Oui pour les maîtres ») : **le Doctore** (Ludus), **le Vétéran** (Académie), **le Maître
  des lames** (Cercle ; nom d'Idan), puis **l'Alchimiste** (Labo d'alchimie ; pas de maître à la Tour de guet, à la Cabane du bûcheron ni à la Guilde des mineurs), nommés **comme le directeur** : bâtiment construit, même chance d'accepter, même
  refus, même retour sur le terrain, une proposition par jour ; hors mission, ils vivent dans leur bâtiment (pas de place
  au dortoir) ; un mercenaire ne tient qu'un poste (intendant, médecin, directeur, maître, lieutenant). Ils aident comme
  le directeur à l'École : même test, même gain ; **niveau du maître** : sa valeur dans ce que travaille la salle ou
  l'aile (sa Force à la Meule, sa Résistance au feu au Four…) ; chacun gagne **20 XP de Transmission du savoir par élève
  de son bâtiment et par jour**. Intendance : un panneau par maître, à côté du directeur, une fois le bâtiment construit
  (la liste montre ce que travaille la salle principale) ; fiche : statut, journal et jours en poste. Code :
  `camp-posts.js`, `school-director.js` (paramètre `post`), `school-training.js` ; textes : `camp-masters-dialogue.json`.

**Ludus** (validé, noms compris) — maître : **le Doctore**.

| Aile | Travaille | Info-bulle |
|---|---|---|
| **La Cour** (salle principale) | Résistance physique | « Le Doctore frappe. On encaisse. Jusqu'à ce que ça ne fasse plus mal. » |
| **La Meule** | Force | « On pousse la meule à la place de l'âne. L'âne, lui, se repose. » |
| **La Longue Piste** | Endurance | « Dix tours du camp en armure. Le onzième, c'est pour avoir demandé combien il en restait. » |
| **La Course au Cochon** | Vitesse | « Le cochon est graissé. Le vainqueur le garde. Personne n'a encore gagné. » |
| **La Quintaine** | Esquive | « On frappe le mannequin, il tourne et rend le coup. On apprend vite à se baisser. » |
| **Le Réfectoire du Doctore** | Constitution | « Six œufs crus au réveil, bouillie et viande de cheval. Le corps suit, ou pas. » |

**Académie de la survie** (validée, noms compris) — maître : **le Vétéran**. Dans le bâtiment lui-même, sans aile à
construire (Idan : « on ne construit rien de plus ») : les **Boucliers** (salle principale) et l'**apprentissage des
armures** (les ports d'armure, légère puis intermédiaire puis lourde, appris comme un sort ; voir ci-dessous).

| Aile | Travaille | Info-bulle |
|---|---|---|
| **Le Four** | Résistance au feu | « On y entre en armure. On en ressort cuit à point, ou endurci. » |
| **Le Frigo** | Résistance au froid | « Une nuit dans la glacière. Le Vétéran appelle ça “se rafraîchir les idées”. » |
| **La Décharge** | Résistance à la foudre | « Un mage en colère, une flaque d'eau, et vous dedans. » |
| **L'Assommoir** | Résistance au poison | « Le plat du jour est toujours un test. Personne n'a jamais su lequel. » (Nommée « La Cantine » jusqu'au 2026-11-08 ; Idan : « L'assommoir en référence à l'absinthe et à Zola », pour ne pas la confondre avec la Cantine de la Taverne.) |
| **Le Placard** | Discrétion | « On s'y cache pendant que le Vétéran vous cherche. Il cherche encore le dernier. » |

**Apprendre une armure à l'Académie** (Idan, 2026-11-03 : « comme un sort » ; Force + Endurance : « Parfait » ; « pas de
professeur pour ça » ; sans le port, pas d'armure : doc 03 ; règles `game-core/armor-study.js`, interface
`prototype-web/armor-study-ui.js`, textes `armor-study-dialogue.json`) :

- **dans l'ordre** : légère, puis intermédiaire, puis lourde ; **pas de manuel**, le seul coût est le temps ;
- **le convaincre**, comme pour un sort : 10 + 80 / (1 + e^(−Δ/20)), **Δ = 0,5 × affinité avec le capitaine** + l'appui de
  l'intendant (50 % à affinité 0) ; une tentative par jour ; le capitaine sans test ;
- **au jour J, on organise J+1** : il entre à l'Académie le lendemain matin (« Annuler » d'ici là) ; il prend **une place
  de la salle principale** (avant l'entraînement libre) et reste au camp — ni mission, ni garde du corps, ni
  entraînement libre, ni sort à l'École — jusqu'à ce qu'il sache ;
- **chaque matin**, à partir du matin suivant son entrée : chance = **100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 × niveau de
  l'Académie)**, au plus 95 %, **X = (Force + Endurance) / 2 − 10 par cran** (0 légère, 10 intermédiaire, 20 lourde)
  **+ Transmission du savoir du Vétéran / 5** s'il a lui-même ce port ; réussi : il a ce port et ceux d'en dessous. Moyen
  (Force 54, Endurance 59), Académie niveau 1 : légère 11 % (**9 jours**), intermédiaire 7 % (14 jours), lourde 4 %
  (23 jours) ; avec un Vétéran à 48 de Transmission : légère 17 % (6 jours) ;
- **le faire sortir** avant la fin : rien n'est acquis ;
- **affinité avec le capitaine**, comme pour un sort : +5 à l'entrée, −2 s'il refuse, +10 quand il sait, −10 si on le fait
  sortir ; le Vétéran gagne **20 XP de Transmission du savoir par élève et par jour** (doublé deux fois après le bêta-test, Idan, 2026-11-07 et 2026-11-08) ;
- **interface** : sur la carte de l'Académie, « Apprendre une armure » (les membres et le port qu'ils apprendraient ;
  plus de place : plus de bouton), puis « Apprentissages » (l'armure, le jour, la chance du lendemain au survol,
  « Annuler » ou « Le faire sortir ») ; statut « Apprend une armure » ; journal du matin ; historique.
- Constantes : `spell_study.*` (les mêmes que pour un sort), `armor_study.daily.class_malus`,
  `armor_study.daily.veteran_divisor`. Test : `tests/armor-study.test.js`.

**Le Cercle des Fines Lames** (validé, noms compris) — maître : **le Maître des lames** ; salle principale : **Dextérité** ;
ailes (des salles à construire, « comme les autres »).

| Aile | Travaille | Info-bulle |
|---|---|---|
| **La Salle des Miroirs** | Lames longues | « On s'y bat contre son reflet. Il triche. » |
| **Le Boudoir** | Lames courtes | « Les dagues, les confidences et les coups bas. » |
| **Le Bal masqué** | Combat à deux armes | « Une rapière, une main-gauche, et surtout ne pas marcher sur les pieds. » |
| **Le Salon de thé** | Combat à une main | « La tasse dans une main, l'épée dans l'autre. Ne rien renverser. » |

Deuxième fonction (Idan, 2026-11-03 : « On garde juste l'augmentation de la prime, pas la fréquence ») :
on y croise des nobles, le **paiement d'une garde du corps × (1 + 5 % par niveau du Cercle)**, arrondi à 10 PO, pour
les offres qui arrivent au tableau (`garde_paie_par_niveau`, doc 17 §12) ; +50 % au niveau 10. La fiche de l'offre
montre le paiement, sans commentaire.

**La Tour de guet** (Idan, 2026-11-03) — salle principale **La Vigie** : **Perception** (« Là-haut, on voit venir les
ennuis. Et la pluie. ») ; une aile, **Le Créneau** : **Armes de tir** (« On tire sur tout ce qui approche. Le facteur ne
passe plus. ») ; les élèves apprennent avec leur **Perception** (`apprend_avec`). Même barème et mêmes places que les
autres bâtiments, entraînement libre compris. Ni Armes à feu, ni Pièges, ni Courage, ni Volonté (« Non »). **Pas
d'instructeur** (Idan : « Immobiliser un mercenaire pour si peu me semble de trop… Peut-être qu'on fera un chef pour
plusieurs bâtiments… Mais on verra ») ; **pas de deuxième fonction** pour l'instant (« Rien pour l'instant ! ») : anticiper
les attaques du camp viendra avec la défense du camp.

**Le Labo d'alchimie** (Idan, 2026-11-03 : « Dans la salle principale, on peut entraîner sa résistance au poison » ; « piège
et armes à feu, c'est validé ») — chef de salle : **l'Alchimiste** (« En fait, on va nommer un alchimiste comme chef de
salle ! » ; nommé et aidant comme les autres maîtres) ; salle principale **L'Alambic** : **Résistance au poison** (« Ça bout, ça
fume, ça sent le chou. Personne ne sait ce que c'est. ») ; ailes **La Poudrière** : **Armes à feu** (« On y apprend à
charger, à viser… et surtout à ne pas fumer. ») et **La Cave** : **Pièges** (« Chaque marche est un piège. La rampe
aussi. ») ; les élèves apprennent avec leur **Intelligence**. Même barème et mêmes places que les autres bâtiments. Les
**potions** (préparation, ingrédients, recettes) viendront avec la fabrication, qui fera monter l'Alchimie (« On verra
après pour le craft qui lui fera monter le niveau d'alchimiste »).

**Apprendre l'Empoisonnement des armes au Labo** (Idan, 2026-11-03 : « Ça doit dépendre d'intelligence, de dextérité (pour
pas en mettre partout !) et de résistance au poison (au cas où on en met partout) » ; « Oui, vas-y ») — comme un port
d'armure à l'Académie (même conviction, entrée le lendemain matin, une place de l'Alambic, au camp jusqu'à la fin, même
affinité, rien d'acquis si on le fait sortir) ; chaque matin, chance = 100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 × niveau du
Labo), au plus 95 %, **X = (Intelligence + Dextérité) / 2 + Résistance au poison + Transmission du savoir de
l'Alchimiste / 5** s'il a lui-même l'aptitude. Labo niveau 1 : 10 % les moins doués ~13 jours, médiane ~7 jours (~5 avec
un Alchimiste à 48), 10 % les meilleurs ~3 jours ; l'Alchimiste gagne 20 XP de Transmission par élève. Carte du Labo :
« Apprendre l'empoisonnement », « Apprentissages » ; statut « Apprend l'empoisonnement » ; journal ; historique. Un
seul apprentissage à la fois (sort, armure ou empoisonnement). Constantes `poison_study.daily.*` ; code
`game-core/armor-study.js` (course "poison") ; test `tests/poison-study.test.js`.

**La Cabane du bûcheron** (Idan, 2026-11-03 : « On aura une salle d'entraînement aux haches, mais l'idée c'est d'envoyer des
mercenaires bûcheronner pour accélérer la construction du camp. Pas une ressource de bois […] sur les constructions
actuelles de niveau 1 à 5 (y'aura la mine pour 6 à 10). On peut envoyer 1 mercenaire par niveau de cabane » ; « Pas de chef
pour l'instant » ; « Parfait. ») — salle principale **Le Billot** : **Haches** (« On fend du bois toute la journée. Le bois,
lui, ne se défend pas. »), apprises avec la **Force** ; même barème et mêmes places que les autres bâtiments, entraînement
libre compris ; pas d'aile.

Deuxième fonction, **les bûcherons** (corvée ; Idan, 2026-11-04 : « on va mettre les mercenaires en durée indéterminée.
On peut les retirer quand on le souhaite. Par contre, chaque jour fait baisser l'affinité » ; « Dans les 3 cas, ils peuvent
refuser. -1 par jour c'est bien ») :

- **1 bûcheron par niveau** de la Cabane (`camp.lumber.workers_per_level`), places prises tant qu'ils y restent. Au jour J,
  on organise J+1 : on l'envoie aujourd'hui (carte de la Cabane, « Envoyer bûcheronner »), il commence demain matin et
  continue chaque jour **jusqu'à ce qu'on le retire** (« Retirer ») ; retiré, il est libre le lendemain (mission, garde du
  corps, apprentissage, autre corvée). Tant qu'il y est : ni mission, ni garde du corps, ni entraînement libre, ni
  apprentissage. Ni l'intendant, ni le médecin, ni un maître à son poste, ni un blessé.
- **Il peut refuser** : chance d'accepter = 10 + 80 / (1 + e^(−Δ/20)), **Δ = 0,5 × affinité avec le capitaine − 30** +
  l'appui de l'intendant (comme pour un sort) ; ~25 % à affinité 0, 45 % à 50, 69 % à 100. Après un refus, **une relance**
  (§ « Relance après un refus » ci-dessous) : Intimider ou Convaincre, ou laisser tomber ; puis c'est non pour aujourd'hui.
  Le capitaine accepte toujours.
- **Chaque matin de travail : affinité −1** (`camp.lumber.daily_affinity`), **−2** s'il a été intimidé, **−0,5** s'il a
  été convaincu ; l'affinité perdue ne revient pas quand on le retire. Le capitaine ne perd rien. Le salaire de la corvée se
  règle à l'Intendance (« Politique sociale », doc 09 §7) : de 0 à 200 %, la perte du jour × (2 − taux ÷ 100) ; −1 à 100 %
  (par défaut), 0 à 200 %. Même chose pour les mineurs et le Palais, un curseur par corvée.
- **Effet fixe** : chaque bûcheron retire **1 jour** (`camp.lumber.days_per_worker`) au chantier **qui finit le plus tôt**
  (« A »), parmi ceux de **niveau 1 à 5** (`camp.lumber.max_work_level`) : un bâtiment (son niveau en construction) et le
  dortoir (« Oui ») — qualité : le niveau visé ; agrandissement : son rang ; quartier du lieutenant : son numéro. Un
  chantier finit au plus tôt le lendemain matin ; s'il n'y en a aucun, la journée est perdue. Le journal du matin dit les
  jours gagnés, chantier par chantier.
- Carte de la Cabane : « Bûcherons (2 / 3) », chacun avec « dès demain », « intimidé » ou « convaincu » s'il y a lieu.
  Statuts : « Bûcheronne demain », « Bûcheronne ». Constantes `camp.lumber.*` ; code `game-core/lumber.js` ; textes
  `lumber-dialogue.json` ; test `tests/lumber.test.js`. La **Guilde des mineurs** fait de même pour les chantiers de
  niveau 6 à 10.

**Relance après un refus** (Idan, 2026-11-04 : « On peut retenter via deux options de dialogues (ou laisser tomber) :
Intimider, Convaincre. On refait le test en ajoutant son intimidation ou son charisme (moitié du cha). En intimidation, ça
double la perte d'affinité. En charisme, ça la divise par deux » ; « valable pour tout test de refus » ; « Oui Go ! ») :

- après un refus, **une seule relance**, l'une ou l'autre, ou « Laisser tomber » ; puis c'est non pour aujourd'hui ;
- **Intimider** : le test est refait avec, en plus, l'**Intimidation du capitaine** (`persuasion.intimidate.weight`, médiane
  38) ; **Convaincre** : avec son **Charisme ÷ 2** (`persuasion.convince.weight`, médiane 27). Exemple, un test à 50 % :
  environ 77 % en intimidant, 70 % en convainquant ;
- la perte d'affinité qui suit est **× 2** si on l'a intimidé, **× 0,5** si on l'a convaincu (`persuasion.*.loss_factor`) :
  pour une corvée, la perte de chaque jour, pendant toute l'affectation ; pour les autres tests, la perte du refus si la
  relance échoue, celle de l'accord si elle réussit ;
- **apprentissages** (Idan, 2026-11-04 : « vas-y pour les apprentissages ») : proposer un sort, un professeur, un port
  d'armure, l'empoisonnement ; un refus coûte −2 d'affinité ; relance ratée : −4 en tout (intimidé) ou −1 (convaincu) ;
  relance réussie : il entre le lendemain matin comme d'habitude, mais **intimidé, il ne gagne pas les +5 du premier
  matin ; convaincu, il les garde** (Idan, 2026-11-04 : « B ») ; de même pour le professeur et ses +3
  (`persuasion.*.gain_factor`) ;
- code `game-core/persuasion.js` (bonus, facteur, refus du jour : une seule relance), `prototype-web/persuasion-ui.js`
  (les trois choix, la relance ajoutée au dialogue) ; textes communs `persuasion-dialogue.json` ; test
  `tests/persuasion.test.js`. Fait : les corvées, le Palais des plaisirs, les apprentissages, les échanges d'équipement
  (doc 05 : l'affinité de l'échange, perte × 2 ou × 0,5, gain annulé s'il a été intimidé) et les postes ;
- **postes** (Idan, 2026-11-04 : « Oui, vas-y pour les postes ») : intendant, médecin, directeur, maîtres, et leur retour
  sur le terrain ; leur chance est un pourcentage : la relance y ajoute l'Intimidation ou le Charisme ÷ 2, en points (au
  plus 95 %) ; si le refus tient : **vexé**, la perte × 2 (intimidé) ou × 0,5 (convaincu) ; **flatté**, le bonus est
  perdu s'il a été intimidé (il pourra être flatté une autre fois), gardé s'il a été convaincu ; accepté, rien ne change ;
- **la relance a échoué** : en plus de « Partir », « **Au cachot !** », s'il reste une cellule (§11, Le Cachot).

**La Guilde des mineurs** (Idan, 2026-11-04 : « même chose mais avec les pierres pour des bâtiments de lvl 6 à 10 et on y
apprend les armes contondantes » ; « Oui, oui et pareil ») — salle principale **Le Puits** : **Armes contondantes** (« On y
descend avec une lanterne, on en remonte avec un marteau. »), apprises avec la **Force** ; même barème et mêmes places,
entraînement libre compris ; pas d'aile, pas de chef.

Deuxième fonction, **les mineurs** — comme les bûcherons :

- **1 mineur par niveau** de la Guilde (`camp.mine.workers_per_level`), envoyé la veille (« Envoyer à la mine »), jusqu'à
  ce qu'on le retire ; mêmes exclusions.
- **Même test, même relance, même perte par jour** (« pareil ») : `camp.lumber.offer_offset`, `camp.lumber.daily_affinity`.
- **Effet** : chaque mineur retire **1 jour** (`camp.mine.days_per_worker`) au chantier de **niveau 6 à 10**
  (`camp.mine.min_work_level`, `camp.mine.max_work_level`) qui finit le plus tôt, dortoir compris (même lecture du niveau) ;
  les bûcherons ne touchent que les niveaux 1 à 5.
- **Une seule corvée à la fois** : pour passer de la Cabane à la mine, on le retire d'abord ; il peut descendre à la mine
  dès le lendemain.
- Statuts : « À la mine demain », « À la mine ». Code `game-core/lumber.js` (course "mine") et `prototype-web/lumber-ui.js` ;
  textes `mine-dialogue.json` ; test `tests/mine.test.js`.

**Les dernières armes** (Idan, 2026-11-04 : « Je voulais des nouvelles idées ! » ; l'Ermitage et le Hall des Berserkers sont
abandonnés) — même barème et mêmes places que les autres salles, entraînement libre compris :

- **La Caverne de la terreur** (« On y apprend par défaut le courage. On a une salle où on peut s'entraîner aux armes
  d'hast. On fait très simple pour l'instant, je pense qu'on pourra y récupérer des cristaux après ») — salle principale
  **La Gueule** : **Courage** (« On y entre en héros. On en ressort en courant. ») ; aile **Le Hérisson** : **Armes d'hast**
  (« Des piques partout, et quelque chose de gros derrière. ») ; apprises avec le **Courage** ; pas de chef.
- **Combat à deux mains** (« On va le mettre chez les bûcherons et chez les mineurs ») : aile **Le Merlin** de la Cabane du
  bûcheron (« Le merlin se tient à deux mains. La bûche n'a rien demandé. ») et aile **La Masse** de la Guilde des mineurs
  (« Une masse de carrier, deux mains, et la roche finit par céder. Le carrier aussi. ») ; apprises avec la **Force**.
- **Bâtons** (« On va mettre l'entraînement aux bâtons dans l'école de magie ») : la **Salle du Bâton** de l'École de magie
  (« Un bâton de mage, c'est d'abord un bâton. Demandez au gobelin qui a ri. »), comme les salles des écoles : au plus au
  niveau de l'École, l'Intelligence, le test et le directeur de l'École.
- **Le Sauna** des Bains chauds (« Dans les bains chauds, on peut faire le sauna où on peut s'entraîner au maximum de
  mana ») : **Réserve de mana** (« On transpire, on médite, on remplit sa réserve. Surtout de vapeur. »), appris avec la
  **Volonté** ; au plus au niveau des Bains (5). Les Bains eux-mêmes n'ont pas de places.
- **Armes flexibles** : au **Palais des plaisirs** (ci-dessous). **Combat à mains nues** : désactivé (doc 03).

Test : `tests/training-buildings.test.js`. Les compétences de camp (artisanat) attendront les bâtiments de fabrication.

**Le Palais des plaisirs** (Idan, 2026-11-04 : « Le bâtiment a un chef, le maître des plaisirs. On peut y faire travailler
nos mercenaires, ils rapportent des pièces d'or en fonction de leur charisme et de leur réputation. Il faut un test
d'affinité pour envoyer un mercenaire. On a une salle pour s'entraîner aux armes flexibles » ; « le charisme ne s'entraîne
pas. Les gains sont pas assez importants. Il faut que ça soit rentable d'y faire travailler des mercenaires. Le maître
augmente les gains » ; « Parfait » ; « vas-y pour le Palais ») — même barème que les autres bâtiments :

- salle principale **Le Grand Salon** (« Sourire, écouter, ne jamais annoncer son prix en premier. ») : on y travaille, on
  ne s'y entraîne pas ; une aile, **L'Arrière-salle** : **Armes flexibles** (« On y apprend le fouet. Officiellement, pour
  le dressage. »), apprises avec le **Charisme** ;
- chef : **le Maître des plaisirs** (la Maîtresse), nommé comme les autres maîtres, choisi sur son Charisme ; il aide
  l'entraînement de l'Arrière-salle et **multiplie l'or de chacun par 1 + son Charisme ÷ 200** (`camp.palace.master_divisor` ;
  Charisme 60 : + 30 %) ;
- **le travail**, comme les corvées : 1 par niveau du Palais (`camp.palace.workers_per_level`), envoyé la veille
  (« Envoyer au Palais »), jusqu'à ce qu'on le retire ; une seule corvée à la fois ; il peut refuser : **~50 % à affinité
  0**, 69 % à 50, 85 % à 100 (`camp.palace.offer_offset` = 0), et la relance (Intimider, Convaincre) ; **−1 d'affinité
  par jour** (`camp.palace.daily_affinity`), × 2 intimidé, × 0,5 convaincu ;
- **l'or de chaque journée = Charisme × (1 + 0,2 × niveau de réputation)** (1 à 15 ; `camp.palace.reputation_weight`),
  arrondi : ~55 PO pour un faible (Charisme 39, niveau 2), ~86 pour un moyen (54, niveau 3), ~124 pour un très bon (69,
  niveau 4) ; le salaire médian est de 48 PO. Journal du matin : « Palais des plaisirs : 273 PO. » ;
- statuts « Au Palais demain », « Au Palais » ; fiche : « Jours à la tête du Palais », nomination et retour sur le terrain.
  Code `game-core/lumber.js` (course "palace"), `game-core/camp-posts.js` ; textes `palace-dialogue.json`,
  `camp-masters-dialogue.json` ; test `tests/palace.test.js`.

## 8 — Bâtiments pour animaux et montures

Le château peut accueillir des structures spécialisées selon les espèces :

- écuries ;
- porcherie ;
- salle / antre pour dragon ;
- autres bâtiments spécifiques à définir.

Objectif : supporter des unités montées, y compris des compositions volontairement extravagantes comme une troupe se déplaçant sur plusieurs dragons.

### La Grange du dresseur et les Écuries (Idan, 2026-11-07)

> « On peut déjà créer un premier bâtiment, la grange du dresseur et y nommer un mercenaire maître. » « Ensuite, on peut créer des salles qui permettent de stocker des montures. Commençons par écuries et Nid de griffon. Avec les niveaux, on augmente le nombre de places disponibles pour le stockage. » « Un animal aura un coût d'entretien. » « On ajoute des montures aux ennemis. La monture est mise KO au combat. En fonction du type de monture, elle est capturable ou non. Pour chaque monture, on fait test de survie. Si elle survit et qu'on a de la place, elle est stockée dans l'enclos. » « Tout est validé ! »

- **Grange du dresseur** (`trainer_barn`) : à construire, puis 10 niveaux au barème habituel (niveau n = 500 × n² PO et 4 × n jours). Son maître, le **Dresseur** (Animal, Intelligence, Charisme, Intimidation) : nommé comme les autres maîtres (doc 08, poste `trainer`, choisi sur son Compagnon animal), il aide à apprivoiser.
- **Les Écuries** (`trainer_stables`), son aile : au plus au niveau de la Grange ; **2 places par niveau** (`places_par_niveau`), 20 au niveau 10. Le Nid de griffon viendra avec le griffon.
- **Le Chenil** (`trainer_kennel`, Idan, 2026-11-07 : « Il loge au chenil » ; « Parfait » pour le faire comme les Écuries) : l'autre aile de la Grange, mêmes prix et durées, 2 places par niveau. Chaque animal loge dans le sien (`mounts.json`, `logement`) : les chevaux et la licorne aux Écuries, le loup au Chenil ; chacun ses places. L'entretien du matin compte tous nos animaux (journal : « Animaux »).
- **Capture** : après une victoire, chaque monture **capturable** (`mounts.json`, `capturable`) restée KO sur la carte, et chaque **loup de la Cour de sang** (Idan, 2026-11-07 : « ceux de la cours de sang » ; `enemy-archetypes.json`, `capture`), passe le **test de survie** : le jet de mort de nos mercenaires (doc 10 §3 : à 0 PV ou plus, elle vit ; sous 0, mort = −1 000 × PV ÷ PV max − Volonté ÷ 20 %). Un cheval qui a fui, ou qui est parti avec son cavalier, est perdu.
- **Arrivée** : après un contrat, les montures rentrent **avec l'escouade** ; à son retour, chacune prend une place aux Écuries, sinon elle est **relâchée**. Dans la Mission Test, elles entrent tout de suite.
- **Le Pégase** (Idan, 2026-11-09 : « remplissons l'écurie avec le Pégase ! ») : aux Écuries, comme les chevaux ; **40 PO
  d'entretien**, rang d'échange 4, neutre bon, entêtement (Intelligence 80 + Volonté 70) ÷ 2 = **75** (un cran d'écart :
  25 % par jour ; trois : 1,6 %) ; titre « à dos de pégase » ; vendu par Aymeric Belcomptoir (doc 18) ; il vole et charge
  par les airs (doc 04).
- **Au Chenil, le cerbère et le molosse** (Idan, 2026-11-09) : le **cerbère** (35 PO d'entretien, rang d'échange 4, loyal
  mauvais, entêtement (20 + 60) ÷ 2 = 40, « à dos de cerbère », vendu par Bruga Roc-Fendu, des Ogres des montagnes ; 1 place)
  et le **molosse de guerre** (5 PO, rang 1, neutre mauvais, entêtement 25, vendu par Kippa Ressortdor, des Gnomes des villes ;
  **une demi-place** : `place`, « Il prend une demi place au chenil »). Les places prises comptent ces demi-places (l'écran le
  dit : « 1,5 / 2 »).
- **La Serre** (`trainer_greenhouse` ; Idan, 2026-11-09 : « J'ai envie de faire les papillons ! » ; « parfait » pour la
  Serre) : la troisième aile de la Grange, comme le Chenil (2 places par niveau ; on s'y entraîne avec son papillon :
  Papillons et Compagnon animal). Les petits papillons (télépathe, vénéneux) prennent **une demi-place**, le géant une
  place. **Papillon télépathe** (3 PO, chaotique bon, vendu par Callie Loincompas, des Explorateurs ; il ne se capture
  pas), **papillon vénéneux** (4 PO, chaotique neutre, vendu par Jasper Bonnebourse, des Halflings des cités humaines ; il
  se capture à la Chasse aux papillons), **papillon géant** (10 PO, neutre bon, « à dos de papillon » pour un petit qui le
  monte, vendu par Dottie Mielbruyère, des Halflings des villages isolés ; seulement vendu). Les fiches : doc 04.
- **Entretien** : chaque matin, **10 PO par destrier** (`mounts.json`, `entretien`), avec les salaires (le journal et la notification du jour le disent ; l'or peut passer sous 0).
- **Écran** : sous la Grange, dans Ma Compagnie, la liste des montures (d'où elles viennent, le jour de leur capture, leur entretien), places prises / places, **Relâcher** pour libérer une place (sans propriétaire), **Apprivoiser** (à un mercenaire, sa chance du jour au survol). Apprivoisée et équipée, il part à cheval (doc 04, « Combat à cheval »).
- **Une monture est un objet** (Idan, 2026-11-07 : « On peut donc acheter et vendre des chevaux comme les autres biens ») : type `mount`, sans tier ni qualité ; sans propriétaire, à l'**Intendance** (onglet **Montures**) ; où qu'elle soit, elle loge aux Écuries (sa place, son entretien). Achat et vente chez les marchands : doc 18 §12 bis.
- **Son nom** (Idan, 2026-11-07 : « à la capture ou à l'achat de l'animal, on lui attribue un nom ( il faut faire une liste de noms pour chaque animal) ») : à son arrivée (capture, achat chez un marchand), elle reçoit un nom de la liste de son animal (`animal-names.json`, 24 noms chacun) qu'aucun autre de nos animaux ne porte ; la liste épuisée, un nom suivi d'un numéro. Le joueur la **renomme librement** (le crayon à côté de son nom, aux Écuries). Elle garde son espèce (« Destrier ») : les marchands la reconnaissent ainsi. Son nom est partout : Écuries, Intendance, sa carte, « Proposer à… », le journal, et en combat (« Tonnerre » ; celles d'en face restent « Destrier de … »).
- **Proposer une monture à un mercenaire** (Idan : « comme les autres Items, il accepte / refuse ») : depuis l'Intendance, « Proposer à… », le jet des échanges d'équipement (doc 05) ; un mercenaire la juge à son **rang d'échange** (`mounts.json`, `rang_echange` : le destrier comme un T3, la licorne comme un T4). Acceptée, elle est **dans son inventaire, non équipable** : il doit l'apprivoiser chez le Dresseur, cette monture-là (« c'est valable par monture et non pas une catégorie de monture »). Celle d'un mercenaire ne se vend ni ne se relâche ; s'il meurt, elle revient à l'Intendance (« elle repart dans l'enclos et peut être attribuée à un autre mercenaire »). Après une mission, elle se repose comme un mercenaire (blessée ou fatiguée, N jours ; doc 04, « Combat à cheval »). Un mercenaire peut avoir plusieurs montures, mais une seule équipée (Idan, 2026-11-07 : « Avoir un dragon n'empêche pas d'avoir un cheval ») : chacune s'apprivoise, l'autre attend dans son inventaire.

### S'entraîner avec son compagnon (Idan, 2026-11-07)

> « on peut envoyer passer du temps au chenil ou à l'écurie un mercenaire pour s'entraîner avec son compagnon » ; « Charisme + Intelligence + Intimidation. Un mix des trois. C'est un entraînement libre comme pour les écoles de magie. Il y va en fonction de ses envies »

- Les **Écuries** (Équidés) et le **Chenil** (Canidés) entrent dans l'**entraînement libre** (§7) : chaque matin, il y va selon ses envies (là où il se classe le mieux à 75 %, sinon au hasard), avec le test des bâtiments d'entraînement et le Dresseur comme maître.
- **Seulement celui qui y a son animal apprivoisé**, pas au repos (blessé ou fatigué). Places : celles des animaux (2 par niveau).
- **Gain** : la formule de l'entraînement libre, avec la **moyenne de ses Charisme, Intelligence et Intimidation** (`apprend_avec` de la Grange) ; la famille de l'animal (Équidés, Canidés) et **Compagnon animal** montent chacune du gain, sans recul des autres familles. Le Dresseur gagne 5 XP de Transmission du savoir par élève et par jour.
- Code : `school-training.js` (`learnValue`, `room.only`, `room.animal`), `campaign.js` (`trainingRooms`, `buildingPlaces`). Test : `tests/companion-training.test.js`.

### Apprivoiser (Idan, 2026-11-07)

> « Pour pouvoir l'équiper ( c'est valable par monture et non pas une catégorie de monture... S'il perd un cheval, il doit apprivoiser un autre cheval), il doit passer du temps chez le dresseur. Ici, un peu comme les apprentissages, il doit chaque jour tenter de réussir un jet en fonction de 5 caracs ( intelligence/ charisme/ intimidation/ animal/ animal spécifique) Le dresseur offre un bonus. Sauf qu'en plus, il y a un second test à faire : les montures/ compagnons ont un alignement et une tolérance à l'écart d'alignement. Un Destrier est neutre et tolère tous les alignements. Une licorne est loyal bon et chaque cas d'écart rend le test très difficile.. » « faudrait que ce facteur soit pondéré par la volonté et l'intelligence de l'animal. La licorne est intelligente et a une grande volonté. Un chaotique mauvais n'y arrivera quasiment jamais... La licorne, c'est une tête de mule ! Un orc a statistiquement très peu de chances de monter sur une licorne, mais c'est pas impossible au sens propre.. peut-être 1 pour 1000 ? »

- **Qui** : le mercenaire à qui est la monture, s'il peut la monter (« un ogre ne peut pas monter sur un cheval » : sa taille, les places du dortoir de son peuple, sous le gabarit de la monture). Un compagnon (le loup, `mounts.json`, `compagnon`) s'apprivoise par tout le monde : celui qui ne peut pas le monter l'emmène à pied (doc 04). Il faut la Grange du dresseur.
- **Quand** : au jour J, on organise J+1 ; il entre à la Grange le lendemain matin (on peut annuler d'ici là) et reste au camp jusqu'à la fin (ni mission, ni autre apprentissage, ni corvée : l'agenda). Une monture à la fois.
- **Chaque matin**, deux tests, à réussir le même jour (le premier le matin qui suit son entrée) :
  1. **Dressage** : X = moyenne de ses Intelligence, Charisme, Intimidation, Compagnon animal et compétence de la famille de la monture (Équidés…) + **bonus du Dresseur** = (Compagnon animal + Intelligence + Charisme + Intimidation du Dresseur) ÷ 20 (`taming.trainer.divisor`), environ +10, s'il y en a un et qu'il n'est pas l'élève ; chance = 100 / (1 + e^(−(X − 60) / 10)) (`taming.daily.center`, `taming.daily.slope`) : 50 % à X = 60.
  2. **Alignement** : écart = crans sur l'axe Loyal–Chaotique + crans sur l'axe Bon–Mauvais (0 à 4) ; sans écart, réussi d'office ; sinon, chance = 100 × ((100 − entêtement) ÷ 100)^écart, **entêtement** = (Intelligence + Volonté de l'animal) ÷ 2. Pas de tolérance (Idan, 2026-11-07 : « je veux qu'on evite au max d'ajouter des caractéristiques. On supprime la tolérance ») : l'entêtement suffit. La licorne (82,5) : 17,5 % pour un cran, 3 % pour deux, 0,5 % pour trois, **0,09 % pour quatre** (un orc chaotique mauvais : environ 1 pour 1000). Le destrier (20), peu têtu : 80 % pour un cran, 64 % pour deux (il est neutre : deux crans au plus).
- **Réussi** : il l'a apprivoisée (`tamedBy`), il peut l'équiper (emplacement Monture de sa fiche) et sort de la Grange. Une monture apprivoisée par un autre ne s'équipe pas.
- **Le Dresseur** gagne 20 XP de Transmission du savoir par élève et par jour, comme les autres maîtres.
- **Le faire sortir**, la monture qui n'est plus à lui, le Cachot : rien n'est acquis.
- Journal du matin (entrée, réussite), statut « Apprivoise sa monture », historique de la fiche (entrée, réussite, sortie ; jours à la tête de la Grange).
- Code : `game-core/stables.js`, `campaign.js` (entretien du matin, retour d'expédition), `mission.js` (`missionCapturedMounts`, `admitMissionMounts`), `equipment-deals.js` (rang d'échange, emplacement Monture), `prototype-web/stable-ui.js`, `deal-ui.js` (« Proposer à… »), `quartermaster-ui.js` (onglet Montures), `game-core/taming.js` (apprivoiser), `camp-posts.js` (le Dresseur). Tests : `tests/stables.test.js`, `tests/mount-market.test.js`, `tests/taming.test.js`, `tests/animal-names.test.js` (noms, renommer), `tests/wolf.test.js` (le loup, le Chenil).

## 9 — Soins & mémorial

### Soins

Les bâtiments médicaux améliorent :

- qualité / vitesse de guérison ;
- récupération de fatigue ;
- capacités soignantes utilisées dans la durée des blessures.

**Dispensaire et Bains chauds** (Idan, 2026-11-01 ; données `camp-buildings.json`, code `game-core/campaign.js`, encarts dans
**Ma Compagnie**) :

- **à construire, puis 5 niveaux** ; le niveau n coûte **500 × n² PO** (1 000 × n² avant le bêta-test : Idan, 2026-11-07, « On divise par 2 le coût du bâtiment lvl 1 (1000 à 500) », tous les niveaux ÷ 2) et **4 × n jours** ; **un chantier par bâtiment**,
  en parallèle de celui du dortoir ; l'or est payé au lancement, le niveau est atteint le matin du dernier jour ;

  | Niveau | Prix | Jours | Total |
  |---:|---:|---:|---:|
  | 1 | 1 000 | 4 | 1 000 |
  | 2 | 4 000 | 8 | 5 000 |
  | 3 | 9 000 | 12 | 14 000 |
  | 4 | 16 000 | 16 | 30 000 |
  | 5 | 25 000 | 20 | 55 000 |

- **Dispensaire** : la durée d'une blessure (doc 10 §6), déjà bornée de 7 à 60 jours, est multipliée par **1 − 0,1 × niveau**
  (au moins 1 jour), pour les blessures reçues après la construction. Au niveau 5 : 7 → 4 jours, 27 → 14, 48 → 24, 60 → 30 ;
- **Bains chauds** : la fatigue (doc 10 §5) dure **1 jour de moins par niveau**, au moins 1 jour (5 à 7 jours → 1 à 2 jours
  au niveau 5), après la réduction de la qualité du dortoir (§4 ; au niveau 10 du dortoir, plus de fatigue) ; la recharge du mana au camp (doc 12) gagne **+5 % de la Réserve par jour et par niveau** (Volonté 52 :
  36 % → 61 % par jour au niveau 5) ; une salle, **Le Sauna** (Réserve de mana, §7, Idan, 2026-11-04) ;
- pas d'écran à part ni d'image pour l'instant ; le nom de chaque bâtiment donne son rôle en infobulle.

**Médecin** (Idan, 2026-11-01 ; règles `game-core/medic.js`, effets `game-core/campaign.js`, panneau `prototype-web/medic-ui.js`) :

- on peut nommer un médecin **une fois le Dispensaire construit** ; un seul médecin ; ni le capitaine, ni un lieutenant, ni
  l'intendant ;
- **il peut refuser, même règle que l'intendant** (doc 14) : même envie (40 − 0,6 × Courage + 2 × Missions + 8 × Blessures,
  de 2 à 95 %), même retour sur le terrain (60 − envie + 1 par jour en poste), même effet d'un refus sur l'affinité
  (± (Intelligence − Courage) / 10, flatté une seule fois), une proposition par jour ;
- c'est un **mercenaire hors mission, comme l'intendant** (Idan : « il devient un mercenaire hors mission, comme
  l'intendant ») : il reste au camp, vit au Dispensaire (pas de place au dortoir), ne part ni en mission ni en garde du
  corps, ne devient pas lieutenant ; il passe dans Ma Compagnie, à côté de l'intendant ;
- **blessures** : leur durée est multipliée par **1 − Médecine / 250**, en plus du Dispensaire (au moins 1 jour), pour les
  blessures reçues pendant qu'il est en poste. Médecine 46 (une recrue moyenne) : −18 % ; 63 : −25 % ; 100 : −40 %.
  Dispensaire 1 et médecin à 50 : 10 jours → 8 ;
- **Renommée de la compagnie** : + sa Médecine, tant qu'il est en poste (+46 pour un médecin moyen) ;
- **expérience** : chaque fois qu'un blessé guérit pendant qu'il est en poste, il gagne **40 XP de Médecine par jour** (doublé deux fois après le bêta-test, Idan, 2026-11-07 et 2026-11-08) que la
  blessure a duré ;
- **interface** (Idan : « on déplace sa fiche à côté de l'intendant ») : en haut de l'Intendance, à côté de l'intendant ;
  « Nommer un médecin » (la Médecine de chaque candidat), puis sa fiche compacte avec ses effets au survol et « Le renvoyer
  sur le terrain ». Textes : `medic-dialogue.json`. Constantes : `medic.*`.

### Mémorial

Le mémorial a une **capacité illimitée** et conserve la mémoire des mercenaires morts.

**Le Mémorial** (Idan, 2026-11-09 : « plus un bâtiment souvenir. Il est là dès le début. On y retrouve le portrait de tous
ceux qui sont décédés au sein de la compagnie. Quand on clique dessus, on voit l'avatar complet avec sa date de décès, la
cause de son décès (un peu drôle, c'est mieux !) et un épitaphe délirant » ; règles `game-core/memorial.js`, textes
`data/reference/memorial.json`, écran `prototype-web/memorial-ui.js` ; test : `tests/memorial.test.js`) :

- **là dès le début** : ni construction, ni niveau, ni entretien ; une carte dans **Ma Compagnie**, sous le Dortoir, et
  « Aller au Mémorial » ;
- **qui y entre** : tous les mercenaires morts dans la compagnie — au jet de mort de fin de mission, l'éclaireur prisonnier
  jamais revenu (doc 04), le déserteur tué en combat singulier par le capitaine (§11) ; **pas les animaux** (« Non ») ;
  chacun une seule fois (`company.memorial`, du plus ancien au plus récent) ;
- **la galerie** : les portraits, du plus récent au plus ancien ; au clic : l'**avatar complet**, le nom, le peuple et la
  culture, la **date du décès** (jour de campagne et calendrier du camp), les jours passés dans la compagnie, la **cause**,
  l'**épitaphe** et **son historique** (« si on peut garder son historique, c'est cool » : les compteurs et le journal,
  arrêtés au jour de sa mort ; sa dernière mission compte, et le journal finit sur « Tombe au combat ») ;
- **la cause** : l'écran de combat note ce qui fait tomber l'un des nôtres — un coup (corps à corps, tir, charge, contre la
  contre-charge, attaque d'opportunité, en fuite, dans le dos), sa propre arme (échec critique), un sort (feu, froid,
  foudre ou autre), son propre sort qui se retourne, le poison, une malédiction, le relevé en zombie (par l'ennemi ou un
  camarade), un camarade (« tir ami ») ; avec le tueur (« un Guerrier orc vétéran », « une Goule », ou le nom d'un
  camarade) et l'arme ou le sort (« Arme du crime : Hache de guerre. ») ; une tournure drôle est tirée une fois pour toutes
  parmi celles de sa nature ;
- **l'épitaphe** : une centaine, délirantes (« Mort comme il a vécu : en retard sur l'initiative. »), tirées au hasard,
  **jamais deux fois dans une même partie** tant qu'il en reste ; au masculin ou au féminin ;
- la fiche gardée est réduite à ce que la galerie montre (nom, peuple, avatar, contrat, historique) : une fiche complète
  pèse ~18 Ko.

**Étudier la Nécromancie au Mémorial** (Idan, 2026-11-09 : « un mercenaire peut aller s'entrainer de lui même pour la
nécromancie, comme dans l'école de magie. L'xp depend ici du nombre de morts dans la compagnie. A 10 morts, c'est
l'équivalent du lvl 1. A 100 morts, du level 10... mais ici, pas de limites ! » ; « on peut pas le faire linéaire ? On ouvre
à 1 mort ? » ; « Une seule place. C'est un mini bonus gratuit... ») :

- une salle de l'entraînement libre (§ École de magie), ouverte **dès le premier mort** ; **une place**
  (`camp.memorial.places`) ; elle travaille la **Nécromancie** (et fait reculer ses écoles opposées, comme à l'École) ;
- son **niveau = morts ÷ 10** (`camp.memorial.deaths_per_level`), sans arrondi ni plafond : 1 mort 0,1 ; 10 morts 1 ;
  100 morts 10 ;
- le **test** et le **gain** d'une salle de l'École, **sans directeur** : 80 × Intelligence / 50 × (1 + 0,1 × niveau) ; pour une
  Intelligence de 50 : 81 XP par jour à 1 mort, 88 à 10, 160 à 100, 320 à 300 ;
- le capitaine peut y être envoyé (« Le capitaine », sous les bâtiments) ; la carte du Mémorial montre son niveau et qui
  occupe la place aujourd'hui.

## 10 — Grande salle du château

Lieu de vie et de discussions avec les mercenaires.

Peut accueillir :

- conversations calmes ;
- disputes / négociations ;
- décisions sociales importantes ;
- éventuellement la salle des trophées.

## 11 — Prison

**Le Cachot** (Idan, 2026-11-04 : « On va créer un bâtiment "Le cachot". Avec 10 niveaux et un nombre de places par niveau. Un
mercenaire qui refuse après test inti ou charisme peut aller au cachot. L'affinité va forcément en prendre un coup…
Surtout qu'au cachot, on n'a pas de salaire… D'ailleurs le capitaine peut envoyer n'importe qui au cachot » ; « Parfait
pour tout. Non l'affinité ne revient pas après ») — 10 niveaux, même barème que les autres bâtiments :

- **1 cellule par niveau** (`camp.dungeon.cells_per_level`) ;
- **qui** : n'importe quel membre, sauf le capitaine et ceux qui partent ou sont partis en mission ; depuis la carte du
  Cachot (« Envoyer au cachot »), ou dans le dialogue quand une relance (Intimider, Convaincre) a échoué : « Au cachot ! » ;
- **tout de suite, jusqu'à ce qu'on le libère** (« Libérer ») ; il garde son lit au dortoir ;
- en y entrant, **il perd son poste** (intendant, médecin, directeur, maître, lieutenant ; ses jours de poste sont comptés)
  et quitte sa corvée et son apprentissage (sortir de l'École ou de l'Académie coûte ce que ça coûte d'habitude) ;
- **affinité −10** en y entrant, **−2 chaque matin** (`camp.dungeon.entry_affinity`, `camp.dungeon.daily_affinity`) ;
  elle **ne revient pas** à la libération ;
- **pas de salaire** ; ni mission, ni garde du corps, ni entraînement, ni corvée, ni apprentissage, ni poste ; statut
  « Au cachot » ; historique : « Est jeté au cachot. », « Sort du cachot après 3 jours. » ;
- les autres membres ne réagissent pas, pour l'instant. Code `game-core/dungeon.js`, `prototype-web/dungeon-ui.js` ; textes
  `dungeon-dialogue.json` ; test `tests/dungeon.test.js`.

Plus tard : les prisonniers ennemis, l'interrogatoire, les événements internes.

### La désertion (Idan, 2026-11-04)

« Chaque matin, quand l'affinité d'un mercenaire a baissé, il fait un test d'affinité avec le capitaine, puis en cas d'échec
avec chacun des lieutenants. Si tous les tests échouent, le mercenaire se barre ! (Sauf s'il est au cachot, il le fera à sa
sortie.) » ; « Variante plus douce » ; « il part avec son sac aussi ! » ; « Garde-fou : s'il reste, il est immunisé aux tests
de désertion pendant 15 jours » ; « Si ! Il est mort dans un combat ».

- **Le test du matin**, après tout ce qui fait bouger l'affinité ce matin-là : chaque membre présent au camp (pas en mission),
  sauf le capitaine, dont l'affinité avec le capitaine a **baissé depuis la veille** (le bilan sur 24 heures : −2 puis +5, pas
  de test). Chance de rester = **100 / (1 + e^(−(affinité + 60) / 10))**, de 1 à 99 % (`desertion.stay.*`) : 99 % à 0,
  98 % à −20, 88 % à −40, 50 % à −60, 12 % à −80. D'abord avec le capitaine ; s'il rate, avec **chaque lieutenant présent**
  au camp (son affinité envers le lieutenant : peuple, culture, alignement). Tous ratés : il part cette nuit.
- **Au cachot** : il ne part pas ; il **veut partir** (plus de test) et tente de filer le matin qui suit sa libération.
- **La Tour de guet** (« En fonction du niveau de la tour et de la discrétion du mercenaire… niveau 10, y'a 95 % de chance
  qu'il se fasse repérer ») : chance de le repérer = **100 / (1 + e^(−Δ/15))**, **Δ = 10 × niveau − 55 − (Discrétion − 30)**
  (équipement compris), de 5 à 95 % (`desertion.spot.*`) ; sans Tour, jamais. Discrétion 30 (la moyenne) : 5 % au niveau 1,
  42 % au niveau 5, 95 % au niveau 10.
- **Passé inaperçu** : il part avec ce qu'il porte **et son sac** ; dans la notification du jour et au journal, l'intendant le signale (« Brak a
  filé cette nuit, avec son sac. ») ; sans intendant, on l'apprend quand même (« … a disparu cette nuit »). Son profil est
  gardé (`company.deserters`), pour plus tard.
- **Repéré** (« La Vigie a repéré … » dans la notification du jour) : une scène **au début de la journée**, une par repéré ; on ne peut rien faire d'autre (ni passer au jour
  suivant) avant de l'avoir réglée :
  - **Intimider** ou **Convaincre** : une seule tentative, **dure** : 10 + 80 / (1 + e^(−Δ/20)), **Δ = 0,5 × affinité +
    Intimidation (ou Charisme ÷ 2) du capitaine − 60** (`desertion.persuade.*`) ; capitaine moyen, mercenaire à −20 :
    23 % en intimidant, 18 % en convainquant. **Il reste** : **+20** d'affinité (« on la fait bien remonter »,
    `desertion.persuade.stay_affinity`) et **15 jours sans test** (`desertion.immunity_days`). Raté : il reste les deux choix
    suivants ;
  - **le défier en combat singulier** (pour l'instant automatique) : le capitaine gagne, **il meurt** ; il rejoint le
    mémorial (§9), laisse son **héritage de renommée** (doc 09) ; ses affaires (portées et sac) vont à l'Intendance ;
  - **le laisser partir** : **+10** d'affinité (`desertion.let_go.affinity`, gardée dans son profil), et il part avec son sac.
- **En partant ou en mourant**, il quitte son poste, sa corvée et son apprentissage, comme pour le Cachot.
- Historique : « A voulu quitter la compagnie ; le capitaine l'a retenu. » ; dans le profil gardé : « Quitte la compagnie en
  pleine nuit, avec son sac. », « Quitte la compagnie : le capitaine l'a laissé partir. », « Meurt en combat singulier contre
  le capitaine. ». Code `game-core/desertion.js`, `prototype-web/desertion-ui.js` ; textes `desertion-dialogue.json` ; test
  `tests/desertion.test.js`.

## 12 — Embellissement / prestige kitsch

Le joueur peut dépenser beaucoup d’or dans des améliorations purement ou largement prestigieuses qui alimentent la **renommée de la compagnie**.

Exemples retenus :

- immense statue dorée à l’effigie du capitaine ;
- tapis érotiques ;
- décorations volontairement excessives / ridicules.

Ce système constitue un **gold sink** assumé.

## 13 — Forge

La forge couvre :

- travail du métal ;
- fabrication / modification d’équipement métallique ;
- enchantement magique associé aux objets concernés.

## 14 — Atelier de couture

Couvre notamment :

- cuir ;
- vêtements ;
- équipements textiles ;
- enchantement magique associé.

## 15 — Joaillerie

Couvre notamment :

- bagues ;
- amulettes ;
- bijoux ;
- futurs systèmes d’enchantement / gemmes.

## 16 — Armurerie / Intendance

Fonctions validées :

- stockage d’un **nombre limité** de matériels / équipements ;
- gestion de l’équipement mis à disposition des mercenaires ;
- possibilité de proposer des **échanges** à un mercenaire pour récupérer un objet qui lui avait été donné.

Le matériel attribué à un mercenaire ne doit donc pas être considéré comme automatiquement récupérable sans interaction.

### Stock d'armes de départ (Idan, 2026-10-23)

À sa création, la compagnie reçoit un stock d'armes (et d'armures) de rechange, sans propriétaire, listé à l'Intendance :

- **nombre** : **2D20** armes (2 à 40) ;
- **choix de chaque arme** : tirage pondéré parmi toutes les armes du référentiel, **boucliers compris**, doublons possibles :
  - `Poids = max(0,25 ; 1 + 2 × A)` ;
  - `A` additionne les intensités de la matrice de génération du **peuple** et de la **culture** du capitaine, sur l'arme et sur sa catégorie. Exemple pour un Nain du chaos : Arquebuse 2 + 2 + 1 + 1 = 6, poids 13 ; Hache de guerre 2 + 1 = 3, poids 7 ; Fouet 0, poids 1 ;
- **tier de chaque arme** : table de l'équipement de départ des mercenaires (doc 05), lue à la réputation du capitaine. À la création (≈ 110 à 165), cela donne environ 77 % T1, 20 % T2, 3 % T3.

**Armures (Idan, 2026-10-24)** : le stock compte aussi quelques armures de base, **1D6 par type d'armure** (Vêtement, Légère, Intermédiaire, Lourde), chacune tirée au hasard parmi les armures de son type ; même table de tier, à la réputation du capitaine (le T3 reste rare, environ 3 %). L'Intendance les range après les armes, de la plus légère à la plus lourde.

**Bottes (Idan, 2026-10-24)** : le stock compte aussi **1D6 paires de bottes**, chacune d'un type tiré au hasard (vitesse, esquive, perception ; doc 05), même table de tier. L'Intendance les range après les armures.

**Ceintures (Idan, 2026-10-24)** : **1D6 ceintures** aussi, chacune d'un type tiré au hasard (mana, endurance, courage ; doc 05), dans leur propre onglet de l'Intendance.

**Amulettes (Idan, 2026-10-24)** : **1D6 amulettes** aussi, chacune d'un type tiré au hasard (puissance magique, volonté, chance ; doc 05), dans leur propre onglet de l'Intendance.

**Capes (Idan, 2026-10-24)** : **1D6 capes** aussi, chacune d'un type tiré au hasard (résistance physique, esquive, discrétion ; doc 05), dans leur propre onglet de l'Intendance.

**Gants (Idan, 2026-10-24)** : **1D6 paires de gants** aussi, chacune d'un type tiré au hasard (pièges, dextérité, force ; doc 05), dans leur propre onglet de l'Intendance.

**Culottes (Idan, 2026-10-24)** : **1D6 culottes** aussi, chacune d'un type tiré au hasard (charisme, intimidation, affinité ; doc 05), dans leur propre onglet de l'Intendance.

**Bagues (Idan, 2026-10-24)** : **1D6 bagues** aussi, chacune d'un type tiré au hasard parmi les onze (chance, courage, une par école de magie ; doc 05), dans leur propre onglet de l'Intendance.

**Casques et chapeaux (Idan, 2026-10-25)** : **1D6 casques ou chapeaux** aussi, chacun d'un type tiré au hasard (constitution, intelligence, dresseur ; doc 05), dans leur propre onglet de l'Intendance (après les armures). Une partie commencée avant les reçoit aussi.

**Potions et fioles (Idan, 2026-10-29)** : **1D6 de chaque sorte** (potion de soins, potion de mana, fiole de poison ; doc 05), dans leur propre onglet « Potions » de l'Intendance. Elles se donnent et se reprennent librement, sans négociation. Une partie commencée avant les reçoit aussi.

**Affichage de l'Intendance (Idan, 2026-10-24)** : un onglet par grande catégorie (Armes, Armures, Bottes, avec leur nombre) ; dans chaque onglet, les catégories sont en accordéon, fermées par défaut. L'onglet choisi et les catégories ouvertes restent tels quels quand l'écran se redessine.

Constantes : `company.starting_stock.dice_count` (2), `company.starting_stock.dice_sides` (20), `company.starting_stock.affinity_weight` (2), `company.starting_stock.min_weight` (0,25), `company.starting_stock.armor_dice_count` (1), `company.starting_stock.armor_dice_sides` (6), `company.starting_stock.boots_dice_count` (1), `company.starting_stock.boots_dice_sides` (6), `company.starting_stock.belt_dice_count` (1), `company.starting_stock.belt_dice_sides` (6), `company.starting_stock.amulet_dice_count` (1), `company.starting_stock.amulet_dice_sides` (6), `company.starting_stock.cape_dice_count` (1), `company.starting_stock.cape_dice_sides` (6), `company.starting_stock.gloves_dice_count` (1), `company.starting_stock.gloves_dice_sides` (6), `company.starting_stock.pants_dice_count` (1), `company.starting_stock.pants_dice_sides` (6), `company.starting_stock.ring_dice_count` (1), `company.starting_stock.ring_dice_sides` (6), `company.starting_stock.potion_dice_count` (1), `company.starting_stock.potion_dice_sides` (6). Une partie sauvegardée avant ces règles reçoit au chargement ce qui lui manque (le stock d'armes, puis les armures, les bottes, les ceintures, les amulettes, les capes, les gants, les culottes, les bagues, les casques et les fioles, une seule fois chacun). La capacité limitée de l'armurerie reste à définir.

### L'intendant (Idan, 2026-10-24)

Le capitaine **propose** à un mercenaire de devenir intendant ; il peut refuser. Un seul intendant ; jamais le capitaine ; **une proposition par mercenaire et par jour**. L'intendant passe dans la rubrique Compagnie, ne part plus en mission, et on lui parle à l'Intendance. Cela remplace l'assignation libre du rôle (PR #11), qui n'avait pas d'interface.

- **Envie d'intendance** = 40 − 0,6 × Courage + 2 × Missions + 8 × Blessures (retours de mission blessé ; historique de la fiche). Plus il est courageux, moins il veut quitter le terrain ; un vieux mercenaire souvent blessé, davantage.
- **Accepter le poste** : chance = Envie, bornée de 2 à 95 %. Courage 31 / 49 / 62 : 21 / 11 / 3 % en début de partie ; 57 / 47 / 39 % après 10 missions et 2 blessures ; on a donc du mal à trouver un intendant au début.
- **Revenir sur le terrain** : chance = 60 − Envie + 1 par jour passé à l'intendance (le goût du sang lui manque), bornée de 2 à 95 %. Courage 49, 10 missions, 2 blessures : 13 % le premier jour, 43 % après 30 jours, 73 % après 60 jours.
- **Refus** (proposé par JC, validé par Idan le 2026-10-24) : l'affinité change de (Intelligence − Courage) / 10, arrondi. Le malin se sent flatté qu'on lui confie la compagnie (une seule fois, pour qu'on ne gonfle pas l'affinité en insistant) ; le brave se vexe qu'on veuille l'écarter du combat (à chaque fois). Un accord ne change pas l'affinité. Même règle quand l'intendant refuse de revenir sur le terrain.
- **Évaluer les candidats de la Taverne** : on le questionne comme le tavernier (candidat → catégorie → caractéristique), mais il répond par un chiffre, à ±20 % × (1 − Intendance/100) près (doc 14 §7) ; c'est gratuit, et sa réponse reste la même si l'on repose la question.
- **Appuyer les échanges d'équipement** (formule de JC, validée) : Δ + 0,2 × son Intendance + 0,25 × l'affinité du mercenaire envers lui (même règle qu'envers le capitaine : peuple, culture, alignement). Avec 50 en Intendance et une affinité de +40, « Troquer son T1 contre un T3 » (Int 20) passe de 42 à 62 %. Pas d'appui quand c'est à lui-même qu'on parle.
- **Historique** : propositions, nomination, refus, retour sur le terrain et jours d'intendance.

Constantes `steward.*` et `equipment_deal.steward_*` ; code `game-core/steward.js` et `game-core/equipment-deals.js`.

**Interface** (`prototype-web/steward-ui.js` ; textes `data/reference/steward-dialogue.json`, 4 variantes par réponse, écrites par JC) : en tête de l'Intendance, sans intendant, « Proposer le poste à… » liste les mercenaires (grisés s'ils ont déjà été sollicités ce jour-là) ; la réponse s'affiche dans la boîte de dialogue des échanges (proposition, réplique acceptée / flattée / vexée / neutre, issue, Partir). Avec un intendant : son portrait (qui ouvre sa fiche), son Intendance, depuis quand il est en poste, et « Lui parler » — évaluer un candidat de la Taverne (candidat → catégorie → caractéristique) ou lui proposer de revenir sur le terrain. Sa carte passe dans Ma Compagnie, avec le cartouche « Intendant » ; il n'apparaît plus dans Mes mercenaires ni dans la sélection de mission. Dans un échange d'équipement qu'il appuie, la boîte de dialogue le dit (« Isolde, votre intendante, appuie votre proposition. »).

## 17 — Laboratoire d’alchimie

Fonctions :

- potions ;
- poisons ;
- recettes ;
- fabrication / recherche alchimique.

## 18 — Cuisine / Réfectoire

Lieu de vie quotidien pouvant intervenir dans :

- récupération ;
- fatigue ;
- satisfaction / ambiance de compagnie ;
- relations entre mercenaires.

Le réfectoire peut aussi devenir le lieu où des conflits dégénèrent si l’Arène n’a pas permis de les régler.

## 19 — Bibliothèque

La bibliothèque sert notamment de **lieu d’aide intégré au jeu** :

- formules ;
- explications ;
- règles ;
- informations de référence.

Elle pourra aussi soutenir des mécaniques de formation / Intelligence / Transmission du savoir si cela est retenu plus tard.

## 20 — Arène / fosse d’entraînement

Bâtiment volontairement riche en événements.

Fonctions validées :

- duels ;
- entraînement réel ;
- paris ;
- règlements de compte « encadrés » entre mercenaires ;
- progression potentiellement plus rapide de certaines compétences ;
- **risque réel de blessure**.

L’Arène sert aussi de soupape sociale avant que deux mercenaires ne se poignardent au réfectoire.

## 21 — Atelier bois / ingénierie

Fonctions envisagées :

- arcs ;
- hampes ;
- boucliers / éléments en bois ;
- pièges ;
- objets techniques et ingénierie non métallique.

## 22 — Salle des trophées

Concept validé, emplacement encore ouvert :

- Bureau du Capitaine ;
- Grande salle ;
- Bibliothèque.

Les trophées peuvent contribuer au prestige / à la renommée.

## 23 — Muraille / tours de garde

Le château pourra être **attaqué**.

Les murailles et tours de garde doivent donc pouvoir être réparées / améliorées et participer à la défense du camp.

Les règles de siège / attaque du château restent à définir.

## 24 — Principe de design des bâtiments

Les bâtiments doivent autant que possible **ouvrir des actions, des choix ou des capacités**, pas seulement fournir des bonus passifs.

Exemples :

- Taverne → plus de candidats, missions et renseignements ;
- Dortoir → capacité de roster ;
- bâtiments de soins → réduction d’indisponibilité ;
- salles d’entraînement → actions de formation ;
- Forge / ateliers → production et modification d’objets ;
- Arène → duels, paris, progression risquée ;
- Armurerie → stockage et négociation de récupération d’équipement.

## 25 — Non retenu pour l’instant

Les idées non explicitement validées lors de la discussion restent hors de cette page. La carte détaillée du château et le découpage spatial des ailes / tours / sous-sols seront définis plus tard.