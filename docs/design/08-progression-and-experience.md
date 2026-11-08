> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Progression & expérience

<aside>
🧪

**Version de travail validée au 1er octobre 2026.** Le système sépare l’**XP naturelle**, gagnée par ce que le mercenaire vit réellement, et l’**XP choisie**, obtenue par formation au camp.

</aside>

## 1 — Courbe universelle XP → niveau

Même fonction pour les caractéristiques, les compétences et les sorts (Idan, 2026-11-08 : « Je veux qu'on reste aligné pour compétences et carac, ça c'est certain »). La **valeur** est le **niveau**.

**Avant le 2026-11-08** : XP cumulée = 10 × Niveau², soit un point n → n+1 à 10 × (2n+1) XP.

**Courbe par zones, lissée** (Idan, 2026-11-08 : « De 0 à 50, c'est très facile (on divise par 4) De 51 à 100, (on divise par 2) De 101 à 150 comme aujourd'hui De 151 à 200 on divise par 0,75 » ; « Je choisis option 1 on lisse le tout (fais les maths, je te fais confiance). Après 200, on durcit encore un peu ») :

$$
XP(n\rightarrow n+1)=arrondi\left(10(2n+1)\times m(n+0{,}5)\right)
$$

- **m** vaut **1 / diviseur au milieu de chaque zone** : ¼ à 25 (zone 0–50), ½ à 75 (51–100), 1 à 125 (101–150), 1 / 0,75 ≈ 1,33 à 175 (151–200) ;
- entre deux milieux, m varie **en ligne droite** : pas de marche à 50 ni à 100 ;
- sous 25, m reste à ¼ ; **au-delà de 175, m continue de monter avec la même pente** (≈ 1,67 à 225, 2 à 275) : « on durcit encore un peu » ;
- constantes : `progression.xp_curve.coefficient` (10), `progression.xp_curve.zone_width` (50), `progression.xp_curve.zone_1_divisor` à `zone_4_divisor` (4, 2, 1, 0,75) ; code : `game-core/progression.js` (`xpForLevel`, `levelForXp`).

Chaque point coûte au moins autant que le précédent. Les repères restent proches de la proposition à marches (6 250, 43 750, 168 750 et ≈ 402 000 XP pour 50, 100, 150 et 200).

Une compétence est un **niveau continu** (30,6 = niveau 30, à 60 % de la tranche vers 31). Une valeur sans XP enregistrée (valeur générée, ou changée par ailleurs) repart du milieu de sa tranche : les valeurs ne bougent pas quand la courbe change, seul le prix des points suivants change.

Pour les caractéristiques, **pas de plafond maximum** ; pour les compétences non plus (Idan, 2026-11-06 : « pas de plafond. La courbe d'expérience fait que c'est plus dur de monter, mais sky is the limit ! »).

### Repères de progression

| Passage | XP nécessaire sur la tranche | XP cumulé à l'arrivée | Avant (10 × N²) |
| --- | --- | --- | --- |
| 0 → 10 | 255 | 255 | 1 000 |
| 10 → 20 | 755 | 1 010 | 4 000 |
| 20 → 30 | 1 287 | 2 297 | 9 000 |
| 30 → 40 | 2 107 | 4 404 | 16 000 |
| 40 → 50 | 3 157 | 7 561 | 25 000 |
| 50 → 60 | 4 407 | 11 968 | 36 000 |
| 60 → 70 | 5 857 | 17 825 | 49 000 |
| 70 → 80 | 7 607 | 25 432 | 64 000 |
| 80 → 90 | 10 219 | 35 651 | 81 000 |
| 90 → 100 | 13 319 | 48 970 | 100 000 |
| 100 → 110 | 16 819 | 65 789 | 121 000 |
| 110 → 120 | 20 719 | 86 508 | 144 000 |
| 120 → 130 | 24 911 | 111 419 | 169 000 |
| 130 → 140 | 28 811 | 140 230 | 196 000 |
| 140 → 150 | 32 877 | 173 107 | 225 000 |
| 150 → 160 | 37 210 | 210 317 | 256 000 |
| 160 → 170 | 41 811 | 252 128 | 289 000 |
| 170 → 180 | 46 677 | 298 805 | 324 000 |
| 180 → 190 | 51 810 | 350 615 | 361 000 |
| 190 → 200 | 57 211 | 407 826 | 400 000 |
| 200 → 250 | 376 384 | 784 210 | 625 000 |
| 250 → 300 | 551 386 | 1 335 596 | 900 000 |

