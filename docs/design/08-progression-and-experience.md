> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Progression & expérience

Le mercenaire progresse par l'**XP naturelle**, gagnée par ce qu'il vit en mission, et par l'**XP choisie**, obtenue par
formation au camp. Toutes les constantes : `data/reference/formula-constants.json`.

## 1 — Courbe universelle XP → niveau

Même courbe pour les caractéristiques, les compétences et les sorts (Idan, 2026-11-08). La **valeur** est le **niveau**.

$$
XP(n\rightarrow n+1)=arrondi\left(10(2n+1)\times m(n+0{,}5)\right)
$$

- **m** = 1 / diviseur au milieu de chaque zone : ¼ à 25 (zone 0–50), ½ à 75 (51–100), 1 à 125 (101–150), 1 / 0,75
  ≈ 1,33 à 175 (151–200).
- Entre deux milieux, m varie en ligne droite : pas de marche à 50 ni à 100. Sous 25, m reste à ¼ ; au-delà de 175, m
  continue de monter avec la même pente (≈ 1,67 à 225, 2 à 275).
- Chaque point coûte au moins autant que le précédent.
- Une compétence est un **niveau continu** (30,6 = niveau 30, à 60 % de la tranche vers 31) ; le bilan arrondit au point
  entier.
- Une valeur sans XP enregistrée (générée, ou changée par ailleurs) démarre au **milieu de sa tranche** : sinon, la
  première petite perte ferait tomber un point. Si la courbe change, les valeurs ne bougent pas ; seul le prix des
  points suivants change.
- **Pas de plafond**, ni pour les caractéristiques ni pour les compétences (Idan, 2026-11-06 : « sky is the limit ! »).

### Repères de progression

| Passage | XP de la tranche | XP cumulée à l'arrivée |
| --- | --- | --- |
| 0 → 10 | 255 | 255 |
| 10 → 20 | 755 | 1 010 |
| 20 → 30 | 1 287 | 2 297 |
| 30 → 40 | 2 107 | 4 404 |
| 40 → 50 | 3 157 | 7 561 |
| 50 → 60 | 4 407 | 11 968 |
| 60 → 70 | 5 857 | 17 825 |
| 70 → 80 | 7 607 | 25 432 |
| 80 → 90 | 10 219 | 35 651 |
| 90 → 100 | 13 319 | 48 970 |
| 100 → 110 | 16 819 | 65 789 |
| 110 → 120 | 20 719 | 86 508 |
| 120 → 130 | 24 911 | 111 419 |
| 130 → 140 | 28 811 | 140 230 |
| 140 → 150 | 32 877 | 173 107 |
| 150 → 160 | 37 210 | 210 317 |
| 160 → 170 | 41 811 | 252 128 |
| 170 → 180 | 46 677 | 298 805 |
| 180 → 190 | 51 810 | 350 615 |
| 190 → 200 | 57 211 | 407 826 |
| 200 → 250 | 376 384 | 784 210 |
| 250 → 300 | 551 386 | 1 335 596 |

Coût d'un seul point : 53 XP à 10, 169 à 30, 381 à 50, 763 à 75, 1 518 à 100, 2 518 à 125, 3 522 à 150, 4 692 à 175,
6 028 à 200, 9 202 à 250.

## 2 — XP naturelle

- **Bêta-test** : toutes les XP de cette page et de la formation au camp (entraînement libre, médecin, directeur,
  professeur, Perfectionner) sont **× 4** (Idan, 2026-11-07 et 2026-11-08), déjà compté ci-dessous ; sauf les actions
  ajoutées le 2026-11-08, aux valeurs d'Idan.
- Un plafond de gain par mission est envisagé, pas encore chiffré.
- **Multiplicateur d'étoiles** (Idan, 2026-11-08) : toute l'XP d'une mission (caractéristiques, résistances,
  compétences, sorts, et les reculs qui vont avec) est multipliée par **1 + 0,25 × (étoiles − 1)** : 1★ × 1, 3★ × 1,5,
  5★ × 2, 10★ × 3,25, 15★ × 4,5. Pas de multiplicateur selon le tier de l'ennemi. Combat sans mission (Mission Test) :
  × 1. « Rentrer vivant avec sa monture » n'est pas multiplié (ce n'est pas du combat).

