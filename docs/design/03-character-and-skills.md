# Personnage & compétences

Ce qui décrit un mercenaire après sa génération : **caractéristiques fondamentales → états temporaires → valeurs
dérivées** ; résistances, identité, morphologie et attributs cachés restent à part des valeurs calculées.

Données : `data/reference/skills.json` (compétences et fiches d'armes : maîtrise, dés et puissances de blessure, Prise
`1 main / 2 mains / Au choix`, malus vitesse, portée, cadence, recharge, contre-charge, zone, bonus de charge) et
`characteristics.json`. Idée non développée : les [titres
acquis](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/02%20%E2%80%94%20Personnage%20%26%20comp%C3%A9tences/Titres%20acquis%203eac799da3d181b58ccceb1fbb60d42f.md)
(archive Notion). Voir aussi les docs 08 (progression), 09 (réputation) et 12 (magie).

## Identité descriptive / cosmétique

**Nom**, **Âge**, **Taille**, **Corpulence** et **Biographie courte** n'entrent dans aucune formule. Ils sont générés
**après** le profil mécanique, pour s'en inspirer sans boucle : une grande Force peut rendre une grande taille plus
probable, jamais l'inverse. La biographie est drôle et marquée (doc 15).

## Génération V1 — Camp, compétences de terrain et styles martiaux

### Camp

**Médecine** et la catégorie **Artisanat** appartiennent au domaine **Camp** :

`Valeur = (1 + (Charisme + Intelligence) / 100) × 6D6`

Sous-compétences d'Artisanat (Forge, Alchimie, Couture…) :

`Sous-compétence Artisanat = (1 + (Dextérité + Intelligence) / 100) × 6D6`

### Martial — compétences dérivées

L'**Agilité** du design est la caractéristique **Dextérité**.

- **Pièges** = `Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2) × 0,5`
- **Discrétion** = `Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2) × 0,5`
- **Combat à deux armes** = `Max(arme de mêlée utilisable à 1 main) × Rand(0,8 ; 1,2)`
- **Combat à une main** = `Max(arme de mêlée utilisable à 1 main) × Rand(0,8 ; 1,2)` (Idan, 2026-11-02 ; effet : doc 04)
- **Combat à deux mains** = `Max(arme de mêlée utilisable à 2 mains) × Rand(0,8 ; 1,2)`
- **Combat à mains nues** : **désactivé** (Idan, 2026-11-02 : rien ne s'en sert en combat ; à reprendre avec un
  équipement et de vraies techniques) : ni tiré ni affiché. Ancienne formule : `Moyenne(Force, Dextérité) × Rand(0,8 ;
  1,2) × 0,5`.
- **Armes naturelles** : **retirées des mercenaires** (Idan, 2026-11-02) ; seules les créatures invoquées les gardent
  (griffes, crocs).

Le facteur **× 0,5** ramène Pièges et Discrétion, tirés des caractéristiques (≈ 60 en moyenne), à l'échelle des armes
(1D20 / 2D20) (Idan, 2026-10-21).

Pour les styles à une / deux mains, les armes à distance et les boucliers sont exclus. Une arme **Au choix** compte dans
les deux calculs.

### Armes de prédilection

