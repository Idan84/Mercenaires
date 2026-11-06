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

- **Réussite = 10 + 85 / (1 + e^(−Δ/15))**, avec **Δ = (Maîtrise + Intelligence) / 2 − 30** (constantes `magic.cast.*`). Au plus 95 %.
- **Une seule difficulté pour tous les sorts** (Idan, 2026-11-01 : pas de paliers ni de niveau minimal) : sans armure, un débutant (maîtrise 31,5, Intelligence 35) réussit **57 %** de ses sorts, une recrue moyenne (56,5 et 53) **81 %**, un expert (134 et 73) **94 %**, quel que soit le sort. Un gros sort ne se distingue que par **son effet, sa zone et son mana**, qui montent avec le niveau de l'école (la maîtrise) et la Puissance magique : de débutant à expert, l'effet est multiplié par près de 3.
- **Armure** : l'**Altération magique** de l'armure portée se retire **en points** de la réussite (Vêtements 0, Gambison 2, Cuir 5, Cuir renforcé 10, Écailles 12, Brigandine 20, Mailles 25, Plates 45), × le multiplicateur de malus de sa qualité (Usée × 1,2 ; De bonne facture × 0,8 ; De luxe × 0,6). Jamais sous 0. Un mage en plates reste un pari toute la partie. Les boucliers ont le même champ, encore vide : ils ne gênent pas pour l'instant.
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

### École de la Vie (10 sorts, Idan, 2026-10-25 et 2026-10-31)

Même modèle que Soin rapide : **Effet = 10 × dés × (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100)**, **mana = base × (1 − Maîtrise / 300)** ; seuls les dés, l'action, la portée, la durée, la zone et le mana de base changent ; la réussite est la même pour tous les sorts. **Coup critique** : dés au maximum. **Échec critique** : le lanceur subit l'effet minimum de son sort (dés à 1). Action **principale** = l'action d'attaque du tour : un mage peut cumuler, dans le même tour, une action rapide et une action principale (par exemple Purge puis Soin profond). Données : `spells.json`.

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
| Délivrance | rapide | allié ou soi | retire **la peur (fin de la fuite), la paralysie, le gel et la frénésie**, et depuis l'Illusion **le sommeil, le désespoir et le brouillage mental** ; pas de coup critique | 2 + M/25 | 10 |
| Lumière sacrée | principale | une case | **1D10** à **chaque mort-vivant** d'un cercle de **rayon 1 + M/50 (au plus 3)**, les nôtres compris ; ignore armure, résistances et blocage | centre à 2 + M/25 | 30 |

*M = Maîtrise ; portées, durées et rayons arrondis à l'inférieur ; toujours en ligne de vue.*

