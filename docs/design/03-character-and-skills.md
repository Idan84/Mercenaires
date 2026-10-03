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

- **Pièges** = `Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2)`
- **Discrétion** = `Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2)`
- **Combat à deux armes** = `Max(arme de mêlée utilisable à 1 main) × Rand(0,8 ; 1,2)`
- **Combat à mains nues** = `Moyenne(Force, Dextérité) × Rand(0,8 ; 1,2)`
- **Combat à deux mains** = `Max(arme de mêlée utilisable à 2 mains) × Rand(0,8 ; 1,2)`
- **Armes naturelles** = `0` avant application des modificateurs de la Matrice de génération.

Pour les styles à une/deux mains, les armes à distance et les boucliers sont exclus. Une arme dont la prise est **Au choix** peut servir dans les deux calculs.

### Armes de prédilection

Après génération et application de tous les modificateurs, chaque mercenaire reçoit trois indications de prédilection :

- **Une main**
- **Deux mains**
- **Distance**

Pour chaque arme candidate :

`ScorePredilection = MaîtriseCatégorieMartiale + MaîtriseArmePrécise`

L’arme possédant le score le plus élevé dans chaque famille devient l’arme de prédilection correspondante. Ce résultat sert d’indication sur la fiche et pourra guider la génération / attribution d’équipement initial.


## Aptitudes binaires générées par identité

Ces aptitudes valent uniquement **true / false**.

### Physiologie
- Vision nocturne
- Vol

### Martial
- Empoisonnement des armes
- Port d’armure légère
- Port d’armure intermédiaire
- Port d’armure lourde

Le jeu n’utilise pas de classes. À la création, ces aptitudes sont donc déterminées par :
- Peuple
- Ascendance
- Culture
- Origine sociale

Règle V1 proposée et retenue :
`Aptitude = PeupleAccorde OR AscendanceAccorde OR CultureAccorde OR OrigineAccorde`

Il n’y a pas de jet aléatoire supplémentaire : l’aléatoire vient déjà du tirage de l’identité. Une aptitude peut aussi être acquise plus tard par les autres moyens prévus (entraînement, magie, mutation, enseignement, événement, etc.).

Les tables précises indiquant quelles identités accordent quelles aptitudes restent à renseigner.