Après tous les modificateurs, chaque mercenaire reçoit trois armes de prédilection : **Une main**, **Deux mains**,
**Distance**. Dans chaque famille, l'arme au plus haut `ScorePredilection = MaîtriseCatégorieMartiale +
MaîtriseArmePrécise`. Elle s'affiche sur la fiche et peut guider l'équipement initial.

## Aptitudes binaires V1

Elles valent **vrai / faux**, hors des maîtrises numériques.

### Physiologie

**Vision nocturne** (automatique) si au moins une condition : cultures Elfes noirs, Gobelins des cavernes, Gnomes des
cavernes, Reptiliens des marécages, Tribus des forêts anciennes ; ascendance Sang de démon. Aucun peuple entier ne l'a.

**Vol** : à la création pour le sang féerique, le sang divin et le sang de dragon bâtard ; règles en combat : doc 04 (« Capacités de terrain »).

### Martial

#### Empoisonnement des armes

Somme des bonus en **points de pourcentage**, bornée de 0 à 100 %, puis jet. Les bonus se cumulent.

- Origine Hors-la-loi : +25 pp
- Elfes noirs : +45 pp ; Reptiliens des marécages : +30 pp ; Tribus de la jungle : +25 pp ; Gobelins des cavernes :
  +20 pp ; Reptiliens des cités-temples : +10 pp

### Ports d'armure

Les chances se cumulent en points de pourcentage.

| Origine ou culture | Légère | Intermédiaire | Lourde |
|---|---:|---:|---:|
| Soldat / Guerrier / Combattant | +90 | +55 | +15 |
| Noble | +20 | +10 | +10 |
| Orcs noirs | +25 | +30 | +30 |
| Nains des montagnes | +25 | +35 | +40 |
| Empire de la nuit blanche | +15 | +20 | +25 |
| Tribus nordiques | +15 | +20 | +20 |
| Ogres des cités humaines | +10 | +15 | +15 |

### Profil magique et armures

Après la génération finale des écoles de magie :

- si **aucune école ne dépasse 25** : +50 pp légère, +30 pp intermédiaire, +20 pp lourde ;
- si **au moins une école dépasse 37,5** : chaque probabilité finale de port × `0,8` (malus relatif, pas −20 points).

Probabilité finale plafonnée à 100 %.

### Hiérarchie des ports

Port lourde ⇒ intermédiaire ⇒ légère. Les trois jets peuvent être faits, puis la hiérarchie s'applique au résultat.

### Sans le port, pas d'armure

Idan, 2026-11-03 : « le mercenaire ne devrait pas pouvoir l'équiper du tout ». Une armure demande le port de son type (ou
d'un plus lourd) ; les Vêtements, rien. L'Intendance ne la propose pas ; il peut la garder dans son inventaire, sans la
porter. Recrues et ennemis partent avec une armure qu'ils savent porter.

### Magie en armure

Compétence martiale de 0 à l'infini, tirée à la fin de la création : **2D6** pour un nain, **1** pour tous les autres,
ennemis compris (Idan, 2026-11-09). Elle retire la moitié de sa valeur au malus magique de l'armure, du bouclier et du
casque (doc 12) et gagne 80 XP par sort raté tant que l'équipement gêne (doc 08). Fiche : onglet Magie.

## Fiche : la valeur des armes (Idan, 2026-11-23)

« Le problème, c'est un problème de lecture […] on touche à rien, mais on affiche uniquement l'arme avec la valeur
arme+cat. » Les règles ne changent pas : la catégorie et l'arme restent deux compétences, additionnées au combat
(doc 04). Sur la fiche (onglet Compétences) :

- une arme montre sa valeur au combat, **arme + catégorie** ; un bouclier, bouclier + Boucliers ;
- une catégorie d'armes montre la valeur de sa **meilleure arme** et, dans sa fenêtre, plus de valeur à elle ;
- les styles (une main, deux mains, deux armes, Boucliers) gardent leur valeur ; les animaux ne changent pas.

Une arme jamais pratiquée montre **1** (arme 1 + catégorie 0 : doc 02, « Compétences non pratiquées », Idan,
2026-11-23) ; une perte d'XP ne fait pas descendre une compétence sous 1 (doc 08).

## Fiche : onglets Camp et Historique (Idan, 2026-10-24)

- **Camp** : Transmission du savoir, Intendance, Médecine, et l'Artisanat avec ses huit métiers, du meilleur au moins
  bon ; en tête, le point fort au camp et le meilleur métier.
- **Historique** : compteurs (jours dans la compagnie, missions, adversaires abattus par ses coups, retours blessé,
  coups encaissés, coups critiques) et journal daté, du plus récent au plus ancien : arrivée (fondation, escouade de
  départ, contrat), retours de mission (adversaires abattus, blessure et convalescence), échanges d'équipement
  (acceptés ou refusés).
- **Flèches ‹ ›** à côté du nom (et flèches du clavier) : mercenaire précédent ou suivant, dans l'ordre de « Mes
  mercenaires », capitaine en tête (Idan, 2026-10-24).