- **Soin profond** soigne près de trois fois plus que Soin rapide pour deux fois plus de mana et l'action principale ; le soigneur doit aller au contact au début : c'est le prix du gros soin.
- **Régénération** garde la Puissance et la maîtrise du lancer ; elle **ne se cumule pas** : la relancer remplace la précédente. Coup critique : dé au maximum à chaque tour.
- **Soin de masse** : rayon 1 = 7 cases, 2 = 19, 3 = 37.
- **Restitution** attend les morts-vivants pour servir en combat ; **Purge** retire le poison du Crachat de venin (école de la Transmutation).
- **Icônes** (Idan, 2026-10-25) : un parchemin par sort sous un **cadre commun à l'école** (vert, lianes et émeraudes pour la Vie), superposés dans le jeu : barre de sorts du combat et grimoire de la fiche. Masters : `assets-src/Sorts/Vie/` ; `scripts/build-spells.sh` détoure le centre du cadre (accord d'Idan) et produit les versions du jeu.
- **Les quatre sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts.
- **Bénédiction** : la Chance fait les coups critiques (Chance / 10 %) et confirme moins d'échecs critiques ; en points plutôt qu'en pourcentage, sinon le bonus serait trop faible (Chance médiane d'une recrue : 55, soit 5,5 % de critiques ; bénie par une recrue moyenne : 11 %). Ne se cumule pas ; sur soi, l'activation en cours compte comme la première.
- **Lien de vie** : le lanceur ne donne **que ce qu'il faut** pour remonter l'allié (au plus le résultat des dés) et **garde toujours 1 PV** ; sur un allié flétri, il ne donne rien (`magic.lifeLink`). Ce n'est pas une blessure : pas de résistance.
- **Délivrance** : sans cible s'il n'y a rien à retirer (comme Purge sans poison) ; la frénésie emporte son bonus de Force. Liste dans `spells.json` (`retire`) : on y ajoute les états à venir au fil des écoles (Sommeil, Désespoir et Brouillage mental depuis l'Illusion).
- **Lumière sacrée** : les vivants du cercle n'ont rien ; nos zombies et squelettes y passent aussi.
- **Infobulle du grimoire** (Idan, 2026-10-30 : « on doit savoir à qui il sert, combien de mana il utilise ») : au survol d'un sort de la fiche, sa description (la cible et l'action y sont), puis ses chiffres pour ce mercenaire, maîtrise et équipement compris, les mêmes qu'en combat : mana, réussite, portée, soins ou dégâts, bonus, durée, zone (`prototype-web/ui.js`, `spellTip` ; test : `tests/magic.test.js`).

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

### École du Feu (10 sorts, Idan, 2026-10-25 et 2026-10-31)

Même modèle que la Vie (effet, mana, CC aux dés maximum, EC : le lanceur subit le minimum de son sort). Données : `spells.json`.

**Dégâts de feu** : effet × (1 − protection / 100). **Protection contre le feu** = Résistance au feu du personnage (équipement compris) **+ ou − la valeur « brûlant » de l'armure portée** (plates −20 : le métal chauffe ; mailles −10 ; brigandine −5 ; vêtements +5 ; cuir +15 ; cuir renforcé +18 ; écailles +35), bornée de **−50 à +75 %** (`combat.elemental.*`). Même règle pour le froid (« glaçant ») et la foudre (« foudroyant ») ; la fiche montre ces résistances avec l'armure (Idan : « on doit ajouter ou soustraire aux résistances l'impact de l'armure »).

| Sort | Action | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|
| Trait de feu | principale | 1D6 de feu sur un ennemi, **comme une flèche** | 12 + M/10 (l'arc : 18) | 10 |
| Boule de feu | principale | 2D6 de feu au centre, **dégressif** : × (1 − d / (rayon + 1)) à d cases ; rayon **3 + M/50, de 3 à 5** | centre à **6 + M/25, de 6 à 12** | 30 |
| Anneau de feu | principale | 1D6 de feu à tous ceux qui sont à 1 ou 2 cases du lanceur, lanceur épargné | autour du lanceur | 20 |
| Arme enflammée | rapide | +1D4 de feu à chaque coup qui touche (même sans blesser), pendant 2 + M/50 tours | la sienne ou celle d'un compagnon, 1 + M/50 | 12 |
| Armure de feu | rapide | +(30 + M/5) de protection contre le froid, pendant 2 + M/50 tours | allié ou soi, 2 + M/25 | 10 |
| Flaque de magma | rapide | une case vide devient infranchissable pendant **4 + M/25 tours** (de quoi bloquer un passage) | 2 + M/25 | 8 |
| Embrasement | principale | l'ennemi brûle : **1D6 de feu au début de chacune de ses activations**, pendant **2 tours (3 à 100 de maîtrise)** ; ne se cumule pas | 6 + M/25, au plus 12 | 20 |
| Mur de flammes | principale | un mur de **3 + M/50 cases (au plus 5)** en travers, pendant **3 tours** : qui y entre, ou y commence son activation, prend **1D6 de feu** à chaque fois | centre à 2 + M/25 | 25 |
| Souffle ardent | principale | **2D6 de feu** à tous ceux d'un **cône de 3 cases** devant le lanceur (1, puis 3, puis 3 cases), alliés compris ; ne s'évite pas | vers une case voisine | 25 |
| Torche vivante | rapide | pendant **2 + M/50 tours**, au début de chacune de ses activations, **1D4 de feu** à chaque ennemi au contact du porteur ; lui ne brûle pas | allié ou soi, 1 + M/50 | 15 |

- **Trait de feu** suit les règles de l'arc (Idan) : après un sort réussi, jet de toucher avec la formule des tirs, la Maîtrise du sort à la place des compétences d'arme, l'Esquive de la cible, la perte avec la distance au-delà du quart de la portée (et la couverture, quand le décor existera) ; un trait raté peut toucher quelqu'un dans la ligne de tir (approximation des projectiles). Pas de jet de Blesser : seule la protection contre le feu réduit les dégâts.
- **Boule de feu** ne s'évite pas, mais peut taper à côté : après un sort réussi, précision = 50 + Maîtrise / 2 − 5 × distance (10 à 95 %) ; si elle rate, la boule dévie de **1D3 cases** dans une direction au hasard. Elle touche tout le monde dans la zone, **alliés et lanceur compris** (Idan : « j'aime l'idée que le mage puisse se blesser lui-même »). Cette règle remplace, pour la Boule de feu, la précision d'attaque de zone du doc 04 (−10 % de toucher par case), qui reste celle du Tromblon. Sur la carte actuelle (13 × 9), un rayon de 5 couvre 91 cases sur 117.
- **Anneau de feu** : un seul jet pour tous, alliés compris ; difficulté abaissée à 30 (Idan : « la chance de toucher me semble un peu faible ») ; depuis le 2026-11-01, c'est celle de tous les sorts.
- **Arme enflammée** : les tours se décomptent au début de chaque activation de celui qui porte l'arme (le tour du lancer compte) ; elle ne se cumule pas. **Armure de feu** : même décompte ; elle protège du froid de l'école de l'Eau (Flèche de glace, Tsunami, Arme de glace) et réduit le Gel.
- **Flaque de magma** : ni passage ni arrêt sur la case (déplacements, charges, fuites) ; elle ne coupe pas la vue et ne fait pas de dégâts ; elle refroidit au début du tour indiqué.
- **Les quatre sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts.
- **Embrasement** : la Puissance et la maîtrise sont figées au lancer, comme pour la Régénération ; coup critique : dé au maximum à chaque tour. Chaque brûlure compte pour la Résistance au feu de la cible et bloque la régénération d'un sang de troll.
- **Mur de flammes** : posé comme le Brouillard (centré sur la case visée, en travers de la direction du lanceur), il ne bloque ni le passage ni la vue : il brûle. On brûle une fois par case de mur où l'on entre, et au début de son activation si l'on s'y tient. Pas de coup critique. Il s'éteint au début du tour indiqué ; la carte le montre en orange.
- **Souffle ardent** : un seul jet pour tous, chacun avec sa protection contre le feu ; le lanceur choisit une case voisine, le cône part dans sa direction.
- **Torche vivante** : un seul jet pour tous les voisins ennemis ; ne se cumule pas.

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

### École de l'Eau (10 sorts, Idan, 2026-10-27 et 2026-10-31)

**Objectif V1 (Idan, 2026-10-27) : 10 sorts mono-école par école.** La Vie, le Feu, la Transmutation, la Foudre, la Télékinésie et l'Illusion en ont 6, l'Eau 7 ; les autres viendront.

Même modèle que la Vie et le Feu (effet, mana, CC aux dés maximum, EC : le lanceur subit le minimum de son sort). L'élément de l'école est le **froid** : dégâts × (1 − protection contre le froid / 100), avec la valeur « glaçant » de l'armure (même règle que le feu). Données : `spells.json`.

| Sort | Action | Effet | Portée / zone | Mana (base) |
|---|---|---|---|---|
| Brouillard | principale | un rideau de **5 cases** qui coupe la ligne de vue pendant **3 tours, fixes** | centre à 2 + M/25 | 15 |
| Eau guérissante | rapide | soin **1D3** (Soin rapide : 1D4) | allié ou soi, 2 + M/25 | 10 |
| Flèche de glace | principale | 1D6 de froid, **comme une flèche** (le Trait de feu en froid) | 12 + M/10 | 10 |
| Tsunami | principale | **2D6 de froid** à tous ceux qui sont dans une ligne de **3 + M/50 cases, de 3 à 5**, alliés compris | part de la **case voisine** choisie | 25 |
| Armure de froid | rapide | +(30 + M/5) de protection contre le **feu**, pendant 2 + M/50 tours | allié ou soi, 2 + M/25 | 10 |
| Gel | rapide | −(20 + M/5) en **Vitesse et en Dextérité**, pendant **1 + M/100 tours, au plus 2** (Idan : « 1 ou 2 tours ») | un ennemi à 1 + M/50 | 12 |
| Arme de glace | rapide | +1D4 de froid à chaque coup qui touche (même sans blesser), pendant 2 + M/50 tours | la sienne ou celle d'un compagnon, 1 + M/50 | 12 |
| Prison de glace | principale | l'ennemi est **figé** : il perd ses activations pendant **1 tour (2 à 100 de maîtrise)** et ne subit que **la moitié des dégâts** ; il résiste si D100 ≤ Constitution + protection contre le froid − M/2 (5 à 95 %) ; pas de coup critique | 6 + M/25, au plus 12 | 30 |
| Blizzard | principale | une tempête de neige de **rayon 2 + M/50 (au plus 4)** pendant **3 tours** : **1D4 de froid** à tous ceux de la zone à chaque tour, dès le lancer (un jet pour tous, alliés compris) ; on n'y voit pas à travers ; qui y commence son activation n'a que **la moitié de son déplacement** ; sans ligne de vue | centre à 6 + M/25, au plus 12 | 35 |
| Source vive | principale | rend **3 × 1D6** (× Puissance et maîtrise) de **mana** à un autre allié, sans dépasser sa réserve | 2 + M/25 | 10 |

- **Brouillard** (Idan : « bloque la ligne de vue et empêche de tirer ») : les 5 cases sont centrées sur la case visée, **en travers** de la direction du lanceur (le long de l'axe de la grille le plus perpendiculaire). Une case de brouillard coupe la ligne de vue comme un mur : personne ne tire ni ne lance de sort **à travers, depuis ou vers** une case de brouillard (Idan : il bloque aussi les sorts). Le corps à corps et les déplacements ne changent pas. Les cases hors de la carte sont perdues ; il se dissipe au début du tour indiqué. C'est la première chose qui coupe la ligne de vue (doc 04).
- **Tsunami** : ne s'évite pas ; la ligne part de la case voisine choisie et file droit devant (Idan : « 3 à 5 cases selon la maîtrise », dégâts de froid).
- **Les trois sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts.
- **Prison de glace** : figé, il ne bouge ni n'agit, ne fait pas d'attaque d'opportunité et ne réagit pas aux tirs ; il ne subit que la moitié des coups d'armes, du toucher spectral et des dégâts physiques et élémentaires des sorts (les dégâts « sans aucune résistance » passent entiers). La glace se brise après sa dernière activation perdue. Délivrance la retire (avec le gel).
- **Blizzard** : posé comme la Tempête de la Foudre (une zone, sans ligne de vue), il coupe la ligne de vue comme le Brouillard ; il retombe au début du tour indiqué ; la carte le montre en blanc.
- **Source vive** : le premier sort qui rend du mana ; bon marché à haute maîtrise (un expert rend ≈ 27 mana pour 6).
- **Gel** : le malus baisse avec la protection de la cible contre le froid (résistance, armure « glaçant », Armure de feu) : × (1 − protection / 100). Il compte **tout de suite** (Vitesse et Dextérité entrent dans le toucher, l'esquive des tirs, l'initiative et le mouvement : −15 en Vitesse ≈ une case de moins) et couvre les prochaines activations de la cible ; il tombe au début de l'activation suivante. Il ne se cumule pas.
- **Armure de froid** et **Arme de glace** : les miroirs de l'Armure de feu et de l'Arme enflammée (même décompte, ne se cumulent pas ; l'Arme de glace remplace l'Arme enflammée).
- **Eau guérissante** : l'IA du combat automatique s'en sert comme de Soin rapide, quand elle ne connaît pas ce dernier.

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

### École de la Transmutation (10 sorts, Idan, 2026-10-27 et 2026-10-31)

Idan : « c'est un buffeur ». Tous les sorts sont des **actions rapides**, sur **un allié ou soi**, à **moyenne portée (3 + M/25)**, et durent **1 tour, 2 pour un maître (1 + M/100, au plus 2)**. Même modèle que les autres écoles pour le mana, la réussite et les critiques. Écoles opposées : Foudre et Invocation. Données : `spells.json`.

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

- **Pourcentages** : de la valeur de base, comme l'équipement ; ils comptent partout où la caractéristique compte (Force : dégâts au corps à corps ; Vitesse : mouvement, initiative, toucher et esquive des tirs ; Perception et Dextérité : toucher). **Peau de pierre** donne des points, comme la cape (la Résistance physique médiane n'est que de 5) : un point retire environ 1 % des dégâts physiques, dans la limite de 50.
- **Durée** : « 1 tour » = la prochaine activation de la cible ; si le lanceur se vise lui-même, c'est son activation en cours (Force de titan, puis frapper dans la foulée). Les sorts différents se cumulent ; le même sort relancé remplace le précédent.
- **Les quatre sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts, sur le même modèle.
- **Robustesse de l'ours** : les PV max suivent la Constitution en combat ; quand l'effet prend fin, ils redescendent et les PV avec eux s'ils dépassent (les ennemis gardent les PV de leur fiche).
- **Peau d'écailles** : un bonus de protection sur les trois éléments à la fois, comme l'Armure de feu sur un seul ; il réduit aussi le Gel.
- **Crachat de venin** : pendant les 1 ou 2 **prochaines** activations de la cible (même si le lanceur se vise : l'action rapide vient d'être prise), un bouton « Cracher du venin » : action rapide, un ennemi à **2 à 10 cases** (la Sarbacane), en ligne de vue. Toucher comme le Trait de feu, avec la **Maîtrise du lanceur** à la place des compétences d'arme ; **1D4 de poison** × la Puissance du lanceur, réduits par la Résistance au poison (l'armure ne compte pas). S'il blesse, la cible est **empoisonnée**.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| 6e sens, Force de titan, Vitesse du guépard, Robustesse de l'ours, Sagesse du hibou, Agilité du chat | +26 %, 1 tour · portée 4 | +31 %, 1 tour · portée 5 | +46 %, 2 tours · portée 8 |
| Peau d'écailles | +26 feu, froid et foudre, 1 tour · 11 mana | +31, 1 tour · 10 | +46, 2 tours · 7 |
| Peau de pierre | +13 points, 1 tour | +15, 1 tour | +23, 2 tours |
| Crachat de venin, par crachat | 22 (9 de poison ensuite) | 28 (12) | 63 (26) |
| Cautérisation | 17 PV · 9 mana | 23 · 9 | 51 · 6 |

### Poison (Idan, 2026-10-27)

- Une cible **blessée** par du venin est **empoisonnée pendant 3 tours** (`combat.poison.turns`) ; un nouveau poison remplace l'ancien.
- Au **début de chacune de ses activations**, elle fait un **jet de résistance** : **D100 ≤ Constitution / 2 + Résistance au poison** (équipement compris, de 5 à 95 % ; `combat.poison.*`) **annule l'effet** (Idan : « un jet de résistance au poison au début du tour (constitution ?) »). Raté, elle subit des **dégâts légers** : le minimum du venin (dé à 1), réduit par sa Résistance au poison. La Résistance au poison progresse avec ces dégâts (doc 08).
- **Purge** (école de la Vie) retire le poison.
- **Fiole de poison** (Idan, 2026-10-29 ; doc 05) : action rapide, sur soi ; l'arme active est enduite pendant 3 tours, et chaque coup qui blesse, au corps à corps comme au tir, empoisonne : **10 PV par tour**, 3 tours, même jet de résistance. Avec une sarbacane enduite, le plus fort des deux poisons.

### École de la Foudre (10 sorts, Idan, 2026-10-27 et 2026-10-31)

Même modèle que les autres écoles (effet, mana, CC aux dés maximum, EC : le lanceur subit le minimum de son sort). L'élément est la **foudre** : dégâts × (1 − protection contre la foudre / 100), avec la valeur « foudroyant » de l'armure, et le métal conduit : **plates −45**, mailles −30, brigandine −18 ; vêtements +5, gambison +15, écailles +25, cuir renforcé +28, cuir +30. **Portée moyenne des attaques** (Idan) : **6 + M/25, au plus 12**, comme la Boule de feu. Écoles opposées : Eau et Transmutation. Données : `spells.json`.

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

- **Décharge électrique** (Idan : « au cac, mais gros dégâts ») : la main touche, pas d'esquive ; le plus gros sort sur une cible.
- **Boule d'éclairs** (Idan : 5 cibles, alliés compris) : ne s'évite pas ; après la cible, elle saute chaque fois sur le personnage en jeu le plus proche du précédent **pas encore touché**, à **3 cases au plus**, **alliés et lanceur compris** (à égalité, un ennemi du lanceur d'abord) ; s'il n'y a personne à 3 cases, la chaîne s'arrête. Chacun a sa propre protection contre la foudre. Les rebonds ne demandent pas la ligne de vue.
- **Foudre** : elle tombe du ciel ; elle passe le Brouillard (et, plus tard, le décor).
- **Célérité** : se cumule avec Vitesse du guépard (deux sorts différents) ; la relancer remplace la précédente.
- **Les quatre sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts.
- **Étincelle** : la petite Décharge électrique, en action rapide ; le premier sort de foudre d'un débutant.
- **Arc électrique** : le Tsunami de la foudre, en plus long ; le métal le conduit comme les autres sorts de foudre.
- **Paralysie** : la cible résiste si **D100 ≤ Constitution + protection contre la foudre − 0,5 × Maîtrise du lanceur**, borné de 5 à 95 % (`resistance_caracteristique`, `resistance_maitrise_facteur`). Le métal conduit : en plates, la résistance tombe presque toujours à 5 %. Paralysée, la cible saute sa prochaine activation (joueur comme ennemi), puis l'effet tombe. Les jets de la résistance et du résultat sont dans le journal.
- **Tempête** : la zone reste marquée sur la carte tant qu'il lui reste des vagues ; à chaque vague, 1D3 personnages différents de la zone (moins s'il y en a moins) sont frappés, chacun avec ses propres dés et sa protection contre la foudre ; la Maîtrise et la Puissance sont figées au lancer ; le coup critique ne vaut que pour la première vague (`frappes_de` = 3).

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

### École de la Télékinésie (10 sorts, Idan, 2026-10-28 et 2026-10-31)

Une école de **contrôle** : elle déplace les gens sur la carte. Même modèle que les autres écoles pour le mana, la réussite et les critiques. Écoles opposées : Illusion et Feu. Données : `spells.json`.

**Dégâts contondants, qui passent par l'armure** (Idan : « ça passe par l'armure… c'est du contondant ») : l'étape **Blesser** d'un coup d'arme (doc 04), où la **Puissance magique** du lanceur tient le rôle de la Force et **0,2 × Maîtrise** celui des compétences d'arme, face à la **résistance contondante de l'armure** et à l'**Endurance** de la cible : Δ = Puissance magique + 0,2 × Maîtrise + puissance du sort − armure (contondant) − Endurance, P = 10 + 80 / (1 + e^(−Δ/20)), de 10 à 90 %. Si le coup blesse : l'effet du sort, réduit par la **Résistance physique** (avec sa variation D3, comme une arme). Les dés ont pris un cran (Idan : « augmente un peu les dégâts si besoin ») pour compenser l'armure. Le contondant fait progresser la Résistance physique de la cible.

| Sort | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|
| Attraction | principale | **1D6** contondant (puissance 25), puis la cible est **tirée de 2 + M/50 cases** vers le lanceur, jusqu'à son contact | **12 + M/10** (grande portée) | 15 |
| Projection | principale | **1D8** contondant (puissance 35), puis la cible est **repoussée de 2 + M/50 cases** dans l'axe lanceur → cible | 6 + M/25, au plus 12 | 12 |
| Déplacement | rapide | un allié ou un ennemi est **déplacé d'une case**, sur une case libre voisine choisie (deux clics : la cible, puis la case) | 6 + M/25, au plus 12 | 8 |
| Entrechoc | principale | **deux ennemis côte à côte** (deux clics) : **2D8** contondant (puissance 55) **à chacun**, chacun avec son armure | 6 + M/25, au plus 12 | 20 |
| Champ de protection | principale | sur soi ou un allié, pendant **4 tours** : chaque **projectile** a **50 %** de chances d'être **dévié** | 3 + M/25 | 15 |
| Lancer de pierre | rapide | un tir de **fronde** : jet de toucher comme le Trait de feu, puis **1D6** contondant (puissance 25, la Fronde) | **2 à 14** (la Fronde) | 6 |
| Lancer d'arme | principale | l'**arme de corps à corps tenue** part et revient : ses **dés** × sa **qualité**, avec la **Puissance magique** au lieu de la Force, puis **Blesser** avec le meilleur type de l'arme (tranchant, perforant ou contondant) | 4 + M/25, au plus 10 | 15 |
| Onde de choc | principale | **tous ceux à 2 cases ou moins** du lanceur, **alliés compris**, sont **repoussés de 2 + M/50 cases** ; **choc 1D4** contondant (puissance 35) s'ils heurtent quelque chose | soi | 25 |
| Bond | rapide | le lanceur se propulse sur une **case libre**, par-dessus tout, **sans attaque d'opportunité** ; ce n'est pas un déplacement (il garde son mouvement) | 2 + M/50, au plus 4 | 10 |
| Écrasement | principale | **2D6** contondant (puissance 45), et la cible **ne peut pas se déplacer** à sa prochaine activation | 6 + M/25, au plus 12 | 20 |

- **Déplacement forcé** (Attraction, Projection, Déplacement) : jamais d'attaque d'opportunité. La cible suit les cases jusqu'au premier **obstacle** (un personnage, une flaque de magma, le bord du terrain) ; l'obstacle l'arrête et lui inflige un **choc** (Idan : « dégâts en plus ») : **1D4** contondant, qui passe lui aussi par l'armure. L'Attraction s'arrête au contact du lanceur, sans choc. Si la cible meurt du coup, elle ne bouge pas.
- **Couverture du décor** (doc 04 ; Idan, 2026-11-06 : « oui pour les sorts qui volent ») : un sort qui vole comme une
  flèche (et le crachat de venin) voit sa chance de toucher multipliée par 0,5 contre une cible en couverture partielle,
  0,25 en couverture totale, comme un tir.
- **Altitude** (doc 04 « Altitude ») : comme un tir, ce sort gagne **+10** au delta du Toucher par niveau au-dessus de sa
  cible (−10 par niveau en dessous), et passe par-dessus la couverture partielle d'au moins un niveau plus haut.
- **Champ de protection** (Idan : il dévie aussi les sorts) : avant le jet de toucher, 50 % de dévier les tirs d'armes (arcs, frondes, armes à feu, contre-charges au tir) et les sorts qui volent comme une flèche (Trait de feu, Flèche de glace, Éclair, Lancer de pierre, crachat de venin). Il dure 4 tours : jusqu'au début du 4e tour suivant le lancer. Il ne gêne ni la Foudre, ni les zones, ni la Décharge.
- **Lancer de pierre** en action rapide : il se combine avec un sort principal dans le même tour.
- **Les quatre sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts, sur le même modèle.
- **Lancer d'arme** : il faut une arme de corps à corps en main (pas d'arc, pas de mains nues). La qualité de l'arme compte, comme à la frappe ; une critique prend les dés au maximum. L'arme revient aussitôt : rien à ramasser.
- **Onde de choc** : les plus éloignés sont repoussés d'abord, dans l'axe lanceur → eux, pour ne pas se gêner ; pas de dégâts sans obstacle. Pas de critique.
- **Bond** : action rapide, il se combine avec un sort principal ou une attaque dans le même tour.
- **Écrasement** : « immobilisé » = plus de déplacement à sa prochaine activation ; il peut encore frapper, tirer ou lancer un sort.

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

