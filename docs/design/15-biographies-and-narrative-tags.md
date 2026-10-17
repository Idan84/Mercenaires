# Biographies de mercenaires — banque taggée V0

> Proposition Chatty — 4 octobre 2026. Aucun comportement n'est encore codé.

## Intention

Chaque mercenaire doit donner l'impression d'avoir vécu avant d'arriver à la Taverne, sans demander une génération IA en direct.

La proposition est volontairement proche du système d'avatars :

1. on écrit / pré-génère une **grande banque de biographies** ;
2. chaque texte reçoit des **tags** ;
3. le moteur choisit le texte le plus compatible avec le mercenaire ;
4. le texte choisi est stocké sur le mercenaire et ne change plus.

Avantages :
- ton éditorial contrôlé ;
- aucun coût IA ni dépendance réseau en jeu ;
- textes relisibles / localisables ;
- résultat déterministe après sauvegarde ;
- possibilité de produire très vite des centaines de textes avec l'IA, puis de les garder comme contenu statique.

## Pack plutôt que phrase Frankenstein

V0 : **un pack est écrit comme un petit ensemble cohérent**, pas assemblé mot par mot.

```json
{
  "id": "bio_0042",
  "short": "A servi dans trois armées. Deux n'existent plus. Il refuse de préciser si c'est une coïncidence.",
  "rumor": "On raconte qu'il dort en armure pour gagner du temps.",
  "motto": "On verra bien.",
  "tags": {
    "people": ["Humain", "Nain", "Orc"],
    "origin": ["Soldat / Guerrier / Combattant"],
    "profile": ["melee"],
    "high": ["Endurance"],
    "low": [],
    "alignment": [],
    "magic": []
  },
  "gender": "any",
  "weight": 1
}
```

Le champ principal affiché dans la fiche est `short`. `rumor` peut servir à la Taverne, dans un tooltip ou un événement. `motto` est purement cosmétique.

Une V2 pourra assembler plusieurs fragments, mais le **pack complet** évite les biographies grammaticalement correctes et humainement absurdes.

## Tags

### Contraintes dures

Un pack peut être :

- **générique** : aucun peuple imposé ;
- réservé à un ou plusieurs **peuples** ;
- réservé à un **genre visuel** si le texte est genré ;
- réservé à une **culture** si l'anecdote en dépend réellement.

Si une contrainte dure ne correspond pas, le pack est exclu.

Le genre vient de l'avatar attribué : on assigne donc idéalement la bio **après l'avatar**. La majorité des textes devraient rester `gender:any`.

### Tags souples

Les tags souples servent au score :

- origine sociale ;
- culture ;
- profil `melee / ranged / magic` ;
- caractéristique dominante ;
- caractéristique faible ;
- école magique dominante ;
- arme / famille d'arme ;
- alignement ;
- réputation faible / moyenne / haute ;
- courage faible / élevé ;
- chance faible / élevée ;
- prétentions salariales faibles / élevées.

Il ne faut pas tout taguer. Comme pour les avatars : un texte avec trois tags utiles vaut mieux qu'un texte avec dix-sept tags inutiles.

## Matching V0 proposé

1. retirer les packs incompatibles avec les contraintes dures ;
2. retirer les packs déjà utilisés dans la sauvegarde ;
3. calculer un score souple ;
4. ajouter un petit bruit aléatoire pour éviter que deux profils proches reçoivent toujours le même type de texte ;
5. tirer parmi les meilleurs.

Poids de départ proposés — à tester, pas à considérer comme règle :

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

Un pack sans tag spécifique reste un excellent fallback.

## Unicité

Contrairement aux portraits, produire du texte coûte presque rien.

**Proposition : une bio n'est jamais réutilisée dans une même sauvegarde**, même après la mort du mercenaire. Le Mémorial peut donc conserver sa bio sans risque de voir le même passé réapparaître sur Gérard II trois semaines plus tard.

Avec 500 à 1 000 packs, ce principe devient pratiquement gratuit.

## Ton

Objectif : **dark fantasy adulte, sec, drôle, parfois triste ; jamais “lol random”.**

Le texte doit pouvoir être lu sérieusement tout en ayant une pointe de travers.

Bon :
> A servi dans trois armées. Deux n'existent plus. Il refuse de préciser si c'est une coïncidence.

Moins bon :
> MDR il adore les licornes et les patates explosives !!!

Le jeu peut être absurde ; le narrateur, lui, garde son sérieux.

## Premiers packs de ton — exemples

### Génériques

**G01 — Vétéran**
> A servi dans trois armées. Deux n'existent plus. Refuse de préciser si c'est une coïncidence.

Tags : `origin:soldat`, `profile:melee`.

**G02 — Optimiste professionnel**
> N'a jamais remporté une bataille facile. Soutient que cela prouve seulement qu'on ne lui confie que les importantes.

Tags : `high:courage`.

**G03 — Sens des affaires**
> A calculé le prix exact auquel sa loyauté devient négociable. Le chiffre change curieusement chaque semaine.

Tags : `origin:commercant`, `high:pretentions`.

**G04 — Survivant**
> Porte trois cicatrices qu'il attribue à trois monstres différents. Les témoins parlent d'une seule chèvre particulièrement agressive.

Tags : `high:endurance`, `low:charisma`.

### Gobelins

