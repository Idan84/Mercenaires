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
