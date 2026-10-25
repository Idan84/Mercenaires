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
| Charisme | Selon l'école (Illusion, Invocation…) ; ne joue pas sur le soin |

Toutes ces valeurs se prennent **équipement compris** (bague de l'école, amulette de puissance magique, ceinture de mana, casque de constitution…).

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
- **Restitution** et **Purge** attendent les morts-vivants et le poison pour servir en combat.
- **Icônes** (Idan, 2026-10-25) : un parchemin par sort sous un **cadre commun à l'école** (vert, lianes et émeraudes pour la Vie), superposés dans le jeu : barre de sorts du combat et grimoire de la fiche. Masters : `assets-src/Sorts/Vie/` ; `scripts/build-spells.sh` détoure le centre du cadre (accord d'Idan) et produit les versions du jeu.

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
- **Arme enflammée** : les tours se décomptent au début de chaque activation de celui qui porte l'arme (le tour du lancer compte) ; elle ne se cumule pas. **Armure de feu** : même décompte ; elle servira quand le froid existera (école de l'Eau).
- **Flaque de magma** : ni passage ni arrêt sur la case (déplacements, charges, fuites) ; elle ne coupe pas la vue et ne fait pas de dégâts ; elle refroidit au début du tour indiqué.

| | Débutant | Recrue moyenne | Expert |
|---|---|---|---|
| Trait de feu | 30 (9–52) · portée 15 · 9 mana · 57 % | 40 · portée 17 · 9 · 81 % | 89 · portée 25 · 6 · 94 % |
| Boule de feu, au centre | 60 · rayon 3 · portée 7 · 27 mana · 17 % | 79 · rayon 4 · portée 8 · 25 · 33 % | 178 · rayon 5 · portée 11 · 17 · 87 % |
| Anneau de feu, par cible | 30 · 18 mana · 57 % | 40 · 17 · 81 % | 89 · 12 · 94 % |
| Arme enflammée, par coup | +22, 2 tours · 57 % | +28, 3 tours · 81 % | +63, 4 tours · 94 % |
| Armure de feu | +36 froid, 2 tours | +41, 3 tours | +56, 4 tours |
| Flaque de magma | 5 tours · 31 % | 6 tours · 59 % | 9 tours · 93 % |

### Mana

- Le **Mana actuel** se dépense en combat et se **recharge chaque jour au camp** : **Réserve de mana × (10 + Volonté / 2) %** par jour (Volonté 52 : 36 % par jour, plein en 3 jours). Rien pendant les trajets.

### Écoles : progression et régression

Chaque gain dans une école fait perdre **la moitié de ce gain**, partagée à parts égales entre ses **deux écoles opposées** (un quart chacune), comme les armes (doc 08). Chaque lancer donne de l'XP au sort et à son école (barème à chiffrer à l'étape 3).

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

L'école de culture n'est **pas garantie** à la création : une recrue sur deux des cultures que la génération ne pousse pas dans leur école (Cités libres, Royaumes du Soleil Levant, Steppes désertiques, Ogres des steppes, Nains du chaos, Orcs des villes, Orcs des steppes, Caravanes de ferrailleurs) n'a pas l'école, et sa chance au tirage de culture est presque nulle. Voulu : « tout le monde ne doit pas être mage » (Idan, 2026-10-25).

Plus tard : une **école de magie** à construire au camp et des **manuels** à trouver pour apprendre les autres sorts.

### Mise en place

1. **Étape 1** — ces décisions, `spells.json`, les règles des sorts (`game-core/magic.js`) et leurs tests (`tests/magic.test.js`) : Soin rapide, puis les six sorts de l'école de la Vie.
2. **Étape 2** — les sorts dans l'écran de combat actuel, **pour tester** (Vie, puis Feu ; le bouton de test s'appelle désormais « Sorts (test) » et donne tous les sorts écrits) (Idan, 2026-10-25 ; l'interface de combat sera refaite) : une barre de sorts pour le mercenaire actif (action, mana, réussite) ; les cases ciblables en vert (alliés et lanceur, ou toutes les cases à portée pour Soin de masse) ; le journal ; la Régénération au début des activations ; le mana affiché dans la liste des équipes ; un bouton **« Sorts de Vie (test) »** : toute l'escouade connaît les six sorts (niveau 1) pour ce combat, sans toucher au grimoire, le mana étant bien dépensé ; une IA simple, aussi en combat automatique : Soin profond sur l'allié le plus blessé sous 35 % de ses PV à la place de l'attaque, Soin rapide sous 60 %.
3. Étape 3 — **recharge du mana au camp** (faite avec l'étape 2, pour pouvoir tester d'un combat à l'autre), XP du sort et de l'école, régression des écoles opposées.
4. Étape 4 — sorts connus à la création et compensations des nains et des ogres.

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

- **Carreaux de glace** — monocible.
- **Pluie de glace** — zone.
- **Arme de glace** — dégâts supplémentaires + composante froid.
- **Armure climatisée** — protection contre le feu.
- **Bloc de glace** — crée un mur destructible servant de couverture.

### Foudre

- **Éclair** — monocible.
- **Éclair rebondissant** — multi-cible par rebonds.
- **Arme de foudre** — dégâts supplémentaires + composante foudre.
- **Décharge** — monocible au CAC.

### Illusion

- **Création de double** — augmente la capacité à éviter les attaques selon un affrontement futur entre qualité de l'illusion et Intelligence / Perception de l'attaquant.

### Nécromancie

- **Zombification** — transforme un mort en zombie combattant.
- **Invocation de spectres** — invoque des spectres ; piste : immunité aux dégâts physiques ordinaires.
- **Nécrose** — sort offensif de CAC.

### Vie

École écrite le 2026-10-25 : voir « École de la Vie » plus haut (Soin rapide remplace Premiers soins). Idées d'origine :

- **Premiers soins** — soin monocible.
- **Soins de masse** — soin de zone.
- **Régénération** — soin progressif sur plusieurs tours.

### Télékinésie

- **Éjection** — déplace une cible et lui inflige des dégâts.
- **Main invisible** — déplacement sans dégâts.
- **Lancer d'arme** — projette l'arme de CAC équipée puis la ramène au lanceur ; évite de créer une catégorie artificielle uniquement pour la hache de lancer.

### Transmutation

- **Célérité** — bonus de Vitesse.
- **Peau de pierre** — bonus d'Endurance.
- **Force démoniaque** — bonus de Force.

### Invocation

- **Invocation de corbeaux** — éclaireurs pour révéler la carte / lever le brouillard de guerre.
- **Invocation d'élémentaire** — créature combattante invoquée.
- **Bourbier** — crée une case marécageuse pour immobiliser / retenir un personnage, y compris potentiellement un allié en fuite.

## Cas de test futurs

Ce catalogue couvre déjà les principaux besoins du futur moteur : monocible, zone, enchantement d'arme, protection, terrain persistant, obstacle destructible, rebond, CAC magique, soin, soin sur durée, déplacement forcé, contrôle et invocation.