**GO01 — Ingénieur**
> Affirme avoir inventé une arbalète pliable. Les trois premiers prototypes ont surtout plié leurs utilisateurs.

Tags : `people:Gobelin`, `profile:ranged`, `high:dexterity`.

**GO02 — Collectionneur**
> Ne vole jamais. Il récupère des objets dont les propriétaires ont momentanément perdu le contrôle administratif.

Tags : `people:Gobelin`, `origin:hors-la-loi`.

### Nains

**N01 — Dette familiale**
> Sa famille lui parle encore, mais uniquement par l'intermédiaire d'un notaire. Il considère cela comme une amélioration.

Tags : `people:Nain`, `origin:noble|commercant`.

**N02 — Perfectionniste**
> A quitté son ancienne compagnie après qu'on lui a demandé de réparer une épée « à peu près correctement ».

Tags : `people:Nain`, `high:artisanat`.

### Ogres

**O01 — Diplomate**
> A découvert tardivement que « poser calmement le problème sur la table » était une expression. La table précédente n'a pas survécu.

Tags : `people:Ogre`, `high:force`, `low:charisma`.

**O02 — Érudit**
> Lit très lentement, mais retient tout. Possède une opinion argumentée sur chaque livre qu'il a mangé par erreur.

Tags : `people:Ogre`, `origin:erudit`.

### Elfes

**E01 — Longue mémoire**
> Se souvient parfaitement d'une insulte prononcée il y a cent douze ans. A oublié le nom de la personne, mais pas le programme de vengeance.

Tags : `people:Elfe`, `high:volonte`.

**E02 — Mage blasé**
> A étudié la magie pendant plus longtemps que la plupart des humains ne vivent. Utilise principalement ce savoir pour réchauffer son vin.

Tags : `people:Elfe`, `profile:magic`.

### Orcs

**OR01 — Philosophe pratique**
> Pense que tous les conflits peuvent être résolus par la discussion. Il appelle « discussion » la période très courte avant le premier coup.

Tags : `people:Orc`, `profile:melee`.

**OR02 — Mauvaise réputation**
> Sa réputation le précède. Lui aussi, généralement, parce qu'il court très vite quand elle arrive.

Tags : `people:Orc`, `high:vitesse`, `low:courage`.

### Magie

**M01 — Feu**
> A appris la magie du feu pour impressionner quelqu'un. Ne se rappelle plus qui, mais continue par respect pour les dégâts matériels déjà engagés.

Tags : `profile:magic`, `magic:Feu`.

**M02 — Nécromancie**
> Soutient que parler aux morts est une compétence sociale comme une autre. Les morts n'ont pas encore déposé de plainte.

Tags : `profile:magic`, `magic:Nécromancie`.

**M03 — Vie**
> A choisi la magie de Vie après avoir découvert que ses camarades considéraient « ne pas mourir » comme un avantage contractuel.

Tags : `profile:magic`, `magic:Vie`.

## Données à stocker sur le mercenaire

V0 minimale :

```js
mercenary.biography = {
  id: "bio_0042",
  short: "...",
  rumor: "...",
  motto: "..."
}
```

La sauvegarde stocke le texte choisi ou, au minimum, l'ID du pack avec une version du catalogue.

Pour éviter qu'un changement ultérieur du catalogue réécrive le passé d'un mercenaire existant, la solution la plus sûre est de **figer le contenu sélectionné dans la sauvegarde**.

## Décisions d'Idan (2026-10-04)

- **Principe validé** : banque de packs tagués, choisis selon le profil, jamais réutilisés dans une sauvegarde.
- **La bio se découvre au recrutement**, pas à la Taverne. Seuls les membres de la compagnie en ont une, ce qui demande aussi moins de textes.
- **Textes V0 acceptés tels quels pour l'instant** ; Idan relira le fond plus tard.
- Affichage : `short`, `rumor` et `motto` dans la fiche, en tête de l'onglet Profil (proposition non contestée).

## Encore ouvert

- veut-on plus tard des biographies évolutives : une seconde ligne ajoutée après un exploit, une blessure, une trahison, etc. ?

## Implémentation (prototype)

- Moteur : `game-core/biography.js` (PR #34). Contraintes dures : peuple, et genre si le pack est genré. Score souple avec les poids ci-dessus, plus un bruit de 0 à 5 ; le meilleur gagne. `weight` est réservé pour un futur tirage parmi les finalistes.
- `high` et `low` : les **deux** caractéristiques les plus hautes et les plus basses. La culture est un tag souple.
- Le **pack** est figé sur le mercenaire, mais ses textes restent des **modèles** (`{nom}`, `{Il|Elle}`), accordés à l'affichage : le sexe viendra de l'avatar.
- Attribution : capitaine et escouade initiale à la création de la partie, puis chaque recrue à la signature. `state.biographiesUsed` empêche toute réutilisation, même après la mort. Une ancienne sauvegarde est complétée au chargement, puis sauvegardée aussitôt.

## Banque V0 structurée

Une première banque de **30 packs** a été préparée puis transférée dans le catalogue canonique `data/reference/biographies.json` de la PR #34, qui contient aussi le moteur de matching. Cette page reste la source de design ; le référentiel d'exécution n'est pas dupliqué dans cette branche.

La banque est explicitement `proposal-v0` : elle sert de matériau de test et de direction éditoriale, pas de contenu verrouillé.
