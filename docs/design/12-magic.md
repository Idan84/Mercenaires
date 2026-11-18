> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Magie — apprentissage, incantation & premier catalogue

## Décisions du 2026-10-25 (Idan)

Le joueur reste **très libre** : à lui d'éviter les builds inefficaces, le jeu fait les calculs. **Pas de sort
« supérieur » appris plus tard** : chaque sort garde son intérêt jusqu'en fin de partie (à équilibrer face aux gros
dragons si besoin). Données : `data/reference/spells.json`.

### Rôle des caractéristiques

| Valeur | Rôle |
|---|---|
| Niveau de l'école | Pèse le plus dans la maîtrise : effet, portée, coût et réussite |
| Niveau du sort | Appris au niveau 1, monte quand on s'en sert, sans plafond ; simple bonus dans la maîtrise |
| Puissance magique | Combien le sort fait (PV soignés, dégâts…) |
| Réserve de mana | Combien de sorts on peut lancer |
| Intelligence | Réussite du sort ; sorts connus à la création |
| Volonté | Recharge du mana au camp |
| Charisme | Selon l'école : Invocation, Nécromancie (l'Illusion prend la Volonté) ; ne joue pas sur le soin |

Valeurs **équipement compris** (doc 05 : bague de l'école, amulette, ceinture de mana, casque de constitution ; en main,
bâton long +5 % de Puissance magique ou bâton court +10 % de Réserve de mana).

### Maîtrise d'un sort

**Maîtrise = École + Niveau du sort / 2** (Vie 84 et sort 1 : 84,5 ; Vie 56 et sort 50 : 81). Pas de **prérequis**
d'école pour connaître ou lancer un sort.

### Réussite d'un sort

