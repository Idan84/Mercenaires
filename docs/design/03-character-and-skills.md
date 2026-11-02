> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# 02 — Personnage & compétences

Caractéristiques, attributs, compétences et éléments persistants qui décrivent un mercenaire après sa génération.

<aside>
🧬

Architecture de référence : **caractéristiques fondamentales → états temporaires → valeurs dérivées**. Les bases conservent aussi les résistances, l’identité, la morphologie et les attributs cachés sans les mélanger avec les valeurs calculées.

</aside>

La base **Caractéristiques & attributs** possède des vues séparées pour Caractéristiques, Résistances, États temporaires et Valeurs dérivées. La base **Compétences** porte également les fiches d'armes : maîtrise, dés et puissances de blessure, **Prise** (`1 main / 2 mains / Au choix`), **Malus vitesse arme base**, portée en hexagones, cadence de tir, recharge, capacité de contre-charge, attaque de zone et **Bonus charge base** (valeurs à équilibrer). Les vues d'équilibrage dédiées sont exposées dans `04 — Équipement`.

[Compétences](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/02%20%E2%80%94%20Personnage%20%26%20comp%C3%A9tences/Comp%C3%A9tences%2013a89648818840a7aa9a0698e018b039.csv)

[Caractéristiques & attributs](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/02%20%E2%80%94%20Personnage%20%26%20comp%C3%A9tences/Caract%C3%A9ristiques%20%26%20attributs%20eb1e6e789f9343c6937931157a26c27e.csv)

[Titres acquis](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/02%20%E2%80%94%20Personnage%20%26%20comp%C3%A9tences/Titres%20acquis%203eac799da3d181b58ccceb1fbb60d42f.md)

