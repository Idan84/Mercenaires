> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Magie — apprentissage, incantation & premier catalogue

<aside>
🧪

**Page de conception.** Les principes ci-dessous sont retenus comme direction de travail. Le premier sort, **Soin rapide**, et les règles communes (maîtrise, réussite, armure, mana, sorts à la création) sont chiffrés : voir « Décisions du 2026-10-25 ». Les autres sorts restent à définir.

</aside>

## Décisions du 2026-10-25 (Idan)

Principe : le joueur reste **très libre** de faire ce qu'il veut, à lui d'être vigilant aux builds inefficaces ; le jeu l'aide en faisant les calculs, c'est lui qui décide. Il n'y aura **pas de sort « supérieur » appris plus tard** : chaque sort doit garder son intérêt jusqu'en fin de partie (ses formules montent avec la Puissance magique et la maîtrise ; on équilibrera face aux gros dragons de fin de partie si besoin).

### Rôle des caractéristiques

| Valeur | Rôle |
|---|---|
| Niveau de l'école | Pèse le plus dans la maîtrise : effet, portée, coût et réussite |
| Niveau du sort | Appris au niveau 1 (sur 100), monte quand on s'en sert ; simple bonus dans la maîtrise |
| Puissance magique | Combien le sort fait (PV soignés, dégâts…) |
| Réserve de mana | Combien de sorts on peut lancer |
| Intelligence | Réussite du sort ; sorts connus à la création |
| Volonté | Recharge du mana au camp |
| Charisme | Selon l'école (Invocation, Nécromancie : Idan, 2026-10-28 ; l'Illusion prend la Volonté) ; ne joue pas sur le soin |

