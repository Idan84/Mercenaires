> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# 03 — Combat

Règles de résolution du combat. La V1 garde un pipeline physique commun et choisit les formules selon le type d'attaque.

<aside>
⚔️

Pipeline physique : **Portée légale → Toucher → Critique positif éventuel → Blesser → Dégâts PV → Courage éventuel**. Le
CAC et la distance partagent cette structure mais pas toutes les formules.

</aside>

Les registres complets de formules, termes et constantes sont dans **05 — Référentiels techniques**.

[Types de dégâts](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/03%20%E2%80%94%20Combat/Types%20de%20d%C3%A9g%C3%A2ts%205db7647603614c41bb7acc47a89986d6.csv)

[Mécaniques à intégrer ensuite](/design/#doc=90-mechanics-backlog.md)

[États](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/03%20%E2%80%94%20Combat/%C3%89tats%20a2ea68aea2414a24a343f374c6fb19e3.csv)

## Grille, activation & mouvement V1

- Grille **carrée** (section suivante) ; un personnage standard occupe **1 case**.
- [Activation hexagonale V1](/design/#doc=formulas/activation-hexagonale-v1.md) : une activation fournit **Mouvement +
  Action rapide + Attaque**, dans l'ordre choisi ; le mouvement est fractionnable et l'Attaque peut être remplacée par
  un second Mouvement.
- [Mouvement hexagonal V1](/design/#doc=formulas/mouvement-hexagonal-v1.md) : `MouvementBase` est calculé à partir de
  Vitesse combat effective, Endurance et Volonté.
- [Portée d'arme V1](/design/#doc=formulas/portee-d-arme-v1.md) : une arme de mêlée standard vaut implicitement 1–1 ;
  les armes d'hast configurées 1–2 utilisent toujours le pipeline CAC.

## Passage aux cases carrées (Idan, 2026-11-17)

Cases carrées vues de dessus (« on se rapproche de Dofus ») ; une vue isométrique à la X-COM viendra ensuite.

- **Distances en losange** partout (déplacement, portées, zones, repérage) : une case en diagonale est à 2 cases.
- **Déplacement** vers les 4 voisines seulement. PM et portées inchangés ; l'équilibrage viendra.
- **PM au quart de point** (0,75 ; 1 ; 1,5…), avec 1 PM = 1 case normale. Le reste qui ne permet d'entrer dans aucune
  case est perdu en fin de tour (affiché « 3,5/5 »).
- **Contact** : les **4 cases** des côtés (attaques d'opportunité, encerclement, descendre de monture). **Hast et
  fouet** (portée 1–2) : le contact, les **4 diagonales** et **2 cases en ligne droite**.
- **Dos** : la case derrière et ses deux coins (4 sens). **Encerclement** : deux adversaires sur des côtés opposés.
- **Tir** : portée en losange ; la ligne de vue suit les cases, en diagonale au besoin, et passe entre deux obstacles
  qui se touchent par le coin si rien n'est sur la diagonale elle-même.
- **Plus de couverture** : l'Esquive du terrain la remplace (« Le modèle de la case »).
- **Sorts** : zones en losange ; lignes, cônes (1-3-3) et murs **en ligne droite seulement** (« ça oblige à bien se
  placer ») ; ligne et cône partent d'une case voisine par un côté (portée 1), droit devant ; le mur suit une colonne ou
  une ligne.
- **Charge** : dans toute direction, sans contourner d'obstacle ; tout droit sur une colonne ou une ligne, sinon en
  escalier par les côtés, au plus près de la ligne droite (elle franchit les arêtes comme un déplacement). Course
  comptée en losange ; le chargeur finit collé à la cible par un côté ; un personnage sur l'escalier barre la charge.
- **Grosses créatures** : cheval et **cerbère** 1×2 (Idan, 2026-11-18) ; mammouth et tricératops 2×2 ; énorme 3×3. Elles se déplacent depuis
  la case de leur **tête**.
- **Déplacement forcé** (repousser, attirer) : arrêté par une palissade ou une meurtrière comme par un mur ; il passe un
  muret.
- **IA** : mêmes règles ; elle franchit une palissade (+2 PM) pour frapper ; un tireur dont un allié bouche la ligne se
  décale.
- **Carte** : 36 × 25 cases, à régler à l'équilibrage.

### Le modèle de la case (Idan, 2026-11-17)

- **Phase 1 sans altitude** (« Altitude »). La règle d'un côté, le dessin de l'autre : une case ou une arête peut avoir
  plusieurs dessins ; une maison est un plan de cases (murs, plancher) où l'on entre.
- **Une case** a un **coût en PM** (au quart de point) ; un **bonus de Discrétion** pour qui s'y cache (« Se cacher ») ;
  elle **bloque la vue** ou non (dedans, on n'est **ciblable qu'au contact**, mais on voit et tire dehors si aucune
  autre case qui bloque la vue n'est entre soi et la cible : l'orée de la forêt) ; un **bonus d'Esquive**, parfois sous
  condition (Respiration aquatique), parfois **négatif** (neige, marais).
- **Un mur a de l'épaisseur** : c'est une case (100 PM, bloque la vue), comme la montagne et le gros rocher. La
  palissade est une arête.
- **Une arête**, partagée par les deux cases qu'elle sépare, a 4 réglages, les mêmes des deux côtés sauf la vue :
  **franchir** (le PM de la case d'arrivée plus ce malus) ; **Esquive** ; **vue** (laisse voir, bloque, ou **un seul
  sens** : on voit du côté défendu vers l'extérieur, pas l'inverse) ; **corps à corps à travers** (sinon, ni coup, ni
  zone de menace, ni charge à travers : on fait le tour).
- **L'Esquive du terrain** (case et arête) compte contre les **tirs**, les **sorts qui volent** comme une flèche (Trait
  de feu, Flèche de glace, Éclair, Lancer de pierre, Choc psychique, Flèche de mort, crachat de venin) et la
  **charge** ; pas contre un coup normal au CAC. Elle passe par la formule du toucher : une attaque à 50 % tombe à 32 %
  environ avec +20, à 20 % avec +40 ; jamais sous 10 %.
- **Contre une charge**, elle compte **double** (« Je charge face à la palissade, il a 120 d'esquive »), sauf charge
  aérienne.
- **Rien d'infranchissable pour qui vole ou nage** : l'infranchissable vaut 100 PM. Les volants ignorent les malus des
  cases et des arêtes et passent au-dessus des murs et des montagnes (1 PM), sans pouvoir s'y arrêter.
- **Diagonales** : une arête seule ne protège pas la diagonale (il faut une autre arête de la même case ou d'une
  voisine) ; un tir de biais regarde l'arête qui fait face au tireur. Une ligne de vue qui passe pile par un coin n'est
  bloquée que si les deux arêtes de ce coin bloquent la vue.
- **Les personnages** bloquent la vue, pas la discrétion (étape 3).
- **Affichage** : les arêtes en trait épais au bord des cases (un seul sens : une ombre du côté défendu) ; le survol
  d'une case dit son PM, sa vue et ses arêtes.
- **Plus tard** : les portes qui s'ouvrent ; les zones à travers un mur (au cas par cas).

### Étape 1 : les cases (Idan, 2026-11-17, V1)

Données : `data/reference/combat-cells.json`.

| Case | Dessins, où | PM | Se cacher | Vue | Esquive | Capacités de terrain, notes |
|---|---|---|---|---|---|---|
| Terrain par défaut | terre, herbe rase, champs, chemins, camps | 1 | — | laisse voir | — | |
| Végétation souple | buissons, blé haut, champ de tournesols | 1,5 | +30 | laisse voir | — | vol : 1 PM |
| Forêt | | 1,5 | — | bloque | +30 | Déplacement sylvain : sans malus et +30 de Discrétion |
| Plancher, dallage, route | intérieur des bâtiments ; la route | 0,75 | — | laisse voir | — | |
| Boue, marais, neige | marais, bords de rivière | 2 | — | laisse voir | — | vol : 1 PM |
| Eau peu profonde | gués, mares, torrents | 2 | +10 | laisse voir | +25 avec Respiration aquatique | Déplacement aquatique : 1 PM et +30 de Discrétion ; vol : 1 PM |
| Eau profonde | rivières, lacs | 100 | — | laisse voir | +80 avec Respiration aquatique | Déplacement aquatique : 2 PM ; Respiration aquatique : 1 PM ; vol : 1 PM |
| Éboulis, pierraille | gorges, carrières, pieds de falaise | 2 | +30 | laisse voir | — | vol : 1 PM ; des murets en forme de rochers pourront s'y ajouter |
| Gouffre, vide, lave | gorges, ruines effondrées | 100 | — | laisse voir | — | vol : 1 PM |
| Mur, montagne, rocher | maisons, château, temples, remparts ; montagnes | 100 | — | bloque | — | vol : 1 PM (par-dessus) |

Des sorts changent des cases en une case existante, pour quelques tours, avec leur dessin : la **Flaque de magma** fait
du Gouffre (la lave) ; le **Bourbier** ferait une large zone de Boue au lieu d'immobiliser une case (taille à régler).

### Étape 2 : les arêtes (Idan, 2026-11-17, V1)

Données : `data/reference/combat-edges.json`.

| Arête | Où | Franchir | Esquive | Vue | Corps à corps à travers | Notes |
|---|---|---|---|---|---|---|
| Muret | champs, fermes, ruines | +0,5 | +30 | laisse voir | possible | mi-hauteur : on se baisse, on se relève pour tirer |
| Palissade | enceinte des camps | +2 | +60 | un seul sens | impossible | hauteur d'homme ; du bois plein, on fait le tour |
| Muraille avec meurtrière | châteaux, remparts, forts | +4 | +100 | un seul sens | impossible | elle s'escalade ; différente de la case Mur |

### Étape 3 : les personnages (Idan, 2026-11-17, V1)

- **On ne traverse la case de personne**, allié ou ennemi.
- **Ligne de vue** (tirs et sorts) : un **ennemi** cache ceux qui sont derrière lui ; un **allié collé au tireur** (les
  8 cases autour) ne gêne pas, plus loin sur la ligne il empêche de tirer ; **un plus petit ne cache pas un plus grand**
  (on compare le **gabarit** : gobelin 0,5, humain 1, ogre 2…) ; **au sol** ou **en vol**, on ne cache rien ; une
  **grosse créature** cache sur toutes ses cases ; un **personnage caché** bloque la vue, sans qu'on sache pourquoi ;
  celui qui se tient sur la case visée par une zone ne la cache pas.
- Les personnages ne comptent pas au repérage et ne donnent pas d'Esquive à qui est derrière eux.
- **Arme d'hast** : à 2 cases, par-dessus un allié collé ou un personnage au sol, pas par-dessus un ennemi debout ; en
  diagonale, par l'un ou l'autre côté du coin.
- **Entrechoc** : il faut voir les deux ennemis (côte à côte vus du lanceur) ; c'est une **action rapide**.

### Étape 4 : les objets du décor (Idan, 2026-11-17, V1)

Un objet du décor est le **dessin d'une case** ou **une arête** (`data/reference/terrain-decors.json`) ; d'autres objets
viendront avec le graphisme.

| Décor | Devient |
|---|---|
| Buissons, Blé haut | case Végétation souple |
| Forêt | case Forêt |
| Marais | case Boue, marais, neige |
| Eau peu profonde, Eau profonde, Éboulis | leur case |
| Gros rocher, Mur | case Mur / Montagne / Rocher |
| Gouffre | case Gouffre, vide, lave |
| Muret, Tombe, Caisses, Tonneaux | arête Muret |
| Palissade | arête Palissade |
| Maison | un plan : des cases Mur autour de cases Plancher ; la porte est une case Plancher dans le mur, avec son dessin (s'ouvrir et se fermer : plus tard) |

- **La fenêtre** : à voir ; plutôt une case de sol avec une arête muret qu'une case mur.
- **Les paysages** (Vieille carrière, Cimetière, Château en ruine…) suivent ce tableau ; ni collines, ni rampes, ni camp
  en hauteur.

## Initiative & ordre interne V1

[Initiative interne d'équipe V1](/design/#doc=formulas/initiative-interne-d-equipe-v1.md) est calculée **avant la
mission** et visible pendant la préparation.

- Les équipes jouent l'une après l'autre ; l'équipe qui commence est fixée par le **scénario**.
- L'initiative ne sert qu'à ordonner les personnages **au sein de leur équipe**.
- Aucun jet aléatoire : `VitesseCombatEffective + 0,25×Intelligence + 0,10×Courage + 0,05×Volonté`.
- Égalité : Courage le plus élevé ; égalité parfaite restante = assert / erreur de développement pour l'instant.
- La Fatigue sera intégrée plus tard comme système global.

## Attaque d'opportunité CAC V1

[Attaque d'opportunité CAC V1](/design/#doc=formulas/attaque-d-opportunite-cac-v1.md) formalise les réactions de zone de
menace.

- Sortir de la zone menacée par un adversaire déclenche sa réaction ; rester à l'intérieur de sa portée ne suffit pas.
  Chaque adversaire dont on quitte la zone peut réagir.
- L'attaque est résolue **avant** la fin du déplacement ou de l'action qui l'a déclenchée.
- La cible ne conserve que **50 % de son Esquive effective** et sa Perception défensive est supprimée du Toucher.
- Une arme = **un coup**, sans enchaînement ; combat à deux armes = **un coup avec chaque arme**, sans cadence
  supplémentaire.
- La fuite peut elle-même déclencher ces réactions.
- Pas de limite par adversaire et par tour ; un personnage Au Sol réagit normalement et compte pour l'encerclement ; des
  réactions simultanées se résolvent dans l'ordre d'initiative de l'équipe qui réagit.

## Frappe dans le dos & encerclement V1

[Frappe dans le dos V1](/design/#doc=formulas/frappe-dans-le-dos-v1.md) annule la **Perception défensive** au Toucher et
divise par deux la **résistance au type de dégâts** utilisée pour Blesser. La Résistance physique % qui réduit ensuite
les PV n'est pas modifiée.

- Elle vaut pour toute attaque d'opportunité, contre une cible en fuite et pour une attaque non détectée.
- [Encerclement CAC V1](/design/#doc=formulas/encerclement-cac-v1.md) : deux ennemis au contact sur des cases **non
  adjacentes entre elles** suffisent ; la cible encerclée, **tous** ses adversaires au CAC ont la Frappe dans le dos.
- Pas de blocage au bouclier (Idan, 2026-11-04).

## CAC V1 — Toucher, Blesser & dégâts

1. **Toucher** : [Toucher CAC V1](/design/#doc=formulas/toucher-cac-v1.md).
2. **Blesser** : [Blesser CAC V1](/design/#doc=formulas/blesser-cac-v1.md).
3. **Dégâts PV physiques** : [Dégâts PV physiques V1](/design/#doc=formulas/degats-pv-physiques-v1.md).

## Critiques physiques V1

- **Après Toucher réussi** : jet de critique via Chance ; réussi, [Critique toucher — armure ignorée
  V1](/design/#doc=formulas/critique-toucher-armure-ignoree-v1.md) ignore l'armure pour l'étape Blesser seulement.
- **Toucher naturel 96–100** : test d'échec critique ; échec du test de Chance → **Au Sol** ([Échec critique CAC
  V1](/design/#doc=formulas/echec-critique-cac-v1.md)).
- **Après Blesser réussi** : un critique positif peut imposer les dégâts maximum ([Critique de blessure positif CAC
  V1](/design/#doc=formulas/critique-de-blessure-positif-cac-v1.md)).
- **Blesser naturel 96–100** : échec du test de Chance → [Échec critique de blessure CAC
  V1](/design/#doc=formulas/echec-critique-de-blessure-cac-v1.md) : l'attaquant subit les dégâts minimum de son propre
  coup.
- La V1 distance réutilise ce même principe ; les exceptions d'armes ou de sorts viendront à part si besoin.

Précisions (Idan, 2026-10-20) :
- un seul jet de critique par étape (Toucher : armure ignorée ; Blesser : dégâts maximum), probabilité Chance / 10 ;
- en charge, la blessure critique et le contrecoup gardent le multiplicateur de charge : seuls le jet de dégâts et la
  variation de Résistance physique sont imposés ;
- au tir, les quatre critiques s'appliquent avec la formule de dégâts à distance (sans la Force) : l'échec critique au
  Toucher met le tireur Au Sol, celui à Blesser lui inflige le contrecoup ;
- Au Sol dure jusqu'à la prochaine activation du personnage, comme après une chute en charge.

## Vitesse, prise et cadence CAC V1

- [Vitesse combat effective CAC V1](/design/#doc=formulas/vitesse-combat-effective-cac-v1.md) : Vitesse après armure et
  objets tenus.
- [Malus vitesse arme effectif V1](/design/#doc=formulas/malus-vitesse-arme-effectif-v1.md) : inertie de l'arme, qualité
  et compensation par les maîtrises.
- [Enchaînement d'attaques CAC V1](/design/#doc=formulas/enchainement-d-attaques-cac-v1.md) : enchaînement d'attaques
  avec une arme.
- [Prise d'arme et mode deux mains V1](/design/#doc=formulas/prise-d-arme-et-mode-deux-mains-v1.md) : prises `1 main`,
  `2 mains`, `Au choix`.
- [Combat à deux armes CAC V1](/design/#doc=formulas/combat-a-deux-armes-cac-v1.md) : combat à deux armes.

**Combat à une main** (Idan, 2026-11-02) : une arme à une main tenue seule, l'autre main vide (pistolet compris ; la
fronde est à deux mains ; une arme `Au choix` non empoignée à deux mains), donne **Esquive effective + 0,2 × Combat à
une main** contre tous les jets qui lisent l'Esquive effective (CAC, tir, sorts) : à 50, +10 d'Esquive, une attaque à
50 % passe à 40 %. Au Sol, l'Esquive reste à 0. Tiré à la création comme Combat à deux armes, +10 XP par attaque (doc
08) ; visible dans le détail de l'Esquive. Plus tard, peut-être : une seconde action rapide.

**Attaquer à deux mains** (Idan, 2026-11-02) : une arme `Au choix` tenue seule est à une main ; le bouton « Attaquer à
deux mains » l'empoigne (dégâts × 1,5, Combat à deux mains au Blesser) jusqu'au prochain tour du combattant. La charge
se fait à une main. L'IA empoigne à deux mains si Combat à deux mains ≥ Combat à une main.

**Combat à deux armes** (Idan, 2026-10-08 et 2026-10-20) :
- une **arme** dans chaque main du set actif (un bouclier n'en est pas une) ;
- une arme `2 mains` exige une main secondaire vide : ce qui serait rangé à côté (bouclier, seconde arme), comme une
  arme `2 mains` rangée en main secondaire, n'est pas tenu (ni paire, ni blocage, ni malus de vitesse) ;
- la **Dextérité effective** `Dextérité / (2 − Combat à deux armes / 100)` remplace la Dextérité au Toucher (CAC et
  distance) et dans les enchaînements ;
- à chaque séquence, chaque arme **utilisable** frappe une fois, principale puis secondaire, chacune dans son mode
  (épée + pistolet : la lame au contact, le pistolet au contact comme à distance) ; une arme déchargée ou hors portée
  est sautée ;
- attaque d'opportunité : un coup par arme de mêlée, puis un seul test de Courage ; la zone de menace couvre la portée
  de chaque arme de mêlée tenue ;
- **charge** et **contre-charge** avec **les deux armes** : à l'arrivée, chaque arme utilisable frappe une fois, sans
  séquence suivante, avec son propre `Bonus charge base` ; une seule chute de charge ; un échec critique coupe la
  seconde arme. En contre-charge, chaque arme qui le permet riposte une fois, à son moment (pistolet à mi-course, hast à
  l'entrée dans sa portée) ; la première riposte qui blesse brise la charge ;
- deux pistolets : la paire de base, sans séquence suivante (règle CAC) ;
- pas de seconde arme à la création : elle viendra avec le changement d'équipement (négociation avec le mercenaire).

**Enchaînements** (attaques CAC et tirs `Répétable` ; Idan, 2026-10-08 et 2026-10-20) : la **charge** reste une seule
attaque ; au tir, les attaques d'opportunité des ennemis au contact sont résolues **une fois**, avant la séquence ; la
chaîne vise toujours la même cible et s'arrête si elle n'est plus à portée ; un seul test de Courage en fin de séquence
([Courage post-attaque CAC V1](/design/#doc=formulas/courage-post-attaque-cac-v1.md), [Courage post-tir
V1](/design/#doc=formulas/courage-post-tir-v1.md)), sauf la cible en sous-nombre, qui teste après chaque blessure et pas
en fin de séquence.

## Bouclier physique V1

Le blocage vaut au **CAC et contre les projectiles physiques**, sans malus au tir. Il intervient **après un Toucher
réussi et avant le critique positif de Toucher** ([Blocage bouclier physique
V1](/design/#doc=formulas/blocage-bouclier-physique-v1.md)).

- **Pas de blocage contre une Frappe dans le dos** ou une attaque non détectée ; **un seul blocage réussi par tour**
  (Idan, 2026-11-04), retrouvé au début du tour suivant.
- Le bouclier compte s'il est en main secondaire du **set actif**. `Bonus blocage base` : Rondache 5, Écu 10, Pavois 20
  (`data/reference/skills.json`). Son malus de vitesse s'ajoute à celui de l'arme ; une arme `Au choix` tenue avec lui
  passe à une main (Idan, 2026-10-20).
- À la création, aucun mercenaire ne reçoit de bouclier : seules les armes principales des sets sont remplies
  (05-equipment).
- **Fléau d'armes** (Idan, 2026-10-29) : contre lui, la chance de blocage est divisée par deux.
- Un blocage réussi : l'attaque n'a pas réellement touché (ni critique positif, ni Blesser, ni dégâts) et l'enchaînement
  s'arrête. À deux armes, chaque attaque est testée à part ; la paire continue si au moins une touche réellement.

## Parade du saï (Idan, 2026-10-29)

Un **saï** tenu dans le set actif pare **5 %** des coups **tranchants** de mêlée, **10 %** avec deux saïs (un par main).
Le jet a lieu après le Toucher, le blocage éventuel et le critique au Toucher, une fois le type de dégâts du coup
choisi : un coup perforant ou contondant n'est jamais paré. Comme un blocage, un coup paré n'a pas touché : ni Blesser,
ni dégâts, ni enchaînement, ni arme enchantée. La qualité ne change pas la chance. Données :
`data/reference/weapons.json`.

## Courage post-attaque CAC V1

<aside>
🧠

**Exceptions positionnelles V1 :** un attaquant participant à un encerclement valide ne teste pas son Courage s'il ne
blesse pas ; une cible en sous-nombre utilise [Courage en sous-nombre
V1](/design/#doc=formulas/courage-en-sous-nombre-v1.md) et teste immédiatement **après chaque blessure reçue**, avec
`−10` au score par ennemi de surplus dans la mêlée locale.

</aside>

Hors de ces exceptions, [Courage post-attaque CAC V1](/design/#doc=formulas/courage-post-attaque-cac-v1.md) est résolu
**une seule fois en fin de séquence offensive** :

- au moins une blessure infligée → le défenseur teste normalement ;
- aucune blessure → l'attaquant teste, mais sa probabilité de fuite est divisée par deux.

<aside>
🧠

Score de base : **Courage + 0,25 × Volonté − 0,25 × Intimidation adverse**, borné à 5–95 % avant l'ajustement du cas
sans blessure.

</aside>

## Tir & armes à distance V1

Le tir est un combat physique à distance, sur le même moteur.

- **Toucher** : [Toucher distance V1](/design/#doc=formulas/toucher-distance-v1.md). Aucun malus jusqu'au quart de la
  portée max, puis jusqu'à `−40` au Delta à portée max. L'Esquive du terrain s'applique.
- **Blesser** : [Blesser distance V1](/design/#doc=formulas/blesser-distance-v1.md) ; la **Perception remplace la
  Force**.
- **Dégâts physiques** : [Dégâts PV physiques distance V1](/design/#doc=formulas/degats-pv-physiques-distance-v1.md) ;
  sans Force, l'énergie est dans les dés et puissances de l'arme.
- **Cadence** : [Enchaînement de tirs distance V1](/design/#doc=formulas/enchainement-de-tirs-distance-v1.md) pour les
  armes `Répétable` : arc, arbalète (Idan, 2026-11-06), fronde, sarbacane. Les armes à feu tirent une fois.
- **Approximation** : [Approximation projectile V1](/design/#doc=formulas/approximation-projectile-v1.md) : un tir raté
  peut toucher un allié ou un ennemi dans le **couloir de tir**, un cône de **30°** centré sur l'axe tireur → cible, de
  la **moitié de la distance** de la cible jusqu'à la **portée max** de l'arme (Idan, 2026-10-08).
- **Courage** : [Courage post-tir V1](/design/#doc=formulas/courage-post-tir-v1.md). Une cible réellement blessée peut
  fuir ; le tireur ne teste jamais son Courage pour avoir raté ou pas blessé.
- **Armes à feu** : [Armes à feu — recharge et double pistolet
  V1](/design/#doc=formulas/armes-a-feu-recharge-et-double-pistolet-v1.md) : pas de stock de munitions normales ;
  **recharger = 1 Action rapide** ; épée + pistolet et deux pistolets suivent le combat à deux armes (inerties cumulées,
  une attaque de base par arme utilisable).

**Recharge** (Idan, 2026-10-08 et 2026-10-20) : armes à feu **chargées au début de la mission**, pour la mission
seulement ; armes à recharge : Pistolet, Arquebuse, Tromblon, Canon à main (`data/reference/skills.json`) ; l'arme se
décharge dès que le coup part ; l'IA recharge avec son Action rapide quand son arme est déchargée (après un éventuel
changement d'arme, qui consomme aussi l'Action rapide).

**Approximation** (Idan, 2026-10-08) : après tout tir raté, échec critique au Toucher et tir de contre-charge compris ;
pas après un tir **bloqué** par un bouclier. Le touché suit la suite normale (blocage, critique, Blesser, dégâts) et la
chaîne de tirs s'arrête. Le blessé teste son Courage face au tireur, même allié. Un allié mis hors combat ainsi ne
compte pas pour l'XP de Charisme. Pas pour le Tromblon, arme de zone.

Une attaque à distance exige une **ligne de vue** (décor : « Le modèle de la case » ; personnages : étape 3). Le
**Brouillard** (doc 12) la coupe : ni tir ni sort à travers, depuis ou vers une case de brouillard (sur la ligne droite
entre les deux cases, extrémités comprises). Le **Champ de protection** (doc 12) dévie la moitié des projectiles tirés
sur le protégé, avant le jet de toucher.

Tirer sur une cible distante avec un ennemi adjacent provoque son [attaque
d'opportunité](/design/#doc=formulas/attaque-d-opportunite-cac-v1.md) ; tirer sur cet ennemi avec une arme autorisée au
contact, non.

## Discrétion et camouflage (Idan, 2026-10-28)

- **Camouflé** : un personnage qu'aucun ennemi n'a encore vu est **invisible pour l'armée ennemie** ; au début du
  combat, tout le monde l'est.
- **Repérage** : au **début de chaque tour** (et du combat), chacun teste chaque ennemi camouflé **dans sa ligne de
  vue** (le Brouillard l'empêche) : **P = 100 / (1 + e^(−Δ/15))**, **Δ = 2 × (Perception − (Discrétion + bonus « Se cacher »)) +
  40 − 5 × distance**, de **0,1** à 95 %, jet au centième. Un succès : l'ennemi est **repéré par toute l'armée, pour
  toute la partie**.
- **Armure** (Idan, 2026-11-12) : elle retire de la Discrétion les mêmes points que de l'Esquive, × le malus de sa
  qualité : Plates 16, Écailles 12, Brigandine 9, Mailles 8, Cuir renforcé 5, Cuir 3, Gambison 2, Vêtements 0
  (`data/reference/base-armors.json`) ; éclaireur compris ; la fiche le montre.
- **Se cacher** (Idan, 2026-11-17) : une **action rapide**, pour qui est encore camouflé : au repérage, **+10** de
  Discrétion plus le bonus « Se cacher » de sa case, tant qu'il n'est pas repéré. Il peut se déplacer caché : le +10 le
  suit, le bonus de case suit la case.
- **Invisible** : ni attaque, ni charge, ni sort visé contre lui (les zones le touchent) ; l'IA ne le cible pas ; ni
  attaque d'opportunité ni contre-charge contre lui.
- **Il agit sans se découvrir** : son attaque est une **attaque non détectée**, donc une **Frappe dans le dos** ; un
  sort qui vole ignore aussi la Perception de la cible.
- **Exemples** : Perception 62 contre Discrétion 30 : 95 % à 3 comme à 8 cases ; Perception 43 : 60 % à 12 cases ;
  Perception 60 contre Discrétion 100 à 5 cases : 1,3 %.
- **Brouillard de guerre** : un ennemi camouflé **n'apparaît nulle part** (carte, liste, ordre d'initiative ; le journal
  dit « Un ennemi invisible », sans ses déplacements). Qui entre dans sa case **tombe nez à nez** avec lui : il
  s'arrête, l'ennemi est repéré, les deux camps donnent l'alerte.
- **IA aveugle** (Idan, 2026-11-09) : au début du combat, la moitié des ennemis font des **rondes** (2 pas par tour au
  plus, à 3 cases au plus de leur poste), les autres montent la **garde** sans bouger. Un ennemi **donne l'alerte**
  quand il repère l'un des nôtres ou quand l'un des siens est frappé ou touché par un sort. Alerté sans personne en vue,
  il **fouille l'endroit d'où venait le coup** (ou celui où l'un des nôtres a été vu) ; la piste perdue, il reprend sa
  garde ou sa ronde. L'IA ne vise, ne fuit et ne se range que face à ce qu'elle voit. Notre équipe en combat automatique
  sait où est le camp ennemi.
- **Second mouvement de l'IA** : qui ne peut pas avancer d'une seule case renonce à attaquer pour un second mouvement.
- **L'éclaireur** (Idan, 2026-11-09) : à l'arrivée d'un contrat ou d'une chasse (après la marche), la fenêtre « Escouade
  sur place » propose **Envoyer un éclaireur**, pris dans l'escouade (les plus discrets d'abord) ; un compagnon animal
  ne part pas seul, il suit son maître. Chaque ennemi tente de le repérer à **8 cases**, lui avec **+60** de Discrétion (il se faufile),
  en plus de la sienne : Perception 60 contre Discrétion 30, **1,8 %** ; contre 80, 0,1 %. **Un
  succès : capturé**, avec son animal, il quitte le combat ; **victoire** : libéré **indemne** ; **défaite** : **mort**,
  son animal aussi. Parti seul et capturé : pas de combat, mission perdue. **Pas vu**, il cherche à son tour chaque
  ennemi, à 8 cases, à découvert : ceux qu'il voit **commencent le combat repérés** (il peut en manquer).
- **Rapport et déploiement** : le combat s'ouvre sur **Déploiement · rapport de l'éclaireur** (la carte et les seuls
  ennemis qu'il a vus). On place les nôtres sur la **bande de 4 cases** autour de la carte (ni décor infranchissable, ni
  case prise), puis **Lancer le combat** (ennemis vus repérés ; nous jouons en premier) ou **Rebrousser chemin** :
  contrat perdu (renommée de l'échec, −30), sans combat, sans mort, sans récompense. Sans éclaireur, ou s'il est
  capturé : déploiement au bord gauche.

## Décor (Idan, 2026-11-06)

Paysages : `data/reference/mission-landscapes.json`.

- **Chemins** : le moins cher (à coût égal, le moins de cases). Une case infranchissable ne se traverse pas (ni
  déplacement, ni charge, ni déplacement forcé : on la heurte) ; on n'y invoque rien.
- **Charge en terrain lent** (« pieds dans le tapis ») : la chute de charge (2 %) gagne **+5 % par point de PM au-delà
  de 1** à chaque pas, l'arête comprise.
- **Affichage** : couleur et motif dessiné de chaque décor, en attendant de vraies images ; bords plus sombres si on ne
  traverse pas ; le survol dit ce que fait la case.
- **Mission Test** : 4 à 6 groupes de décor au hasard entre les deux lignes de déploiement.
- **Cartes de contrat** : un **paysage par faction**, tiré à chaque combat :

  | Faction | Paysage | Décor (poids) |
  |---|---|---|
  | Gobelins | Vieille carrière | éboulis, gros rochers, buissons, caisses, marais |
  | Ogres | Carrière | gros rochers, éboulis, buissons, eau peu profonde |
  | Orcs | Camp | caisses, murets, gros rochers, buissons, marais |
  | Hommes-bêtes | Clairière en forêt | forêt épaisse, buissons, marais ; le camp dans une clairière |
  | Voleurs | Repaire | maisons, murs, caisses, blé haut, eau peu profonde |

  10 à 18 groupes de décor (28 à 36 en forêt) pour 30 × 15 cases ; × 2 sur la carte de 36 × 25 (camp au centre) : même
  densité. Aucun décor à 2 cases ou moins de l'escouade ni sur ses colonnes de déploiement, ni à côté des ennemis (4
  cases pour la clairière). **Garde-fou** : chacun peut atteindre l'ennemi à pied ; sinon nouveau tirage, 30 fois au
  plus, puis la carte reste sans décor.
- **Enceinte du camp** : une palissade (ligne d'arêtes ; Muret au cimetière) défendue de l'intérieur, en anneau à **2
  cases** de l'ennemi le plus proche, avec **2 ou 3 ouvertures de 2 cases** (une face à l'escouade, les autres à 4 cases
  au moins l'une de l'autre), rien devant une ouverture. Pas d'enceinte dans la clairière (la forêt suffit), ni au
  hasard en Mission Test. Le château en ruine : un anneau de cases Mur.
- **Garde-fou du décor** (Idan, 2026-11-18) : toute case où l'on peut se tenir se rejoint à pied depuis l'escouade sans
  traverser de mur ni franchir de palissade ou de muraille (un muret n'enferme pas) ; sinon, nouveau tirage (contrats et
  Mission Test).
- **L'IA** suit le vrai chemin, autour du décor. Elle ne fonce pas vers un ennemi qu'elle ne voit pas : sans personne
  en vue ni alerte, elle garde son poste ou fait sa ronde (« IA aveugle ») ; un tireur que personne ne voit passe en
  sentinelle. Dans les missions actuelles, c'est nous qui attaquons (Idan, 2026-11-18).
- **Tireur mal placé** (trop près : arc et arbalète ne tirent pas à moins de 2 cases ; trop loin ; hors de vue) : il va
  sur la case la moins chère de son mouvement d'où il a portée et vue, avec le moins d'attaques d'opportunité ; sinon il
  avance.

## Capacités de terrain (Idan, 2026-11-09)

Qui les a et ce qu'elles donnent : `data/reference/terrain-skills.json`. Niveau d'un sang : 1 lointain ancêtre, 2 lignée
proche, **3 bâtard**. Sur la fiche, avec les **Aptitudes** (effet au survol).

- **Vol** — **sang féerique, divin ou de dragon bâtard**, dès la création : 1 PM par case, au-dessus du décor, et
  **charge aérienne**. À cheval, c'est la monture qui compte.
- **Déplacement aquatique** — **Reptiliens, sangs de sirène, crocodiles invoqués** : **1 PM** et **+30** de Discrétion
  en eau peu profonde, **2 PM** en eau profonde.
- **Respiration aquatique** — **sang de sirène bâtard** : **1 PM** et **+80 d'Esquive** en eau profonde, **+25** en eau
  peu profonde.
- **Déplacement sylvain** — **Elfes sylvains, Tribus de la jungle, Gnomes des forêts, Tribus des forêts anciennes** :
  **1 PM** et **+30** de Discrétion en forêt.
- Cumul : le PM le plus bas ; Discrétion et Esquive s'ajoutent. **Monté**, on se déplace et se cache comme sa monture
  (le cheval d'un elfe sylvain paie la forêt).

## Altitude (Idan, 2026-11-06)

**Retirée en phase 1** (Idan, 2026-11-17 : « Trop complexe à gérer en phase 1 ») ; elle pourra revenir en phase 2. Reste
la hauteur du cavalier au corps à corps (« Combat à cheval »).

## Mode sentinelle (Idan, 2026-11-06)

- **Qui** : un tireur dont l'arme est prête (chargée, pour une arme à feu), qui n'a pas encore attaqué et qu'**aucun
  ennemi ne voit** (camouflé, ou hors de toute ligne de vue ennemie).
- **Quand** : à son activation, **au lieu de tirer** (bouton « Sentinelle »), après un déplacement éventuel ; son
  activation s'arrête là.
- **Le tir** : au tour adverse, le **premier ennemi visible qui fait un pas à sa portée** et dans sa ligne de vue
  (déplacement, approche, charge, fuite ; pas un déplacement forcé par un sort) essuie aussitôt son tir, avec les règles
  du tir ; encore camouflé, c'est une attaque non détectée.
- **Bonus** : **+20 au Toucher** ; enchaînement comme au CAC, (Dextérité effective + Vitesse) / N au lieu de / (1,5 ×
  N), pour les armes `Répétable` (pas les armes à feu).
- **Fin** : après ce tir ; sans cible, au début de sa prochaine activation.
- **Les ennemis aussi** : un tireur ennemi sans cible après son déplacement, que personne ne voit, se met en
  sentinelle ; de même en combat automatique.

## Invocations et morts-vivants (Idan, 2026-10-28)

Fiches des ennemis : `data/reference/enemy-archetypes.json`.

- **Invocations** (doc 12 : zombie, spectre ; corbeau, loups, ours, crocodiles) : dans le camp du mage, avec leur
  activation dans l'ordre d'initiative dès le tour suivant leur arrivée. Au début de chaque tour, le mage les garde
  (test de Charisme, puis mana) ; elles disparaissent quand il tombe. Ni corps, ni bilan de fin de mission.
- **Courage** : un mort-vivant ne le teste jamais (comme en frénésie) ; les créatures de l'Invocation, si.
- **Bourbier** (Invocation) : on y entre, on n'en sort plus tant qu'il dure ; on ne le traverse pas ; on y attaque et on
  y lance des sorts.
- **Spectre** : immunisé aux dégâts physiques (coup d'arme, tir ou sort contondant qui touche le traverse). **Toucher
  spectral** : dégâts psychiques au contact, sans Blesser, armure ni résistance : 10 × 1D6 × Volonté de l'attaquant /
  Volonté de la cible (de × 0,5 à × 2).
- **Morts-vivants ennemis** (doc 17 §19) : **insensibles au poison** (ni dégâts, ni empoisonnement) ; **squelettes** :
  tranchant **× 0,5**, contondant **× 1,5**, perforant entier (chiffres proposés), au CAC, au tir et par les sorts
  physiques ; le journal le dit.
- **Sorts d'une fiche** (le nécromancien) : essayés dans l'ordre de la fiche : son invocation tant qu'elle n'est pas là
  (au plus près de l'ennemi), la Résurrection sur un corps, puis ses sorts sur l'ennemi visible le plus proche ; hors de
  portée, il va d'abord à la case la moins chère d'où lancer. Une fiche sans sort n'en lance aucun, soins compris (Idan,
  2026-11-07).
- **IA commune** (Idan, 2026-11-07), pour les ennemis et nos mercenaires en combat automatique :
  - **Sorts** (sans fiche) : invocations, Résurrection, zones, sorts sur un ennemi, renforts sur soi ; soins de l'IA
    (allié sous 35 % / 60 %). Aucun sort sous **40 %** de réussite : il frappe. Une **zone** vise la case (sur un ennemi
    en vue) qui touche le plus d'ennemis, **au moins 2**, sans allié ni lanceur. Un **renfort sur soi** (Arme
    électrique, Peau d'écailles…) : **une fois par combat**, quand l'ennemi approche ; en action rapide, il frappe
    encore.
  - **Se regrouper** : avant le contact, un combattant de mêlée ne devance pas de plus de **3 cases** le plus en retard
    de ses alliés de mêlée valides, qui avance toujours ; un blessé à l'arrière (sous 30 % de PV) ne retient pas le
    groupe.
  - **Reculer** : sous **30 %** de PV, sans ennemi au contact, il recule vers les siens, sur une case plus loin des
    ennemis, sans attaque d'opportunité (déjà au plus loin, il reste ; un tireur tire encore s'il le peut). Seulement si
    un allié valide le couvre (pas le nécromancien en retrait), et pas s'il peut frapper ce tour un ennemi sous **25 %**
    de PV. Morts-vivants, invocations, leurres et nécromancien ne reculent pas.
  - **Se cacher** : un tireur qui se place prend, à risque égal, la case à la meilleure Esquive du terrain face à sa
    cible. Camouflé et hors de vue, qui ne pourrait pas frapper au tour suivant reste hors de vue, en embuscade, **2
    tours** au plus, avec « Se cacher » (Idan, 2026-11-18) ; un ennemi caché ne se trahit pas dans le journal. Repéré,
    on le reste.
- **Nécromancien** : son **Armée d'os** est levée autour de lui dès le début, sans mana ni jet, puis suit les règles
  d'une invocation (entretien, test de Charisme). **En retrait** : tant que ses troupes tiennent, il n'avance que pour
  lancer un sort et ne frappe qu'un ennemi à son contact ; seul, il se bat.
- **Vol** (chauves-souris de la Cour de sang) : 1 PM par case, sans coût de décor ; au-dessus d'un décor infranchissable
  (murs, rochers, maisons), sans pouvoir s'y arrêter ; bourbier et flaque de magma comptent toujours.
- **Créatures sur plusieurs cases** (Idan, 2026-11-06) : taille **normale** (1 case), **longue** (1×2 : la tête et le
  corps derrière, dans le sens du déplacement ; les montures), **grande** (2×2) ou **énorme** (3×3).
  - **Distance** de case la plus proche à case la plus proche (portées, contact, attaques d'opportunité, encerclement) ;
    on entoure une énorme à 12.
  - **Déplacement** : toute l'empreinte doit passer (dans la carte, sans personnage ni décor infranchissable) ; un pas
    coûte la case la plus lente couverte ; la longue suit son pas. Volante : 1 PM par case, sans s'arrêter sur un
    infranchissable. En fuite, elle sort dès qu'une de ses cases touche le bord.
  - **Toucher** : +10 contre une grande, +20 contre une énorme (CAC, tir, sorts qui visent ; chiffres proposés) ; l'Esquive
    du terrain est celle de sa case la plus exposée.
  - Une **zone** la touche une fois ; **ni poussée ni attraction** ; on la **voit** si on voit une de ses cases. Elle ne
    charge pas encore ; la charge contre elle vise sa case la plus proche.
  - **Placement** : la case la plus proche où toute l'empreinte tient ; un gros pion au centre. **Mission Test** : le
    troisième ennemi est un **troll géant**, grand ou énorme.
- **Drain de vie** (vampire et rejetons) : l'IA se le lance (action rapide) quand un ennemi visible est à portée de ses
  pas et que l'effet n'est pas actif, puis frappe ; c'est le seul sort sur soi que joue l'IA.
- **Régénération** (vampire) : celle du sang de troll : au début de chaque activation, 2D6 × (0,5 + Régénération / 50)
  PV ; rien s'il a été brûlé depuis sa dernière activation.

## Combat à cheval (Idan, 2026-11-07)

Fiches : `data/reference/mounts.json` (une fiche fixe par monture, ennemie ou nôtre).

**Les montures**

- **Destrier** : Force 90, Constitution 70, Dextérité 30, Vitesse 90, Endurance 85, Esquive 20, Courage 35, Volonté 30,
  Perception 60, Intelligence 10 ; **270 PV** (formule des mercenaires) ; **Sabots** 1D8 contondant 50 ; résistances,
  Chance et maîtrise d'un humain moyen (P50) ; gabarit 2. Aussi Charisme 30, Intimidation 40, Discrétion 10, Puissance
  magique et Réserve de mana 0.
- **Licorne** : le destrier, avec Vitesse 110 (10 cases), Endurance 100, Courage 30, Intelligence 80, Volonté 85 (296
  PV), **Corne** 1D10 perforant 70, résistances feu, froid et foudre 50, Charisme 70, Intimidation 20, Puissance magique
  50, Réserve de mana 40 ; loyale bonne. Sort : Création de double (doc 12 ; Illusion 50 : 17 mana, portée 5), dans la
  barre de sorts du cavalier si elle est montée, à sa propre activation si elle est seule.
- **Pégase** : le destrier, avec Force 100, Constitution 80 (**312 PV**), Vitesse 110, Intelligence 80, Volonté 70,
  résistances + 2 (physique 7 ; feu, froid, foudre 6 ; poison 7) ; neutre bon ; 40 po d'entretien. **Il vole** (monté,
  le couple vole) ; charge aérienne « toujours ».
- **Cerbère** : Force 100, Constitution 90 (**339 PV**), Vitesse 75 (7 cases), Intelligence 20, Volonté 60 ; **trois
  Morsures** (1D8 perforant 35 chacune) qui frappent comme le combat à deux armes (chacune une fois par séquence, avec
  son jet, aussi en charge et en attaque d'opportunité ; la séquence peut s'enchaîner) ; gabarit 2 ; loyal mauvais.
- **Molosse de guerre** : Force 30, Constitution 35 (**145 PV**), Vitesse 50 ; **Morsure** 1D6 perforant 25 ; gabarit
  0,5 : il se bat à pied à côté de son maître ; neutre mauvais.
- **Sanglier de combat** (Idan, 2026-11-16) : Force 85, Constitution 80 (**300 PV**), Vitesse 70 (7 cases), Esquive 15,
  Courage 75 ; **Défenses** 1D8 perforant 35, **doublées en charge** (bonus de charge 2) ; gabarit 2, une case ;
  chaotique neutre.
- **Mammouth de guerre** (« Fais le très lent ») : Force 130, Constitution 120 (**426 PV**), Vitesse 25 (**4 cases**),
  Courage 20, Armes naturelles 30 ; **Défenses** 1D12 contondant 50, doublées en charge ; gabarit 3 ; taille
  « grande » ; neutre.
- **Tricératops** (Idan, 2026-11-17 : « une forteresse sur pattes ») : Force 140, Constitution 150 (**524 PV**),
  **Résistance physique 14** (la plus haute du jeu), Vitesse 25 (4 cases), Courage 40, Armes naturelles 45 ; **Cornes**
  1D12 perforant 70, doublées en charge ; **gabarit 4** ; taille « grande » ; il craint le froid ; neutre.
- **Papillons** (Idan, 2026-11-09), qui **volent** : **télépathe** (Discrétion **300**, Perception 90, Vitesse 110 ;
  n'attaque pas) ; **vénéneux** (Discrétion **150** ; sa **Piqûre** n'enlève aucun PV mais **empoisonne comme une
  sarbacane** : 10 PV par tour, 3 tours, jet de résistance à chaque activation ; il pique sans se découvrir) ; **géant**
  (taille d'un loup, gabarit 1 : monté, le couple vole ; Discrétion **100** ; ne frappe pas ; **charge aérienne
  seulement monté**).
- **Loup de combat** (Idan, 2026-11-07 : « on limite à un compagnon / monture pour l'instant ») : la fiche du Loup de la
  Cour de sang (gabarit 1, **Morsure** 1D8 perforant 35), chaotique neutre, dans l'emplacement Monture.
- Destrier et licorne : ni vision nocturne, ni vol, ni régénération ; artisanat, camp et compétences animales à 0. Nos
  montures gardent leur mana d'un combat à l'autre (recharge au camp) et progressent avec l'XP de leurs combats, comme
  nos mercenaires (doc 08).

**Monter**

- **Gabarit** : les places du dortoir du peuple (Gobelin, Gnome, Halfling 0,5 ; Ogre 2 ; les autres 1). **On ne monte
  qu'une bête plus grande que soi** : l'ogre ne monte ni destrier, ni cerbère, ni sanglier, mais monte le mammouth ; les
  petits montent le loup et le papillon géant ; personne ne monte le molosse ni le télépathe.
- **À pied** : qui ne peut pas monter son compagnon (cerbère ou sanglier de l'ogre, loup des autres que les petits)
  l'emmène à pied : au début du combat, il se pose sur la case libre la plus proche de son maître et joue seul **juste
  après lui**, comme un mercenaire.
- **Un animal qui n'attaque pas** ne va pas au contact : au contact d'un ennemi qu'il voit, il s'éloigne ; sinon il
  reste à deux cases de son maître. Il **ne tient pas le terrain** : si seuls de tels animaux restent debout dans un
  camp, ce camp a perdu.

**Le couple**

- **Un pion, deux fiches** (PV, effets, poison, brûlure…) sur les mêmes cases ; le couple a la **taille de la monture**
  et regarde vers l'adversaire ; la monture subit ses effets au début de l'activation du cavalier. Discrétion : la plus
  basse des deux ; Intimidation : la plus haute (pour le Courage de ceux qu'il frappe).
- **Déplacement** : celui de la monture (destrier 8 cases ; humain moyen 5).
- **La monture agit** dans l'activation du cavalier : sa propre action principale (bouton **Attaque de la monture**, au
  contact) et sa propre action rapide, ses sorts et son mana ; déplacement commun. IA : après le cavalier, un sort,
  sinon son attaque au contact.
- **Elle menace aussi** : qui quitte le contact du couple subit l'attaque d'opportunité du cavalier, puis celle de la
  monture.
- **XP, réputation, titre** : chaque attaque de la monture (ou du loup mené à pied) donne au cavalier l'XP d'une arme
  (doc 08 : 10, + 5 si elle touche, + 5 si elle blesse), famille de la monture (Équidés, Canidés…), catégorie Compagnon
  animal. Ses exploits comptent pour sa réputation (doc 09) ; équipée, elle s'ajoute à son titre (doc 19) : « à
  cheval », « à dos de sanglier », « de mammouth », « de tricératops » ; « à dos de loup » seulement pour qui le monte.
- **Qui prend les coups** : au CAC et en charge, le joueur choisit (bouton **Viser la monture**, sinon le cavalier) ; au
  tir, pour un sort qui vise, une attaque d'opportunité et les coups de l'IA, la monture est visée à son gabarit ÷ (son
  gabarit + celui du cavalier) (humain sur destrier : 2 ÷ 3 ; gobelin : 80 % ; mammouth : 75 % sous un humain, 60 % sous
  un ogre ; tricératops : 80 % sous un humain, 67 % sous un ogre) ; une zone touche les deux. Sur un allié monté,
  **Viser la monture** lui donne le sort ou la potion (action rapide).
- **Hauteur** : au CAC, le cavalier compte un niveau plus haut : + 10 au Toucher pour lui, − 10 contre lui ; rien contre
  la monture.
- **Charge** : avec le déplacement de la monture (destrier : 8 à 16 cases), depuis la tête, le corps suivant ; **+ la
  moitié de la Force de la monture** pour le cavalier (Blesser et dégâts) ; **la monture frappe aussi**, juste après,
  même cible, avec le bonus de charge (son action principale). Charger le cheval, c'est essuyer la contre-charge de son
  cavalier.
- **Charge aérienne** (Idan, 2026-11-09) : capacité de fiche, à donner à qui on veut (pas aux chauves-souris) :
  « toujours » (seule ou montée : le pégase) ou « montée ». Une grande bête qui l'a « toujours » charge aussi seule. La
  ligne habituelle (droite, 1 à 2 fois le déplacement) passe **au-dessus des personnages, du décor, du bourbier et du
  magma** ; seule **l'arrivée**, corps compris, doit être libre. **Pas d'attaque d'opportunité** pendant la course ; un
  bourbier ne retient qu'à l'arrivée. **Contre-charge** au même moment, **Toucher × 0,5**. Chaque arme qui frappe
  (cavalier, arme naturelle de la monture) : **Toucher, Blesser et dégâts × 1,2**, en plus du bonus de charge et de la
  Force de la monture ; chance plafonnée à 100 % ; l'aperçu et le journal l'indiquent.
- **Courage et Volonté partagés** : ceux de la monture + (ceux du cavalier − ceux de la monture) × part ; part =
  (Compagnon animal + famille de la monture) ÷ 100, au plus 1. **Un seul test de Courage pour le couple** (un coup sur
  la monture compte) ; ils fuient ensemble.
- **Monture KO** : le cavalier tombe **Au Sol** (jusqu'à sa prochaine activation) et se bat à pied ; la monture reste
  couchée, capturable après une victoire (doc 11 §8).
- **Cavalier KO** : la monture joue seule dès le tour suivant, **juste après lui** dans l'ordre (pas d'initiative
  propre), et fuit comme tout combattant (destrier : Courage 35). Un cavalier qui sort de la carte emporte sa monture.
- **Descendre / Monter** (action rapide) : il descend sur une case libre au contact du couple, la monture jouant seule
  juste après lui ; il remonte au contact ; **seul son cavalier** la monte. Le couple a fait le premier déplacement de
  chacun s'il a bougé, les deux s'il a fait un second mouvement ; en remontant, il repart avec le déplacement de la
  monture si elle n'a pas encore joué ce tour. L'IA ne descend pas d'elle-même.
- **Écran** : le pion couvre les cases du couple, avec une seconde barre de PV ; le survol donne les PV de la monture
  et, au tir, sa chance de prendre le coup.
- **Nos montures** (loup compris) : apprivoisée et équipée (emplacement Monture ; doc 11 §8), elle part au combat ;
  cavalier KO, on la joue comme un mercenaire. En fin de combat, la **chaîne de nos mercenaires** (doc 10 : mort →
  blessure → fatigue, jet doublé après une défaite de contrat) : morte, perdue ; blessée ou fatiguée, au repos aux
  Écuries autant de jours qu'un mercenaire (Dispensaire, médecin, bains chauds), le cavalier part à pied. Cavalier
  mort : elle retourne à l'Intendance, sans propriétaire.

## Attaques de zone — Toucher V1

[Précision d'attaque de zone V1](/design/#doc=formulas/precision-d-attaque-de-zone-v1.md) fournit le noyau commun :
l'attaque vise une **case**, puis chaque cible potentielle perd **10 points de probabilité de toucher par case d'écart**
à cette case.

`P_touche(d) = max(0, P_touche_centre − 10×d)`.

La **forme et le rayon** restent propres à l'arme ou au sort. Cette règle sert au Tromblon, à la Boule de feu, à la
Pluie de glace et aux futures zones. **Exception (Idan, 2026-10-25)** : la Boule de feu ne s'évite pas ; elle peut
dévier de 1 à 3 cases et ses dégâts diminuent du centre vers le bord (doc 12, « École du Feu »).

## Charge & contre-charge V1

- [Charge CAC V1](/design/#doc=formulas/charge-cac-v1.md) : en ligne droite dans n'importe quelle direction (en biais :
  l'escalier), sans personnage, magma ni bourbier entre les deux (Idan, 2026-11-04) ; distance `MouvementBase` à `2 ×
  MouvementBase` ; 2 % de chute de base (plus en terrain lent : « Décor ») ; puissance croissante selon distance
  parcourue × `Bonus charge base` de l'arme ; V1 = **1** par défaut, **2** pour hast / armes `2 mains`.
- [Contre-charge V1](/design/#doc=formulas/contre-charge-v1.md) : la cible d'une charge peut réagir avec une arme
  configurée `Contre-charge`. Une réaction **à distance part à mi-course** ; une réaction de mêlée / hast part à sa
  portée normale. Sur une course impaire `2N+1`, mi-course = case **N+1** (5 cases → 3e ; Idan, 2026-10-08).

Si la contre-charge **blesse** le chargeur, son attaque est annulée et il teste aussitôt son Courage. En cas d'échec, il
fait demi-tour et consomme tout mouvement de charge restant pour repartir dans la direction opposée.

Précisions (Idan, 2026-10-20) :
- la contre-charge est **automatique** dès que l'arme active de la cible le permet ; une arme à feu doit être chargée et
  se décharge en tirant ; un personnage En Fuite ne contre-charge pas ;
- c'est une seule attaque normale (Toucher, blocage, critiques, Blesser), sans enchaînement ; si elle ne blesse pas,
  personne ne teste son Courage et la charge continue ;
- le chargeur blessé fait le test normal face à la cible, sans malus de sous-nombre ;
- le demi-tour suit la ligne de la charge à rebours ; il s'arrête sur une case occupée ou au bord de la carte, et peut
  provoquer des attaques d'opportunité ;
- une charge brisée avant son attaque (contre-charge ou attaque d'opportunité pendant la course) compte quand même comme
  **charge tentée** pour l'XP de Courage (doc 08).

## En Fuite V1

[Mouvement de fuite immédiat V1](/design/#doc=formulas/mouvement-de-fuite-immediat-v1.md) : quand l'état En Fuite est
appliqué, tout mouvement restant sert à s'éloigner de la source de peur. Avec `0` mouvement restant, le personnage reste
sur place mais demeure En Fuite.

À partir du tour suivant, [Reprise de contrôle — En Fuite V1](/design/#doc=formulas/reprise-de-controle-en-fuite-v1.md)
est résolu au début de chaque activation. Une réussite retire aussitôt **En Fuite** et rend l'activation normale
complète. En cas d'échec, [Comportement automatique — En Fuite
V1](/design/#doc=formulas/comportement-automatique-en-fuite-v1.md) remplace toute l'activation par un `1D3` : **Course
effrénée**, **Cachons-nous** ou **Feu à volonté**. Première valeur à tester : **+10 au score de récupération par tour
commencé En Fuite** ; les déplacements imposés restent soumis aux attaques d'opportunité.

- **Cachons-nous** sans abri total valide : il file vers une **sortie de carte**, sans jamais entrer dans une case
  adjacente à un ennemi ; sans trajet sûr, il s'éloigne au mieux par les cases sûres, sinon il reste sur place.
- **Feu à volonté** tire à la cadence de l'arme et ne recharge pas une arme déchargée.
- Sortir de la carte coûte une case de mouvement depuis une case du bord ; le fuyard sorti est hors combat.

[Boîte à idées — Combat](/design/#doc=91-combat-ideas.md)

[Fin de mission, temps & indisponibilités](/design/#doc=10-mission-time-and-unavailability.md)

## Mission Test — prototype tactique V1

Le bouton **Mission Test** lance un combat d'essai : **3 mercenaires** choisis contre **3 ennemis** générés, sur une
carte de **13 × 9** cases (les équipes à deux colonnes de leur bord ; le joueur joue en premier). Courage après chaque
attaque (CAC, tir, charge, attaque d'opportunité). IA V1 : attaque si possible, sinon charge si valide, sinon avance
vers la cible la plus proche et attaque si elle entre en portée. Fin quand les trois membres d'une équipe sont **hors
combat**.

- **Actions** : Se déplacer, Attaquer, Charger, Changer de set d'armes, Attaquer à distance. **Se déplacer** est choisi
  d'office ; la carte montre le mouvement restant (bleu) et, tant que l'Attaque est disponible, le second mouvement
  (violet), qui la sacrifie ; après le premier mouvement, le bouton devient **Second mouvement** (Idan, 2026-11-14).
- [Aura du capitaine](/design/#doc=13-fleeing.md) (Idan, 2026-10-24) : 35 % du Courage + 25 % du Charisme du capitaine
  présent, équipement compris, en Courage pour ses alliés à 10 cases ou moins ; un allié qui tient un **fouet** ajoute
  **+5 / 10 / 15 / 20 % du Courage de base** (selon le tier ; Idan, 2026-11-05) des autres alliés à 3 cases ou moins
  (journal : « fouet +5 »).
- **Écran** (Idan, 2026-11-04) : la portée de l'action choisie, la zone d'un sort au survol (disque, anneau, ligne,
  cône, mur), les destinations qui provoquent des attaques d'opportunité, les encerclés en pointillés. En **Attaquer**,
  un ennemi à portée de mouvement est cliquable : approche par le plus court chemin (à égalité, le moins d'attaques
  d'opportunité), puis frappe si possible ; le survol montre ce chemin. L'aperçu d'un sort donne réussite, coût, Toucher
  ou précision, fourchette d'effet (après protection élémentaire, Volonté, Blesser et Résistance physique selon le
  sort), bonus, zone, durée. Un journal détaille mouvements, jets et dégâts.
- **Tour ennemi** : un ennemi après l'autre, animé, avec une pause d'environ 1 s ; **Accélérer** la raccourcit ; le
  combat automatique joue d'un coup.
- **Caméra** (Idan, 2026-11-16 : « Zoomer et rester ») : au début de chaque tour, elle glisse sur celui qui joue et
  zoome (deux fois la carte entière, ou le zoom choisi par le joueur), sans vide au-delà des bords, et y reste ; « carte
  entière » pour reculer. Environ 0,7 s, moins avec **Accélérer**, rien si le système demande moins de mouvement. Elle
  part de la case où l'ennemi a commencé son tour, sauf s'il y était caché. Zoomer ou faire glisser la carte
  l'interrompt.

### Simplifications volontaires du premier test

Dans ce banc de test, `PV <= 0` signifie **hors combat** et déclenche la condition de victoire. La mortalité de fin de
mission reste un système séparé. Les PV restent **signés** sous 0 : l'interface affiche 0, mais la profondeur sert au
jet de mort de fin de mission.