### Chance — « La chance tourne »

- **EC confirmé** : `+120 XP` ; **CC** : `−20 XP`. L'XP ne descend jamais sous 0.
- Compte comme CC chaque critique positif, au Toucher comme à Blesser ; comme EC chaque échec critique confirmé, au
  Toucher (Au Sol) comme à Blesser (contrecoup). Ce contrecoup compte aussi comme une blessure physique subie pour les
  Résistances (Idan, 2026-10-20).
- Avec les formules de CC/EC, la Chance s'équilibre autour de **75** (en dessous elle tend à monter, au-dessus à
  baisser).

### Résistances — « Ce qui ne te tue pas te rend plus fort »

À chaque **blessure effectivement subie** d'un type de dégâts (Physique, Feu, Froid, Foudre, Poison) : `+32 XP` à la
résistance de ce type, `−8 XP` à chacune des quatre autres. Jamais sous 0 XP ; pas de plafond.

- **Dégâts mixtes** : chaque composante est résolue séparément (Physique + Feu : tout le Physique, puis tout le Feu).
- **Attaques multiples et DOT** : même règle ; chaque blessure effectivement subie compte, quelle que soit sa source.

### Constitution — « Y'a quelque chose dans ta potion, non ? »

- `+4 XP` par PV **réellement restauré par un soin** ; les PV au-delà des PV max ne rapportent rien.
- `+2 XP` par **PV de dégâts encaissé** pendant la mission, s'il y survit (2026-11-08) : le cumul de la mission, celui de
  la fatigue (les soins ne l'effacent pas).

### Courage — « Courage, fuyons ! »

`+200 XP` par **charge tentée** contre un ennemi, même ratée ou finie en chute (« le courage, c'est de tenter », Idan,
2026-10-06).

### Vitesse — « Cours Forest, cours ! »

`+8 XP` par case parcourue **en fuite** ; `+1 XP` par case parcourue en combat, en fuite ou non (2026-11-08). En fuite,
les deux s'additionnent.

### Charisme — « Triste Monde ! »

- `+200 XP` par **adversaire mis hors combat** par le mercenaire (les ennemis ne font pas de jet de mort : « tué » = hors
  combat ; Idan, 2026-10-06).
- `+40 XP` au capitaine ou au lieutenant dont l'**aura** a fait tenir un allié proche à son test de Courage
  (2026-11-08) : l'aura la plus forte à portée (doc 04) ; le fouet seul ne compte pas. Après une attaque, un tir, une
  charge ou un sort de Peur.

### Perception — « C'est comme ça que le métier rentre »

- `+40 XP` chaque fois qu'il est **effectivement blessé par une attaque reçue dans le dos**.
- `+20 XP` par **tir qui touche** (ni bloqué ni paré) **au-delà de la moitié de la portée** de l'arme (2026-11-08) : un
  arc de portée 12 tire à 7 cases ou plus.

### Force — porter son équipement

La Force progresse selon le **rapport entre la charge portée et la Force** (Idan, 2026-10-07).

- **Charge** = malus de vitesse de base de l'armure + celui de **toutes les armes équipées** (les deux sets) ; pas de
  colonne de poids (formule *Malus vitesse arme effectif V1*).
- À chaque **activation** en mission, avec la charge et la Force du moment (changer d'équipement ne change pas l'XP
  acquise) :

$$
XP_{Force}=80\times\max\left(0;\ \frac{Charge}{Force}-0{,}25\right)
$$

- Une charge sous le quart de sa Force ne rapporte rien ; plus c'est lourd pour lui, plus il progresse, et moins à
  mesure que sa Force monte : il tend à devenir « aussi fort que ce qu'il porte ».
- Repères (≈ 5 activations par mission) : hache double + plates (charge 52) à Force 55 → ≈ 280 XP par mission ; épée
  longue + écu + mailles (28) → ≈ 100 XP ; dague + arc + cuir (14) → 0.

### Dextérité, Esquive, Endurance, Volonté, Intelligence (Idan, 2026-10-20)

D'autres sources pourront s'ajouter : leurs XP s'additionnent.

- **Dextérité** : chaque **enchaînement réussi** (attaque, tir ou séquence à deux armes supplémentaire) : `+200 XP`.
- **Esquive** : chaque **coup encaissé qui blesse** : `+40 XP`. Le contrecoup de sa propre arme n'en est pas un.
- **Endurance** : chaque **case parcourue en armure lourde** (plates, écailles) : `+8 XP` ; chaque **activation
  commencée au contact d'un ennemi** (à une case ; 2026-11-08) : `+10 XP`.
- **Volonté** : chaque **test de Courage réussi** : `+80 XP` ; chaque **reprise de contrôle** réussie en fuite :
  `+80 XP` ; chaque **sort ennemi résisté** (Paralysie, Sommeil, Prison de glace ; 2026-11-08) : `+80 XP`.
- **Intelligence** : il apprend de ses erreurs : chaque fois qu'il choisit le **pire type de dégâts** : `+120 XP`. Ce
  mauvais choix n'arrive qu'aux mercenaires sous 50 d'Intelligence.

### Puissance magique, Réserve de mana, écoles et sorts (Idan, 2026-10-25)

Détail dans le doc 12 (« Écoles : progression et régression »).

- **Puissance magique** : chaque sort réussi qui a un vrai effet : `+80 XP`.
- **Réserve de mana** : chaque point de mana dépensé, même si le sort rate : `+8 XP`.
- **Chance** : les critiques des sorts comptent comme ceux des armes (`−20` / `+120`), et pour la réputation aussi
  (doc 09).
- **Sort et école** : chaque lancer `+40 XP`, `+20` s'il réussit, `+20` s'il a un vrai effet ; les deux écoles opposées
  perdent chacune un quart du gain de l'école ; une école ne descend pas sous 1 ; les sorts ne régressent pas, plafond
  100.
- Les dégâts des sorts et de l'arme enflammée comptent pour les **Résistances** de la cible (brûlure : Résistance au
  feu) et, pour le lanceur, comme un coup d'arme (Charisme, réputation) ; les soins comptent pour la **Constitution** du
  soigné.