Coût d'un seul point : 53 XP à 10, 169 à 30, 381 à 50, 763 à 75, 1 518 à 100, 2 518 à 125, 3 522 à 150, 4 692 à 175, 6 028 à 200, 9 202 à 250.

## 2 — XP naturelle

> **Bêta-test (Idan, 2026-11-07 : « On double l'xp gagné partout (combat / entrainement au camp ....) »)** : toutes les XP de cette page et de la formation au camp (entraînement libre, médecin, directeur, professeur, Perfectionner) sont **doublées**, puis **doublées à nouveau** (Idan, 2026-11-08 : « multiplie l'xp Gagné par 2 à nouveau ») : × 4 en tout ; les valeurs ci-dessous sont à jour, `data/reference/formula-constants.json` fait foi. La courbe XP → niveau ne change pas avec ces doublements (elle passe par zones le 2026-11-08, §1).

Principe général : les caractéristiques progressent en conséquence d’actions et de résultats d’actions en combat. Un plafond de gain par mission est envisagé mais **pas encore chiffré**.

**Multiplicateur d'étoiles** (Idan, 2026-11-08 : « Multiplicateur selon les étoiles de la mission … On prend ça, c'est le plus rapide à équilibrer et ça boostera tout le monde ») : toute l'XP d'une mission (caractéristiques, résistances, compétences, sorts, et les reculs qui vont avec) est multipliée par **1 + 0,25 × (étoiles − 1)** : 1★ × 1, 3★ × 1,5, 5★ × 2, 10★ × 3,25, 15★ × 4,5 (`progression.mission.star_bonus`). Pas de multiplicateur selon le tier de l'ennemi. Un combat sans mission (Mission Test) : × 1. Le « rentrer vivant avec sa monture » n'est pas multiplié (ce n'est pas du combat).

**Nouvelles actions** (Idan, 2026-11-08) : leurs valeurs sont celles d'Idan, sans les doublements du bêta-test (constantes `progression.*` en version V2).

### Chance — « La chance tourne »

- **EC confirmé** : `+120 XP Chance`.
- **CC** : `−20 XP Chance`.
- L’XP ne descend jamais sous 0.

Avec les formules actuelles de CC/EC, le système crée un équilibre statistique naturel autour de **Chance 75** : en dessous, la tendance moyenne est à la hausse ; au-dessus, à la baisse.

### Résistances — « Ce qui ne te tue pas te rend plus fort »

À chaque **blessure effectivement subie** d’un type de dégâts :

- résistance correspondant au type : `+32 XP` ;
- chacune des quatre autres résistances : `−8 XP` ;
- aucune résistance ne descend sous `0 XP` ;
- aucun plafond maximum.

Types concernés : Physique, Feu, Froid, Foudre, Poison.

**Dégâts mixtes :** chaque composante est traitée séparément. Exemple Physique + Feu : résolution complète du gain/perte Physique, puis résolution complète du gain/perte Feu.

**Attaques multiples et DOT :** même règle. Ce qui compte est chaque blessure effectivement subie, quelle que soit sa source ou sa fréquence.

### Constitution — « Y’a quelque chose dans ta potion, non ? »

Pour chaque **1 PV réellement restauré par un soin** :

- `+4 XP Constitution`.

Pour chaque **PV de dégâts encaissé** pendant la mission, s'il y survit (Idan, 2026-11-08 : « +2 XP par PV de dégâts encaissés et survécus ») : `+2 XP Constitution` (le cumul de la mission, celui de la fatigue : les soins ne l'effacent pas ; `progression.constitution.damage_taken_xp`).
- Les PV de soin qui dépassent les PV max ne rapportent rien.
- Seuls les PV réellement récupérés comptent.

### Courage — « Courage, fuyons ! »