### École de l'Illusion (10 sorts, Idan, 2026-10-28 et 2026-10-31)

L'école du **moral** : elle joue sur le test de Courage du combat (doc 04, Courage post-attaque). La **Volonté** du mage y compte (Idan : « ici, c'est la force mentale » ; le Charisme ira à l'Invocation et à la Nécromancie). Même modèle que les autres écoles pour le mana, la réussite et les critiques. Écoles opposées : Vie et Télékinésie. Données : `spells.json`.

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

- **Peur** : le test de Courage d'après une attaque, la **Maîtrise et la Volonté du mage** tenant le rôle de l'Intimidation de l'adversaire : tenir = Courage + aura + Volonté / 4 − (Maîtrise + Volonté du mage) / 4, de 5 à 95 %. Raté : En fuite, avec le mouvement de fuite immédiat et la reprise de contrôle habituels. Un ennemi déjà en fuite ou en frénésie ne teste pas ; les alliés de la zone ne sont pas touchés. Un ennemi avec Courage 50 et Volonté 50 tient à 42 % face à un débutant, 35 % face à une recrue, 12 % face à un expert.
- **Soutien illusoire**, **Courage de masse** : des points de Courage, qui comptent aussi pour reprendre ses esprits en fuite. Sur le lanceur, l'activation en cours compte comme la première.
- **Avancée cachée** : la Discrétion sert au camouflage (doc 04) : sous le sort, un mercenaire est bien plus dur à repérer.
- **Choc psychique** : un projectile ; le Champ de protection peut le dévier.
- **Les quatre sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts, sur le même modèle.
- **Désespoir** : le Soutien illusoire à l'envers, sur un ennemi ; en action rapide, il se combine avec la Peur dans le même tour. Ses points de Courage en moins comptent partout : test après un coup, Peur, reprise de ses esprits en fuite.
- **Brouillage mental** : contre les mages ennemis (ceux qui soignent) ; la chance de réussite ne descend pas sous 0. Le même rapport de Volonté que le Choc psychique.
- **Création de double** : une copie du mage (allure, équipement), dans son camp, que l'IA vise comme les autres (le plus proche ; à distance égale, le moins de PV : 1 PV l'attire). Il ne fait ni attaque d'opportunité ni test, ne coûte ni entretien ni test de Charisme. Il se dissipe au premier coup qui le touche (même paré ou bloqué ; un coup raté ou dévié ne le touche pas), au premier sort qui le blesse, quand le mage tombe, et à la fin du combat. Un nouveau double remplace le précédent.
- **Sommeil** : la cible résiste si D100 ≤ sa **Volonté − 0,5 × la Maîtrise** (de 5 à 95 %), comme la Paralysie, sans élément. Endormie, elle perd ses activations et ne réagit plus (ni attaque d'opportunité, ni tir de réaction) ; tout dégât la réveille aussitôt (coup, sort, poison, brûlure). Un ennemi de Volonté 50 résiste à 34 % face à un débutant, 22 % face à une recrue, 5 % face à un expert.
- **Délivrance** (Vie) retire aussi le sommeil, le désespoir et le brouillage mental.
- **Frénésie** (Idan : la cible joue seule) : à chacune de ses activations, joueur ou ennemi, elle prend une arme de mêlée si l'autre set en a une, puis frappe au contact, charge, ou fonce sur l'ennemi le plus proche ; jamais de tir ni de sort. Elle ne fait plus aucun test de Courage, et une cible en fuite s'arrête de fuir. Ses 2 prochaines activations, même si le lanceur se vise lui-même.

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

### École de la Nécromancie (10 sorts, Idan, 2026-10-28 et 2026-10-31)

Le **Charisme** du mage y compte (Idan : l'Invocation et la Nécromancie en dépendent) : il garde ses invocations et fixe la force du zombie. Même modèle que les autres écoles pour le mana, la réussite et les critiques. Écoles opposées : Vie et Invocation. Données : `spells.json` (colonnes `entretien_mana` et `creature`), `summon-archetypes.json` (le spectre), constantes `magic.summon.*`.

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

- **Invocations** (zombie, spectre ; l'Invocation suivra les mêmes règles, Idan) : le **joueur** les joue, avec leur propre activation dans l'ordre du tour, dès le tour suivant ; en combat automatique, l'IA. Au **début de chaque tour**, le mage les garde : **test de Charisme** = la formule de réussite d'un sort, le Charisme à la place de l'Intelligence, difficulté **30**, sans l'armure ; raté, l'invocation **disparaît** (le zombie tombe en poussière). Puis l'**entretien** : 5 × (1 − Maîtrise / 300) mana, au moins 1 ; sans assez de mana, elle disparaît aussi. Elles disparaissent aussitôt quand le mage est hors combat ou quitte la carte, et à la fin du combat : ni XP ni bilan. Comme tout le monde, une invocation arrive **camouflée** (doc 04) ; le repérage du début de tour fait le reste. Une meute (Invocation) comptera pour une seule invocation : un test, un entretien.
- **Résurrection** : sur le corps d'un combattant mort resté sur la carte, sur lequel personne ne se tient ; un corps ne se relève qu'une fois, et une invocation ne laisse pas de corps. **Un allié relevé ne survit pas au combat** : son jet de mort de fin de mission est forcément raté (Idan : « pas toujours cool d'avoir un collègue nécromancien ! »). Le zombie est un **mort-vivant** : la Restitution le blesse, les dégâts nécrotiques ne le touchent pas, et il ne fait **aucun test de Courage**.
- **Spectre** (archétype fixe, Idan : « à peu près les stats d'un gobelin ») : guerrier gobelin novice, **Vitesse 65** (6 cases), **Volonté 50**, **100 PV**, sans arme ni armure. **Immunisé aux dégâts physiques** : armes, tirs, sorts contondants ; la magie élémentaire, le psychique et la Restitution le touchent. **Toucher spectral** : jet de toucher au contact, puis **1D6 de dégâts psychiques** × sa Volonté / celle de la cible (de × 0,5 à × 2), sans Blesser, ni armure ni résistance (≈ 35 à Volonté égale). Mort-vivant, sans peur.
- **Dégâts nécrotiques** (Flèche de mort, Nécrose) : ils **traversent l'armure et les résistances**, sans la Volonté ; **sans effet sur les morts-vivants** (on ne peut pas les viser ; une flèche égarée ne leur fait rien). La Flèche de mort est un projectile : le Champ de protection peut la dévier.
- **Drain de vie** : seulement les coups d'arme au corps à corps du mage, pas les tirs ni les sorts ; les PV retirés comptent jusqu'à zéro (pas la profondeur sous zéro). Sur soi, l'activation en cours compte comme la première.
- **Flétrissement** : aucun soin (sorts de soin, Régénération, Drain de vie, potion de soins) pendant les 3 ou 4 prochaines activations de la cible.
- **Les quatre sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts, sur le même modèle.
- **Malédiction** : l'Embrasement en nécrotique, sans jet de toucher : chaque coup traverse l'armure et les résistances ; sans effet sur les morts-vivants (on ne peut pas les viser). Ne se cumule pas : la relancer remplace la précédente.
- **Armée d'os** : le **squelette** (`summon-archetypes.json`, Idan : « faibles, lents, nombreux, sans peur ») : **40 PV**, **3 cases**, **Lame rouillée 1D6** tranchante (≈ 25), mort-vivant, sans peur. Le groupe compte pour une seule invocation : un test de Charisme et un entretien, comme une meute.
- **Siphon d'âme** (Idan : « au profit du lanceur seulement ») : seulement si la cible a encore du mana ; le nécromancien récupère ce qui est pris sans dépasser sa réserve, le reste est perdu.
- **Pacte de sang** : seulement s'il lui manque du mana ; il ne prend que ce qui manque et **garde toujours 1 PV** (comme le Lien de vie). Coût : 1 mana, le minimum de tout sort.

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

### École de l'Invocation (10 sorts, Idan, 2026-10-28 et 2026-10-31)

**Mêmes règles d'invocation que la Nécromancie** (Idan) : le joueur joue ses créatures dès le tour suivant ; chaque tour, test de **Charisme** (difficulté 30) et entretien en mana, sinon elles disparaissent ; elles disparaissent aussi quand le mage tombe. Contrairement aux morts-vivants, les créatures font leurs **tests de Courage et peuvent fuir** (Idan). Une **meute** (loups, ours, crocodiles) compte pour **une seule invocation** : un test, un entretien ; raté, toute la meute disparaît ; chacun se déplace de son côté. Les créatures apparaissent sur la case choisie, voisine du mage, puis sur les cases libres les plus proches (moins de créatures s'il n'y a plus de place). Écoles opposées : Transmutation et Nécromancie. Données : `spells.json` (colonnes `invocation_nb_des`, `invocation_de`, `invocation_pas_maitrise`), `summon-archetypes.json`.

| Sort | Action | Effet | Portée | Mana (base) |
|---|---|---|---|---|
| Corbeau | principale | un **corbeau** | 1 | 10, puis **2 par tour** |
| Bourbier | principale | une case devient un **bourbier** pendant **2 + M/50 tours (2 à 3)** : qui s'y trouve ou y entre, allié ou ennemi, **ne peut plus se déplacer** | 6 + M/25, au plus 12 | 10 |
| Transposition | rapide | le mage **échange sa place** avec une de ses invocations | partout, sans ligne de vue | 8 |
| Invocation de loups | principale | **1D6 loups, +1 par tranche de 50 de Maîtrise** (Idan : « le 1D6 peut évoluer ») | 1 | 25, puis **5 par tour** |
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

- Les autres valeurs des créatures sont celles du guerrier gobelin novice (`summon-archetypes.json`) ; leur arme naturelle passe par les règles des armes (Toucher, Blesser, puissance contre l'armure).
- **Corbeau** : l'éclaireur. Il fait comme tout le monde son test de repérage au début de chaque tour, avec sa Perception de 85 : un ennemi camouflé qu'il repère est vu de toute l'armée, pour toute la partie (doc 04). Il servira encore plus avec le brouillard de guerre.
- **Bourbier** : on peut entrer dans la case (c'est la fin du chemin), pas la traverser ni en sortir ; on y attaque et on y lance des sorts. La fuite est bloquée aussi. Les déplacements forcés (Télékinésie) ne sont pas arrêtés.
- **Transposition** : pas un déplacement : aucune attaque d'opportunité.
- **Élémentaire** : plus tard, comme sort combiné aux éléments (Idan).
- **Les quatre sorts du 2026-10-31** (validés par Idan, chiffrés par JC3) amènent l'école à 10 sorts, sur le même modèle.
- **Nuée d'insectes** (Idan : « Perception et Précision en baisse ») : la Précision (doc 05) vient de la Dextérité et de la Perception ; la nuée retire donc un pourcentage des deux, comme le 6e sens à l'envers. Elle ne pique que les ennemis du mage : ceux qui sont dans la zone au lancer, puis ceux qui y commencent leur activation (le malus vaut pour cette activation). Elle ne coupe pas la ligne de vue.
- **Sangliers** : la charge de leurs Défenses compte double (`bonus_charge` 2, comme les armes d'hast).
- **Araignées géantes** : la morsure empoisonne comme la sarbacane ; la **toile** colle dès que la morsure touche (ni parée, ni bloquée) : la cible ne peut pas se déplacer à sa prochaine activation, comme l'Écrasement.
- **Bannissement** : toute invocation du camp adverse (créature, zombie, spectre, double illusoire) ; une meute compte pour une seule invocation, elle part en entier. Pas de jet de résistance : la réussite du sort suffit.

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

Idan a validé **90 sorts mono-école** (10 par école) et **49 sorts bi-école**. JC3 les chiffre et les intègre **une école par PR** ; chaque école intégrée a sa section plus haut, avec ses chiffres.

**Mono-école : tous intégrés** (2026-11-01) : les 9 écoles ont leurs 10 sorts, chacun avec sa section plus haut.

Refusés (à ne pas reproposer tels quels) : Bouclier de vie, Retour à la vie, Météore, Verglas, Forme bestiale, Corps d'acier, Désarmement, Lévitation, Hallucination, Explosion de cadavre, Esprit gardien, Marque de mort.

**Bi-école (49) — en attente** (Idan, 2026-11-01 : « Mets en stand by les sorts bi école. Garde les idées »). Deux écoles **non opposées**. Ils ne seront **pas appris par les recrues** de la Taverne (pas de sort bi-école à la création). Maîtrise, puissance et apprentissage : à décider (Idan : « prendre la moyenne ou la somme des deux écoles pour calculer la puissance » ; JC3 conseille la moyenne).

- **Vie × Feu** : **Flamme sacrée** (dégâts de feu ; la moitié des PV infligés soigne le lanceur) ; **Brasier de guérison** (un cercle de feu 2 tours : il soigne les alliés et brûle les ennemis qui y sont) ; **Cœur ardent** (soigne un allié et le rend insensible à la peur 2 tours).
- **Vie × Eau** : **Source de jouvence** (soigne un allié et lui rend du mana).
- **Vie × Transmutation** : **Chair neuve** (soigne et retire tous les malus de caractéristiques) ; **Métabolisme** (soins reçus +50 % et pas de poison, plus longtemps que 3 tours) ; **Sursaut vital** (soin + bonus de Force et de Vitesse).
- **Vie × Foudre** : **Éclair de vie** (rebondit comme la Boule d'éclairs : soigne les alliés, blesse les ennemis).
- **Vie × Télékinésie** : **Main secourable** (attire un allié blessé près du lanceur et le soigne) ; **Repousse-mal** (repousse les ennemis au contact d'un allié et le soigne).
- **Vie × Invocation** : **Dryade** (soigne chaque tour l'allié le plus blessé à portée) ; **Soin de la meute** (soigne toutes nos invocations).
- **Feu × Transmutation** : **Torche humaine** (un allié file de 5 cases en ligne droite, dans la direction de son choix, et brûle tout sur son passage).
- **Feu × Foudre** : **Déflagration** (explosion de feu et de foudre autour du lanceur, alliés compris) ; **Arme d'orage** (l'arme d'un allié ajoute feu et foudre à chaque coup) ; **Éclair de feu** (sans ligne de vue : la cible brûle et est électrisée).
- **Feu × Nécromancie** : **Feu noir** (feu et nécrotique ; tant que la cible brûle, on ne peut plus la soigner) ; **Squelette ardent** (relève un mort en squelette enflammé dont les coups brûlent).
- **Feu × Invocation** : **Élémentaire de feu** ; **Molosses de braise** (une meute de chiens de feu).
- **Eau × Transmutation** : **Corps éthéré** (un allié est insensible aux coups physiques pendant 1 tour).
- **Eau × Illusion** : **Brume des songes** (un brouillard où les ennemis s'endorment s'ils ratent un test) ; **Chant de sirène** (les ennemis de la zone sont attirés vers le lanceur et ne l'attaquent pas pendant 1 tour) ; **Miroir d'eau** (renvoie un sort de dégâts sur son lanceur).
- **Eau × Nécromancie** : **Peste des marais** (une maladie : des PV perdus à chaque tour, qui se transmet aux voisins) ; **Eaux mortes** (une zone : les ennemis qui y meurent se relèvent en zombies de notre camp).
- **Eau × Invocation** : **Élémentaire d'eau** ; **Ondine** (rend du mana et des PV à un allié voisin à chaque tour).
- **Transmutation × Télékinésie** : **Pesanteur** (un ennemi perd de la Vitesse et de l'Esquive) ; **Pierre animée** (un golem de pierre lent et très solide).
- **Transmutation × Illusion** : **Aspect terrifiant** (les ennemis au contact du lanceur testent leur Courage à chaque tour) ; **Peau de caméléon** (un allié devient camouflé et le reste même après une attaque).
- **Transmutation × Nécromancie** : **Putréfaction** (la cible perd de la Constitution, donc des PV max, jusqu'à la fin du combat) ; **Abomination** (fusionne deux cadavres en une créature puissante) ; **Chair recousue** (nos morts-vivants récupèrent des PV et gagnent de la Force).
- **Foudre × Télékinésie** : **Canon magnétique** (une pierre ou une arme lancée à une vitesse foudroyante traverse tout sur une ligne) ; **Répulsion** (renvoie les projectiles de métal vers leur tireur).
- **Foudre × Illusion** : **Éblouissement** (les ennemis de la zone perdent Précision et Perception 1 tour) ; **Coup de tonnerre** (test de Courage pour tous les ennemis de la carte).
- **Foudre × Nécromancie** : **Foudre noire** (des rebonds qui volent des PV au profit du lanceur) ; **Arrêt du cœur** (une cible sous **10 %** de ses PV tombe hors combat).
- **Foudre × Invocation** : **Élémentaire de foudre** ; **Oiseau-tonnerre** (rapide, volant ; frappe de foudre sans voir sa cible).
- **Télékinésie × Nécromancie** : **Faux spectrale** (fauche les ennemis en arc devant le lanceur, dégâts nécrotiques) ; **Chaînes d'âme** (relie deux ennemis : chaque blessure de l'un frappe aussi l'autre).
- **Télékinésie × Invocation** : **Rappel** (ramène nos invocations autour du lanceur, sans attaque d'opportunité) ; **Téléportation** (téléporte une invocation sur la case choisie, hors du brouillard).
- **Illusion × Nécromancie** : **La mort vous va si bien** (test de Courage pour tous les ennemis de la carte).
- **Illusion × Invocation** : **Djinn** (une invocation très rapide, qui ignore le terrain qui ralentit et ne craint ni les coups physiques ni la foudre).

**Écoles opposées** (Idan) : des sorts bi-école entre deux écoles opposées sont intéressants, à condition d'être **très forts** ; JC3 doit les proposer.

### Mana

- Le **Mana actuel** se dépense en combat et se **recharge chaque jour au camp** : **Réserve de mana × (10 + Volonté / 2) %** par jour (Volonté 52 : 36 % par jour, plein en 3 jours). Rien pendant les trajets. **Bains chauds** du camp (Idan, 2026-11-01 ; doc 11 §9) : +5 % de la Réserve par jour et par niveau.

### Écoles : progression et régression

Chaque gain dans une école fait perdre **la moitié de ce gain**, partagée à parts égales entre ses **deux écoles opposées** (un quart chacune), comme les armes (doc 08).

**XP de la magie** (étape 3, Idan, 2026-10-25), calquée sur les armes : le sort joue le rôle de l'arme, son école celui de la catégorie. À chaque lancer, même raté :

- **+10 XP** au sort et à son école ; **+5** de plus si le sort réussit ; **+5** de plus s'il a un **vrai effet** (PV soignés, dégâts qui passent la protection, effet posé, poison purgé) ;
- les deux écoles opposées perdent chacune **un quart** de l'XP gagnée par l'école ; une école ne descend pas sous 1 (la valeur d'un mercenaire sans l'école) ;
- les **sorts ne régressent pas** ; même courbe que les compétences (XP = 10 × niveau², niveau continu), **sans plafond** (Idan, 2026-11-06 : « oui libère les sorts » ; plafond 100 auparavant) ;
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

**Rattrapage du mage** (Idan, 2026-11-01 : « Un profil mage sans sort, c'est quand même problématique… Qu'il connaisse au moins un sort de sa meilleure école ») : un mercenaire de domaine Mage (doc 02) qui n'a réussi aucun tirage apprend un sort au hasard dans sa meilleure école, une fois son domaine accentué (`grantMageSpell`, trace `mageSpell`). Environ un Mage sur cinq en profite ; il n'y a plus de Mage sans sort.

L'école de culture n'est **pas garantie** à la création : une recrue sur deux des cultures que la génération ne pousse pas dans leur école (Cités libres, Royaumes du Soleil Levant, Steppes désertiques, Ogres des steppes, Nains du chaos, Orcs des villes, Orcs des steppes, Caravanes de ferrailleurs) n'a pas l'école, et sa chance au tirage de culture est presque nulle. Voulu : « tout le monde ne doit pas être mage » (Idan, 2026-10-25).

**Manuels de sorts** (Idan, 2026-10-31 : « les manuels des sorts doivent être en vente ; c'est ce qui permettra de les
apprendre » ; modalités de JC3) :

- **Un manuel par sort** de `spells.json` : les sorts à venir ont leur manuel sans rien ajouter. Objet « Manuel : <sort> »,
  rangé à l'Intendance dans l'onglet **Manuels**, par école ; sa case montre le parchemin du sort, sa carte son école et sa
  description. Pas de tier ni de qualité.
- **Valeur** : **3 000 PO**, la même pour tous les sorts (`economy.manual_value` ; Idan, 2026-11-01) ; le marchand en
  demande × 1,5 selon l'affinité, comme pour un objet (doc 18) : 4 500 PO à affinité nulle (Idan : « 3000 po de base »).
- **En vente** chez les marchands des cultures de l'école (doc 18) : une ligne « manuels de l'école » ; chaque article est un
  manuel tiré dans l'école.
- **Apprendre** (Idan, 2026-11-02 ; remplace la lecture instantanée) : à l'**École de magie**, dans la salle de l'école du
  sort, en un temps indéterminé (voir ci-dessous). On n'apprend pas un sort déjà connu ; pas pendant une mission ; pas de
  prérequis d'école pour le mercenaire, seulement la salle construite.
- Code : `game-core/spell-manuals.js` ; tests : `tests/spell-manuals.test.js`.

**École de magie** (Idan, 2026-11-01 et 2026-11-02) : le bâtiment et ses neuf salles se construisent au camp, avec un
directeur, l'entraînement libre et l'apprentissage des sorts (doc 11 §7).

**Apprendre un sort à l'École** (Idan, 2026-11-02 : « Il faut le manuel. L'école de magie correspondante construite. On
parle à un mercenaire pour le convaincre d'apprendre un sort. […] Le seul coût est la durée… qui est indéterminée » ;
règles `game-core/spell-study.js`, constantes `spell_study.*`, interface `prototype-web/spell-study-ui.js`) :

- **Conditions** : le manuel à l'Intendance, la **salle de l'école du sort** construite (la Salle du Feu pour un sort de
  Feu) avec une place libre ; le mercenaire au camp (pas d'expédition, même programmée), ni déjà élève ni professeur.
- **Convaincre**, comme pour l'équipement : « Apprendre à… » sur le manuel ; chance = **10 + 80 / (1 + e^(−Δ/20))**, avec
  **Δ = 0,5 × affinité avec le capitaine + 0,5 × (école du sort − 50)** + l'appui de l'intendant (0,2 × Intendance +
  0,25 × affinité envers lui) ; une tentative par jour ; le **capitaine** apprend sans test. Affinité 0 et école 80 :
  64 % ; sans l'école : 28 % ; affinité 50 et école 80 : 80 %.
- **S'il accepte** (au jour J, on organise J+1, doc 16) : il **entre à l'École le lendemain matin** ; d'ici là, le manuel
  est mis de côté et la place réservée, et « Annuler » rend le manuel à l'Intendance (sans effet sur l'affinité). Au
  matin, le manuel est détruit, l'affinité appliquée ; il prend une place de la salle (avant l'entraînement libre) et
  **reste au camp** (ni mission, ni garde du corps, ni entraînement libre) jusqu'à ce qu'il connaisse le sort. Le premier
  test a lieu le matin suivant son entrée.
- **Chaque matin**, un test : chance = **100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 × niveau de la salle)**, au plus 95 %,
  avec **X = (Intelligence + école du sort) / 2 + (école du sort du directeur + sa Transmission du savoir) / 10 +
  Transmission du savoir du professeur / 5**. Salle niveau 1 : moyen (Intelligence 54, école 70) 14 % par jour, **7 jours**
  en moyenne ; talentueux (75, 110) 45 %, **2 jours** ; pas doué (35, sans l'école) 2 %, 56 jours ; moyen avec un
  directeur (école 100, Transmission 48) 26 %, 4 jours ; avec un professeur (Transmission 48) 21 %, 5 jours ; les deux
  37 %, 3 jours ; salle niveau 5 : 20 %, 5 jours.
- **Niveau du sort appris** : le **niveau de la salle** (1 à 10) ; avec un professeur, **le niveau du sort chez le
  professeur × sa Transmission du savoir / 100** s'il est plus haut (Transmission 120 : 20 % de plus que lui), au plus
  100. Professeur à 40 : 19 avec une Transmission de 48, 48 avec 120.
- **Professeur** (facultatif, à tout moment) : un membre qui **connaît le sort**, au camp, ni l'élève ni déjà pris par
  l'École. Il accepte selon 10 + 80 / (1 + e^(−Δ/20)), **Δ = (son affinité avec le capitaine + son affinité envers
  l'élève) / 2** (50 % à 0) ; une tentative par jour ; le capitaine enseigne sans test. Il **reste au camp** jusqu'à la
  fin (Idan : il ne part pas) ; il **enseigne dès le lendemain matin** (son affinité change à ce moment-là) ; on peut le
  **libérer**, l'élève continue seul. +5 XP de Transmission du savoir par jour
  d'enseignement ; le directeur compte les élèves qui apprennent un sort (+5 XP par élève et par jour).
- **Le faire sortir avant la fin** : le manuel est perdu et **rien n'est acquis**.
- **Affinité avec le capitaine** (Idan : « toutes ces interactions doivent faire évoluer l'affinité ») : l'élève **+5**
  s'il accepte, **−2** s'il refuse, **+10** quand il connaît le sort, **−10** si on le fait sortir ; le professeur **+3**
  s'il accepte, **−2** s'il refuse, **+5** quand son élève connaît le sort, **−3** si on le libère. Le capitaine ne
  change pas.
- **Interface** : « Apprendre à… » (Intendance, onglet Manuels) ouvre la proposition, la réponse passe par la boîte de
  dialogue des échanges ; dans l'encart de l'École, « Apprentissages » : chaque élève, son sort, sa salle, son jour (la
  chance du lendemain au survol), « Ajouter un professeur » (ceux qui connaissent le sort, avec leur Transmission) ou
  « Libérer », et « Le faire sortir » (avec confirmation) ; les places des salles comptent les élèves ; fiche : « Apprend /
  Enseigne <sort> » ; journal du matin : « … connaît désormais <sort> (niveau 3), après 6 jours. » ; historique.
- Tests : `tests/spell-study.test.js`.

**Perfectionner un sort à l'École** (Idan, 2026-11-02 : « consommer des manuels contre de l'xp de sort » ; « le même
sort », « une journée à l'école » ; règles `game-core/spell-study.js`, constantes `spell_study.perfect.*`) :

- **Un manuel du même sort**, pour un membre qui le **connaît déjà** : dans « Apprendre à… », il voit « Perfectionner »
  (avec l'XP qu'il gagnera). **Pas de test** ; affinité avec le capitaine **+2**. Il faut la **salle de l'école du sort**
  avec une place libre ; sans plafond de niveau (2026-11-06).
- **Une journée à l'École** : il **entre le lendemain matin** (on peut annuler d'ici là : le manuel revient) ; au matin,
  le manuel est détruit et l'affinité appliquée ; il passe la journée dans la salle (une place prise, ni mission, ni
  garde du corps, ni entraînement libre) ; l'XP tombe **le matin suivant**, puis il sort.
- **XP du sort = 1 000 × Intelligence / 50 × (1 + 0,1 × niveau de la salle) × (1 + Transmission du savoir du directeur /
  100)**, sans plafond. Intelligence 54, salle 3, sans directeur : **1 404 XP** (≈ 78 lancers) ; un sort passe du
  niveau 1 à 11, de 10 à 15, de 20 à 23, de 50 à 51, de 90 à 90,8 ; avec un directeur à 48 de Transmission : 2 078 XP.
- Interface : la ligne de l'élève dans « Apprentissages » (« perfectionne (+1 404 XP demain) ») ; statut « Perfectionne un
  sort » ; journal du matin (« … perfectionne Boule de feu : niveau 20 → 23 (+1 404 XP). ») ; historique.
- Tests : `tests/spell-perfect.test.js`.

### Mise en place

1. **Étape 1** — ces décisions, `spells.json`, les règles des sorts (`game-core/magic.js`) et leurs tests (`tests/magic.test.js`) : Soin rapide, puis les six sorts de l'école de la Vie.
2. **Étape 2** — les sorts dans l'écran de combat actuel, **pour tester** (Vie, puis Feu, Eau, Transmutation, Foudre, Télékinésie, Illusion, Nécromancie et Invocation ; le bouton de test s'appelle désormais « Sorts (test) » et donne tous les sorts écrits) (Idan, 2026-10-25 ; l'interface de combat sera refaite) : une barre de sorts pour le mercenaire actif (action, mana, réussite) ; les cases ciblables en vert (alliés et lanceur, ou toutes les cases à portée pour Soin de masse) ; le journal ; la Régénération au début des activations ; le mana affiché dans la liste des équipes ; un bouton **« Sorts de Vie (test) »** : toute l'escouade connaît les six sorts (niveau 1) pour ce combat, sans toucher au grimoire, le mana étant bien dépensé ; une IA simple, aussi en combat automatique : Soin profond sur l'allié le plus blessé sous 35 % de ses PV à la place de l'attaque, Soin rapide sous 60 %.
3. Étape 3 — **recharge du mana au camp** (faite avec l'étape 2, pour pouvoir tester d'un combat à l'autre), **XP du sort et de l'école, régression des écoles opposées**, XP de la Puissance magique, de la Réserve de mana et de la Chance (faite, voir « Écoles : progression et régression »).
4. Étape 4 — **sorts connus à la création** et **compensations des nains et des ogres** (faite, voir « Sorts connus à la création »).

## Architecture d'un sort

Principes d'origine (avant les décisions du 2026-10-25). Le **prérequis d'école a été retiré** par Idan le 2026-10-25 : on peut connaître et lancer un sort sans minimum dans son école ; le jet d'incantation et l'efficacité suivent les formules des décisions ci-dessus. Le 2026-11-01, Idan a aussi retiré la **difficulté propre à chaque sort** (une seule pour tous) : il n'y a plus de sort « presque impossible à lancer », la puissance d'un sort vient de son effet et de son mana.

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

Remplacé par l'**École de la Foudre** d'Idan (2026-10-27 et 2026-10-31, ci-dessus) : Décharge électrique, Éclair, Arme électrique, Boule d'éclairs, Foudre, Célérité, Étincelle, Arc électrique, Paralysie, Tempête.

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