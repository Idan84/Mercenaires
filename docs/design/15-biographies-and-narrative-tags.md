# Biographies de mercenaires — banque taguée V0

Chaque mercenaire doit sembler avoir vécu avant d'arriver, sans génération IA en direct. Comme pour les avatars : une
**grande banque de biographies** écrites à l'avance, chacune avec des **tags** ; le jeu choisit le texte le plus
compatible et le fige sur le mercenaire. Ton contrôlé, aucun coût IA ni réseau, textes relisibles et traduisibles.

## Décisions d'Idan (2026-10-04)

- **Principe validé** : banque de packs tagués, choisis selon le profil, **jamais réutilisés dans une partie**, même
  après la mort du mercenaire (le Mémorial garde sa bio sans la voir réapparaître ailleurs).
- **La bio se découvre au recrutement**, pas à la Taverne : seuls les membres de la compagnie en ont une (capitaine et
  escouade initiale à la création de la partie, puis chaque recrue à la signature).
- **Textes V0 acceptés tels quels pour l'instant** ; Idan relira le fond plus tard.
- Affichage : `short`, `rumor` et `motto` en tête de l'onglet Profil de la fiche.

## Un pack, pas une phrase Frankenstein

Un pack est **un petit ensemble cohérent**, pas assemblé mot par mot : `short` (le texte de la fiche), `rumor` (pour la
Taverne, une infobulle ou un événement), `motto` (cosmétique), ses tags, son genre (`any` le plus souvent) et un poids.
Ses textes sont des **modèles** (`{nom}`, `{Il|Elle}`), accordés à l'affichage. Une V2 pourra assembler des fragments.

Catalogue : `data/reference/biographies.json` (30 packs, `proposal-v0` : matériau de test et direction éditoriale).

## Tags

**Contraintes dures** (le pack est exclu si elles ne correspondent pas) : un ou plusieurs **peuples** ; un **genre** si
le texte est genré (le genre vient de l'avatar : la bio s'attribue **après l'avatar**) ; une **culture** si l'anecdote en
dépend vraiment. Sans contrainte, le pack est générique.

**Tags souples** (pour le score) : origine sociale, culture, profil `melee / ranged / magic`, les **deux**
caractéristiques les plus hautes et les deux plus basses, école magique dominante, arme ou famille, alignement,
réputation, courage, chance et prétentions faibles ou élevées. Trois tags utiles valent mieux que dix-sept inutiles.

## Choix du pack

1. retirer les packs incompatibles et ceux déjà utilisés dans la partie ;
2. calculer le score souple, plus un petit bruit aléatoire ;
3. le meilleur gagne (le poids est réservé à un futur tirage parmi les finalistes).

Poids de départ, à tester :

| Correspondance | Score |
|---|---:|
| Origine sociale | +15 |
| Culture | +12 |
| Profil combat | +10 |
| Caractéristique forte | +8 |
| Caractéristique faible | +8 |
| École magique | +8 |
| Famille d'arme | +6 |
| Alignement | +4 |
| Réputation / courage / chance / prétentions | +3 |
| Bruit aléatoire | 0 à +5 |

Un pack sans tag spécifique reste un excellent repli. Avec 500 à 1 000 packs, l'unicité ne coûte presque rien.

## Ton

**Dark fantasy adulte, sec, drôle, parfois triste ; jamais « lol random ».** Le jeu peut être absurde ; le narrateur
garde son sérieux.

- Bon : « A servi dans trois armées. Deux n'existent plus. Il refuse de préciser si c'est une coïncidence. »
- Moins bon : « MDR il adore les licornes et les patates explosives !!! »
- Autre exemple, hors banque (Nécromancie) : « Soutient que parler aux morts est une compétence sociale comme une autre.
  Les morts n'ont pas encore déposé de plainte. »

## Encore ouvert

- Des biographies évolutives : une ligne ajoutée après un exploit, une blessure, une trahison ?
