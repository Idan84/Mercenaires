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
- **Dortoir : capacité 40** (portée de 20 à 40 par Idan le 2026-10-03, car l'escouade initiale peut dépasser 20 mercenaires) ;
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

- capacité initiale : `40` (décision Idan du 2026-10-03 ; constante `camp.dormitory.initial_capacity`) ;
- amélioration → plus de places ;
- embellissement / qualité → contribution possible à la renommée / attractivité.

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

## 8 — Bâtiments pour animaux et montures

Le château peut accueillir des structures spécialisées selon les espèces :

- écuries ;
- porcherie ;
- salle / antre pour dragon ;
- autres bâtiments spécifiques à définir.

Objectif : supporter des unités montées, y compris des compositions volontairement extravagantes comme une troupe se déplaçant sur plusieurs dragons.

## 9 — Soins & mémorial

### Soins

Les bâtiments médicaux améliorent :

- qualité / vitesse de guérison ;
- récupération de fatigue ;
- capacités soignantes utilisées dans la durée des blessures.

### Mémorial

Le mémorial a une **capacité illimitée** et conserve la mémoire des mercenaires morts.

## 10 — Grande salle du château

Lieu de vie et de discussions avec les mercenaires.

Peut accueillir :

- conversations calmes ;
- disputes / négociations ;
- décisions sociales importantes ;
- éventuellement la salle des trophées.

## 11 — Prison

La prison peut contenir :

- prisonniers ennemis ;
- mercenaires dissidents / contestataires.

Elle pourra plus tard se connecter aux systèmes d’interrogatoire, intimidation, torture ou événements internes.

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

**Affichage de l'Intendance (Idan, 2026-10-24)** : un onglet par grande catégorie (Armes, Armures, Bottes, avec leur nombre) ; dans chaque onglet, les catégories sont en accordéon, fermées par défaut. L'onglet choisi et les catégories ouvertes restent tels quels quand l'écran se redessine.

Constantes : `company.starting_stock.dice_count` (2), `company.starting_stock.dice_sides` (20), `company.starting_stock.affinity_weight` (2), `company.starting_stock.min_weight` (0,25), `company.starting_stock.armor_dice_count` (1), `company.starting_stock.armor_dice_sides` (6), `company.starting_stock.boots_dice_count` (1), `company.starting_stock.boots_dice_sides` (6), `company.starting_stock.belt_dice_count` (1), `company.starting_stock.belt_dice_sides` (6), `company.starting_stock.amulet_dice_count` (1), `company.starting_stock.amulet_dice_sides` (6), `company.starting_stock.cape_dice_count` (1), `company.starting_stock.cape_dice_sides` (6). Une partie sauvegardée avant ces règles reçoit au chargement ce qui lui manque (le stock d'armes, puis les armures, les bottes, les ceintures, les amulettes et les capes, une seule fois chacun). La capacité limitée de l'armurerie reste à définir.

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