- **Réussite = 10 + 85 / (1 + e^(−Δ/15))**, **Δ = (Maîtrise + Intelligence) / 2 − 30**, au plus 95 %. **Même
  difficulté pour tous les sorts** (Idan, 2026-11-01). Sans armure : débutant (maîtrise 31,5, Intelligence 35) **57 %**,
  recrue moyenne (56,5 ; 53) **81 %**, expert (134 ; 73) **94 %**. Un gros sort se distingue par son effet, sa zone et
  son mana (de débutant à expert, l'effet est multiplié par près de 3).
- **Armure** : son **Altération magique** se retire **en points** (Vêtements 0, Gambison 2, Cuir 5, Cuir renforcé 10,
  Écailles 12, Brigandine 20, Mailles 25, Plates 45), × le malus de sa qualité (Usée × 1,2 ; De bonne facture × 0,8 ; De
  luxe × 0,6). Jamais sous 0.
- **Bouclier et casque** (Idan, 2026-11-09) : bouclier du **set actif** Rondache 10, Écu 15, Pavois 20, × le malus de sa
  qualité ; **Casque de constitution** 5, × son tier (T1 × 1,2, T2 × 1, T3 × 0,8, T4 × 0,6), en plus de son malus de
  Puissance magique ; les chapeaux ne gênent pas. Tout s'ajoute : plates + pavois + casque = 70 points.
- **Magie en armure** : compétence martiale (0 à l'infini) qui retire **la moitié de sa valeur** à ce malus total,
  jamais sous 0 (140 efface les 70 points). Génération : Nains **2D6**, les autres **1** ; les ennemis gardent la valeur
  de leur génération. **+80 XP** (× le multiplicateur d'étoiles) par sort raté tant que l'équipement gêne encore après
  la compétence. Journal : « équipement −X » (le malus restant).
- Le **mana est dépensé** même si le sort échoue.
- **Critiques** (comme les armes) : **coup critique** si, le sort réussi, D100 ≤ Chance / 10 (1 à 25 %) : dés de l'effet
  au maximum. **Échec critique** : un naturel de 96 à 100, puis D100 > Chance : le sort se retourne, le lanceur subit
  l'effet minimum de son sort (dés à 1 ; Soin rapide : il perd le soin minimum).

### Soin rapide (école Vie)

Restaure X PV à **un allié ou au lanceur**, à Y cases, **en ligne de vue** (comme les tirs, doc 04 : seul le décor la
coupe). **Action rapide.** Coût : Z mana.

- **X = 10 × 1D4 × (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100)**, arrondi au supérieur (la Puissance
  magique tient le rôle de la Force d'une arme).
- **Y = 2 + Maîtrise / 25**, arrondi à l'inférieur. **Z = 12 × (1 − Maîtrise / 300)**, arrondi au supérieur.

| Profil | Maîtrise | X moyen (fourchette) | Y | Z | Réussite sans armure |
|---|---|---|---|---|---|
| Débutant (Puissance 53, Vie 31, sort 1, Int 35) | 31,5 | 22 (9–35) | 3 | 11 | 57 % |
| Fort en Vie, sort neuf (Puissance 53, Vie 84, sort 1, Int 53) | 84,5 | 36 (15–58) | 5 | 9 | 89 % |
| Confirmé (Puissance 53, Vie 56, sort 50, Int 53) | 81 | 35 (14–56) | 5 | 9 | 88 % |
| Expert (Puissance 69, Vie 84, sort 100, Int 73) | 134 | 64 (26–102) | 7 | 7 | 94 % |

Repères : PV max médian ≈ 214 ; dague ≈ 38, arme lourde ≈ 100. En fin de partie (caracs 100, T4, Vie 100, sort 100) :
soin moyen ≈ 135, ≈ 29 % des PV d'un allié du même stade.

### École de la Vie (10 sorts)

**Modèle de toutes les écoles** : **Effet = 10 × dés × (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100)** ;
**mana = base × (1 − Maîtrise / 300)** ; seuls changent dés, action, portée, durée, zone et mana de base. L'action
**principale** est l'action d'attaque du tour : on peut faire une action rapide et une principale dans le même tour.

| Sort | Action | Cible | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|---|
| Soin rapide | rapide | allié ou soi | soin 1D4 | 2 + M/25 | 12 |
| Soin profond | principale | allié ou soi | soin **2D6** | **1 + M/50** (au contact au début) | 25 |
| Régénération | principale | allié ou soi | soin 1D4 au début de chaque activation de la cible, pendant **2 + M/50 tours** | 2 + M/25 | 20 |
| Soin de masse | principale | une case | soin 1D4 à **tous** dans un cercle de **rayon 1 + M/50** : alliés, ennemis, lanceur compris ; un seul jet pour tous | centre à 2 + M/25 | 30 |
| Restitution | principale | un mort-vivant | **1D10** de dégâts qui ignorent armure, résistances et blocage | 2 + M/25 | 15 |
| Purge | rapide | allié ou soi | retire tout le poison ; pas de coup critique | 2 + M/25 | 8 |
| Bénédiction | rapide | allié ou soi | **+30 + M/2 de Chance** pendant **2 tours** ; pas de coup critique | 2 + M/25 | 10 |
| Lien de vie | principale | **un autre allié** | le lanceur donne **jusqu'à 2D6** de ses PV, l'allié en reçoit **× 1,5** | 2 + M/25 | 15 |
| Délivrance | rapide | allié ou soi | retire **la peur (fin de la fuite), la paralysie, le gel, la frénésie, le sommeil, le désespoir et le brouillage mental** ; pas de coup critique | 2 + M/25 | 10 |
| Lumière sacrée | principale | une case | **1D10** à **chaque mort-vivant** d'un cercle de **rayon 1 + M/50 (au plus 3)**, les nôtres compris ; ignore armure, résistances et blocage | centre à 2 + M/25 | 30 |

*M = Maîtrise ; portées, durées et rayons arrondis à l'inférieur ; toujours en ligne de vue.*

- **Régénération** : Puissance et maîtrise du lancer ; **ne se cumule pas** (la relancer remplace) ; critique : dé au
  maximum à chaque tour.
- **Soin de masse** : rayon 1 = 7 cases, 2 = 19, 3 = 37.
- **Bénédiction** : la Chance fait les coups critiques et confirme moins d'échecs critiques ; en points, sinon le bonus
  serait trop faible (Chance médiane 55 : 5,5 % de critiques ; bénie par une recrue moyenne : 11 %). Ne se cumule pas ;
  sur soi, l'activation en cours compte comme la première.
- **Lien de vie** : ne donne **que ce qu'il faut** (au plus les dés), **garde toujours 1 PV** ; rien sur un allié
  flétri ; pas une blessure, donc pas de résistance.
- **Délivrance** : sans cible s'il n'y a rien à retirer ; la frénésie emporte son bonus de Force ; les états à venir
  s'ajouteront à sa liste.
- **Lumière sacrée** : rien aux vivants ; nos zombies et squelettes y passent aussi.
- **Icônes** (Idan, 2026-10-25) : un parchemin par sort sous un **cadre commun à l'école** (Vie : vert, lianes,
  émeraudes), dans la barre de sorts et le grimoire.
- **Infobulle du grimoire** (Idan, 2026-10-30 : « on doit savoir à qui il sert, combien de mana il utilise ») : la
  description (cible, action), puis ses chiffres pour ce mercenaire, équipement compris, comme en combat : mana,
  réussite, portée, soins ou dégâts, bonus, durée, zone.

| | Débutant (Vie 31) | Recrue moyenne (Vie 56) | Expert (Vie 84, sort 100) |
|---|---|---|---|
| Soin rapide | 22 PV · 11 mana | 28 · 10 | 63 · 7 |
| Soin profond | 60 PV · 23 | 79 · 21 | 178 · 14 |
| Régénération | 22 × 2 tours · 18 | 28 × 3 · 17 | 63 × 4 · 12 |
| Soin de masse | 22 par cible, rayon 1 · 27 | 28, rayon 2 · 25 | 63, rayon 3 · 17 |
| Restitution | 48 dégâts · 14 | 62 · 13 | 140 · 9 |
| Purge | 8 mana | 7 | 5 |
| Bénédiction | +45 de Chance, 2 tours · 9 mana | +58 · 9 | +97 · 6 |
| Lien de vie (donnés → reçus) | 60 → 90 · 14 mana | 79 → 119 · 13 | 178 → 267 · 9 |
| Délivrance | 9 mana | 9 | 6 |
| Lumière sacrée, par mort-vivant | 48, rayon 1 · 27 mana | 62, rayon 2 · 25 | 140, rayon 3 · 17 |

### École du Feu (10 sorts)

**Dégâts élémentaires** : effet × (1 − protection / 100). **Protection** = Résistance à l'élément (équipement compris)
**+ ou − la valeur de l'armure portée**, de **−50 à +75 %**. Feu (« brûlant ») : plates −20, mailles −10, brigandine −5,
vêtements +5, cuir +15, cuir renforcé +18, écailles +35. Même règle pour le froid (« glaçant ») et la foudre
(« foudroyant ») ; la fiche montre ces résistances avec l'armure.

| Sort | Action | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|
| Trait de feu | principale | 1D6 de feu sur un ennemi, **comme une flèche** | 12 + M/10 (l'arc : 18) | 10 |
| Boule de feu | principale | 2D6 de feu au centre, **dégressif** : × (1 − d / (rayon + 1)) à d cases ; rayon **3 + M/50, de 3 à 5** | centre à **6 + M/25, de 6 à 12** | 30 |
| Anneau de feu | principale | 1D6 de feu à tous ceux qui sont à 1 ou 2 cases du lanceur, lanceur épargné | autour du lanceur | 20 |
| Arme enflammée | rapide | +1D4 de feu à chaque coup qui touche (même sans blesser), pendant 2 + M/50 tours | la sienne ou celle d'un compagnon, 1 + M/50 | 12 |
| Armure de feu | rapide | +(30 + M/5) de protection contre le froid, pendant 2 + M/50 tours | allié ou soi, 2 + M/25 | 10 |
| Flaque de magma | rapide | une case vide devient infranchissable pendant **4 + M/25 tours** | 2 + M/25 | 8 |
| Embrasement | principale | l'ennemi brûle : **1D6 de feu au début de chacune de ses activations**, pendant **2 tours (3 à 100 de maîtrise)** ; ne se cumule pas | 6 + M/25, au plus 12 | 20 |
| Mur de flammes | principale | un mur de **3 + M/50 cases (au plus 5)** en travers, pendant **3 tours** : qui y entre, ou y commence son activation, prend **1D6 de feu** à chaque fois | centre à 2 + M/25 | 25 |
| Souffle ardent | principale | **2D6 de feu** à tous ceux d'un **cône de 3 cases** devant le lanceur (1, puis 3, puis 3 cases), alliés compris ; ne s'évite pas | vers une case voisine | 25 |
| Torche vivante | rapide | pendant **2 + M/50 tours**, au début de chacune de ses activations, **1D4 de feu** à chaque ennemi au contact du porteur ; lui ne brûle pas | allié ou soi, 1 + M/50 | 15 |

- **Trait de feu** : règles de l'arc. Le sort réussi, jet de toucher des tirs (la Maîtrise au lieu des compétences
  d'arme, l'Esquive de la cible, la perte au-delà du quart de la portée, la couverture) ; raté, il peut toucher
  quelqu'un dans la ligne de tir. Pas de jet de Blesser : seule la protection contre le feu réduit.
- **Boule de feu** : ne s'évite pas, mais le sort réussi, précision = 50 + Maîtrise / 2 − 5 × distance (10 à 95 %) ;
  ratée, elle dévie de **1D3 cases** au hasard. Elle touche toute la zone, **alliés et lanceur compris** (Idan :
  « j'aime l'idée que le mage puisse se blesser lui-même »). Cette précision remplace pour elle celle des zones du doc
  04 (−10 % par case), qui reste celle du Tromblon.
- **Anneau de feu**, **Souffle ardent**, **Torche vivante** : un seul jet pour tous, chacun avec sa protection ;
  l'Anneau touche aussi les alliés ; la Torche ne se cumule pas.
- **Arme enflammée** : les tours se décomptent au début de chaque activation du porteur (le tour du lancer compte) ; pas
  de cumul. **Armure de feu** : même décompte ; elle protège du froid de l'Eau et réduit le Gel.
- **Flaque de magma** : ni passage ni arrêt (déplacements, charges, fuites) ; ne coupe pas la vue, pas de dégâts ;
  refroidit au début du tour indiqué.
- **Embrasement** : Puissance et maîtrise figées au lancer ; critique : dé au maximum à chaque tour. Chaque brûlure
  compte pour la Résistance au feu de la cible et bloque la régénération d'un sang de troll.
- **Mur de flammes** : posé comme le Brouillard ; ne bloque ni le passage ni la vue. Une brûlure par case de mur où l'on
  entre, et au début de son activation si l'on s'y tient. Pas de critique. S'éteint au début du tour indiqué (en orange
  sur la carte).

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Trait de feu | 30 (9–52) · portée 15 · 9 mana | 40 · portée 17 · 9 | 89 · portée 25 · 6 |
| Boule de feu, au centre | 60 · rayon 3 · portée 7 · 27 mana | 79 · rayon 4 · portée 8 · 25 | 178 · rayon 5 · portée 11 · 17 |
| Anneau de feu, par cible | 30 · 18 mana | 40 · 17 | 89 · 12 |
| Arme enflammée, par coup | +22, 2 tours | +28, 3 tours | +63, 4 tours |
| Armure de feu | +36 froid, 2 tours | +41, 3 tours | +56, 4 tours |
| Flaque de magma | 5 tours | 6 tours | 9 tours |
| Embrasement, par tour | 30 × 2 tours · portée 7 · 18 mana | 40 × 2 · portée 8 · 17 | 89 × 3 · portée 11 · 12 |
| Mur de flammes, par brûlure | 30 · 3 cases · 23 mana | 40 · 4 cases · 21 | 89 · 5 cases · 14 |
| Souffle ardent, par cible | 60 · 23 mana | 79 · 21 | 178 · 14 |
| Torche vivante, par voisin et par tour | 22 × 2 tours · 14 mana | 28 × 3 · 13 | 63 × 4 · 9 |

### École de l'Eau (10 sorts)

Élément : le **froid** (armure « glaçant », même règle que le feu).

| Sort | Action | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|
| Brouillard | principale | un rideau de **5 cases** qui coupe la ligne de vue pendant **3 tours, fixes** | centre à 2 + M/25 | 15 |
| Eau guérissante | rapide | soin **1D3** | allié ou soi, 2 + M/25 | 10 |
| Flèche de glace | principale | 1D6 de froid, **comme une flèche** (le Trait de feu en froid) | 12 + M/10 | 10 |
| Tsunami | principale | **2D6 de froid** à tous ceux qui sont dans une ligne de **3 + M/50 cases, de 3 à 5**, alliés compris ; ne s'évite pas | part de la **case voisine** choisie, droit devant | 25 |
| Armure de froid | rapide | +(30 + M/5) de protection contre le **feu**, pendant 2 + M/50 tours | allié ou soi, 2 + M/25 | 10 |
| Gel | rapide | −(20 + M/5) en **Vitesse et en Dextérité**, pendant **1 + M/100 tours, au plus 2** | un ennemi à 1 + M/50 | 12 |
| Arme de glace | rapide | +1D4 de froid à chaque coup qui touche (même sans blesser), pendant 2 + M/50 tours | la sienne ou celle d'un compagnon, 1 + M/50 | 12 |
| Prison de glace | principale | l'ennemi est **figé** : il perd ses activations pendant **1 tour (2 à 100 de maîtrise)** et ne subit que **la moitié des dégâts** ; il résiste si D100 ≤ Constitution + protection contre le froid − M/2 (5 à 95 %) ; pas de coup critique | 6 + M/25, au plus 12 | 30 |
| Blizzard | principale | une tempête de neige de **rayon 2 + M/50 (au plus 4)** pendant **3 tours** : **1D4 de froid** à tous ceux de la zone à chaque tour, dès le lancer (un jet pour tous, alliés compris) ; on n'y voit pas à travers ; qui y commence son activation n'a que **la moitié de son déplacement** ; sans ligne de vue | centre à 6 + M/25, au plus 12 | 35 |
| Source vive | principale | rend **3 × 1D6** (× Puissance et maîtrise) de **mana** à un autre allié, sans dépasser sa réserve | 2 + M/25 | 10 |

- **Brouillard** : centré sur la case visée, **en travers** de la direction du lanceur (l'axe de la grille le plus
  perpendiculaire). Une case de brouillard coupe la vue comme un mur : ni tir ni sort **à travers, depuis ou vers**
  elle. Corps à corps et déplacements inchangés. Les cases hors carte sont perdues ; il se dissipe au début du tour
  indiqué.
- **Gel** : malus × (1 − protection contre le froid / 100). Il compte **tout de suite** (toucher, esquive des tirs,
  initiative, mouvement : −15 en Vitesse ≈ une case de moins), couvre les prochaines activations de la cible et tombe au
  début de l'activation suivante. Pas de cumul.
- **Armure de froid**, **Arme de glace** : miroirs de l'Armure de feu et de l'Arme enflammée (même décompte, pas de
  cumul ; l'Arme de glace remplace l'Arme enflammée).
- **Prison de glace** : figé, il ne bouge ni n'agit, ni attaque d'opportunité, ni réaction aux tirs ; il ne subit que la
  moitié des coups d'armes, du toucher spectral et des dégâts physiques et élémentaires des sorts (les dégâts « sans
  aucune résistance » passent entiers). La glace se brise après sa dernière activation perdue. Délivrance la retire.
- **Blizzard** : une zone sans ligne de vue, comme la Tempête ; coupe la vue comme le Brouillard ; retombe au début du
  tour indiqué (en blanc sur la carte).
- **Eau guérissante** : l'IA du combat automatique s'en sert comme de Soin rapide quand elle ne connaît pas ce dernier.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Brouillard | 5 cases, 3 tours · portée 3 · 14 mana | portée 4 · 13 | portée 7 · 9 |
| Eau guérissante | 17 PV (9–26) · 9 mana | 23 · 9 | 51 · 6 |
| Flèche de glace | 30 (9–52) · portée 15 · 9 mana | 40 · portée 17 · 9 | 89 · portée 25 · 6 |
| Tsunami, par cible | 60 · 3 cases · 23 mana | 79 · 4 cases · 21 | 178 · 5 cases · 14 |
| Armure de froid | +36 feu, 2 tours | +41, 3 tours | +56, 4 tours |
| Gel | −26, 1 tour · 1 case | −31, 1 tour · 2 cases | −46, 2 tours · 3 cases |
| Arme de glace, par coup | +22, 2 tours | +28, 3 tours | +63, 4 tours |
| Prison de glace | 1 tour · portée 7 · 27 mana | 1 tour · portée 8 · 25 | 2 tours · portée 11 · 17 |
| Blizzard, par vague | 22 · rayon 2 · portée 7 · 32 mana | 28 · rayon 3 · portée 8 · 29 | 63 · rayon 4 · portée 11 · 20 |
| Source vive | +9 mana · 9 mana | +12 · 9 | +27 · 6 |

### École de la Transmutation (10 sorts)

Idan : « c'est un buffeur ». Tous ses sorts : **action rapide**, **un allié ou soi**, à **3 + M/25** cases, pendant
**1 + M/100 tours, au plus 2**. Écoles opposées : Foudre et Invocation.

| Sort | Effet | Mana (base) |
|---|---|---|
| 6e sens | **+(20 + M/5) %** de Perception et de Dextérité | 12 |
| Force de titan | **+(20 + M/5) %** de Force | 10 |
| Vitesse du guépard | **+(20 + M/5) %** de Vitesse | 10 |
| Peau de pierre | **+(10 + M/10) points** de Résistance physique | 10 |
| Crachat de venin | la cible peut **cracher du venin par une action rapide** (voir ci-dessous) | 12 |
| Cautérisation | soin **1D3** (comme Eau guérissante) | 10 |
| Robustesse de l'ours | **+(20 + M/5) %** de Constitution, donc de PV max (et autant de PV) | 10 |
| Peau d'écailles | **+(20 + M/5)** de protection contre **le feu, le froid et la foudre** | 12 |
| Sagesse du hibou | **+(20 + M/5) %** d'Intelligence : des sorts qui réussissent plus souvent | 10 |
| Agilité du chat | **+(20 + M/5) %** d'Esquive | 10 |

- **Pourcentages** de la valeur de base, comme l'équipement, partout où la caractéristique compte (Force : dégâts au
  corps à corps ; Vitesse : mouvement, initiative, toucher et esquive des tirs ; Perception et Dextérité : toucher).
  **Peau de pierre** : des points, comme la cape (médiane : 5) ; un point retire environ 1 % des dégâts physiques, dans
  la limite de 50.
