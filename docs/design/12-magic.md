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

---

# Catalogue V0 élargi — proposition Chatty

> **Contenu de travail, pas encore règles actives.** Les noms, rôles et combinaisons d'écoles servent à préparer le futur catalogue. Aucun coût en mana, portée, difficulté, durée ou valeur chiffrée n'est fixé ici.

Le but est d'avoir suffisamment de variété pour tester le futur moteur sans fabriquer cinquante variantes de « projectile coloré ».

## Illusion

| Sort | Rôle | Idée |
|---|---|---|
| **Double trompeur** | Défense | Crée un double ; une attaque peut viser l'illusion plutôt que le lanceur. |
| **Voile trouble** | Défense | Rend une cible plus difficile à toucher à distance. |
| **Faux ordre** | Contrôle | Fait croire brièvement à une cible qu'un ordre vient d'un allié. |
| **Silhouette amie** | Infiltration | Le lanceur prend l'apparence d'un type de créature choisi. |
| **Mur absent** | Contrôle | Fait croire qu'une case est bloquée alors qu'elle ne l'est pas. |
| **Mur présent** | Défense | Cache un obstacle réel ou donne l'impression d'une couverture inexistante. |
| **Panique imaginaire** | Psychologie | Fait apparaître à la cible ce qu'elle craint ; interaction future avec Courage. |
| **Disparition** | Mobilité | Camouflage bref jusqu'à action hostile ou détection. |

## Invocation

| Sort | Rôle | Idée |
|---|---|---|
| **Corbeaux éclaireurs** | Exploration | Révèle temporairement une portion de carte. |
| **Familier** | Utilitaire | Invoque une petite créature persistante aux capacités limitées. |
| **Élémentaire mineur** | Invocation | Créature de combat simple, type dépendant d'une seconde école éventuelle. |
| **Élémentaire majeur** | Invocation | Version puissante et coûteuse. |
| **Nuée affamée** | Zone | Invoque une nuée gênant déplacement et perception. |
| **Porte fugace** | Mobilité | Déplacement court entre deux cases visibles. |
| **Bourbier** | Contrôle terrain | Crée une zone difficile / immobilisante. |
| **Appel du prédateur** | Invocation | Fait apparaître temporairement une bête adaptée au terrain. |

## Vie

| Sort | Rôle | Idée |
|---|---|---|
| **Premiers soins** | Soin | Soin monocible faible et fiable. |
| **Suture magique** | Soin | Soin plus lent mais efficace sur une cible très blessée. |
| **Régénération** | Soin | Rend des PV sur plusieurs tours. |
| **Soins de masse** | Zone | Soigne plusieurs alliés proches. |
| **Second souffle** | Buff | Rend temporairement Endurance / Courage à une cible épuisée. |
| **Purge** | Support | Retire poison ou autre altération biologique compatible. |
| **Croissance sauvage** | Terrain | Fait pousser rapidement végétation / racines sur une zone. |
| **Refus de mourir** | Ultime défensif | Empêche temporairement une cible de tomber sous un seuil fatal ; règles à définir. |

## Nécromancie

| Sort | Rôle | Idée |
|---|---|---|
| **Nécrose** | Attaque CAC | Dégâts directs au contact. |
| **Toucher flétrissant** | Debuff | Réduit temporairement Force ou Endurance. |
| **Zombification** | Invocation | Relève un cadavre comme combattant simple. |
| **Spectre** | Invocation | Invoque une entité très résistante aux dégâts physiques ordinaires. |
| **Main du tombeau** | Contrôle | Des mains surgissent du sol et retiennent une cible. |
| **Vol de vigueur** | Drain | Blesse une cible et rend une partie de l'effet au lanceur. |
| **Marque funéraire** | Debuff | Rend une cible plus vulnérable à certains effets nécromantiques. |
| **Dernier service** | Utilitaire noir | Un cadavre allié accomplit une dernière action simple. |

## Feu

| Sort | Rôle | Idée |
|---|---|---|
| **Flèche de feu** | Attaque | Projectile monocible rapide. |
| **Boule de feu** | Zone | Explosion autour d'une case. |
| **Jet de flammes** | Cône | Attaque de courte portée sur plusieurs cases. |
| **Arme enflammée** | Buff arme | Ajoute une composante brûlante à une arme. |
| **Manteau de braises** | Défense | Protège du froid et punit éventuellement le contact. |
| **Flaque de magma** | Terrain | Rend une zone dangereuse / infranchissable temporairement. |
| **Mur de feu** | Terrain | Ligne persistante provoquant dégâts ou dissuasion. |
| **Combustion** | Exécution | Plus efficace contre une cible déjà brûlée / vulnérable au feu. |

## Foudre

| Sort | Rôle | Idée |
|---|---|---|
| **Éclair** | Attaque | Monocible à distance. |
| **Éclair rebondissant** | Multi-cible | Saute entre cibles proches. |
| **Décharge** | Attaque CAC | Gros impact électrique au contact. |
| **Arme foudroyante** | Buff arme | Ajoute une composante foudroyante. |
| **Arc statique** | Défense | Réaction électrique contre un assaillant proche. |
| **Magnétisme brutal** | Contrôle | Attire ou repousse une cible portant beaucoup de métal. |
| **Surcharge** | Debuff | Perturbe un objet, une armure ou un dispositif compatible. |
| **Orage local** | Zone | Petite zone frappée de décharges pendant plusieurs tours. |

## Eau / Glace