Chaque **charge tentée contre un ennemi**, même ratée ou finie en chute (« le courage, c'est de tenter » — Idan, 2026-10-06) :

- `+200 XP Courage`.

### Vitesse — « Cours Forest, cours ! »

Chaque **case parcourue en état de fuite** :

- `+8 XP Vitesse`.

Chaque **case parcourue en combat**, en fuite ou non (Idan, 2026-11-08 : « Vitesse +1 par case parcourue en combat ») : `+1 XP Vitesse` (`progression.speed.hex_moved_xp`) ; en fuite, les deux s'additionnent.

### Charisme — « Triste Monde ! »

Chaque **adversaire mis hors combat** par le mercenaire (décision Idan, 2026-10-06 : les ennemis ne font pas de jet de mort, « tué » = hors combat) :

- `+200 XP Charisme`.

Chaque **test de Courage tenu par un allié grâce à son aura** (Idan, 2026-11-08 : « Charisme +40 quand un allié proche réussit son test de Courage et qu'il a utilisé son aura (donc pour capitaine et lieutenant uniquement) ») : `+40 XP Charisme` au capitaine ou au lieutenant dont l'aura a compté (la plus forte à portée, doc 04 ; le fouet seul ne compte pas) ; après une attaque, un tir, une charge ou un sort de Peur (`progression.charisma.aura_hold_xp`).

Le Charisme inclut ici l’idée d’aura, de présence et de réputation martiale, pas seulement l’aisance sociale.

### Perception — « C’est comme ça que le métier rentre »

Chaque fois qu’un mercenaire est **effectivement blessé par une attaque reçue dans le dos** :

- `+40 XP Perception`.

Chaque **tir qui touche** (ni bloqué ni paré) **au-delà de la moitié de la portée** de l'arme (Idan, 2026-11-08) : `+20 XP Perception` (`progression.perception.long_shot_xp`). Exemple : un arc de portée 12 tire à 7 cases ou plus.

### Force — porter son équipement

Décision Idan du 2026-10-07 : la Force progresse selon le **rapport entre le poids de l'équipement porté et la Force actuelle**.

- **Charge** = malus de vitesse de base de l'armure + malus de vitesse de base de **toutes les armes équipées** (les deux sets, qu'il transporte). Ce malus représente déjà poids et inertie (formule *Malus vitesse arme effectif V1*) ; pas de colonne de poids distincte.
- À chaque **activation** en mission, avec la charge et la Force **du moment** (relevées à chaque activation : un changement d'équipement ne modifie pas l'XP déjà acquise) :

$$
XP_{Force}=80\times\max\left(0;\ \frac{Charge}{Force}-0{,}25\right)
$$

- Un équipement léger pour le mercenaire (charge sous le quart de sa Force) ne rapporte rien ; plus il est lourd pour lui, plus il progresse. Le rendement baisse de lui-même quand la Force monte : le mercenaire tend à devenir « aussi fort que ce qu'il porte ».
- Repères (≈ 5 activations par mission) : hache double + plates (charge 52) à Force 55 → ≈ 280 XP par mission ; épée longue + écu + mailles (28) → ≈ 100 XP ; dague + arc + cuir (14) → 0.

### Dextérité, Esquive, Endurance, Volonté, Intelligence (décisions Idan du 2026-10-20)

Chaque caractéristique pourra recevoir d'autres sources plus tard : leurs XP s'additionnent.

- **Dextérité** : chaque **enchaînement réussi** (attaque, tir ou séquence à deux armes supplémentaire) : `+200 XP`.
- **Esquive** : chaque **coup encaissé qui blesse** : `+40 XP`. Le contrecoup de sa propre arme n'en est pas un.
- **Endurance** : chaque **case parcourue en armure lourde** (plates, écailles) : `+8 XP` ; chaque **activation commencée au contact d'un ennemi** (à une case ; Idan, 2026-11-08 : « +10 par tour passé au contact d'un ennemi ») : `+10 XP` (`progression.endurance.contact_turn_xp`).
- **Volonté** : chaque **test de Courage réussi** : `+80 XP` ; chaque **reprise de contrôle** réussie en fuite : `+80 XP` ; chaque **sort ennemi résisté** (Paralysie, Sommeil, Prison de glace ; Idan, 2026-11-08) : `+80 XP` (`progression.will.spell_resisted_xp`).
- **Intelligence** : il apprend de ses erreurs : chaque fois qu'il choisit le **pire type de dégâts** : `+120 XP`. Ce mauvais choix n'arrive qu'aux mercenaires sous 50 d'Intelligence.

### Puissance magique, Réserve de mana, écoles et sorts (décisions Idan du 2026-10-25)

Détail dans le doc 12 (« Écoles : progression et régression »).