### Compétences (Idan, 2026-10-20)

Même courbe que les caractéristiques, sans plafond (§1).

- **Arme et catégorie** : chaque attaque portée avec une arme : `+40 XP` à l'arme précise et à sa catégorie ; `+20` de
  plus si elle touche réellement (non bloquée), `+20` si elle blesse. La chute de charge et le projectile perdu (même
  tir) ne comptent pas.
- **Styles** : Combat à une main `+40 XP` par attaque avec une arme à une main tenue seule, mêlée ou tir (2026-11-02) ;
  Combat à deux mains `+40 XP` par attaque de mêlée à deux mains ; Combat à deux armes `+40 XP` par séquence où **les
  deux armes ont réellement frappé** (une seconde arme déchargée ou hors de portée ne donne rien) ; Boucliers et le
  bouclier précis `+40 XP` chacun par blocage.
- **Magie en armure** (Idan, 2026-11-09) : `+80 XP` par **sort raté** tant que l'armure, le bouclier du set actif ou le
  casque gênent encore après la compétence ; rien pour un sort réussi, ni sans gêne. Pas de régression entre
  compétences.
- **Intimidation** : chaque adversaire qui rate son test de Courage face au mercenaire : `+200 XP`.
- **Compétences animales** (Idan, 2026-11-07) : chaque attaque de sa monture, quand il la monte ou qu'elle se bat à pied
  à ses côtés (le loup qu'un humain emmène, sa monture quand il est descendu), comme une arme : `+40 XP` à la famille de
  la monture (Équidés…) et à Compagnon animal, `+20` si elle touche, `+20` si elle blesse ; sans recul des autres
  familles.
- **Rentrer vivant avec sa monture** (Idan, 2026-11-07) : si le mercenaire et la monture ou le compagnon avec lequel il
  est parti survivent tous deux à la chaîne de fin de mission : `+200 XP` à Compagnon animal et à la famille de l'animal.
- **Nos montures** : leur fiche progresse avec ces mêmes règles (doc 04, « Combat à cheval »).
- **On progresse au détriment des autres** : chaque gain fait perdre, au total, **la moitié de ce gain**, à parts
  égales, aux compétences que le mercenaire possède (valeur > 0) :
  - un gain d'arme : les **armes des autres catégories** (l'épée longue fait reculer haches, marteaux… mais pas les
    autres lames longues) ;
  - un gain de catégorie : les autres catégories d'armes ;
  - un gain de style : les autres styles (une main, deux mains, deux armes, boucliers).