- **Durée** : « 1 tour » = la prochaine activation de la cible ; sur soi, l'activation en cours. Des sorts différents se
  cumulent ; le même sort relancé remplace le précédent.
- **Robustesse de l'ours** : à la fin de l'effet, les PV max redescendent, et les PV avec eux s'ils dépassent (les
  ennemis gardent les PV de leur fiche). **Peau d'écailles** réduit aussi le Gel.
- **Crachat de venin** : pendant les 1 ou 2 **prochaines** activations de la cible (même sur soi), action rapide
  « Cracher du venin » sur un ennemi à **2 à 10 cases** (la Sarbacane), en ligne de vue. Toucher comme le Trait de feu,
  avec la **Maîtrise du lanceur** ; **1D4 de poison** × la Puissance du lanceur, réduit par la Résistance au poison (pas
  par l'armure). S'il blesse : **empoisonné**.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| 6e sens, Force de titan, Vitesse du guépard, Robustesse de l'ours, Sagesse du hibou, Agilité du chat | +26 %, 1 tour · portée 4 | +31 %, 1 tour · portée 5 | +46 %, 2 tours · portée 8 |
| Peau d'écailles | +26 feu, froid et foudre, 1 tour · 11 mana | +31, 1 tour · 10 | +46, 2 tours · 7 |
| Peau de pierre | +13 points, 1 tour | +15, 1 tour | +23, 2 tours |
| Crachat de venin, par crachat | 22 (9 de poison ensuite) | 28 (12) | 63 (26) |
| Cautérisation | 17 PV · 9 mana | 23 · 9 | 51 · 6 |

### Poison (Idan, 2026-10-27)

- Une cible **blessée** par du venin est **empoisonnée 3 tours** ; un nouveau poison remplace l'ancien.
- Au **début de chacune de ses activations**, **D100 ≤ Constitution / 2 + Résistance au poison** (équipement compris, 5
  à 95 %) **annule l'effet**. Raté : le minimum du venin (dé à 1), réduit par sa Résistance au poison, qui progresse
  avec ces dégâts (doc 08). **Purge** (Vie) retire le poison.
- **Fiole de poison** (Idan, 2026-10-29 ; doc 05) : action rapide, sur soi ; l'arme active est enduite 3 tours ; chaque
  coup qui blesse, au corps à corps comme au tir, empoisonne : **10 PV par tour**, 3 tours, même jet de résistance. Avec
  une sarbacane enduite, le plus fort des deux poisons.

### École de la Foudre (10 sorts)

Élément : la **foudre** (armure « foudroyant ») ; le métal conduit : **plates −45**, mailles −30, brigandine −18 ;
vêtements +5, gambison +15, écailles +25, cuir renforcé +28, cuir +30. Portée moyenne des attaques : **6 + M/25, au plus
12**. Écoles opposées : Eau et Transmutation.

| Sort | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|
| Décharge électrique | principale | **2D8 de foudre**, sans jet de toucher | au contact | 20 |
| Éclair | principale | 1D6 de foudre, **comme une flèche** (la Flèche de glace en foudre) | 12 + M/10 | 10 |
| Arme électrique | rapide | +1D4 de foudre à chaque coup qui touche, pendant 2 + M/50 tours | la sienne ou celle d'un compagnon, 1 + M/50 | 12 |
| Boule d'éclairs | principale | **2D6 de foudre** sur un ennemi, puis **4 rebonds** : 100, 80, 60, 40, 20 % | 6 + M/25, au plus 12 | 30 |
| Foudre | principale | **1D8 de foudre**, sans jet de toucher, **sans ligne de vue** | 6 + M/25, au plus 12 | 15 |
| Célérité | rapide | **+(20 + M/5) %** de Vitesse, **sur soi seulement**, pendant **2 tours** (cette activation et la suivante) | soi | 10 |
| Étincelle | rapide | **1D4 de foudre** sur un ennemi, sans jet de toucher | **1 + M/50** (au contact au début) | 8 |
| Arc électrique | principale | **2D6 de foudre** à tous ceux d'une **ligne de 4 + M/25 cases (au plus 8)** partie de la case voisine choisie, alliés compris ; ne s'évite pas | la ligne | 25 |
| Paralysie | principale | l'ennemi **perd sa prochaine activation**, sauf s'il résiste ; pas de coup critique | 6 + M/25, au plus 12 | 25 |
| Tempête | principale | pendant **3 tours**, dès le lancer puis à chaque nouveau tour, **1D3 personnages au hasard** dans un cercle de **rayon 2 + M/50 (au plus 4)**, alliés et lanceur compris, prennent **1D8 de foudre** chacun ; **sans ligne de vue** | centre à 6 + M/25, au plus 12 | 35 |

- **Décharge électrique** : pas d'esquive ; le plus gros sort sur une cible.
- **Boule d'éclairs** : ne s'évite pas ; elle saute chaque fois sur le personnage le plus proche du précédent **pas
  encore touché**, à **3 cases au plus**, **alliés et lanceur compris** (à égalité, un ennemi du lanceur d'abord) ;
  sinon la chaîne s'arrête. Chacun sa protection ; les rebonds ne demandent pas la ligne de vue.
- **Foudre** tombe du ciel : elle passe le Brouillard et le décor. **Célérité** se cumule avec Vitesse du guépard ;
  la relancer remplace la précédente.
- **Paralysie** : la cible résiste si **D100 ≤ Constitution + protection contre la foudre − 0,5 × Maîtrise** (5 à
  95 %) ; en plates, presque toujours 5 %. Paralysée, elle saute sa prochaine activation, puis l'effet tombe.
- **Tempête** : la zone reste marquée tant qu'il reste des vagues ; à chaque vague, 1D3 personnages différents (moins
  s'il y en a moins), chacun ses dés et sa protection ; Maîtrise et Puissance figées au lancer ; le coup critique ne
  vaut que pour la première vague.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Décharge électrique | 78 · 18 mana | 102 · 17 | 229 · 12 |
| Éclair | 30 · portée 15 · 9 mana | 40 · portée 17 · 9 | 89 · portée 25 · 6 |
| Arme électrique, par coup | +22, 2 tours | +28, 3 tours | +63, 4 tours |
| Boule d'éclairs, première cible | 60 · portée 7 · 27 mana | 79 · portée 8 · 25 | 178 · portée 11 · 17 |
| Foudre | 39 · portée 7 · 14 mana | 51 · portée 8 · 13 | 114 · portée 11 · 9 |
| Célérité | +26 %, 2 tours | +31 % | +46 % |
| Étincelle | 22 · portée 1 · 8 mana | 28 · portée 2 · 7 | 63 · portée 3 · 5 |
| Arc électrique, par cible | 60 · ligne de 5 · 23 mana | 79 · ligne de 6 · 21 | 178 · ligne de 8 · 14 |
| Paralysie (cible : Constitution 55, la médiane d'une recrue, en cuir) | résiste à 69 % · portée 7 · 23 mana | 57 % · portée 8 · 21 | 18 % · portée 11 · 14 |
| Tempête, par frappe (1D3 frappes × 3 tours) | 39 · rayon 2 · portée 7 · 32 mana | 51 · rayon 3 · portée 8 · 29 | 114 · rayon 4 · portée 11 · 20 |

### École de la Télékinésie (10 sorts)

Une école de **contrôle** : elle déplace les gens. Écoles opposées : Illusion et Feu.

**Dégâts contondants, qui passent par l'armure** : l'étape **Blesser** d'un coup d'arme (doc 04), avec **Δ = Puissance
magique + 0,2 × Maîtrise + puissance du sort − armure (contondant) − Endurance**, P = 10 + 80 / (1 + e^(−Δ/20)), de 10 à
90 %. S'il blesse : l'effet du sort, réduit par la **Résistance physique** (variation D3, comme une arme), qui
progresse.

| Sort | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|
| Attraction | principale | **1D6** contondant (puissance 25), puis la cible est **tirée de 2 + M/50 cases** vers le lanceur, jusqu'à son contact | **12 + M/10** (grande portée) | 15 |
| Projection | principale | **1D8** contondant (puissance 35), puis la cible est **repoussée de 2 + M/50 cases** dans l'axe lanceur → cible | 6 + M/25, au plus 12 | 12 |
| Déplacement | rapide | un allié ou un ennemi est **déplacé d'une case**, sur une case libre voisine choisie | 6 + M/25, au plus 12 | 8 |
| Entrechoc | **rapide** (Idan, 2026-11-17) | **deux ennemis côte à côte**, tous deux en vue (un ennemi cache celui qui est derrière lui) : **2D8** contondant (puissance 55) **à chacun**, chacun avec son armure | 6 + M/25, au plus 12 | 20 |
| Champ de protection | principale | sur soi ou un allié, pendant **4 tours** : chaque **projectile** a **50 %** de chances d'être **dévié** | 3 + M/25 | 15 |
| Lancer de pierre | rapide | un tir de **fronde** : jet de toucher comme le Trait de feu, puis **1D6** contondant (puissance 25, la Fronde) | **2 à 14** (la Fronde) | 6 |
| Lancer d'arme | principale | l'**arme de corps à corps tenue** part et revient : ses **dés** × sa **qualité**, avec la **Puissance magique** au lieu de la Force, puis **Blesser** avec le meilleur type de l'arme (tranchant, perforant ou contondant) | 4 + M/25, au plus 10 | 15 |
| Onde de choc | principale | **tous ceux à 2 cases ou moins** du lanceur, **alliés compris**, sont **repoussés de 2 + M/50 cases** ; **choc 1D4** contondant (puissance 35) s'ils heurtent quelque chose | soi | 25 |
| Bond | rapide | le lanceur se propulse sur une **case libre**, par-dessus tout, **sans attaque d'opportunité** ; ce n'est pas un déplacement (il garde son mouvement) | 2 + M/50, au plus 4 | 10 |
| Écrasement | principale | **2D6** contondant (puissance 45), et la cible **ne peut pas se déplacer** à sa prochaine activation (elle peut encore frapper, tirer ou lancer un sort) | 6 + M/25, au plus 12 | 20 |

- **Déplacement forcé** (Attraction, Projection, Déplacement) : jamais d'attaque d'opportunité. La cible avance jusqu'au
  premier **obstacle** (personnage, flaque de magma, bord du terrain), qui l'arrête et lui inflige un **choc** de
  **1D4** contondant, par l'armure. L'Attraction s'arrête au contact du lanceur, sans choc. Morte du coup, la cible ne
  bouge pas.
- **Sorts qui volent comme une flèche** (et crachat de venin), comme un tir (doc 04) : chance de toucher × 0,5 contre
  une couverture partielle, × 0,25 contre une totale (Idan, 2026-11-06) ; **altitude** : +10 au delta du Toucher par
  niveau au-dessus de la cible (−10 en dessous), et par-dessus la couverture partielle d'au moins un niveau plus haut.
- **Champ de protection** : avant le jet de toucher, dévie à 50 % les tirs d'armes (arcs, frondes, armes à feu,
  contre-charges au tir) et les sorts qui volent comme une flèche (Trait de feu, Flèche de glace, Éclair, Lancer de
  pierre, crachat de venin, Choc psychique, Flèche de mort) ; jusqu'au début du 4e tour suivant le lancer. Il ne gêne ni
  la Foudre, ni les zones, ni la Décharge.
- **Lancer d'arme** : une arme de corps à corps en main (ni arc ni mains nues) ; critique : dés au maximum ; l'arme
  revient aussitôt.
- **Onde de choc** : les plus éloignés sont repoussés d'abord, dans l'axe lanceur → eux ; pas de dégâts sans obstacle ;
  pas de critique.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Attraction | 30 · tirée de 2 cases · portée 15 | 40 · 3 cases · portée 17 | 89 · 4 cases · portée 25 |
| Projection | 39 · repoussée de 2 cases | 51 · 3 cases | 114 · 4 cases |
| Entrechoc, à chacun | 78 · 18 mana | 102 · 17 | 229 · 12 |
| Lancer de pierre | 30 · 6 mana | 40 · 5 | 89 · 4 |
| Chance de blesser, Projection (sans armure / cuir / plates) | 82 / 78 / 56 % | 84 / 80 / 61 % | 89 / 88 / 82 % |
| Lancer d'arme (épée longue 1D8, qualité normale) | 39 · portée 5 · 14 mana | 51 · portée 6 · 13 | 114 · portée 9 · 9 |
| Onde de choc | repoussés de 2 cases · choc 22 · 23 mana | 3 cases · choc 28 · 21 | 4 cases · choc 63 · 14 |
| Bond | portée 2 · 9 mana | portée 3 · 9 | portée 4 · 6 |
| Écrasement | 60 · portée 7 · 18 mana | 79 · portée 8 · 17 | 178 · portée 11 · 12 |

### École de l'Illusion (10 sorts)

L'école du **moral** : elle joue sur le test de Courage (doc 04). La **Volonté** du mage y compte. Écoles opposées : Vie
et Télékinésie.

| Sort | Action | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|
| Peur | principale | chaque **ennemi** de la zone fait un **test de Courage** ; raté, il prend la **fuite** | centre à 6 + M/25 (au plus 12), rayon **2 + M/50, de 2 à 3** | 30 |
| Soutien illusoire | rapide | **+(30 + M/5) de Courage** pendant **2 tours** | un allié ou soi, **12 + M/10** (grande portée) | 10 |
| Courage de masse | principale | **+(20 + M/5) de Courage** aux alliés de la zone, lanceur compris, pendant **2 + M/50 tours (2 à 3)** | centre à 6 + M/25, rayon 2 à 3 | 20 |
| Avancée cachée | principale | **+(40 + M/5) de Discrétion** (massif) aux alliés de la zone, lanceur compris, pendant 2 à 3 tours | centre à 6 + M/25, rayon 2 à 3 | 20 |
| Choc psychique | principale | **1D6** × **Volonté du mage / Volonté de la cible** (de × 0,5 à × 2), **comme une flèche** ; ni armure ni résistance | 6 + M/25, au plus 12 | 10 |
| Frénésie | rapide | pendant les **2 prochaines activations** de la cible : elle **joue seule**, **+10 % de Force**, **plus de peur** | un allié, un ennemi ou soi, 2 + M/25 | 15 |
| Désespoir | rapide | **−(30 + M/5) de Courage** pendant **2 tours** | un ennemi, 6 + M/25, au plus 12 | 12 |
| Brouillage mental | principale | pendant **2 tours**, ses sorts ont **−(20 + M/5) % de réussite**, × **Volonté du mage / Volonté de la cible** (de × 0,5 à × 2) | un ennemi, 6 + M/25, au plus 12 | 15 |
| Création de double | principale | un **double du mage, à 1 PV**, sur une case libre : les ennemis le prennent pour lui ; il **n'agit pas** et **se dissipe** dès qu'un coup ou un sort le touche | case libre, 3 + M/25 | 20 |
| Sommeil | principale | la cible **s'endort** et perd ses **2 + M/50 prochaines activations (2 à 4)**, sauf si elle **résiste** ; **un coup qui la blesse la réveille** | un ennemi, 6 + M/25, au plus 12 | 25 |

- **Peur** : tenir = Courage + aura + Volonté / 4 − (Maîtrise + Volonté du mage) / 4, de 5 à 95 %. Raté : En fuite
  (fuite immédiate, reprise de contrôle habituelle). Un ennemi déjà en fuite ou en frénésie ne teste pas ; les alliés ne
  sont pas touchés. Courage 50 et Volonté 50 : tient à 42 % face à un débutant, 35 % face à une recrue, 12 % face à un
  expert.
- **Soutien illusoire**, **Courage de masse**, **Désespoir** : des points de Courage, qui comptent partout (test après
  un coup, Peur, reprise de ses esprits en fuite). Sur le lanceur, l'activation en cours compte comme la première.
- **Avancée cachée** : la Discrétion sert au camouflage (doc 04).
- **Brouillage mental** : la réussite ne descend pas sous 0.
- **Création de double** : une copie du mage, dans son camp, que l'IA vise comme les autres (le plus proche ; à distance
  égale, le moins de PV). Ni attaque d'opportunité, ni test, ni entretien. Il se dissipe au premier coup qui le touche
  (même paré ou bloqué), au premier sort qui le blesse, quand le mage tombe et à la fin du combat. Un nouveau double
  remplace le précédent.
- **Sommeil** : la cible résiste si D100 ≤ sa **Volonté − 0,5 × la Maîtrise** (5 à 95 %). Endormie, elle ne réagit plus
  (ni attaque d'opportunité, ni tir de réaction) ; tout dégât la réveille (coup, sort, poison, brûlure). Volonté 50 :
  résiste à 34 % face à un débutant, 22 % face à une recrue, 5 % face à un expert.
- **Frénésie** : à chacune de ses activations, la cible prend une arme de mêlée si l'autre set en a une, puis frappe,
  charge ou fonce sur l'ennemi le plus proche ; jamais de tir ni de sort ; aucun test de Courage ; une cible en fuite
  s'arrête de fuir. Ses 2 prochaines activations, même sur soi.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Peur | rayon 2 · portée 7 · 27 mana | rayon 3 · portée 8 · 25 | rayon 3 · portée 11 · 17 |
| Soutien illusoire | +36, 2 tours · portée 15 | +41 · portée 17 | +56 · portée 25 |
| Courage de masse | +26, 2 tours | +31, 3 tours | +46, 3 tours |
| Avancée cachée | +46 Discrétion, 2 tours | +51, 3 tours | +66, 3 tours |
| Choc psychique, à Volonté égale | 30 · 9 mana | 40 · 9 | 89 · 6 |
| Frénésie | portée 3 · 14 mana | portée 4 · 13 | portée 7 · 9 |
| Désespoir | −36 Courage · portée 7 · 11 mana | −41 · portée 8 · 10 | −56 · portée 11 · 7 |
| Brouillage mental, à Volonté égale | −26 % · 14 mana | −31 % · 13 | −46 % · 9 |
| Création de double | portée 4 · 18 mana | portée 5 · 17 | portée 8 · 12 |
| Sommeil (Volonté 50) | 2 activations · résiste 34 % · 23 mana | 3 · 22 % · 21 | 4 · 5 % · 14 |

### École de la Nécromancie (10 sorts)

Le **Charisme** du mage y compte : il garde ses invocations et fixe la force du zombie. Écoles opposées : Vie et
Invocation. Créatures : `data/reference/summon-archetypes.json`.

| Sort | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|
| Résurrection | principale | un **combattant mort**, allié ou ennemi, se relève en **zombie** de votre camp, avec **(Maîtrise + Charisme) / 2 %** (de 10 à 100 %) de ses caractéristiques, compétences et PV ; il garde son arme et son armure | 1 (le corps) | 30, puis **5 par tour** |
| Invocation de spectre | principale | un **spectre** apparaît sur une case libre | 1 | 25, puis **5 par tour** |
| Drain de vie | rapide | sur soi, pendant **2 + M/50 tours (2 à 3)** : il récupère **50 %** des PV que ses coups d'arme au corps à corps retirent | soi | 10 |
| Flèche de mort | principale | **1D6** de dégâts **nécrotiques**, **comme une flèche** | 6 + M/25, au plus 12 | 10 |
| Nécrose | principale | **2D8** de dégâts **nécrotiques**, sans jet de toucher | 1 (contact) | 20 |
| Flétrissement | principale | la cible ne peut plus être **soignée** ni récupérer de PV, pendant **3 + M/100 tours (3 à 4)** | 6 + M/25, au plus 12 | 15 |
| Malédiction | principale | **1D4** de dégâts **nécrotiques** au début de chacune de ses **3 prochaines activations** | 6 + M/25, au plus 12 | 20 |
| Armée d'os | principale | **1D4 squelettes**, **+1 par tranche de 50 de Maîtrise**, autour d'une case libre | 1 | 30, puis **5 par tour** |
| Siphon d'âme | principale | la cible perd jusqu'à **3 × 1D6** × (Puissance, Maîtrise) **mana** ; le nécromancien **seul** le récupère | 6 + M/25, au plus 12 | 10 |
| Pacte de sang | rapide | sur soi : **3 × 1D6** × (Puissance, Maîtrise) **mana** au plus, contre **2 PV par point** | soi | 1 |

- **Invocations** (aussi pour l'Invocation) : le **joueur** les joue, avec leur propre activation, dès le tour suivant ;
  en combat automatique, l'IA. Au **début de chaque tour**, **test de Charisme** pour les garder (la réussite d'un sort,
  le Charisme au lieu de l'Intelligence, difficulté **30**, sans l'armure), puis l'**entretien** : 5 × (1 − Maîtrise /
  300) mana, au moins 1. Raté ou sans assez de mana, l'invocation **disparaît**. Elles disparaissent aussi quand le mage
  est hors combat ou quitte la carte, et à la fin du combat : ni XP ni bilan. Elles arrivent **camouflées** (doc 04).
  Une meute ou un groupe compte pour une seule invocation : un test, un entretien.
- **Résurrection** : sur le corps d'un mort resté sur la carte, où personne ne se tient ; une seule fois par corps ; une
  invocation ne laisse pas de corps. **Un allié relevé ne survit pas au combat** : son jet de mort de fin de mission est
  forcément raté (Idan : « pas toujours cool d'avoir un collègue nécromancien ! »). Le zombie est un **mort-vivant** :
  la Restitution le blesse, le nécrotique ne le touche pas, **aucun test de Courage**.
- **Spectre** (« à peu près les stats d'un gobelin ») : guerrier gobelin novice, **Vitesse 65** (6 cases), **Volonté
  50**, **100 PV**, sans arme ni armure. **Immunisé aux dégâts physiques** (armes, tirs, sorts contondants) ; la magie
  élémentaire, le psychique et la Restitution le touchent. **Toucher spectral** : jet de toucher au contact, puis **1D6
  psychique** × sa Volonté / celle de la cible (× 0,5 à × 2), sans Blesser, ni armure ni résistance (≈ 35 à Volonté
  égale). Mort-vivant, sans peur.
- **Nécrotique** : traverse **l'armure et les résistances**, sans la Volonté ; **sans effet sur les morts-vivants** (on
  ne peut pas les viser ; une flèche égarée ne leur fait rien).
- **Drain de vie** : seulement ses coups d'arme au corps à corps ; les PV retirés comptent jusqu'à zéro. Sur soi,
  l'activation en cours compte comme la première.
- **Flétrissement** : aucun soin (sorts, Régénération, Drain de vie, potion) pendant 3 ou 4 activations.
- **Malédiction** : l'Embrasement en nécrotique, sans jet de toucher ; la relancer remplace la précédente.
- **Squelette** (Armée d'os ; « faibles, lents, nombreux, sans peur ») : **40 PV**, **3 cases**, **Lame rouillée 1D6**
  tranchante (≈ 25), mort-vivant, sans peur.
- **Siphon d'âme** : seulement si la cible a du mana ; le nécromancien récupère sans dépasser sa réserve, le reste est
  perdu. **Pacte de sang** : seulement s'il manque du mana, pas plus que ce qui manque ; **garde toujours 1 PV** ;
  coût : 1 mana, le minimum de tout sort.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Résurrection | zombie à 33 % · 27 mana | 55 % · 25 | 100 % · 17 |
| Invocation de spectre | 23 mana | 21 | 14 |
| Garder une invocation, chaque tour | 57 % · 5 mana | 81 % · 5 | 94 % · 3 |
| Drain de vie | 2 tours · 9 mana | 3 tours · 9 | 3 tours · 6 |
| Flèche de mort | 30 · portée 7 · 9 mana | 40 · 8 · 9 | 89 · 11 · 6 |
| Nécrose | 78 · 18 mana | 102 · 17 | 229 · 12 |
| Flétrissement | 3 tours · portée 7 · 14 mana | 3 tours · 8 · 13 | 4 tours · 11 · 9 |
| Malédiction, par activation | 22 · portée 7 · 18 mana | 28 · 8 · 17 | 63 · 11 · 12 |
| Armée d'os | 1D4 squelettes · 27 mana · entretien 5 | 1D4 + 1 · 25 · 5 | 1D4 + 2 · 17 · 3 |
| Siphon d'âme | 9 mana pris · 9 mana | 12 · 9 | 27 · 6 |
| Pacte de sang, au plus | +9 mana pour 18 PV | +12 pour 24 PV | +27 pour 54 PV |

(Charisme supposé égal à l'Intelligence : 35 / 53 / 73.)

### École de l'Invocation (10 sorts)

**Règles d'invocation de la Nécromancie**, mais les créatures font leurs **tests de Courage et peuvent fuir**. Une
**meute** compte pour **une seule invocation** (ratée, toute la meute disparaît) ; chacun se déplace de son côté. Les
créatures apparaissent sur la case choisie, voisine du mage, puis sur les cases libres les plus proches (moins s'il
n'y a plus de place). Écoles opposées : Transmutation et Nécromancie.

| Sort | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|
| Corbeau | principale | un **corbeau** | 1 | 10, puis **2 par tour** |
| Bourbier | principale | une case devient un **bourbier** pendant **2 + M/50 tours (2 à 3)** : qui s'y trouve ou y entre, allié ou ennemi, **ne peut plus se déplacer** | 6 + M/25, au plus 12 | 10 |
| Transposition | rapide | le mage **échange sa place** avec une de ses invocations (pas un déplacement : aucune attaque d'opportunité) | partout, sans ligne de vue | 8 |
| Invocation de loups | principale | **1D6 loups, +1 par tranche de 50 de Maîtrise** (le 1D6 peut évoluer) | 1 | 25, puis **5 par tour** |
| Invocation d'ours | principale | **1D3 ours** | 1 | 30, puis **6 par tour** |
| Invocation de crocodiles | principale | **1D3 crocodiles** | 1 | 30, puis **6 par tour** |
| Nuée d'insectes | principale | une zone de rayon **2 + M/50 (2 à 3)** pendant **2 tours** : les **ennemis** qui s'y trouvent perdent **(20 + M/5) % de Perception et de Dextérité** | centre à 6 + M/25, au plus 12 | 20 |
| Invocation de sangliers | principale | **1D4 sangliers** | 1 | 25, puis **5 par tour** |
| Invocation d'araignées géantes | principale | **1D2 araignées géantes** | 1 | 30, puis **6 par tour** |
| Bannissement | principale | une **invocation ennemie** disparaît, **avec tout son groupe** | 6 + M/25, au plus 12 | 15 |

| Créature | Déplacement | PV | Attaque (dégâts moyens) | Particularités |
|---|---|---|---|---|
| Corbeau (Vitesse 100) | 8 cases | 25 | Bec 1D3, ≈ 6 | Discrétion 95 (Idan : « on le voit, mais personne n'y prête attention »), Perception 85, Esquive 80 |
| Loup (Vitesse 70) | 6 cases | 60 | Morsure 1D6, ≈ 25 | Perception 70 (flair) |
| Ours (Vitesse 20) | 3 cases | 250 | Griffes 1D8, ≈ 77 | Force 85, Résistance physique 20 |
| Crocodile (Vitesse 10) | 2 cases | 200 | Mâchoires 2D8, ≈ 126 | Discrétion 90, Résistance physique 25 |
| Sanglier (Vitesse 70) | 6 cases | 45 | Défenses 1D8, ≈ 50 | **charge × 2** (≈ 100) ; « tiennent mal » : peu de PV |
| Araignée géante (Vitesse 50) | 5 cases | 120 | Morsure venimeuse 1D6, ≈ 32 | **poison** si elle blesse (10 PV par tour, 3 tours) ; **toile** si elle touche ; Discrétion 60, Résistance au poison 60 |

- Les autres valeurs des créatures sont celles du guerrier gobelin novice ; leur arme naturelle suit les règles des
  armes.
- **Corbeau** : l'éclaireur ; un ennemi camouflé qu'il repère est vu de toute l'armée, pour toute la partie (doc 04).
- **Bourbier** : on peut y entrer (fin du chemin), pas le traverser ni en sortir ; on y attaque et on y lance des sorts.
  Il bloque la fuite, pas les déplacements forcés.
- **Nuée d'insectes** : la Précision (doc 05) vient de la Dextérité et de la Perception. Elle ne pique que les ennemis
  du mage : ceux de la zone au lancer, puis ceux qui y commencent leur activation (malus pour cette activation). Elle ne
  coupe pas la vue.
- **Araignées géantes** : la morsure empoisonne comme la sarbacane ; la **toile** colle dès que la morsure touche (ni
  parée, ni bloquée) : la cible ne peut pas se déplacer à sa prochaine activation.
- **Bannissement** : toute invocation adverse (créature, zombie, spectre, double illusoire) ; une meute part en entier.
  Pas de jet de résistance.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Corbeau | 9 mana, entretien 2 | 9, 2 | 6, 2 |
| Bourbier | 2 tours · portée 7 · 9 mana | 3 tours · 8 · 9 | 3 tours · 11 · 6 |
| Transposition | 8 mana | 7 | 5 |
| Loups | 1D6 · 23 mana, entretien 5 | 1D6 + 1 · 21, 5 | 1D6 + 2 · 14, 3 |
| Ours, Crocodiles | 1D3 · 27 mana, entretien 6 | 1D3 · 25, 5 | 1D3 · 17, 4 |
| Garder une invocation, chaque tour | 57 % | 81 % | 94 % |
| Nuée d'insectes | rayon 2 · −26 % · portée 7 · 18 mana | rayon 3 · −31 % · 8 · 17 | rayon 3 · −46 % · 11 · 12 |
| Sangliers | 1D4 · 23 mana, entretien 5 | 1D4 · 21, 5 | 1D4 · 14, 3 |
| Araignées géantes | 1D2 · 27 mana, entretien 6 | 1D2 · 25, 5 | 1D2 · 17, 4 |
| Bannissement | portée 7 · 14 mana | 8 · 13 | 11 · 9 |

### Catalogue validé (Idan, 2026-10-31)

**90 sorts mono-école** (10 par école, l'objectif V1), tous écrits plus haut. Refusés (à ne pas reproposer tels
quels) : Bouclier de vie, Retour à la vie, Météore, Verglas, Forme bestiale, Corps d'acier, Désarmement, Lévitation,
Hallucination, Explosion de cadavre, Esprit gardien, Marque de mort.

**49 sorts bi-école, en attente** (Idan, 2026-11-01 : « Mets en stand by les sorts bi école. Garde les idées »). Deux
écoles **non opposées** ; jamais appris à la création. À décider : maîtrise, puissance et apprentissage (moyenne ou
somme des deux écoles ; conseil : la moyenne). Entre deux écoles opposées, un sort bi-école est intéressant s'il est
**très fort** (à proposer).

- **Vie × Feu** : **Flamme sacrée** (feu ; la moitié des PV infligés soigne le lanceur) ; **Brasier de guérison**
  (cercle de feu 2 tours : soigne les alliés, brûle les ennemis) ; **Cœur ardent** (soin et insensible à la peur 2
  tours).
- **Vie × Eau** : **Source de jouvence** (soin et mana).
- **Vie × Transmutation** : **Chair neuve** (soin et retire tous les malus de caractéristiques) ; **Métabolisme** (soins
  reçus +50 % et pas de poison, plus de 3 tours) ; **Sursaut vital** (soin, bonus de Force et de Vitesse).
- **Vie × Foudre** : **Éclair de vie** (rebonds : soigne les alliés, blesse les ennemis).
- **Vie × Télékinésie** : **Main secourable** (attire un allié blessé et le soigne) ; **Repousse-mal** (repousse les
  ennemis au contact d'un allié et le soigne).
- **Vie × Invocation** : **Dryade** (soigne chaque tour l'allié le plus blessé à portée) ; **Soin de la meute** (soigne
  nos invocations).
- **Feu × Transmutation** : **Torche humaine** (un allié file de 5 cases en ligne droite et brûle tout sur son passage).
- **Feu × Foudre** : **Déflagration** (feu et foudre autour du lanceur, alliés compris) ; **Arme d'orage** (l'arme d'un
  allié ajoute feu et foudre) ; **Éclair de feu** (sans ligne de vue : brûle et électrise).
- **Feu × Nécromancie** : **Feu noir** (feu et nécrotique ; tant qu'elle brûle, la cible ne peut être soignée) ;
  **Squelette ardent** (un mort relevé en squelette enflammé dont les coups brûlent).
- **Feu × Invocation** : **Élémentaire de feu** ; **Molosses de braise** (meute de chiens de feu).
- **Eau × Transmutation** : **Corps éthéré** (un allié insensible aux coups physiques 1 tour).
- **Eau × Illusion** : **Brume des songes** (brouillard où les ennemis s'endorment s'ils ratent un test) ; **Chant de
  sirène** (les ennemis de la zone attirés vers le lanceur, qu'ils n'attaquent pas 1 tour) ; **Miroir d'eau** (renvoie
  un sort de dégâts sur son lanceur).
- **Eau × Nécromancie** : **Peste des marais** (maladie : PV perdus chaque tour, transmise aux voisins) ; **Eaux
  mortes** (zone : les ennemis qui y meurent se relèvent en zombies de notre camp).
- **Eau × Invocation** : **Élémentaire d'eau** ; **Ondine** (rend mana et PV à un allié voisin chaque tour).
- **Transmutation × Télékinésie** : **Pesanteur** (un ennemi perd Vitesse et Esquive) ; **Pierre animée** (golem lent et
  très solide).
- **Transmutation × Illusion** : **Aspect terrifiant** (les ennemis au contact du lanceur testent leur Courage chaque
  tour) ; **Peau de caméléon** (un allié camouflé, même après une attaque).
- **Transmutation × Nécromancie** : **Putréfaction** (perte de Constitution, donc de PV max, jusqu'à la fin du combat) ;
  **Abomination** (deux cadavres fusionnés en une créature puissante) ; **Chair recousue** (nos morts-vivants
  récupèrent des PV et gagnent de la Force).
- **Foudre × Télékinésie** : **Canon magnétique** (pierre ou arme lancée qui traverse tout sur une ligne) ;
  **Répulsion** (renvoie les projectiles de métal à leur tireur).
- **Foudre × Illusion** : **Éblouissement** (les ennemis de la zone perdent Précision et Perception 1 tour) ; **Coup de
  tonnerre** (test de Courage pour tous les ennemis de la carte).
- **Foudre × Nécromancie** : **Foudre noire** (rebonds qui volent des PV au profit du lanceur) ; **Arrêt du cœur** (une
  cible sous **10 %** de ses PV tombe hors combat).
- **Foudre × Invocation** : **Élémentaire de foudre** ; **Oiseau-tonnerre** (rapide, volant ; foudroie sans voir sa
  cible).
- **Télékinésie × Nécromancie** : **Faux spectrale** (fauche les ennemis en arc devant le lanceur, nécrotique) ;
  **Chaînes d'âme** (deux ennemis liés : chaque blessure de l'un frappe l'autre).
- **Télékinésie × Invocation** : **Rappel** (nos invocations ramenées autour du lanceur, sans attaque d'opportunité) ;
  **Téléportation** (une invocation sur la case choisie, hors du brouillard).
- **Illusion × Nécromancie** : **La mort vous va si bien** (test de Courage pour tous les ennemis de la carte).
- **Illusion × Invocation** : **Djinn** (invocation très rapide, qui ignore le terrain lent et ne craint ni les coups
  physiques ni la foudre).

### Mana

Le **Mana actuel** se dépense en combat et se **recharge chaque jour au camp** : **Réserve de mana × (10 + Volonté
/ 2) %** par jour (Volonté 52 : 36 %, plein en 3 jours) ; rien pendant les trajets. **Bains chauds** (doc 11 §9) : +5 %
de la Réserve par jour et par niveau.

### Écoles : progression et régression

Chaque gain dans une école fait perdre **la moitié de ce gain** à ses **deux écoles opposées** (un quart chacune), comme
les armes (doc 08). Une école ne descend pas sous 1.

**XP de la magie** (le sort joue le rôle de l'arme, son école celui de la catégorie), à chaque lancer, même raté :

- **+40 XP** au sort et à son école ; **+20** si le sort réussit ; **+20** de plus s'il a un **vrai effet** (PV soignés,
  dégâts qui passent la protection, effet posé, poison purgé) ;
- les **sorts ne régressent pas** ; même courbe que les compétences (courbe par zones, doc 08 §1), **sans plafond** (Idan,
  2026-11-06) ;
- **Puissance magique** : +80 XP par sort réussi qui a un vrai effet ; **Réserve de mana** : +8 XP par point de mana
  dépensé, même si le sort rate ;
- **Chance et réputation** : critiques comme ceux des armes (coup critique −20 XP de Chance, échec critique confirmé
  +120 XP ; réputation +1 / −1) ;
- appliquée **en fin de mission** et montrée dans le bilan (« Sort Soin rapide +45 », « Écoles opposées −11 »).

Aussi (doc 08) : **Constitution** +4 XP par PV réellement rendu, au mercenaire soigné ; chaque brûlure qui passe la
protection : +32 XP en Résistance au feu, −8 aux quatre autres. Blesser ou mettre hors combat avec un sort ou une arme
enflammée compte comme avec un coup d'arme (Charisme, réputation).

### Sorts connus à la création

À la création d'un mercenaire, **capitaine compris**, trois tirages dans cet ordre : un sort de l'**école de sa
culture** (tableau), un de l'école où il est **le meilleur**, un de sa **deuxième meilleure** école.

- Chance de chaque tirage : **École × Intelligence / 75** %, au plus 75 % (presque nulle sans l'école), puis × 1 pour
  le premier sort obtenu, **× 1,1** pour le deuxième, **× 1,3** pour le troisième (au plus 97,5 %).
- Sort tiré au hasard dans l'école, au **niveau 1**. Si l'école de la culture est aussi sa n°1 ou n°2, il peut en
  apprendre **deux sorts** (jamais deux fois le même) ; plus de sort disponible : le tirage ne donne rien.
- Les cultures **sans école** n'ont que les deux derniers tirages ; en compensation, **Nains des montagnes** et **Nains
  esclaves** : **+1D6 Courage** ; **Ogres des cités humaines** et **Ogres des montagnes** : **+1D6 Force**.

| École | Cultures |
|---|---|
| Eau | Tribus nordiques, Reptiliens des marécages, Elfes des grandes cités |
| Feu | Clans des grandes steppes, Terres des Deux Fleuves, Ogres des steppes |
| Foudre | Elfes noirs, Nains du chaos |
| Vie | Elfes sylvains, Cités libres, Royaumes du Soleil Levant |
| Nécromancie | Tribus des forêts anciennes, Gnomes des cavernes, Montagnes du Nord |
| Illusion | Halflings des villages isolés, Gobelins des villes, Gnomes des forêts, Gnomes des villes |
| Invocation | Explorateurs, Gobelins des cavernes, Reptiliens des cités-temples |
| Transmutation | Tribus de la jungle, Orcs noirs, Orcs des villes, Orcs des steppes |
| Télékinésie | Reptiliens des villes, Halflings des cités humaines, Caravanes de ferrailleurs |
| Aucune | Nains des montagnes, Nains esclaves, Ogres des cités humaines, Ogres des montagnes |

- Cible d'Idan : 50 % des recrues sans sort, 35 % avec un, 12,5 % deux, 2,5 % trois (simulation : 48 / 36 / 13 /
  2,9 %). Données : `data/reference/cultures.json`.
- **Rattrapage du mage** (Idan, 2026-11-01 : « Qu'il connaisse au moins un sort de sa meilleure école ») : un Mage
  (doc 02) sans sort après les tirages en apprend un au hasard dans sa meilleure école, une fois son domaine accentué
  (environ un Mage sur cinq).
- L'école de culture n'est **pas garantie** : une recrue sur deux des cultures que la génération ne pousse pas dans leur
  école (Cités libres, Royaumes du Soleil Levant, Terres des Deux Fleuves, Ogres des steppes, Nains du chaos, Orcs des
  villes, Orcs des steppes, Caravanes de ferrailleurs) n'a pas l'école. Voulu : « tout le monde ne doit pas être mage »
  (Idan, 2026-10-25).

**Manuels de sorts** (Idan, 2026-10-31 : « c'est ce qui permettra de les apprendre ») :

- **Un manuel par sort** (objet « Manuel : <sort> »), rangé à l'Intendance (onglet **Manuels**, par école) ; ni tier ni
  qualité.
- **3 000 PO** pour tous (Idan, 2026-11-01) ; le marchand en demande × 1,5 selon l'affinité, comme pour un objet :
  4 500 PO à affinité nulle. **En vente** chez les marchands des cultures de l'école (doc 18), chaque article tiré dans
  l'école.
- Il s'apprend à l'**École de magie**, dans la salle de l'école du sort ; pas un sort déjà connu, pas pendant une
  mission ; pas de prérequis d'école.

**École de magie** (doc 11 §7) : le bâtiment et ses neuf salles se construisent au camp, avec un directeur,
l'entraînement libre et l'apprentissage des sorts.

**Apprendre un sort à l'École** (Idan, 2026-11-02 : « Le seul coût est la durée… qui est indéterminée ») :

- **Conditions** : le manuel ; la **salle de l'école du sort** construite, avec une place libre ; le mercenaire au camp
  (pas d'expédition, même programmée), ni élève ni professeur.
- **Le convaincre** (« Apprendre à… » sur le manuel) : **10 + 80 / (1 + e^(−Δ/20))**, **Δ = 0,5 × affinité avec le
  capitaine + 0,5 × (école du sort − 50)** + l'appui de l'intendant (0,2 × Intendance + 0,25 × affinité envers lui) ;
  une tentative par jour ; le **capitaine** apprend sans test. Affinité 0 et école 80 : 64 % ; sans l'école : 28 % ;
  affinité 50 et école 80 : 80 %.
- **S'il accepte** (doc 16) : il **entre à l'École le lendemain matin** ; d'ici là, le manuel est mis de côté et la
  place réservée, et « Annuler » rend le manuel, sans effet sur l'affinité. Au matin, le manuel est détruit, l'affinité
  appliquée ; il prend une place (avant l'entraînement libre) et **reste au camp** (ni mission, ni garde du corps, ni
  entraînement libre) jusqu'à connaître le sort. Premier test le matin suivant.
- **Chaque matin** : chance = **100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 × niveau de la salle)**, au plus 95 %, avec
  **X = (Intelligence + école du sort) / 2 + (école du sort du directeur + sa Transmission du savoir) / 10 +
  Transmission du savoir du professeur / 5**. Salle niveau 1 : moyen (Intelligence 54, école 70) 14 % par jour, **7
  jours** en moyenne ; talentueux (75, 110) 45 %, **2 jours** ; pas doué (35, sans l'école) 2 %, 56 jours ; moyen avec
  un directeur (école 100, Transmission 48) 26 %, 4 jours ; avec un professeur (Transmission 48) 21 %, 5 jours ; les
  deux 37 %, 3 jours ; salle niveau 5 : 20 %, 5 jours.
- **Niveau du sort appris** : le **niveau de la salle** (1 à 10) ; avec un professeur, **son niveau du sort × sa
  Transmission du savoir / 100** s'il est plus haut, au plus 100 (professeur à 40 : 19 avec 48 de Transmission, 48 avec
  120).
- **Professeur** (facultatif, à tout moment) : un membre qui **connaît le sort**, au camp, ni l'élève ni déjà pris par
  l'École. Il accepte selon 10 + 80 / (1 + e^(−Δ/20)), **Δ = (son affinité avec le capitaine + son affinité envers
  l'élève) / 2** (50 % à 0) ; une tentative par jour ; le capitaine enseigne sans test. Il **reste au camp** jusqu'à la
  fin et **enseigne dès le lendemain matin** (son affinité change alors) ; on peut le **libérer**, l'élève continue
  seul. +20 XP de Transmission du savoir par jour d'enseignement ; le directeur : +20 XP par élève et par jour.
- **Le faire sortir avant la fin** : manuel perdu, **rien n'est acquis**.
- **Affinité avec le capitaine** : élève **+5** s'il accepte, **−2** s'il refuse, **+10** quand il connaît le sort,
  **−10** si on le fait sortir ; professeur **+3** s'il accepte, **−2** s'il refuse, **+5** quand son élève connaît le
  sort, **−3** si on le libère. Le capitaine ne change pas.
- **Interface** : dans l'encart de l'École, « Apprentissages » (élève, sort, salle, jour, chance du lendemain au
  survol ; « Ajouter un professeur », « Libérer », « Le faire sortir ») ; le journal du matin annonce le sort appris.

**Perfectionner un sort à l'École** (Idan, 2026-11-02 : « consommer des manuels contre de l'xp de sort ») :

- **Un manuel du même sort**, pour un membre qui le **connaît déjà** (« Perfectionner », avec l'XP prévue). **Pas de
  test** ; affinité **+2**. La **salle de l'école du sort**, une place libre ; sans plafond de niveau.
- **Une journée à l'École** : il **entre le lendemain matin** (annulable d'ici là) ; au matin, le manuel est détruit et
  l'affinité appliquée ; il passe la journée dans la salle (une place, ni mission, ni garde du corps, ni entraînement
  libre) ; l'XP tombe **le matin suivant**, puis il sort.
- **XP du sort = 4 000 × Intelligence / 50 × (1 + 0,1 × niveau de la salle) × (1 + Transmission du savoir du directeur /
  100)**. Intelligence 54, salle 3, sans directeur : **5 616 XP** (≈ 78 lancers) : un sort passe du niveau 1 à 44, de 10
  à 45, de 20 à 47, de 50 à 62, de 90 à 94 (courbe par zones, doc 08 §1) ; avec un directeur à 48 de Transmission :
  8 312 XP.

### Mise en place

Étapes : 1. Soin rapide et la Vie ; 2. les sorts en combat ; 3. recharge du mana, XP des sorts et des écoles ; 4. sorts
connus à la création.

- **En combat** : une barre de sorts du mercenaire actif (action, mana, réussite), les cases ciblables en vert, le mana
  dans la liste des équipes.
- **IA simple** (aussi en combat automatique) : Soin profond sur l'allié le plus blessé sous 35 % de ses PV, à la place
  de l'attaque ; Soin rapide sous 60 %.
- **Bouton « Sorts (test) »** : pour ce combat, l'escouade reçoit tous les sorts au niveau 1, sans toucher au grimoire
  ni au niveau d'un sort connu ; le mana est dépensé ; l'XP de ces sorts n'est pas gardée, celle de leur école compte.

## Architecture d'un sort

- **Apprentissage au camp** : un entraînement d'une certaine durée (l'École de magie), avec une chance qui dépend
  notamment de l'Intelligence. Maîtrise de l'école et connaissance du sort restent deux notions distinctes.
- **Incantation en combat** : payer le mana, puis réussir le jet (maîtrise et Intelligence).
- **Efficacité** : la **Puissance magique** fait surtout l'effet (dégâts, soins, durée, intensité). Réussir une boule de
  feu ne garantit pas qu'elle soit plus chaude qu'un radiateur médiocre.

## Écoles opposées

Chaque école a deux écoles opposées (`data/reference/skills.json`, `ecoles_opposees`) ; elles forment une boucle de neuf
écoles, dessinée en roue sur la fiche.

- Un mercenaire **peut être bon dans deux écoles opposées** ; la génération ne les exclut pas (Idan, 2026-10-21). Mais
  **quand il progresse dans l'une, il baisse dans ses opposées** (voir « Écoles : progression et régression »).
- **Bagues de magie** (Idan, 2026-10-24) : une par école ; +10 à +25 % de la maîtrise de base de l'école, −15 à 0 % de
  celle des deux opposées selon le tier (doc 05 « Bagues »).

## Premier catalogue de sorts — idées mono-école

Les idées d'origine (Flèche de feu, Premiers soins, Soins de masse…) sont reprises dans les neuf écoles ci-dessus.

## Cas de test futurs

Le catalogue couvre les besoins du futur moteur : monocible, zone, enchantement d'arme, protection, terrain persistant,
obstacle destructible, rebond, CAC magique, soin, soin sur durée, déplacement forcé, contrôle et invocation.