| Sort | Rôle | Idée |
|---|---|---|
| **Carreau de glace** | Attaque | Projectile froid monocible. |
| **Pluie de glace** | Zone | Rafale de projectiles sur une zone. |
| **Arme glacée** | Buff arme | Ajoute une composante glaciale. |
| **Armure climatisée** | Défense | Réduit l'effet du feu / de la chaleur. |
| **Bloc de glace** | Couverture | Crée un obstacle destructible. |
| **Sol gelé** | Terrain | Rend plusieurs cases glissantes / difficiles. |
| **Brume froide** | Zone | Réduit perception et éventuellement vitesse. |
| **Prison de glace** | Contrôle | Enferme brièvement une cible dans un bloc destructible. |

## Télékinésie

| Sort | Rôle | Idée |
|---|---|---|
| **Main invisible** | Déplacement | Déplace un objet ou une cible légère sans dégâts. |
| **Éjection** | Contrôle | Repousse violemment une cible et peut infliger des dégâts de collision. |
| **Attraction** | Contrôle | Tire une cible vers le lanceur. |
| **Lancer d'arme** | Attaque | Projette l'arme équipée puis la ramène. |
| **Bouclier cinétique** | Défense | Dévie une partie des projectiles. |
| **Chute contrôlée** | Mobilité | Réduit ou annule les effets d'une chute. |
| **Écrasement** | Attaque | Plaque une cible au sol ou contre un obstacle. |
| **Pas impossible** | Mobilité | Permet un déplacement bref ignorant certains obstacles physiques. |

## Transmutation

| Sort | Rôle | Idée |
|---|---|---|
| **Célérité** | Buff | Augmente Vitesse. |
| **Peau de pierre** | Buff | Augmente Endurance / résistance physique. |
| **Force démoniaque** | Buff | Augmente Force. |
| **Membres élastiques** | Buff | Augmente temporairement portée ou mobilité au prix d'une apparence regrettable. |
| **Chair de plume** | Buff | Réduit masse / dégâts de chute, mais peut rendre les poussées plus dangereuses. |
| **Fer vivant** | Buff armure | Améliore temporairement une pièce métallique. |
| **Forme minuscule** | Utilitaire | Réduit fortement la taille pour franchir un passage ou éviter certaines attaques. |
| **Forme monstrueuse** | Transformation | Gros bonus physiques avec contreparties mentales / sociales. |

## Sorts multi-écoles — parents multiples

Ces sorts exploitent explicitement la règle prévue : un sort peut avoir **plusieurs écoles parentes**. Les conditions exactes d'apprentissage et d'incantation restent à définir.

| Sort | Écoles | Rôle | Idée |
|---|---|---|---|
| **Élémentaire de feu** | Invocation + Feu | Invocation | Créature offensive brûlante. |
| **Élémentaire de glace** | Invocation + Eau | Invocation | Créature défensive / contrôle. |
| **Tempête électrique** | Foudre + Eau | Zone | L'eau amplifie ou propage les arcs électriques. |
| **Mirage brûlant** | Illusion + Feu | Contrôle | Illusion de chaleur capable de provoquer panique / erreur de ciblage. |
| **Faux revenant** | Illusion + Nécromancie | Psychologie | Fait croire au retour d'un mort connu. |
| **Marionnette cadavérique** | Nécromancie + Télékinésie | Contrôle | Manipule un corps sans véritablement le ressusciter. |
| **Sang bouillant** | Vie + Feu | Attaque interne | Affecte un organisme vivant de l'intérieur. |
| **Cryostase** | Vie + Eau | Défense | Met une cible vivante en stase froide pour la préserver. |
| **Corps de foudre** | Transmutation + Foudre | Mobilité | Transformation brève augmentant énormément la mobilité. |
| **Golem improvisé** | Transmutation + Invocation | Invocation | Anime temporairement une masse de matière proche. |
| **Main du géant** | Télékinésie + Transmutation | Contrôle | Force télékinétique massive, lente mais très puissante. |
| **Résurrection imparfaite** | Vie + Nécromancie | Exceptionnel | Ramène provisoirement quelqu'un au prix d'un coût / risque considérable. |

## Structure de données future proposée

Un sort peut être stocké comme contenu statique :

```json
{
  "id": "fire.fireball",
  "name": "Boule de feu",
  "schools": ["Feu"],
  "tags": ["attaque", "zone", "projectile"]
}
```

Mais `known` et `mastery` appartiennent **au mercenaire**, pas au catalogue global.

Catalogue :

```js
SpellDefinition {
  id,
  name,
  schools[],
  tags[],
  description,
  schoolRequirement,
  learningDifficulty,
  castDifficulty,
  manaCost,
  effectDefinition
}
```

État personnel :

```js
MercenarySpell {
  spellId,      // référence SpellDefinition.id ; clé stable de sauvegarde
  known: true,
  mastery: 0..100
}
```

Cette séparation évite de dupliquer toute la définition du sort dans chaque mercenaire.

### Identifiants stables et sauvegarde

Le nom affiché d'un sort n'est jamais utilisé comme clé persistante. Le catalogue porte un `id` stable (ex. `fire.fireball`) et l'état du mercenaire référence uniquement cet identifiant via `spellId`. On peut ainsi renommer / traduire « Boule de feu » sans casser les sauvegardes.

### Types de dégâts du catalogue

Quand un sort possède `type_degats`, la valeur référence le `code` stable de `data/reference/damage-types.json` (`burning`, `freezing`, `lightning`, `blunt`, etc.), jamais le libellé affiché. Cela évite de casser les données lors d'un renommage ou d'une traduction.