- **Plancher à 1** (Idan, 2026-11-23 : « fais en sorte qu'on ne puisse pas perdre d'xp en dessous de 1 ») : une perte
  ne fait pas descendre une compétence sous **1** ; une compétence déjà plus bas (une catégorie d'armes jamais
  pratiquée, à 0) n'en perd pas davantage. Constante `progression.skills.floor` ; les écoles gardent leur plancher
  (`progression.magic.school_floor`, 1).

### Application en fin de mission (Idan, 2026-10-06)

- Pendant la mission, chaque mercenaire tient un **journal** de ce qu'il vit ; l'XP naturelle est appliquée **en fin de
  mission**, aux survivants (y compris ceux qui ont fui le combat).
- Une valeur **monte ou descend** selon son XP ; l'XP ne descend jamais sous 0, ni la valeur sous son minimum.
- Le bilan de fin de mission montre un **récapitulatif** : XP gagnée ou perdue par caractéristique, et valeurs qui ont
  changé.

## 3 — XP choisie : formation au camp

Le joueur oriente la progression d'un mercenaire en échange de **temps, d'argent et de disponibilité**.

- **Boucle hebdomadaire** : choisir une caractéristique ou une compétence, affecter un **professeur** et des **élèves**,
  payer, résoudre les tests de formation, attribuer l'XP.
- **Professeur** : normalement un mercenaire du camp, avec un **niveau minimum** dans la matière ; sa **Transmission du
  savoir** modifie le gain des élèves. Un événement peut amener un instructeur PNJ (un **BootCamp**).
- **Élèves** : leurs tests (notamment **Intelligence**, d'autres selon la matière) disent s'ils progressent, et de combien.
- Une formation dure **une semaine**, **coûte de l'argent**, et professeur et élèves ne partent pas en mission.
- **Salles envisagées** : salle de sport (caractéristiques physiques), salle de torture (psychologiques), cabinet
  médical / prison (médecine, alchimie, certaines formations magiques), d'autres selon les domaines. Leur niveau pourra
  modifier la formation ; valeurs à équilibrer.

**Entraînement libre** (Idan, 2026-11-02 et 2026-11-03 ; doc 11 §7) : chaque jour, les mercenaires disponibles vont
d'eux-mêmes à l'École de magie, au Ludus, à l'Académie de la survie ou au Cercle des Fines Lames : à 75 % là où ils se
classent le mieux dans la compagnie, sinon au hasard ; gain selon l'Intelligence, l'Endurance, la Volonté ou la
Dextérité. À l'École, qui y va dépend des places, de la Volonté, de la meilleure école et du directeur ; on y gagne de
l'XP d'école (écoles opposées −¼ chacune) ou de Puissance magique, selon l'Intelligence, le niveau de la salle, le niveau
et la Transmission du savoir du directeur. **Écuries et Chenil** (2026-11-07 ; doc 11 §8) : avec son animal apprivoisé,
XP de la famille et de Compagnon animal, selon la moyenne de ses Charisme, Intelligence et Intimidation.

## 4 — Principe de conception

> Un mercenaire progresse naturellement parce qu'il **vit certaines situations**, et progresse volontairement parce que
> le joueur accepte de **sacrifier une semaine de disponibilité et de l'argent pour le former**.

Cette asymétrie est volontaire : toutes les caractéristiques n'ont pas besoin du même nombre de sources d'XP, ni de
règles symétriques.