Toutes ces valeurs se prennent **équipement compris** (bague de l'école, amulette de puissance magique, ceinture de mana, casque de constitution, bâton long +5 % de Puissance magique ou bâton court +10 % de Réserve de mana tenus en main : doc 05…).

### Maîtrise d'un sort

**Maîtrise = École + Niveau du sort / 2** (`magic.mastery.spell_share` = 0,5) : l'école pèse deux fois plus que le sort. Un bon mage de Vie qui vient d'apprendre un sort (Vie 84, sort 1 : 84,5) vaut à peu près un mage moyen qui le pratique depuis longtemps (Vie 56, sort 50 : 81).

Pas de **prérequis** d'école pour connaître ou lancer un sort.

### Réussite d'un sort

- **Réussite = 10 + 85 / (1 + e^(−Δ/15))**, avec **Δ = (Maîtrise + Intelligence) / 2 − difficulté du sort** (constantes `magic.cast.*` ; difficulté dans `spells.json`). Au plus 95 %.
- **Armure** : l'**Altération magique** de l'armure portée se retire **en points** de la réussite (Vêtements 0, Gambison 2, Cuir 5, Cuir renforcé 10, Écailles 12, Brigandine 20, Mailles 25, Plates 45), × le multiplicateur de malus de sa qualité (usée × 1,2 ; Grand Luxe × 0,8). Jamais sous 0. Un mage en plates reste un pari toute la partie. Les boucliers ont le même champ, encore vide : ils ne gênent pas pour l'instant.
- Le **mana est dépensé** même si le sort échoue.
- **Coup critique** (comme les armes) : sort réussi, puis D100 ≤ Chance / 10 (1 à 25 %) : le dé de l'effet fait son maximum.
- **Échec critique** (comme les armes) : un naturel de 96 à 100 déclenche un test de Chance ; si le D100 dépasse la Chance, le sort se retourne. Pour Soin rapide, le **lanceur perd le soin minimum** (dé à 1), miroir de l'échec critique de blessure.

### Soin rapide (école Vie)

Restaure X PV à **un allié ou au lanceur lui-même**, situé à Y cases, **en ligne de vue** (même règle que les tirs, doc 04 : seul le décor la coupe ; les missions actuelles n'en ont pas). **Action rapide.** Coût : Z mana. Données : `spells.json` (`quick_heal`).

- **X = 10 × 1D4 × (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100)**, arrondi au supérieur (construit comme les dégâts d'une arme, la Puissance magique tenant le rôle de la Force).
- **Y = 2 + Maîtrise / 25**, arrondi à l'inférieur.
- **Z = 12 × (1 − Maîtrise / 300)**, arrondi au supérieur.

| Profil | Maîtrise | X moyen (fourchette) | Y | Z | Réussite sans armure |
|---|---|---|---|---|---|
| Débutant (Puissance 53, Vie 31, sort 1, Int 35) | 31,5 | 22 (9–35) | 3 | 11 | 57 % |
| Fort en Vie, sort neuf (Puissance 53, Vie 84, sort 1, Int 53) | 84,5 | 36 (15–58) | 5 | 9 | 89 % |
| Confirmé (Puissance 53, Vie 56, sort 50, Int 53) | 81 | 35 (14–56) | 5 | 9 | 88 % |
| Expert (Puissance 69, Vie 84, sort 100, Int 73) | 134 | 64 (26–102) | 7 | 7 | 94 % |

Repères : PV max médian d'un mercenaire ≈ 214 ; un coup de dague ≈ 38 PV, une arme lourde ≈ 100. Projection en fin de partie (caracs à 100, équipement T4, Vie 100, sort 100) : soin moyen ≈ 135, soit ≈ 29 % des PV d'un allié du même stade : le sort garde tout son intérêt.

### École de la Vie (6 sorts, Idan, 2026-10-25)

Même modèle que Soin rapide : **Effet = 10 × dés × (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100)**, **mana = base × (1 − Maîtrise / 300)** ; seuls les dés, l'action, la portée, la durée, la zone, le mana de base et la difficulté changent. **Difficulté selon le palier** : Novice 30, Adepte 50, Expert 70. **Coup critique** : dés au maximum. **Échec critique** : le lanceur subit l'effet minimum de son sort (dés à 1). Action **principale** = l'action d'attaque du tour : un mage peut cumuler, dans le même tour, une action rapide et une action principale (par exemple Purge puis Soin profond). Données : `spells.json`.

| Sort | Palier | Action | Cible | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|---|---|
| Soin rapide | Novice | rapide | allié ou soi | soin 1D4 | 2 + M/25 | 12 |
| Soin profond | Adepte | principale | allié ou soi | soin **2D6** | **1 + M/50** (au contact au début) | 25 |
| Régénération | Adepte | principale | allié ou soi | soin 1D4 au début de chaque activation de la cible, pendant **2 + M/50 tours** | 2 + M/25 | 20 |
| Soin de masse | Expert | principale | une case | soin 1D4 à **tous** dans un cercle de **rayon 1 + M/50** : alliés, ennemis, lanceur compris ; un seul jet pour tous | centre à 2 + M/25 | 30 |
| Restitution | Adepte | principale | un mort-vivant | **1D10** de dégâts qui ignorent armure, résistances et blocage | 2 + M/25 | 15 |
| Purge | Novice | rapide | allié ou soi | retire tout le poison ; pas de coup critique | 2 + M/25 | 8 |

*M = Maîtrise ; portées, durées et rayons arrondis à l'inférieur ; toujours en ligne de vue.*

- **Soin profond** soigne près de trois fois plus que Soin rapide pour deux fois plus de mana et l'action principale ; le soigneur doit aller au contact au début : c'est le prix du gros soin.
- **Régénération** garde la Puissance et la maîtrise du lancer ; elle **ne se cumule pas** : la relancer remplace la précédente. Coup critique : dé au maximum à chaque tour.
- **Soin de masse** : rayon 1 = 7 cases, 2 = 19, 3 = 37.
- **Restitution** attend les morts-vivants pour servir en combat ; **Purge** retire le poison du Crachat de venin (école de la Transmutation).
- **Icônes** (Idan, 2026-10-25) : un parchemin par sort sous un **cadre commun à l'école** (vert, lianes et émeraudes pour la Vie), superposés dans le jeu : barre de sorts du combat et grimoire de la fiche. Masters : `assets-src/Sorts/Vie/` ; `scripts/build-spells.sh` détoure le centre du cadre (accord d'Idan) et produit les versions du jeu.
- **Infobulle du grimoire** (Idan, 2026-10-30 : « on doit savoir à qui il sert, combien de mana il utilise ») : au survol d'un sort de la fiche, sa description (la cible et l'action y sont), puis ses chiffres pour ce mercenaire, maîtrise et équipement compris, les mêmes qu'en combat : mana, réussite, portée, soins ou dégâts, bonus, durée, zone (`prototype-web/ui.js`, `spellTip` ; test : `tests/magic.test.js`).

| | Débutant (Vie 31) | Recrue moyenne (Vie 56) | Expert (Vie 84, sort 100) |
|---|---|---|---|
| Soin rapide | 22 PV · 11 mana · 57 % | 28 · 10 · 81 % | 63 · 7 · 94 % |
| Soin profond | 60 PV · 23 · 31 % | 79 · 21 · 59 % | 178 · 14 · 93 % |
| Régénération | 22 × 2 tours · 18 · 31 % | 28 × 3 · 17 · 59 % | 63 × 4 · 12 · 93 % |
| Soin de masse | 22 par cible, rayon 1 · 27 · 17 % | 28, rayon 2 · 25 · 33 % | 63, rayon 3 · 17 · 87 % |
| Restitution | 48 dégâts · 14 · 31 % | 62 · 13 · 59 % | 140 · 9 · 93 % |
| Purge | 8 mana · 57 % | 7 · 81 % | 5 · 94 % |

### École du Feu (6 sorts, Idan, 2026-10-25)

Même modèle que la Vie (effet, mana, difficulté par palier, CC aux dés maximum, EC : le lanceur subit le minimum de son sort). Données : `spells.json`.

**Dégâts de feu** : effet × (1 − protection / 100). **Protection contre le feu** = Résistance au feu du personnage (équipement compris) **+ ou − la valeur « brûlant » de l'armure portée** (plates −20 : le métal chauffe ; mailles −10 ; brigandine −5 ; vêtements +5 ; cuir +15 ; cuir renforcé +18 ; écailles +35), bornée de **−50 à +75 %** (`combat.elemental.*`). Même règle pour le froid (« glaçant ») et la foudre (« foudroyant ») ; la fiche montre ces résistances avec l'armure (Idan : « on doit ajouter ou soustraire aux résistances l'impact de l'armure »).

| Sort | Palier | Action | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|---|
| Trait de feu | Novice (30) | principale | 1D6 de feu sur un ennemi, **comme une flèche** | 12 + M/10 (l'arc : 18) | 10 |
| Boule de feu | Expert (70) | principale | 2D6 de feu au centre, **dégressif** : × (1 − d / (rayon + 1)) à d cases ; rayon **3 + M/50, de 3 à 5** | centre à **6 + M/25, de 6 à 12** | 30 |
| Anneau de feu | Novice (30) | principale | 1D6 de feu à tous ceux qui sont à 1 ou 2 cases du lanceur, lanceur épargné | autour du lanceur | 20 |
| Arme enflammée | Novice (30) | rapide | +1D4 de feu à chaque coup qui touche (même sans blesser), pendant 2 + M/50 tours | la sienne ou celle d'un compagnon, 1 + M/50 | 12 |
| Armure de feu | Novice (30) | rapide | +(30 + M/5) de protection contre le froid, pendant 2 + M/50 tours | allié ou soi, 2 + M/25 | 10 |
| Flaque de magma | Adepte (50) | rapide | une case vide devient infranchissable pendant **4 + M/25 tours** (de quoi bloquer un passage) | 2 + M/25 | 8 |

- **Trait de feu** suit les règles de l'arc (Idan) : après un sort réussi, jet de toucher avec la formule des tirs, la Maîtrise du sort à la place des compétences d'arme, l'Esquive de la cible, la perte avec la distance au-delà du quart de la portée (et la couverture, quand le décor existera) ; un trait raté peut toucher quelqu'un dans la ligne de tir (approximation des projectiles). Pas de jet de Blesser : seule la protection contre le feu réduit les dégâts.
- **Boule de feu** ne s'évite pas, mais peut taper à côté : après un sort réussi, précision = 50 + Maîtrise / 2 − 5 × distance (10 à 95 %) ; si elle rate, la boule dévie de **1D3 cases** dans une direction au hasard. Elle touche tout le monde dans la zone, **alliés et lanceur compris** (Idan : « j'aime l'idée que le mage puisse se blesser lui-même »). Cette règle remplace, pour la Boule de feu, la précision d'attaque de zone du doc 04 (−10 % de toucher par case), qui reste celle du Tromblon. Sur la carte actuelle (13 × 9), un rayon de 5 couvre 91 cases sur 117.
- **Anneau de feu** : un seul jet pour tous, alliés compris ; difficulté abaissée à 30 (Idan : « la chance de toucher me semble un peu faible »).
- **Arme enflammée** : les tours se décomptent au début de chaque activation de celui qui porte l'arme (le tour du lancer compte) ; elle ne se cumule pas. **Armure de feu** : même décompte ; elle protège du froid de l'école de l'Eau (Flèche de glace, Tsunami, Arme de glace) et réduit le Gel.
- **Flaque de magma** : ni passage ni arrêt sur la case (déplacements, charges, fuites) ; elle ne coupe pas la vue et ne fait pas de dégâts ; elle refroidit au début du tour indiqué.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Trait de feu | 30 (9–52) · portée 15 · 9 mana · 57 % | 40 · portée 17 · 9 · 81 % | 89 · portée 25 · 6 · 94 % |
| Boule de feu, au centre | 60 · rayon 3 · portée 7 · 27 mana · 17 % | 79 · rayon 4 · portée 8 · 25 · 33 % | 178 · rayon 5 · portée 11 · 17 · 87 % |
| Anneau de feu, par cible | 30 · 18 mana · 57 % | 40 · 17 · 81 % | 89 · 12 · 94 % |
| Arme enflammée, par coup | +22, 2 tours · 57 % | +28, 3 tours · 81 % | +63, 4 tours · 94 % |
| Armure de feu | +36 froid, 2 tours | +41, 3 tours | +56, 4 tours |
| Flaque de magma | 5 tours · 31 % | 6 tours · 59 % | 9 tours · 93 % |

### École de l'Eau (7 sorts, Idan, 2026-10-27)

**Objectif V1 (Idan, 2026-10-27) : 10 sorts mono-école par école.** La Vie, le Feu, la Transmutation, la Foudre, la Télékinésie et l'Illusion en ont 6, l'Eau 7 ; les autres viendront.

Même modèle que la Vie et le Feu (effet, mana, difficulté par palier, CC aux dés maximum, EC : le lanceur subit le minimum de son sort). L'élément de l'école est le **froid** : dégâts × (1 − protection contre le froid / 100), avec la valeur « glaçant » de l'armure (même règle que le feu). Données : `spells.json`.

| Sort | Palier | Action | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|---|
| Brouillard | Adepte (50) | principale | un rideau de **5 cases** qui coupe la ligne de vue pendant **3 tours, fixes** | centre à 2 + M/25 | 15 |
| Eau guérissante | Novice (30) | rapide | soin **1D3** (Soin rapide : 1D4) | allié ou soi, 2 + M/25 | 10 |
| Flèche de glace | Novice (30) | principale | 1D6 de froid, **comme une flèche** (le Trait de feu en froid) | 12 + M/10 | 10 |
| Tsunami | Adepte (50) | principale | **2D6 de froid** à tous ceux qui sont dans une ligne de **3 + M/50 cases, de 3 à 5**, alliés compris | part de la **case voisine** choisie | 25 |
| Armure de froid | Novice (30) | rapide | +(30 + M/5) de protection contre le **feu**, pendant 2 + M/50 tours | allié ou soi, 2 + M/25 | 10 |
| Gel | Adepte (50) | rapide | −(20 + M/5) en **Vitesse et en Dextérité**, pendant **1 + M/100 tours, au plus 2** (Idan : « 1 ou 2 tours ») | un ennemi à 1 + M/50 | 12 |
| Arme de glace | Novice (30) | rapide | +1D4 de froid à chaque coup qui touche (même sans blesser), pendant 2 + M/50 tours | la sienne ou celle d'un compagnon, 1 + M/50 | 12 |

- **Brouillard** (Idan : « bloque la ligne de vue et empêche de tirer ») : les 5 cases sont centrées sur la case visée, **en travers** de la direction du lanceur (le long de l'axe de la grille le plus perpendiculaire). Une case de brouillard coupe la ligne de vue comme un mur : personne ne tire ni ne lance de sort **à travers, depuis ou vers** une case de brouillard (Idan : il bloque aussi les sorts). Le corps à corps et les déplacements ne changent pas. Les cases hors de la carte sont perdues ; il se dissipe au début du tour indiqué. C'est la première chose qui coupe la ligne de vue (doc 04).
- **Tsunami** : ne s'évite pas ; la ligne part de la case voisine choisie et file droit devant (Idan : « 3 à 5 cases selon la maîtrise », dégâts de froid).
- **Gel** : le malus baisse avec la protection de la cible contre le froid (résistance, armure « glaçant », Armure de feu) : × (1 − protection / 100). Il compte **tout de suite** (Vitesse et Dextérité entrent dans le toucher, l'esquive des tirs, l'initiative et le mouvement : −15 en Vitesse ≈ une case de moins) et couvre les prochaines activations de la cible ; il tombe au début de l'activation suivante. Il ne se cumule pas.
- **Armure de froid** et **Arme de glace** : les miroirs de l'Armure de feu et de l'Arme enflammée (même décompte, ne se cumulent pas ; l'Arme de glace remplace l'Arme enflammée).
- **Eau guérissante** : l'IA du combat automatique s'en sert comme de Soin rapide, quand elle ne connaît pas ce dernier.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Brouillard | 5 cases, 3 tours · portée 3 · 14 mana · 31 % | portée 4 · 13 · 59 % | portée 7 · 9 · 93 % |
| Eau guérissante | 17 PV (9–26) · 9 mana · 57 % | 23 · 9 · 81 % | 51 · 6 · 94 % |
| Flèche de glace | 30 (9–52) · portée 15 · 9 mana · 57 % | 40 · portée 17 · 9 · 81 % | 89 · portée 25 · 6 · 94 % |
| Tsunami, par cible | 60 · 3 cases · 23 mana · 31 % | 79 · 4 cases · 21 · 59 % | 178 · 5 cases · 14 · 93 % |
| Armure de froid | +36 feu, 2 tours | +41, 3 tours | +56, 4 tours |
| Gel | −26, 1 tour · 1 case · 31 % | −31, 1 tour · 2 cases · 59 % | −46, 2 tours · 3 cases · 93 % |
| Arme de glace, par coup | +22, 2 tours · 57 % | +28, 3 tours · 81 % | +63, 4 tours · 94 % |

### École de la Transmutation (6 sorts, Idan, 2026-10-27)

Idan : « c'est un buffeur ». Tous les sorts sont des **actions rapides**, sur **un allié ou soi**, à **moyenne portée (3 + M/25)**, et durent **1 tour, 2 pour un maître (1 + M/100, au plus 2)**. Même modèle que les autres écoles pour le mana, la réussite et les critiques. Écoles opposées : Foudre et Invocation. Données : `spells.json`.

| Sort | Palier | Effet | Mana (base) |
|---|---|---|---|
| 6e sens | Adepte (50) | **+(20 + M/5) %** de Perception et de Dextérité | 12 |
| Force de titan | Novice (30) | **+(20 + M/5) %** de Force | 10 |
| Vitesse du guépard | Novice (30) | **+(20 + M/5) %** de Vitesse | 10 |
| Peau de pierre | Novice (30) | **+(10 + M/10) points** de Résistance physique | 10 |
| Crachat de venin | Adepte (50) | la cible peut **cracher du venin par une action rapide** (voir ci-dessous) | 12 |
| Cautérisation | Novice (30) | soin **1D3** (comme Eau guérissante) | 10 |

- **Pourcentages** : de la valeur de base, comme l'équipement ; ils comptent partout où la caractéristique compte (Force : dégâts au corps à corps ; Vitesse : mouvement, initiative, toucher et esquive des tirs ; Perception et Dextérité : toucher). **Peau de pierre** donne des points, comme la cape (la Résistance physique médiane n'est que de 5) : un point retire environ 1 % des dégâts physiques, dans la limite de 50.
- **Durée** : « 1 tour » = la prochaine activation de la cible ; si le lanceur se vise lui-même, c'est son activation en cours (Force de titan, puis frapper dans la foulée). Les sorts différents se cumulent ; le même sort relancé remplace le précédent.
- **Crachat de venin** : pendant les 1 ou 2 **prochaines** activations de la cible (même si le lanceur se vise : l'action rapide vient d'être prise), un bouton « Cracher du venin » : action rapide, un ennemi à **2 à 10 cases** (la Sarbacane), en ligne de vue. Toucher comme le Trait de feu, avec la **Maîtrise du lanceur** à la place des compétences d'arme ; **1D4 de poison** × la Puissance du lanceur, réduits par la Résistance au poison (l'armure ne compte pas). S'il blesse, la cible est **empoisonnée**.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| 6e sens, Force de titan, Vitesse du guépard | +26 %, 1 tour · portée 4 · 57 % (6e sens : 31 %) | +31 %, 1 tour · portée 5 · 81 % (59 %) | +46 %, 2 tours · portée 8 · 94 % (93 %) |
| Peau de pierre | +13 points, 1 tour | +15, 1 tour | +23, 2 tours |
| Crachat de venin, par crachat | 22 (9 de poison ensuite) · 31 % | 28 (12) · 59 % | 63 (26) · 93 % |
| Cautérisation | 17 PV · 9 mana · 57 % | 23 · 9 · 81 % | 51 · 6 · 94 % |

### Poison (Idan, 2026-10-27)

- Une cible **blessée** par du venin est **empoisonnée pendant 3 tours** (`combat.poison.turns`) ; un nouveau poison remplace l'ancien.
- Au **début de chacune de ses activations**, elle fait un **jet de résistance** : **D100 ≤ Constitution / 2 + Résistance au poison** (équipement compris, de 5 à 95 % ; `combat.poison.*`) **annule l'effet** (Idan : « un jet de résistance au poison au début du tour (constitution ?) »). Raté, elle subit des **dégâts légers** : le minimum du venin (dé à 1), réduit par sa Résistance au poison. La Résistance au poison progresse avec ces dégâts (doc 08).
- **Purge** (école de la Vie) retire le poison.
- **Fiole de poison** (Idan, 2026-10-29 ; doc 05) : action rapide, sur soi ; l'arme active est enduite pendant 3 tours, et chaque coup qui blesse, au corps à corps comme au tir, empoisonne : **10 PV par tour**, 3 tours, même jet de résistance. Avec une sarbacane enduite, le plus fort des deux poisons.

### École de la Foudre (6 sorts, Idan, 2026-10-27)

Même modèle que les autres écoles (effet, mana, difficulté par palier, CC aux dés maximum, EC : le lanceur subit le minimum de son sort). L'élément est la **foudre** : dégâts × (1 − protection contre la foudre / 100), avec la valeur « foudroyant » de l'armure, et le métal conduit : **plates −45**, mailles −30, brigandine −18 ; vêtements +5, gambison +15, écailles +25, cuir renforcé +28, cuir +30. **Portée moyenne des attaques** (Idan) : **6 + M/25, au plus 12**, comme la Boule de feu. Écoles opposées : Eau et Transmutation. Données : `spells.json`.

| Sort | Palier | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|---|
| Décharge électrique | Adepte (50) | principale | **2D8 de foudre**, sans jet de toucher | au contact | 20 |
| Éclair | Novice (30) | principale | 1D6 de foudre, **comme une flèche** (la Flèche de glace en foudre) | 12 + M/10 | 10 |
| Arme électrique | Novice (30) | rapide | +1D4 de foudre à chaque coup qui touche, pendant 2 + M/50 tours | la sienne ou celle d'un compagnon, 1 + M/50 | 12 |
| Boule d'éclairs | Expert (70) | principale | **2D6 de foudre** sur un ennemi, puis **4 rebonds** : 100, 80, 60, 40, 20 % | 6 + M/25, au plus 12 | 30 |
| Foudre | Adepte (50) | principale | **1D8 de foudre**, sans jet de toucher, **sans ligne de vue** | 6 + M/25, au plus 12 | 15 |
| Célérité | Novice (30) | rapide | **+(20 + M/5) %** de Vitesse, **sur soi seulement**, pendant **2 tours** (cette activation et la suivante) | soi | 10 |

- **Décharge électrique** (Idan : « au cac, mais gros dégâts ») : la main touche, pas d'esquive ; le plus gros sort sur une cible.
- **Boule d'éclairs** (Idan : 5 cibles, alliés compris) : ne s'évite pas ; après la cible, elle saute chaque fois sur le personnage en jeu le plus proche du précédent **pas encore touché**, à **3 cases au plus**, **alliés et lanceur compris** (à égalité, un ennemi du lanceur d'abord) ; s'il n'y a personne à 3 cases, la chaîne s'arrête. Chacun a sa propre protection contre la foudre. Les rebonds ne demandent pas la ligne de vue.
- **Foudre** : elle tombe du ciel ; elle passe le Brouillard (et, plus tard, le décor).
- **Célérité** : se cumule avec Vitesse du guépard (deux sorts différents) ; la relancer remplace la précédente.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Décharge électrique | 78 · 18 mana · 31 % | 102 · 17 · 59 % | 229 · 12 · 93 % |
| Éclair | 30 · portée 15 · 9 mana · 57 % | 40 · portée 17 · 9 · 81 % | 89 · portée 25 · 6 · 94 % |
| Arme électrique, par coup | +22, 2 tours · 57 % | +28, 3 tours · 81 % | +63, 4 tours · 94 % |
| Boule d'éclairs, première cible | 60 · portée 7 · 27 mana · 17 % | 79 · portée 8 · 25 · 33 % | 178 · portée 11 · 17 · 87 % |
| Foudre | 39 · portée 7 · 14 mana · 31 % | 51 · portée 8 · 13 · 59 % | 114 · portée 11 · 9 · 93 % |
| Célérité | +26 %, 2 tours · 57 % | +31 % · 81 % | +46 % · 94 % |

### École de la Télékinésie (6 sorts, Idan, 2026-10-28)

Une école de **contrôle** : elle déplace les gens sur la carte. Même modèle que les autres écoles pour le mana, la réussite et les critiques. Écoles opposées : Illusion et Feu. Données : `spells.json`.

**Dégâts contondants, qui passent par l'armure** (Idan : « ça passe par l'armure… c'est du contondant ») : l'étape **Blesser** d'un coup d'arme (doc 04), où la **Puissance magique** du lanceur tient le rôle de la Force et **0,2 × Maîtrise** celui des compétences d'arme, face à la **résistance contondante de l'armure** et à l'**Endurance** de la cible : Δ = Puissance magique + 0,2 × Maîtrise + puissance du sort − armure (contondant) − Endurance, P = 10 + 80 / (1 + e^(−Δ/20)), de 10 à 90 %. Si le coup blesse : l'effet du sort, réduit par la **Résistance physique** (avec sa variation D3, comme une arme). Les dés ont pris un cran (Idan : « augmente un peu les dégâts si besoin ») pour compenser l'armure. Le contondant fait progresser la Résistance physique de la cible.

| Sort | Palier | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|---|
| Attraction | Adepte (50) | principale | **1D6** contondant (puissance 25), puis la cible est **tirée de 2 + M/50 cases** vers le lanceur, jusqu'à son contact | **12 + M/10** (grande portée) | 15 |
| Projection | Novice (30) | principale | **1D8** contondant (puissance 35), puis la cible est **repoussée de 2 + M/50 cases** dans l'axe lanceur → cible | 6 + M/25, au plus 12 | 12 |
| Déplacement | Novice (30) | rapide | un allié ou un ennemi est **déplacé d'une case**, sur une case libre voisine choisie (deux clics : la cible, puis la case) | 6 + M/25, au plus 12 | 8 |
| Entrechoc | Adepte (50) | principale | **deux ennemis côte à côte** (deux clics) : **2D8** contondant (puissance 55) **à chacun**, chacun avec son armure | 6 + M/25, au plus 12 | 20 |
| Champ de protection | Adepte (50) | principale | sur soi ou un allié, pendant **4 tours** : chaque **projectile** a **50 %** de chances d'être **dévié** | 3 + M/25 | 15 |
| Lancer de pierre | Novice (30) | rapide | un tir de **fronde** : jet de toucher comme le Trait de feu, puis **1D6** contondant (puissance 25, la Fronde) | **2 à 14** (la Fronde) | 6 |

- **Déplacement forcé** (Attraction, Projection, Déplacement) : jamais d'attaque d'opportunité. La cible suit les cases jusqu'au premier **obstacle** (un personnage, une flaque de magma, le bord du terrain) ; l'obstacle l'arrête et lui inflige un **choc** (Idan : « dégâts en plus ») : **1D4** contondant, qui passe lui aussi par l'armure. L'Attraction s'arrête au contact du lanceur, sans choc. Si la cible meurt du coup, elle ne bouge pas.
- **Champ de protection** (Idan : il dévie aussi les sorts) : avant le jet de toucher, 50 % de dévier les tirs d'armes (arcs, frondes, armes à feu, contre-charges au tir) et les sorts qui volent comme une flèche (Trait de feu, Flèche de glace, Éclair, Lancer de pierre, crachat de venin). Il dure 4 tours : jusqu'au début du 4e tour suivant le lancer. Il ne gêne ni la Foudre, ni les zones, ni la Décharge.
- **Lancer de pierre** en action rapide : il se combine avec un sort principal dans le même tour.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Attraction | 30 · tirée de 2 cases · portée 15 · 31 % | 40 · 3 cases · portée 17 · 59 % | 89 · 4 cases · portée 25 · 93 % |
| Projection | 39 · repoussée de 2 cases · 57 % | 51 · 3 cases · 81 % | 114 · 4 cases · 94 % |
| Entrechoc, à chacun | 78 · 18 mana · 31 % | 102 · 17 · 59 % | 229 · 12 · 93 % |
| Lancer de pierre | 30 · 6 mana · 57 % | 40 · 5 · 81 % | 89 · 4 · 94 % |
| Chance de blesser, Projection (sans armure / cuir / plates) | 82 / 78 / 56 % | 84 / 80 / 61 % | 89 / 88 / 82 % |

### École de l'Illusion (6 sorts, Idan, 2026-10-28)

L'école du **moral** : elle joue sur le test de Courage du combat (doc 04, Courage post-attaque). La **Volonté** du mage y compte (Idan : « ici, c'est la force mentale » ; le Charisme ira à l'Invocation et à la Nécromancie). Même modèle que les autres écoles pour le mana, la réussite et les critiques. Écoles opposées : Vie et Télékinésie. Données : `spells.json`.

| Sort | Palier | Action | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|---|
| Peur | Expert (70) | principale | chaque **ennemi** de la zone fait un **test de Courage** ; raté, il prend la **fuite** | centre à 6 + M/25 (au plus 12), rayon **2 + M/50, de 2 à 3** | 30 |
| Soutien illusoire | Novice (30) | rapide | **+(30 + M/5) de Courage** pendant **2 tours** | un allié ou soi, **12 + M/10** (grande portée) | 10 |
| Courage de masse | Adepte (50) | principale | **+(20 + M/5) de Courage** aux alliés de la zone, lanceur compris, pendant **2 + M/50 tours (2 à 3)** | centre à 6 + M/25, rayon 2 à 3 | 20 |
| Avancée cachée | Adepte (50) | principale | **+(40 + M/5) de Discrétion** (massif) aux alliés de la zone, lanceur compris, pendant 2 à 3 tours | centre à 6 + M/25, rayon 2 à 3 | 20 |
| Choc psychique | Novice (30) | principale | **1D6** × **Volonté du mage / Volonté de la cible** (de × 0,5 à × 2), **comme une flèche** ; ni armure ni résistance | 6 + M/25, au plus 12 | 10 |
| Frénésie | Adepte (50) | rapide | pendant les **2 prochaines activations** de la cible : elle **joue seule**, **+10 % de Force**, **plus de peur** | un allié, un ennemi ou soi, 2 + M/25 | 15 |

- **Peur** : le test de Courage d'après une attaque, la **Maîtrise et la Volonté du mage** tenant le rôle de l'Intimidation de l'adversaire : tenir = Courage + aura + Volonté / 4 − (Maîtrise + Volonté du mage) / 4, de 5 à 95 %. Raté : En fuite, avec le mouvement de fuite immédiat et la reprise de contrôle habituels. Un ennemi déjà en fuite ou en frénésie ne teste pas ; les alliés de la zone ne sont pas touchés. Un ennemi avec Courage 50 et Volonté 50 tient à 42 % face à un débutant, 35 % face à une recrue, 12 % face à un expert.
- **Soutien illusoire**, **Courage de masse** : des points de Courage, qui comptent aussi pour reprendre ses esprits en fuite. Sur le lanceur, l'activation en cours compte comme la première.
- **Avancée cachée** : la Discrétion sert au camouflage (doc 04) : sous le sort, un mercenaire est bien plus dur à repérer.
- **Choc psychique** : un projectile ; le Champ de protection peut le dévier.
- **Frénésie** (Idan : la cible joue seule) : à chacune de ses activations, joueur ou ennemi, elle prend une arme de mêlée si l'autre set en a une, puis frappe au contact, charge, ou fonce sur l'ennemi le plus proche ; jamais de tir ni de sort. Elle ne fait plus aucun test de Courage, et une cible en fuite s'arrête de fuir. Ses 2 prochaines activations, même si le lanceur se vise lui-même.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Peur | rayon 2 · portée 7 · 27 mana · 17 % | rayon 3 · portée 8 · 25 · 33 % | rayon 3 · portée 11 · 17 · 87 % |
| Soutien illusoire | +36, 2 tours · portée 15 · 57 % | +41 · portée 17 · 81 % | +56 · portée 25 · 94 % |
| Courage de masse | +26, 2 tours · 31 % | +31, 3 tours · 59 % | +46, 3 tours · 93 % |
| Avancée cachée | +46 Discrétion, 2 tours | +51, 3 tours | +66, 3 tours |
| Choc psychique, à Volonté égale | 30 · 9 mana · 57 % | 40 · 9 · 81 % | 89 · 6 · 94 % |
| Frénésie | portée 3 · 14 mana · 31 % | portée 4 · 13 · 59 % | portée 7 · 9 · 93 % |

### École de la Nécromancie (6 sorts, Idan, 2026-10-28)

Le **Charisme** du mage y compte (Idan : l'Invocation et la Nécromancie en dépendent) : il garde ses invocations et fixe la force du zombie. Même modèle que les autres écoles pour le mana, la réussite et les critiques. Écoles opposées : Vie et Invocation. Données : `spells.json` (colonnes `entretien_mana` et `creature`), `summon-archetypes.json` (le spectre), constantes `magic.summon.*`.

| Sort | Palier | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|---|
| Résurrection | Adepte (50) | principale | un **combattant mort**, allié ou ennemi, se relève en **zombie** de votre camp, avec **(Maîtrise + Charisme) / 2 %** (de 10 à 100 %) de ses caractéristiques, compétences et PV ; il garde son arme et son armure | 1 (le corps) | 30, puis **5 par tour** |
| Invocation de spectre | Adepte (50) | principale | un **spectre** apparaît sur une case libre | 1 | 25, puis **5 par tour** |
| Drain de vie | Novice (30) | rapide | sur soi, pendant **2 + M/50 tours (2 à 3)** : il récupère **50 %** des PV que ses coups d'arme au corps à corps retirent | soi | 10 |
| Flèche de mort | Novice (30) | principale | **1D6** de dégâts **nécrotiques**, **comme une flèche** | 6 + M/25, au plus 12 | 10 |
| Nécrose | Adepte (50) | principale | **2D8** de dégâts **nécrotiques**, sans jet de toucher | 1 (contact) | 20 |
| Flétrissement | Novice (30) | principale | la cible ne peut plus être **soignée** ni récupérer de PV, pendant **3 + M/100 tours (3 à 4)** | 6 + M/25, au plus 12 | 15 |

- **Invocations** (zombie, spectre ; l'Invocation suivra les mêmes règles, Idan) : le **joueur** les joue, avec leur propre activation dans l'ordre du tour, dès le tour suivant ; en combat automatique, l'IA. Au **début de chaque tour**, le mage les garde : **test de Charisme** = la formule de réussite d'un sort, le Charisme à la place de l'Intelligence, difficulté **30**, sans l'armure ; raté, l'invocation **disparaît** (le zombie tombe en poussière). Puis l'**entretien** : 5 × (1 − Maîtrise / 300) mana, au moins 1 ; sans assez de mana, elle disparaît aussi. Elles disparaissent aussitôt quand le mage est hors combat ou quitte la carte, et à la fin du combat : ni XP ni bilan. Comme tout le monde, une invocation arrive **camouflée** (doc 04) ; le repérage du début de tour fait le reste. Une meute (Invocation) comptera pour une seule invocation : un test, un entretien.
- **Résurrection** : sur le corps d'un combattant mort resté sur la carte, sur lequel personne ne se tient ; un corps ne se relève qu'une fois, et une invocation ne laisse pas de corps. **Un allié relevé ne survit pas au combat** : son jet de mort de fin de mission est forcément raté (Idan : « pas toujours cool d'avoir un collègue nécromancien ! »). Le zombie est un **mort-vivant** : la Restitution le blesse, les dégâts nécrotiques ne le touchent pas, et il ne fait **aucun test de Courage**.
- **Spectre** (archétype fixe, Idan : « à peu près les stats d'un gobelin ») : guerrier gobelin novice, **Vitesse 65** (6 cases), **Volonté 50**, **100 PV**, sans arme ni armure. **Immunisé aux dégâts physiques** : armes, tirs, sorts contondants ; la magie élémentaire, le psychique et la Restitution le touchent. **Toucher spectral** : jet de toucher au contact, puis **1D6 de dégâts psychiques** × sa Volonté / celle de la cible (de × 0,5 à × 2), sans Blesser, ni armure ni résistance (≈ 35 à Volonté égale). Mort-vivant, sans peur.
- **Dégâts nécrotiques** (Flèche de mort, Nécrose) : ils **traversent l'armure et les résistances**, sans la Volonté ; **sans effet sur les morts-vivants** (on ne peut pas les viser ; une flèche égarée ne leur fait rien). La Flèche de mort est un projectile : le Champ de protection peut la dévier.
- **Drain de vie** : seulement les coups d'arme au corps à corps du mage, pas les tirs ni les sorts ; les PV retirés comptent jusqu'à zéro (pas la profondeur sous zéro). Sur soi, l'activation en cours compte comme la première.
- **Flétrissement** : aucun soin (sorts de soin, Régénération, Drain de vie, potion de soins) pendant les 3 ou 4 prochaines activations de la cible.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Résurrection | zombie à 33 % · 27 mana · 31 % | 55 % · 25 · 59 % | 100 % · 17 · 93 % |
| Invocation de spectre | 23 mana · 31 % | 21 · 59 % | 14 · 93 % |
| Garder une invocation, chaque tour | 57 % · 5 mana | 81 % · 5 | 94 % · 3 |
| Drain de vie | 2 tours · 9 mana · 57 % | 3 tours · 9 · 81 % | 3 tours · 6 · 94 % |
| Flèche de mort | 30 · portée 7 · 9 mana · 57 % | 40 · 8 · 9 · 81 % | 89 · 11 · 6 · 94 % |
| Nécrose | 78 · 18 mana · 31 % | 102 · 17 · 59 % | 229 · 12 · 93 % |
| Flétrissement | 3 tours · portée 7 · 14 mana · 57 % | 3 tours · 8 · 13 · 81 % | 4 tours · 11 · 9 · 94 % |

(Charisme supposé égal à l'Intelligence : 35 / 53 / 73.)

### École de l'Invocation (6 sorts, Idan, 2026-10-28)

**Mêmes règles d'invocation que la Nécromancie** (Idan) : le joueur joue ses créatures dès le tour suivant ; chaque tour, test de **Charisme** (difficulté 30) et entretien en mana, sinon elles disparaissent ; elles disparaissent aussi quand le mage tombe. Contrairement aux morts-vivants, les créatures font leurs **tests de Courage et peuvent fuir** (Idan). Une **meute** (loups, ours, crocodiles) compte pour **une seule invocation** : un test, un entretien ; raté, toute la meute disparaît ; chacun se déplace de son côté. Les créatures apparaissent sur la case choisie, voisine du mage, puis sur les cases libres les plus proches (moins de créatures s'il n'y a plus de place). Écoles opposées : Transmutation et Nécromancie. Données : `spells.json` (colonnes `invocation_nb_des`, `invocation_de`, `invocation_pas_maitrise`), `summon-archetypes.json`.

| Sort | Palier | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|---|
| Corbeau | Novice (30) | principale | un **corbeau** | 1 | 10, puis **2 par tour** |
| Bourbier | Novice (30) | principale | une case devient un **bourbier** pendant **2 + M/50 tours (2 à 3)** : qui s'y trouve ou y entre, allié ou ennemi, **ne peut plus se déplacer** | 6 + M/25, au plus 12 | 10 |
| Transposition | Novice (30) | rapide | le mage **échange sa place** avec une de ses invocations | partout, sans ligne de vue | 8 |
| Invocation de loups | Adepte (50) | principale | **1D6 loups, +1 par tranche de 50 de Maîtrise** (Idan : « le 1D6 peut évoluer ») | 1 | 25, puis **5 par tour** |
| Invocation d'ours | Expert (70) | principale | **1D3 ours** | 1 | 30, puis **6 par tour** |
| Invocation de crocodiles | Expert (70) | principale | **1D3 crocodiles** | 1 | 30, puis **6 par tour** |

| Créature | Déplacement | PV | Attaque (dégâts moyens) | Particularités |
|---|---|---|---|---|
| Corbeau (Vitesse 100) | 8 cases | 25 | Bec 1D3, ≈ 6 | Discrétion 95 (Idan : « on le voit, mais personne n'y prête attention »), Perception 85, Esquive 80 |
| Loup (Vitesse 70) | 6 cases | 60 | Morsure 1D6, ≈ 25 | Perception 70 (flair) |
| Ours (Vitesse 20) | 3 cases | 250 | Griffes 1D8, ≈ 77 | Force 85, Résistance physique 20 |
| Crocodile (Vitesse 10) | 2 cases | 200 | Mâchoires 2D8, ≈ 126 | Discrétion 90, Résistance physique 25 |

- Les autres valeurs des créatures sont celles du guerrier gobelin novice (`summon-archetypes.json`) ; leur arme naturelle passe par les règles des armes (Toucher, Blesser, puissance contre l'armure).
- **Corbeau** : l'éclaireur. Il fait comme tout le monde son test de repérage au début de chaque tour, avec sa Perception de 85 : un ennemi camouflé qu'il repère est vu de toute l'armée, pour toute la partie (doc 04). Il servira encore plus avec le brouillard de guerre.
- **Bourbier** : on peut entrer dans la case (c'est la fin du chemin), pas la traverser ni en sortir ; on y attaque et on y lance des sorts. La fuite est bloquée aussi. Les déplacements forcés (Télékinésie) ne sont pas arrêtés.
- **Transposition** : pas un déplacement : aucune attaque d'opportunité.
- **Élémentaire** : plus tard, comme sort combiné aux éléments (Idan).

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Corbeau | 9 mana, entretien 2 · 57 % | 9, 2 · 81 % | 6, 2 · 94 % |
| Bourbier | 2 tours · portée 7 · 9 mana · 57 % | 3 tours · 8 · 9 · 81 % | 3 tours · 11 · 6 · 94 % |
| Transposition | 8 mana · 57 % | 7 · 81 % | 5 · 94 % |
| Loups | 1D6 · 23 mana, entretien 5 · 31 % | 1D6 + 1 · 21, 5 · 59 % | 1D6 + 2 · 14, 3 · 93 % |
| Ours, Crocodiles | 1D3 · 27 mana, entretien 6 · 17 % | 1D3 · 25, 5 · 33 % | 1D3 · 17, 4 · 87 % |
| Garder une invocation, chaque tour | 57 % | 81 % | 94 % |

### Mana

- Le **Mana actuel** se dépense en combat et se **recharge chaque jour au camp** : **Réserve de mana × (10 + Volonté / 2) %** par jour (Volonté 52 : 36 % par jour, plein en 3 jours). Rien pendant les trajets.

### Écoles : progression et régression

Chaque gain dans une école fait perdre **la moitié de ce gain**, partagée à parts égales entre ses **deux écoles opposées** (un quart chacune), comme les armes (doc 08).

**XP de la magie** (étape 3, Idan, 2026-10-25), calquée sur les armes : le sort joue le rôle de l'arme, son école celui de la catégorie. À chaque lancer, même raté :

- **+10 XP** au sort et à son école ; **+5** de plus si le sort réussit ; **+5** de plus s'il a un **vrai effet** (PV soignés, dégâts qui passent la protection, effet posé, poison purgé) ;
- les deux écoles opposées perdent chacune **un quart** de l'XP gagnée par l'école ; une école ne descend pas sous 1 (la valeur d'un mercenaire sans l'école) ;
- les **sorts ne régressent pas** ; même courbe que les compétences (XP = 10 × niveau², niveau continu), plafond 100 ;
- **Puissance magique** : +20 XP par sort réussi qui a un vrai effet ; **Réserve de mana** : +2 XP par point de mana dépensé, même si le sort rate ;
- **Chance et réputation** : les critiques des sorts comptent comme ceux des armes (Chance : coup critique −5 XP, échec critique confirmé +30 XP ; réputation : +1 / −1) ;
- appliquée **en fin de mission** avec le reste de l'XP naturelle, et montrée dans le bilan (« Sort Soin rapide +45 », « Écoles opposées −11 »).

Les sorts prêtés par le bouton « Sorts (test) » ne sont pas dans le grimoire : leur XP s'affiche dans le bilan sans être gardée ; l'XP de leur école, elle, compte.

Rythme (≈ 18 XP par lancer : 85 % de réussite, effet presque toujours réel) : un sort passe du niveau 1 au niveau 10 en ≈ 55 lancers, au niveau 20 en ≈ 220, au niveau 50 en ≈ 1 400 ; Vie 31 → 32 en ≈ 35 lancers, Vie 56 → 57 en ≈ 63 (une arme à 40 demande ≈ 48 attaques pour un point).

Avec les sorts, deux règles déjà écrites (doc 08) s'appliquent enfin : **Constitution** (+1 XP par PV réellement rendu, au mercenaire soigné) et **Résistances** (chaque brûlure qui passe la protection : +8 XP en Résistance au feu, −2 aux quatre autres). Le lanceur compte aussi les adversaires qu'il blesse ou met hors combat avec un sort ou une arme enflammée, comme avec un coup d'arme (Charisme, réputation).

### Sorts connus à la création

À la création d'un mercenaire, **capitaine compris**, trois tirages, dans cet ordre :

1. un sort de l'**école de sa culture** (tableau ci-dessous) ;
2. un sort de l'école où il est **le meilleur** ;
3. un sort de sa **deuxième meilleure** école.

- Chance de chaque tirage : **École × Intelligence / 150** %, au plus 75 %. Sans l'école (valeur 1), la chance est presque nulle.
- La chance **monte légèrement** pour les sorts suivants : × 1 pour le premier sort obtenu, **× 1,1** pour le deuxième, **× 1,3** pour le troisième (un mercenaire doué en apprend plus facilement un autre).
- Le sort est tiré au hasard parmi tous les sorts de l'école. Si l'école de la culture est aussi sa n°1 ou sa n°2, il peut apprendre **deux sorts de cette école** (jamais deux fois le même) ; si l'école n'a plus de sort disponible, le tirage ne donne rien.
- Un sort connu à la création démarre au **niveau 1**.
- Les cultures **sans école** n'ont que les deux derniers tirages. En compensation : **Nains des montagnes** et **Nains réduits en esclavage dans les colonies** : **+1D6 Courage** à la création ; **Ogres des cités humaines** et **Ogres des montagnes** : **+1D6 Force**.

| École | Cultures |
|---|---|
| Eau | Tribus nordiques, Reptiliens des marécages, Elfes des grandes cités |
| Feu | Clans des grandes steppes, Steppes désertiques, Ogres des steppes |
| Foudre | Elfes noirs, Nains du chaos |
| Vie | Elfes sylvains, Cités libres, Royaumes du Soleil Levant |
| Nécromancie | Tribus des forêts anciennes, Gnomes des cavernes, Montagnes du Nord |
| Illusion | Halflings des villages isolés, Gobelins des villes, Gnomes des forêts, Gnomes des villes |
| Invocation | Explorateurs, Gobelins des cavernes, Reptiliens des cités-temples |
| Transmutation | Tribus de la jungle, Orcs noirs, Orcs des villes, Orcs des steppes |
| Télékinésie | Reptiliens des villes, Halflings des cités humaines, Caravanes de ferrailleurs |
| Aucune | Nains des montagnes, Nains réduits en esclavage dans les colonies, Ogres des cités humaines, Ogres des montagnes |

Simulation (6 000 recrues, tous les sorts supposés écrits) : 48 % ne connaissent aucun sort, 36 % un, 13 % deux, 2,9 % trois (cible d'Idan : 50 / 35 / 12,5 / 2,5). Tant qu'une école n'a pas de sort écrit, un tirage dans cette école ne donne rien.

**Branché** (étape 4) : le générateur fait les tirages pour chaque recrue, l'escouade de départ et le capitaine (`game-core/mercenary-generator.js`, tirages gardés dans la trace de génération ; données : `cultures.json`, colonnes `ecole_magie` et `compensation_sans_ecole` ; constantes `generation.spells.*`). La chance maximale de 75 % s'applique avant le multiplicateur du rang (au plus 97,5 % pour un troisième sort). Tests : `tests/starting-spells.test.js` (avec six sorts fictifs par école : 48 / 36 / 13 / 2,9 %). Aujourd'hui, seules la Vie et le Feu ont des sorts : **environ une recrue sur neuf** connaît un sort en arrivant. Les sorts connus apparaissent dans le grimoire et dans la barre de sorts en combat, sans bouton de test ; le bouton « Sorts (test) » prête les autres au niveau 1, sans remplacer le niveau d'un sort déjà connu.

L'école de culture n'est **pas garantie** à la création : une recrue sur deux des cultures que la génération ne pousse pas dans leur école (Cités libres, Royaumes du Soleil Levant, Steppes désertiques, Ogres des steppes, Nains du chaos, Orcs des villes, Orcs des steppes, Caravanes de ferrailleurs) n'a pas l'école, et sa chance au tirage de culture est presque nulle. Voulu : « tout le monde ne doit pas être mage » (Idan, 2026-10-25).

Plus tard : une **école de magie** à construire au camp et des **manuels** à trouver pour apprendre les autres sorts.

### Mise en place

1. **Étape 1** — ces décisions, `spells.json`, les règles des sorts (`game-core/magic.js`) et leurs tests (`tests/magic.test.js`) : Soin rapide, puis les six sorts de l'école de la Vie.
2. **Étape 2** — les sorts dans l'écran de combat actuel, **pour tester** (Vie, puis Feu, Eau, Transmutation, Foudre, Télékinésie, Illusion, Nécromancie et Invocation ; le bouton de test s'appelle désormais « Sorts (test) » et donne tous les sorts écrits) (Idan, 2026-10-25 ; l'interface de combat sera refaite) : une barre de sorts pour le mercenaire actif (action, mana, réussite) ; les cases ciblables en vert (alliés et lanceur, ou toutes les cases à portée pour Soin de masse) ; le journal ; la Régénération au début des activations ; le mana affiché dans la liste des équipes ; un bouton **« Sorts de Vie (test) »** : toute l'escouade connaît les six sorts (niveau 1) pour ce combat, sans toucher au grimoire, le mana étant bien dépensé ; une IA simple, aussi en combat automatique : Soin profond sur l'allié le plus blessé sous 35 % de ses PV à la place de l'attaque, Soin rapide sous 60 %.
3. Étape 3 — **recharge du mana au camp** (faite avec l'étape 2, pour pouvoir tester d'un combat à l'autre), **XP du sort et de l'école, régression des écoles opposées**, XP de la Puissance magique, de la Réserve de mana et de la Chance (faite, voir « Écoles : progression et régression »).
4. Étape 4 — **sorts connus à la création** et **compensations des nains et des ogres** (faite, voir « Sorts connus à la création »).

## Architecture d'un sort

Principes d'origine (avant les décisions du 2026-10-25). Le **prérequis d'école a été retiré** par Idan le 2026-10-25 : on peut connaître et lancer un sort sans minimum dans son école ; le jet d'incantation et l'efficacité suivent les formules des décisions ci-dessus.

### Apprentissage au camp

- Un sort nécessite un **entraînement pendant une certaine durée** au camp.
- Chaque sort possède une **École de magie** et un **prérequis minimum de compétence dans cette école**.
- Si le prérequis est atteint, l'apprentissage possède un **taux de réussite dépendant notamment de l'Intelligence**.
- La maîtrise de l'école et la maîtrise / connaissance du sort exact restent deux notions distinctes.

Schéma fonctionnel : `eligible = school_mastery >= spell.school_requirement`, puis `P_learn = f(Intelligence, school_mastery, spell.learning_difficulty)`.

### Incantation en combat

- Il faut pouvoir **payer le coût en mana** du sort.
- Le lancement nécessite ensuite un **jet d'incantation** basé au minimum sur la maîtrise de l'école + Intelligence, opposées à la difficulté propre du sort.
- Le système doit permettre des sorts extrêmement puissants mais **presque impossibles à lancer** pour un mage insuffisamment compétent.

Schéma : `can_attempt = current_mana >= mana_cost && school_mastery >= spell.school_requirement`, puis `P_cast = f(school_mastery, Intelligence, spell.cast_difficulty)`.

### Efficacité

Une fois le sort lancé, sa **Puissance magique** détermine principalement son efficacité : dégâts, soins, durée, intensité, etc. Réussir une boule de feu ne garantit donc pas qu'elle soit plus chaude qu'un radiateur médiocre.

Schéma : `SpellEffect = f(spell.base_effect, PuissanceMagique, spell_mastery?)`.

## Écoles opposées

Chaque école a deux écoles opposées (`skills.json`, colonne `ecoles_opposees`) ; les oppositions forment une seule boucle de neuf écoles, que la fiche mercenaire dessine en roue.

- Un mercenaire **peut être bon dans deux écoles opposées** : elles coexistent, la génération ne les exclut pas (Idan, 2026-10-21).
- En revanche, **quand il progresse dans une école, il baisse dans ses opposées** (Idan, 2026-10-21), dans l'esprit de « on progresse au détriment des autres » des armes (doc 08) : la moitié du gain, partagée entre les deux opposées (Idan, 2026-10-25 ; voir « Décisions du 2026-10-25 »).
- **Bagues de magie** (Idan, 2026-10-24) : une par école ; +10 à +25 % de la maîtrise de base de l'école, −15 à 0 % de celle des deux écoles opposées selon le tier (doc 05 « Bagues »).

## Premier catalogue de sorts — idées mono-école

### Feu

- **Flèche de feu** — monocible.
- **Boule de feu** — zone.
- **Arme de feu** — dégâts supplémentaires + composante feu.
- **Armure de feu** — protection contre le froid.
- **Flaque de magma** — transforme une case en lave / terrain infranchissable pendant X tours.

### Eau / Glace

Remplacé par l'**École de l'Eau** d'Idan (2026-10-27, ci-dessus) : Brouillard, Eau guérissante, Flèche de glace, Tsunami, Armure de froid, Gel, Arme de glace.

### Foudre

Remplacé par l'**École de la Foudre** d'Idan (2026-10-27, ci-dessus) : Décharge électrique, Éclair, Arme électrique, Boule d'éclairs, Foudre, Célérité.

### Illusion

Remplacé par l'**École de l'Illusion** d'Idan (2026-10-28, ci-dessus) : Peur, Soutien illusoire, Courage de masse, Avancée cachée, Choc psychique, Frénésie. L'idée de la **Création de double** reste en réserve.

### Nécromancie

Remplacé par l'**École de la Nécromancie** d'Idan (2026-10-28, ci-dessus) : Résurrection, Invocation de spectre, Drain de vie, Flèche de mort, Nécrose, Flétrissement.

### Vie

École écrite le 2026-10-25 : voir « École de la Vie » plus haut (Soin rapide remplace Premiers soins). Idées d'origine :

- **Premiers soins** — soin monocible.
- **Soins de masse** — soin de zone.
- **Régénération** — soin progressif sur plusieurs tours.

### Télékinésie

Remplacé par l'**École de la Télékinésie** d'Idan (2026-10-28, ci-dessus) : Attraction, Projection, Déplacement, Entrechoc, Champ de protection, Lancer de pierre. L'idée du **Lancer d'arme** (projeter l'arme de CAC équipée puis la ramener) reste en réserve.

### Transmutation

Remplacé par l'**École de la Transmutation** d'Idan (2026-10-27, ci-dessus) : 6e sens, Force de titan, Vitesse du guépard, Peau de pierre (Résistance physique), Crachat de venin, Cautérisation.

### Invocation

Remplacé par l'**École de l'Invocation** d'Idan (2026-10-28, ci-dessus) : Corbeau, Bourbier, Transposition, Invocation de loups, d'ours et de crocodiles. L'**Élémentaire** viendra plus tard, comme sort combiné aux éléments.

## Cas de test futurs

Ce catalogue couvre déjà les principaux besoins du futur moteur : monocible, zone, enchantement d'arme, protection, terrain persistant, obstacle destructible, rebond, CAC magique, soin, soin sur durée, déplacement forcé, contrôle et invocation.