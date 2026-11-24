# 01 — Génération & identité

Génération de l’identité initiale d’un mercenaire. Pour le capitaine, le joueur choisit son identité, sans toucher aux
jets bruts ; pour les autres, tirages aléatoires et biais du capitaine
([00 — Démarrage de partie](/design/#doc=01-start-and-generation-functions.md)). Tables : `data/reference/` (peoples,
ancestries, cultures, social-origins, alignments, generation-matrix, d6-generation-scale…).

## Pipeline actuel

1. **Tirage brut** : caractéristiques fondamentales **20 + 3D20** ; résistances **1D6**.
2. **Peuple**, selon sa probabilité de base.
3. **Modificateurs du peuple** : caractéristiques et résistances appliquées ; modificateurs de compétences mémorisés.
4. **Ascendance** : jet de présence ; si oui, une ascendance compatible, puis son niveau.
5. **Modificateurs d’ascendance** (idem).
6. **Culture**, parmi celles du peuple.
7. **Modificateurs de culture** (idem).
8. **Origine sociale**, compatible avec la culture.
9. **Modificateurs d’origine sociale** (idem). **Cultures sans école de magie** (doc 12) : +1D6 Courage (Nains des
   montagnes, Nains esclaves) ou +1D6 Force (Ogres des cités humaines, Ogres des montagnes).
10. **Tirage brut des compétences**, en sachant déjà si un bonus de génération existe (il change le dé).
11. **Modificateurs de compétences** de la Matrice, jamais sur une compétence pas encore tirée :
    - **Ogres** (Idan, 2026-10-29) : **−1 en Bâtons** (arme de mage, doc 05), aucun bonus en Bâton long, **+1 en Armes
      contondantes** ; puis, hors échelle de la Matrice, **−1D6 de Discrétion**, sans descendre sous 0 ;
    - **sorts connus à la création** (doc 12) : école de la culture, meilleure et deuxième meilleure école.
12. **Domaine du mercenaire** (plus bas).
13. **Post-traitement** : valeurs dérivées, réputation personnelle initiale.

- **La Matrice de génération est la source de vérité de l’équilibrage** (peuples, ascendances, cultures, origines ×
  caractéristiques, résistances, compétences). Vide ou `0` : aucun effet ; `±1` à `±3` : bonus ou malus.
- **Échelle D6** : intensité 1 = `2D6`, 2 = `4D6`, 3 = `6D6`. Ascendances : niveau 1 = `2D6 / 4D6 / 6D6` ; niveau 2 =
  `4D6 / 8D6 / 12D6` ; niveau 3 = `6D6 / 10D6 / 15D6`.
- **Les dés sont des distributions de base** : ils doivent pouvoir être pondérés par la réputation du capitaine / de la
  compagnie, pour des candidats sensiblement meilleurs à forte réputation.

## Domaine du mercenaire

Idan, 2026-11-01 (`data/reference/domains.json`) : **Combat rapproché**, **Distance** ou **Mage**. Le domaine évolue
ensuite avec le titre (doc 19, « Domaine évolutif ») ; l’accentuation n’a lieu qu’une fois, à la génération.

- **Choix** : d’après le profil calculé pour l’équipement de départ et l’avatar (meilleure arme ou école, et ses
  caractéristiques). Un sort tiré pousse vers Mage si la magie est à **5 points** ou moins du meilleur score. Les archers
  restent tels quels.
- **Accentuation**, à somme nulle en moyenne : **+2D6** sur les deux caractéristiques du domaine, **−2D6** sur deux
  autres.

  | Domaine | Monte | Baisse |
  |---|---|---|
  | Combat rapproché | Force, Endurance | Puissance magique, Intelligence |
  | Distance | Perception, Dextérité | Force, Puissance magique |
  | Mage | Puissance magique, Intelligence | Force, Dextérité |

  Compétences : **+2D10** sur l’arme qu’il portera et sa catégorie, **−2D10** sur la meilleure arme de l’autre famille et
  sa catégorie. Un mage : **+2D10** dans l’école de son sort (sinon sa meilleure), −2D10 sur sa meilleure arme de mêlée
  et sur sa meilleure arme de tir.
- **Rattrapage du mage** : un Mage sans sort en apprend un dans sa meilleure école (doc 12).
- L’équipement de départ et l’avatar suivent le domaine. Pas de picto de domaine à côté du nom (Idan, 2026-11-12).

**Rééquilibrage des cultures** (Idan, 2026-11-01) : viser, pour chaque culture, 5 à 80 % dans chaque domaine. Points
ajoutés à la Matrice en deux séries. Exception : les **gnomes des villes** (il faudrait retirer des points à leur
culture) ; le garde-fou de l’escouade leur donne un corps-à-corps au départ.

| Arme, école ou caractéristique | Qui | Série 1 | Série 2 |
|---|---|---|---|
| Arc | Elfes des grandes cités | +1 | |
| Arc | Orcs (peuple) | +1 | |
| Arc | Orcs noirs | | +1 |
| Arc | Clans des grandes steppes ; Tribus des forêts anciennes | | +1 |
| Arbalète | Hommes-bêtes (peuple) ; Orcs (peuple) | +1 | |
| Arbalète | Orcs noirs | | +2 |
| Dague | Gnomes (peuple) | +1 | +1 |
| Lames courtes | Gnomes (peuple) | | +2 |
| Épée courte | Elfes sylvains | | +1 |
| Massue | Halflings des villages isolés | +1 | +1 |
| Sarbacane | Reptiliens des cités-temples | +1 | +1 |
| Tromblon, Canon à main | Ogres (peuple) | +1 | +1 |
| Armes à feu (catégorie) | Ogres (peuple) | | +1 |
| Télékinésie | Ogres (peuple) | +1 | +2 |
| Puissance magique | Ogres (peuple : −2 → −1) | | +1 |

Répartition mesurée (1 000 recrues par culture, 2026-11-01), en % corps à corps / distance / mage ; en gras, hors de 5 à
80 %. Elfes sylvains, gnomes des forêts et halflings des villages isolés oscillent entre 4 et 6 % de corps à corps.

| Peuple | Cultures |
|---|---|
| Elfe | Grandes cités 6/14/80 ; Elfes noirs 18/19/63 ; Elfes sylvains **4**/49/47 |
| Gnome | Cavernes 8/20/71 ; Forêts **4**/21/76 ; Villes **2**/12/**87** |
| Gobelin | Caravanes de ferrailleurs 17/62/21 ; Cavernes 32/50/18 ; Villes 26/45/30 |
| Halfling | Explorateurs 6/50/44 ; Cités humaines 5/45/50 ; Villages isolés **4**/34/62 |
| Homme-bête | Clans des grandes steppes 78/8/15 ; Forêts anciennes 64/5/31 ; Tribus nordiques 80/5/16 |
| Humain | Cités libres 49/11/41 ; Empire de la nuit blanche 71/9/21 ; Soleil Levant 62/10/28 ; Deux Fleuves 48/21/31 ; Jungle 47/15/38 |
| Nain | Montagnes 74/13/14 ; Nains du chaos 33/49/19 ; Nains esclaves 72/21/8 |
| Ogre | Cités humaines 75/16/10 ; Montagnes 78/17/6 ; Steppes 80/14/6 |
| Orc | Steppes 67/13/20 ; Villes 51/15/33 ; Orcs noirs 74/8/18 |
| Reptilien | Cités-temples 11/12/77 ; Marécages 18/21/61 ; Villes 23/12/65 |

### Garde-fou de l'escouade initiale

« Il faut 1 mage / 1 distance et 1 CAC sur une escouade » (Idan, 2026-11-01). Chaque domaine absent de l’escouade (sans
compter le capitaine) ajoute **un mercenaire**, même peuple, même culture : **au plus 2 en plus**. On le tire normalement
jusqu’à **30 fois** et on garde le premier qui tombe dans le domaine ; sinon, le dernier reçoit **ce domaine imposé**.

## Noms des personnages

Idan, 2026-10-21 (`data/reference/character-names.json`).

- **Le prénom respecte le sexe**, qui vient de l’avatar : il est réaccordé quand le portrait est posé, avec les noms de
  famille qui s’accordent (Volkov, Volkova). Sans avatar sexué (à valider), le sexe tiré pour le nom s’impose au portrait.
- **Humains** : prénom et nom de famille de la même consonance, selon la culture :

| Culture | Consonance |
|---|---|
| Royaumes du Soleil Levant | japonaise |
| Tribus de la jungle | africaine : ouest-africaine ou bantoue |
| Cités libres | Europe de l'Ouest : française, anglaise, germanique ou italienne |
| Empire de la nuit blanche | scandinave ou russe |
| Terres des Deux Fleuves | indienne |

- **Terres des Deux Fleuves** (Idan, 2026-11-18 : « Je veux faire un peuple hindou ») : ex-Steppes désertiques,
  inspiration Inde et Mésopotamie ; règles et textes à revoir. L’ancien nom reste reconnu pour les mots-clés Bridge des
  avatars. **Kukri +2** et **Transmutation +1** ; les Royaumes du Soleil Levant gardent Kukri +1.
- **Cultures humaines mieux différenciées** (Idan, 2026-11-18 : « Ton tableau me va bien. Fauconnerie et Discrétion ») :
  chacune une arme signature à +2, un animal, un métier de camp et un vrai malus (Matrice de génération).

  | Culture | Signature +2 | Animal +1 | Métier +1 | Malus −1 |
  |---|---|---|---|---|
  | Empire de la nuit blanche | Combat à deux mains | Canidés | Travail du bois (au lieu du Travail du cuir) | Intelligence |
  | Tribus de la jungle | Lance (+1 → +2) | Félins | Alchimie | Résistance au froid |
  | Cités libres | Estoc (+1 → +2) | — | Intendance (au lieu du Travail du cuir) | Perception |
  | Royaumes du Soleil Levant | Katana | Rapaces | Médecine | Boucliers |
  | Terres des Deux Fleuves | Sabre, Kukri | Bêtes à cornes (éléphants de guerre) | Enchantement | Discrétion |

- **Autres peuples** : prénoms propres au peuple (femmes et hommes) ; noms de famille propres à la culture.
- **Capitaine** : nom saisi par le joueur.
- **Renommer** (Idan, 2026-11-07) : le crayon à côté du nom, pour tout membre ou animal de la compagnie, capitaine
  compris. Premier mot = prénom (celui des dialogues), le reste = nom de famille ; 40 caractères au plus.

## Avatars — attribution

- **Obligatoire** (Idan, 2026-10-25) : même peuple, même culture, ascendance compatible, même sexe s’il est connu. Avec
  une ascendance : un avatar de cette ascendance. Sans : un avatar sans ascendance, ou d’ascendance **généraliste** (un
  peu après, −4). Le mot-clé Bridge **« Ascendance only »** réserve l’avatar à son ascendance. Rien de libre : le
  **portrait générique**, jamais une autre culture.
- **Capitaine** (Idan, 2026-10-29) : il choisit son portrait **après l’ascendance**, selon la même règle ; changer
  d’ascendance retire un portrait devenu incompatible. **Au moins 3 choix** par culture × ascendance × genre (Idan,
  2026-11-01) : sinon, on complète avec ceux d’un capitaine sans ascendance, placés après.
- **Priorités** (Idan, 2026-10-25) : profil 20 ; arme en main (ou école du mage) 12 ; arme de dos (ou école d’un
  non-mage) 4 ; origine 2 ; alignement 1 ; hasard 0 à 2. Chaque rang l’emporte sur tous les suivants réunis.
- **Lecture d’un avatar** : il peut porter deux profils et plusieurs cultures ; on le lit sous le profil du mercenaire.
  Son profil dit l’arme tenue (« CAC + Hache + Arc » tient la hache et porte l’arc ; « Distance + Hache + Arc », l’arc ;
  un mage tient son école) ; côté mercenaire, les armes de son profil sont en main, les autres dans le dos (pas de tag
  de plus dans Bridge). Une ascendance se tague si elle se voit, avec « Ascendance only » si l’avatar ne peut pas passer
  pour un mercenaire sans ascendance.
- **Ce qui se voit** : on compare aux armes portées (pas aux préférences), et à une école seulement pour un mage ou qui en
  connaît un sort. Un élément **contraire** (profil, magie, arme, ascendance, culture) coûte autant qu’un tag juste
  rapporte : un avatar neutre passe avant un avatar qui contredit, sans exclusion.
- **Besoin en avatars** (Idan, 2026-10-30), dans l’onglet Avatars du Design Lab :
  - par partie, un joueur voit passer **50 mercenaires d’une même culture** (escouade de départ jusqu’à 22, embauches,
    Taverne) ;
  - **case précise** = culture × ascendance × arme en main (ou école du mage), sa part mesurée une fois sur le vrai
    générateur (40 000 tirages sans ascendance, 8 000 par ascendance ; `avatar-demand.json`) ;
  - **besoin** : assez d’avatars pour que le risque d’en manquer sur 50 tirages reste sous **S = 10 %** sans ascendance,
    **20 %** avec (loi binomiale exacte) ;
  - un avatar ne sert qu’**une fois** (ceux des morts ne reviennent pas), dans une seule case ; un tag de catégorie
    d’arme ne vaut pas une arme précise ; une case trop rare passe au **repli** = culture × ascendance × profil ;
  - **vert** : assez ; **orange** : risque sous **2 × S** avec le repli ; **rouge** : même le repli ne suffit pas. Un
    groupe de repli en manque sans case rouge compte rouge : à combler par un avatar de profil, toute arme ou école ;
  - ordre de grandeur (2026-10-30) : environ 85 avatars précis par culture naine, 2 773 pour les 32 cultures.

## Génération brute des compétences — règles en cours

### Compétences martiales

Chaque sous-catégorie : `2D20` avec un bonus de peuple, d’ascendance, de culture ou d’origine, sinon `1D20`.
`Catégorie martiale = Max(sous-catégories) × Rand(0,8 ; 1,2)`.

### Animal

Chaque sous-compétence : `2D20` avec un bonus, sinon 50 % `1` et 50 % `1D20`.
`Animal = Max(sous-compétences Animal) × Rand(0,8 ; 1,2)`.

### Écoles de magie

Avec un bonus sur l’école ou un jet de présence réussi (50 %) :
`École = Moyenne(Intelligence, Puissance magique, Réserve de mana) × Rand(0,5 ; 1,5) × 0,5` ; sinon `École = 1`.

Le `× 0,5` met les écoles à l’échelle des armes (Idan, 2026-11-05) ; il vaut aussi pour les dés de la Matrice sur une
école. Ce qui compare une école à un nombre suit : seuils de magie des ports d’armure (25 et 37,5), diviseur de chance des
sorts de départ (75), score Magie du profil d’équipement (sans division par 2), accentuation du mage (2D10).

### Compétences non pratiquées (Idan, 2026-11-06)

En fin de génération, après le domaine, une **arme précise**, une **catégorie d’arme**, un **style** (une main, deux
mains, deux armes, Boucliers) ou une **école** à **20 ou moins**, 0 compris, passe à **1** : « jamais pratiqué »
(« Non pratiquée » dans la trace de génération). **Aucun sort ne se tire dans une école à 20 ou moins.**

Une **catégorie d’arme** non pratiquée passe à **0**, pas à 1 (Idan, 2026-11-23 : « Fais passer les armes à 1 ») : sur
la fiche, une arme montre arme + catégorie (doc 03), et une arme jamais pratiquée y vaut 1 + 0 = **1**. Boucliers est un
style : il reste à 1. Constante `generation.skills.unpracticed_category_value`.

### Camp

`Camp = (1 + (Charisme + Intelligence) / 100) × 6D6`.

### Artisanat

`Artisanat = (1 + (Dextérité + Intelligence) / 100) × 6D6`.

### Physiologie

**Régénération** : 0 au tirage brut. Seul le **sang de troll** en donne (Matrice, intensité 2) : 4D6 lointain ancêtre
(≈ 14), 8D6 lignée proche (≈ 27), 10D6 bâtard (≈ 35) ; environ 2 % des recrues. Effets (Idan, 2026-11-01) :

- **en combat**, au début de chaque activation, s’il est debout : **ceil(2D6 × (0,5 + Régénération / 50)) PV**, sans
  dépasser ses PV max (par tour : lointain ancêtre 2 à 10, lignée proche 3 à 13, bâtard 3 à 15, à 100 : 5 à 30). Bloquée
  par le Flétrissement, et par le **feu** s’il a été brûlé depuis sa dernière activation ;
- **au camp**, une blessure guérit en **jours / (1 + Régénération / 100)** ;
- **+120 XP de Régénération par blessure de feu**, pour qui en a déjà, sans plafond ;
- sur la fiche (Caractéristiques, Défense), seulement au-dessus de 0.

### Social

`Social = 10D6`. **Prétentions salariales** : attribut Social caché, `10D6`, exclu du `Max Social` de la réputation.

## Backlog narratif — biographies de mercenaires

Piste : une **grande banque de biographies courtes, drôles et marquées**, associées aux profils (peuple, culture, origine,
caractéristiques fortes et faibles, compétences, équipement, personnalité, particularités). Système et volume à définir.

## Alignement — affinité du peuple

Chaque peuple a un **alignement principal** (`peoples.json`). Alignement d’un mercenaire généré : **40 %** l’alignement
principal ; **45 %** répartis entre les cases qui le touchent sur la grille 3×3 (côtés et diagonales) ; **15 %** répartis
entre les autres.

| | | |
|---|---|---|
| Loyal bon | Neutre bon | Chaotique bon |
| Loyal neutre | Neutre | Chaotique neutre |
| Loyal mauvais | Neutre mauvais | Chaotique mauvais |

Exemple, **Chaotique bon** : 40 % ; Chaotique neutre, Neutre bon, Neutre 15 % chacun ; les cinq autres 3 %. Pour
**Neutre**, les huit autres cases touchent le centre : 7,5 % chacune. Le capitaine du joueur peut avoir un alignement
forcé.

### Influence du capitaine

**+15 points de probabilité** sur l’alignement exact du capitaine, les autres réduits en proportion. Même si le peuple ou
la culture penchent ailleurs : le capitaine **attire** sa propre orientation, sans exclusion. Rien d’autre ne change.

### Exceptions culturelles — Elfes noirs, Nains du chaos

Avant le 40/45/15, l’alignement principal du peuple est remplacé (`alignment-generation.json`) : **Elfes noirs**
Chaotique mauvais ; **Nains du chaos** Chaotique neutre (Idan, 2026-10-23).

## Affinité capitaine ↔ mercenaire (phase 1)

Idan, 2026-10-20. De **−100 à +100**, comment un mercenaire perçoit son capitaine (sur la fiche : dix cœurs et une
phrase). Affinité brute = **peuple** + **culture** + **alignement** :

- **Peuple** : la matrice ci-dessous (−3 à +3), ligne du mercenaire, colonne du capitaine ; volontairement asymétrique.
- **Culture** : +2 si même culture.
- **Alignement** : `4 − 2 × distance` (pas sans diagonale sur la grille 3×3) : +4, +2, 0, −2, −4.

Brut de −7 à +9, normalisé puis arrondi : négatif × 100 / 7, positif × 100 / 9 (+5 → +56 ; −3 → −43). Score total =
initiale + acquise (+ Slip d’Affinité porté, doc 05 « Culottes »), borné à ±100. L’affinité acquise (0 au départ) bouge
en jeu : corvées, refus, échanges d’équipement, renégociation, mutinerie… La part initiale suivra un futur changement d’alignement du capitaine.

| Mercenaire ↓ / Capitaine → | Humain | Nain | Elfe | Halfling | Gnome | Reptilien | Orc | Gobelin | Ogre | Homme-bête |
|---|---|---|---|---|---|---|---|---|---|---|
| **Humain** | +3 | +2 | +2 | +3 | +1 | +1 | −1 | −1 | −2 | −2 |
| **Nain** | +2 | +3 | +1 | +3 | +1 | +1 | −3 | −2 | −2 | −2 |
| **Elfe** | +2 | +1 | +3 | +3 | +1 | +1 | −1 | −1 | −2 | −2 |
| **Halfling** | +3 | +3 | +3 | +3 | +2 | +2 | +1 | +1 | +1 | +1 |
| **Gnome** | +2 | +2 | +2 | +3 | +3 | +2 | −1 | +1 | −2 | −2 |
| **Reptilien** | +2 | +2 | +2 | +3 | +1 | +3 | −1 | −1 | −1 | −1 |
| **Orc** | +1 | −1 | −1 | +1 | −3 | +1 | +3 | +1 | +3 | +2 |
| **Gobelin** | +1 | −1 | −2 | +1 | +1 | +1 | +3 | +3 | +3 | +2 |
| **Ogre** | +1 | +1 | +1 | +1 | +1 | +1 | +2 | +1 | +3 | +2 |
| **Homme-bête** | −2 | −2 | −3 | −1 | −2 | +1 | +1 | −1 | +3 | +3 |

**Cultures à part** (Idan, 2026-10-31) : pour les **Nains du chaos** et les **Elfes noirs**, la part « peuple » est
remplacée (sauf entre membres de la même culture) :

- **cousins haïs**, dans les deux sens (nain du chaos ↔ autre nain, elfe noir ↔ autre elfe) : **−6** ;
- **alliés**, dans les deux sens (nain du chaos ↔ elfe noir) : **+2** ;
- envers tous les autres peuples, eux seuls : **2 points de moins** que la matrice (pas sous −3).

Exemples : nain du chaos chaotique neutre → nain des montagnes loyal bon −100, chaotique neutre −29 ; → elfe noir
chaotique mauvais +44 ; → humain neutre +22. Elfe sylvain neutre bon → elfe noir chaotique mauvais −100. Elfe noir
chaotique mauvais → humain neutre 0 ; humain neutre → elfe noir +22. Données : `data/reference/people-affinity.json`.

État V1 :

- fiche des membres : **dix cœurs** (un plein par tranche de 20 au-dessus de −100) et **une phrase**, sans score. Dix
  phrases, de « Rêve en permanence de vous arracher les organes. » (−100 à −80) à « Fantasme toutes les nuits en pensant
  à vous. » (80 à 100), trois variantes chacune, stables pour un mercenaire et un niveau (`affinity-phrases.json`) ;
- Taverne : le score seul ; l’alignement du candidat reste caché (doc 14 §6) ;
- effets : salaire demandé × (1 − 0,2 × Affinité / 100) (doc 09 §4) ; résistance à la négociation − 0,25 × Affinité
  (doc 14 §9) ; **désertion** : quand elle a baissé, un test chaque matin (doc 11 §11) ; **renégociation salariale** : le
  salaire théorique suit l’affinité du jour (doc 09 §6) ; **échanges d’équipement** : 0,5 × Affinité dans le jet (doc 05).