[Magie — apprentissage, incantation & premier catalogue](/design/#doc=12-magic.md)

[Progression & expérience](/design/#doc=08-progression-and-experience.md)

[Réputation, renommée & salaires](/design/#doc=09-reputation-renown-and-salaries.md)
## Identité descriptive / cosmétique

Les champs **Nom du mercenaire**, **Âge**, **Taille**, **Corpulence** et **Biographie courte** sont des informations **non-codantes** : elles n'entrent dans aucune formule de gameplay.

Elles sont générées **après** le profil mécanique afin de pouvoir s'en inspirer sans créer de boucle de calcul. Exemple : une Force très élevée peut augmenter la probabilité d'une corpulence massive ou d'une grande taille, mais la taille générée ne revient jamais augmenter la Force.

La **Biographie courte** est destinée à être drôle et marquée, en s'appuyant sur le peuple, la culture, l'origine, les caractéristiques dominantes/faibles, les compétences et les particularités du mercenaire.

Le générateur cosmétique précis reste à définir ; son absence ne bloque pas `Create_Mercenary()` côté gameplay.


## Génération V1 — Camp, compétences de terrain et styles martiaux

### Camp

**Médecine** et la catégorie **Artisanat** appartiennent au domaine **Camp** et utilisent la même génération brute que les autres compétences Camp :

`Valeur = (1 + (Charisme + Intelligence) / 100) × 6D6`

Les sous-compétences d’Artisanat (Forge, Alchimie, Couture, etc.) conservent leur génération propre :

`Sous-compétence Artisanat = (1 + (Dextérité + Intelligence) / 100) × 6D6`

### Martial — compétences dérivées

Dans les formules ci-dessous, le terme **Agilité** du design correspond à la caractéristique mécanique **Dextérité**.

- **Pièges** = `Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2) × 0,5`
- **Discrétion** = `Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2) × 0,5`
- **Combat à deux armes** = `Max(arme de mêlée utilisable à 1 main) × Rand(0,8 ; 1,2)`
- **Combat à une main** = `Max(arme de mêlée utilisable à 1 main) × Rand(0,8 ; 1,2)` (Idan, 2026-11-02 ; effet : doc 04)
- **Combat à deux mains** = `Max(arme de mêlée utilisable à 2 mains) × Rand(0,8 ; 1,2)`
- **Combat à mains nues** : **désactivé pour l'instant** (Idan, 2026-11-02 : rien ne s'en sert en combat ; à reprendre avec
  un équipement et de vraies techniques) : ni tiré ni affiché. Ancienne règle : `Moyenne(Force, Dextérité) × Rand(0,8 ; 1,2) × 0,5`.
- **Armes naturelles** : **retirées des mercenaires** (Idan, 2026-11-02) ; elles restent aux créatures invoquées, qui
  attaquent avec leurs griffes et leurs crocs. Colonne `mercenaire` de `skills.json` : `false` pour ces deux compétences.

Le facteur **× 0,5** (constante `generation.martial.stat_skill_factor`) ramène Pièges et Discrétion (et Combat à mains nues, désactivé), tirés des caractéristiques (≈ 60 en moyenne), à l’échelle des armes tirées au 1D20 / 2D20 : sans lui, 78 % des mercenaires étaient meilleurs à mains nues qu’avec leur meilleure arme (Idan, 2026-10-21).

Pour les styles à une/deux mains, les armes à distance et les boucliers sont exclus. Une arme dont la prise est **Au choix** peut servir dans les deux calculs.

### Armes de prédilection

Après génération et application de tous les modificateurs, chaque mercenaire reçoit trois indications de prédilection :

- **Une main**
- **Deux mains**
- **Distance**

Pour chaque arme candidate :

`ScorePredilection = MaîtriseCatégorieMartiale + MaîtriseArmePrécise`

L’arme possédant le score le plus élevé dans chaque famille devient l’arme de prédilection correspondante. Ce résultat sert d’indication sur la fiche et pourra guider la génération / attribution d’équipement initial.




## Aptitudes binaires V1

Ces aptitudes valent uniquement **true / false** et n’entrent pas dans les maîtrises numériques.

### Physiologie

#### Vision nocturne — automatique

Vision nocturne vaut `true` si au moins une des conditions suivantes est satisfaite :

- Culture : Elfes noirs
- Culture : Gobelins des cavernes
- Culture : Gnomes des cavernes
- Culture : Reptiliens des marécages
- Culture : Tribus des forêts anciennes
- Ascendance : Sang de démon

Aucun peuple entier ne possède Vision nocturne par défaut.

#### Vol

`Vol = false` en V1.

La mécanique de vol est volontairement reportée : elle implique déplacement, vitesse, endurance, maniabilité et interactions de terrain supplémentaires.

### Martial

#### Empoisonnement des armes

Probabilité finale = somme des bonus identitaires en **points de pourcentage**, plafonnée entre 0 et 100 %, puis jet binaire.

Origine :
- Hors-la-loi : +25 pp

Cultures :
- Elfes noirs : +45 pp
- Reptiliens des marécages : +30 pp
- Tribus de la jungle : +25 pp
- Gobelins des cavernes : +20 pp
- Reptiliens des cités-temples : +10 pp

Les bonus se cumulent.

### Ports d’armure

Les chances identitaires se cumulent en points de pourcentage.

#### Port d’armure légère
- Soldat / Guerrier / Combattant : +90 pp
- Noble : +20 pp
- Orcs noirs : +25 pp
- Nains des montagnes : +25 pp
- Montagnes du Nord : +15 pp
- Tribus nordiques : +15 pp
- Ogres des cités humaines : +10 pp

#### Port d’armure intermédiaire
- Soldat / Guerrier / Combattant : +55 pp
- Noble : +10 pp
- Orcs noirs : +30 pp
- Nains des montagnes : +35 pp
- Montagnes du Nord : +20 pp
- Tribus nordiques : +20 pp
- Ogres des cités humaines : +15 pp

#### Port d’armure lourde
- Soldat / Guerrier / Combattant : +15 pp
- Noble : +10 pp
- Orcs noirs : +30 pp
- Nains des montagnes : +40 pp
- Montagnes du Nord : +25 pp
- Tribus nordiques : +20 pp
- Ogres des cités humaines : +15 pp

### Profil magique et armures

Après génération finale des écoles de magie :

- si **aucune école de magie ne dépasse 50**, ajouter :
  - +50 pp pour légère
  - +30 pp pour intermédiaire
  - +20 pp pour lourde
- si **au moins une école dépasse 75**, multiplier la probabilité finale de chaque port d’armure par `0,8`.

Le malus de 20 % est donc relatif, pas une soustraction de 20 points.

La probabilité finale est plafonnée à 100 %.

### Hiérarchie des ports

- Port d’armure lourde ⇒ Port d’armure intermédiaire ⇒ Port d’armure légère
- Port d’armure intermédiaire ⇒ Port d’armure légère

Les trois jets peuvent être calculés, puis la hiérarchie est appliquée au résultat final.

## Fiche : onglets Camp et Historique (Idan, 2026-10-24)

- **Camp** : les compétences de camp — Transmission du savoir, Intendance, Médecine — et l’Artisanat avec ses huit métiers, du meilleur au moins bon ; en tête, le point fort au camp et le meilleur métier.
- **Historique** : « tout ce qui concerne le mercenaire, aussi bien en journal qu’en stats accumulées ». Compteurs : jours dans la compagnie, missions, adversaires abattus (mis hors de combat par ses coups), retours de mission blessé, coups encaissés, coups critiques. Journal daté (jour de campagne et date du calendrier du camp), du plus récent au plus ancien : arrivée (fondation, escouade de départ, contrat signé), retours de mission (adversaires abattus, blessure et convalescence), échanges d’équipement (acceptés ou refusés).

Données : `mercenary.history` (`game-core/history.js`) — `since` (jour d’arrivée), les compteurs et `log` (faits datés, sans texte ; l’interface les raconte avec `character-sheet-copy.json`, `history`). Une partie sauvegardée avant reçoit un historique à partir du jour de contrat, sans ses missions passées, qui n’avaient pas été comptées.