- **Puissance magique** : chaque sort réussi qui a un vrai effet : `+80 XP`.
- **Réserve de mana** : chaque point de mana dépensé, même si le sort rate : `+8 XP`.
- **Chance** : les critiques des sorts comptent comme ceux des armes (`−20` / `+120`), et pour la réputation aussi (doc 09).
- **Sort et école** : chaque lancer `+40 XP`, `+20` s'il réussit, `+20` s'il a un vrai effet ; les deux écoles opposées perdent chacune un quart du gain de l'école ; une école ne descend pas sous 1 ; les sorts ne régressent pas, plafond 100.
- Les dégâts des sorts et de l'arme enflammée comptent pour les **Résistances** de la cible (brûlure : Résistance au feu) et, pour le lanceur, comme un coup d'arme (Charisme, réputation) ; les soins comptent pour la **Constitution** du soigné.

### Compétences (décisions Idan du 2026-10-20)

- Même courbe que les caractéristiques ; **sans plafond** depuis le 2026-11-06 (Idan : « sky is the limit ») : `valeur_maximale` n'est plus une limite. Auparavant plafond à 100.
- Les valeurs générées ont des décimales : une compétence est un **niveau continu**, 30,6 = niveau 30, à 60 % de la tranche vers 31. Le bilan arrondit au point entier.
- **Arme et catégorie** : chaque attaque portée avec une arme : `+40 XP` à l'arme précise et à sa catégorie ; `+20` de plus si elle touche réellement (non bloquée), `+20` si elle blesse. La chute de charge et le projectile perdu (même tir) ne comptent pas.
- **Styles** : Combat à une main `+40 XP` par attaque avec une arme à une main tenue seule, mêlée ou tir (Idan, 2026-11-02) ; Combat à deux mains `+40 XP` par attaque de mêlée à deux mains ; Combat à deux armes `+40 XP` par séquence où **les deux armes ont réellement frappé** (une seconde arme déchargée ou hors de portée ne donne rien, revue Chatty du 2026-10-20) ; Boucliers et le bouclier précis `+40 XP` chacun par blocage.
- **Intimidation** : chaque adversaire qui rate son test de Courage face au mercenaire : `+200 XP`.
- **Compétences animales** (Idan, 2026-11-07 : « xp catégorie animal pour le cavalier ») : chaque attaque de sa monture, quand il la monte ou qu'elle se bat à pied à ses côtés (le loup qu'un humain emmène, sa monture quand il est descendu ; Idan : « Oui bien sur »), comme une arme : `+40 XP` à la famille de la monture (Équidés…) et à Compagnon animal, `+20` si elle touche, `+20` si elle blesse (mêmes constantes que les armes ; sans recul des autres familles).
- **Rentrer vivant avec sa monture** (Idan, 2026-11-07 : « 50 XP oui », doublé deux fois depuis) : quand le mercenaire et la monture ou le compagnon avec lequel il est parti survivent tous deux à la chaîne de fin de mission, `+200 XP` à Compagnon animal et à la famille de l'animal (`progression.skill.mount_return_xp`).
- **Nos montures** (Idan, 2026-11-07 : « xp licorne ») : leur fiche à elles progresse avec ces mêmes règles (doc 04, « Combat à cheval »).
- **On progresse au détriment des autres** : chaque gain fait perdre, au total, **la moitié de ce gain**, à parts égales, aux compétences que le mercenaire possède (valeur > 0) :
  - un gain d'arme : les **armes des autres catégories** (l'épée longue fait reculer haches, marteaux… mais pas les autres lames longues) ;
  - un gain de catégorie : les autres catégories d'armes ;
  - un gain de style : les autres styles (une main, deux mains, deux armes, boucliers).

### Application en fin de mission (V1 — décisions Idan du 2026-10-06)

