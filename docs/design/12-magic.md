> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Magie — apprentissage, incantation & premier catalogue

<aside>
🧪

**Page de conception.** Les principes ci-dessous sont retenus comme direction de travail ; les formules chiffrées, coûts, difficultés, durées et valeurs de sorts restent à définir avant passage en règles actives.

</aside>

## Architecture d'un sort

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
- En revanche, **quand il progresse dans une école, il baisse dans ses opposées** (Idan, 2026-10-21), dans l'esprit de « on progresse au détriment des autres » des armes (doc 08). Ampleur de la baisse à définir.

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