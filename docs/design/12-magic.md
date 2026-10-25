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

Simulation (6 000 recrues, tous les sorts supposés écrits) : 48 % ne connaissent aucun sort, 36 % un, 13 % deux, 2,9 % trois (cible d'Idan : 50 / 35 / 12,5 / 2,5). Tant que seul Soin rapide existe, un tirage dans une autre école ne donne rien.

Plus tard : une **école de magie** à construire au camp et des **manuels** à trouver pour apprendre les autres sorts.

### Mise en place

1. **Étape 1** — ces décisions, `spells.json`, les règles de Soin rapide (`game-core/magic.js`) et leurs tests (`tests/magic.test.js`).
2. Étape 2 — Soin rapide dans l'écran de combat : bouton d'action rapide, cible à portée, journal, IA.
3. Étape 3 — recharge du mana au camp, XP du sort et de l'école, régression des écoles opposées.
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