- La **valeur** d'une caractéristique ou d'une résistance **est son niveau** : une valeur de 50 correspond à 7 561 XP cumulés (25 000 avant la courbe par zones du 2026-11-08, §1).
- Pendant la mission, chaque mercenaire tient un **journal** de ce qu'il vit ; l'XP naturelle est calculée et appliquée **en fin de mission**, aux survivants (y compris ceux qui ont fui le combat).
- Une valeur **monte ou descend** selon son XP ; l'XP ne descend jamais sous 0, ni la valeur sous son minimum.
- Une valeur générée, qui n'a pas encore d'XP, démarre au **milieu de la tranche** de son niveau (constante `progression.xp_curve.start_position` = 0,5, validée par Idan le 2026-10-07) : sans cela, la première petite perte ferait tomber un point.
- Résistances : chaque composante de dégâts qui blesse effectivement compte séparément. **Limite V1** : le moteur de combat ne produit encore qu'une composante, physique, par attaque ; les dégâts mixtes (physique + feu), les dégâts sur la durée et les coups multiples s'inscriront composante par composante quand ils existeront.
- Le joueur voit un **récapitulatif** dans le bilan de fin de mission : XP gagnée ou perdue par caractéristique, et valeurs qui ont changé.
- Toutes les valeurs de cette section sont des **constantes d'équilibrage** (`data/reference/formula-constants.json`, codes `progression.*`).
- Branché dans le prototype : Résistances, Courage, Vitesse, Charisme, Perception, Force, Chance, Dextérité, Esquive, Endurance, Volonté, Intelligence, Constitution, Puissance magique, Réserve de mana, les compétences de combat (armes, catégories, styles, Intimidation), les compétences animales (attaques de la monture), les écoles de magie et les sorts. En attente : les autres compétences.
- Chance (choix d'implémentation validés par Idan le 2026-10-20) : chaque critique positif, au Toucher comme à Blesser, compte comme un CC ; chaque échec critique confirmé, au Toucher (Au Sol) comme à Blesser (contrecoup), compte comme un EC. Le contrecoup d'un échec critique de blessure compte comme une blessure physique subie pour les Résistances.

## 3 — XP choisie : formation au camp

L’XP choisie permet au joueur d’orienter volontairement la progression d’un mercenaire en échange de **temps, argent et disponibilité opérationnelle**.

### Boucle hebdomadaire

1. Choisir une caractéristique ou compétence à entraîner.
2. Affecter un **professeur**.
3. Affecter un ou plusieurs **élèves**.
4. Payer le coût de la formation.
5. Résoudre les tests de formation.
6. Attribuer l’XP obtenue à la caractéristique ou compétence visée.

### Professeur

- Normalement un mercenaire présent au camp.
- Doit posséder un **niveau minimum** dans la caractéristique ou compétence enseignée.
- Sa compétence **Transmission du savoir** modifie/multiplie le gain d’XP des élèves.
- Certains événements peuvent faire apparaître temporairement un instructeur PNJ, par exemple un **BootCamp**.

### Élèves

- Leur progression dépend de tests, notamment **Intelligence** et d’autres caractéristiques pertinentes selon la matière.
- Le résultat de ces tests détermine si l’élève progresse et de combien.

### Contraintes

- Une formation dure **une semaine**.
- Professeur et élèves affectés sont **indisponibles pour partir en mission** pendant la formation.
- La formation **coûte de l’argent**.

### Salles dédiées envisagées

- **Salle de sport** : caractéristiques physiques.
- **Salle de torture** : caractéristiques psychologiques.
- **Cabinet médical / prison** : médecine, alchimie et certaines formations magiques.
- D’autres bâtiments spécialisés pourront être ajoutés selon les domaines d’apprentissage.

La qualité/niveau de la salle pourra servir de multiplicateur ou modificateur de formation. Les valeurs exactes restent à équilibrer.

**Entraînement libre dans les bâtiments d'entraînement** (Idan, 2026-11-03 ; doc 11 §7) : École de magie, Ludus, Académie
de la survie, Cercle des Fines Lames ; à 75 % là où le mercenaire se classe le mieux dans la compagnie, sinon au hasard ;
gain selon l'Intelligence, l'Endurance, la Volonté ou la Dextérité. Les Écuries et le Chenil (Idan, 2026-11-07) : avec son
animal apprivoisé, la famille et Compagnon animal, gain selon la moyenne de ses Charisme, Intelligence et Intimidation
(doc 11 §8).

**Entraînement libre à l'École de magie** (Idan, 2026-11-02 ; doc 11 §7) : premier entraînement au camp en jeu. Chaque
jour, les mercenaires disponibles vont d'eux-mêmes à l'École selon les places, leur Volonté, leur meilleure école et le
directeur ; ils gagnent de l'XP d'école (écoles opposées −¼ chacune) ou de Puissance magique, selon leur Intelligence, le
niveau de la salle, le niveau et la Transmission du savoir du directeur.

## 4 — Principe de conception

> Un mercenaire progresse naturellement parce qu’il **vit certaines situations**, et progresse volontairement parce que le joueur accepte de **sacrifier une semaine de disponibilité et de l’argent pour le former**.
> 

Cette asymétrie est volontaire : toutes les caractéristiques n’ont pas besoin du même nombre de sources d’XP, ni de règles symétriques.