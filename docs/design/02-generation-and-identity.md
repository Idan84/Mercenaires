> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# 01 — Génération & identité

Référentiels et règles utilisés pour générer l’identité initiale d’un mercenaire.

<aside>
🎮

Le pipeline ci-dessous décrit la génération statistique commune. Son point d’entrée dépend de la fonction appelante : `Create_Captain_Mercenary` laisse le joueur choisir son identité sans modifier les jets bruts ; `Create_Mercenary` utilise les tirages aléatoires et les biais liés au capitaine. Voir [00 — Démarrage de partie & fonctions de génération](/design/#doc=01-start-and-generation-functions.md).

</aside>

## Pipeline actuel

1. **Tirage brut des caractéristiques** : caractéristiques fondamentales = **20 + 3D20** ; résistances = **1D6**. Ces distributions seront plus tard pondérées par la renommée / réputation du capitaine-compagnie.
2. **Tirage du peuple** selon sa probabilité de base.
3. **Lecture des modificateurs du peuple** : appliquer immédiatement les caractéristiques / résistances ; mémoriser les bonus ou malus de compétences pour la phase compétences.
4. **Ascendance** : jet de présence ; si oui, tirage parmi les ascendances compatibles puis tirage du niveau.
5. **Lecture des modificateurs d’ascendance** : appliquer caractéristiques / résistances ; mémoriser les modificateurs de compétences.
6. **Tirage de la culture** parmi celles associées au peuple.
7. **Lecture des modificateurs de culture** : appliquer caractéristiques / résistances ; mémoriser les modificateurs de compétences.
8. **Tirage de l’origine sociale** parmi celles compatibles avec la culture.
9. **Lecture des modificateurs d’origine sociale** : appliquer caractéristiques / résistances ; mémoriser les modificateurs de compétences.
   - **Cultures sans école de magie** (doc 12 ; Idan, 2026-10-25) : +1D6 Courage (Nains des montagnes, Nains réduits en esclavage dans les colonies) ou +1D6 Force (Ogres des cités humaines, Ogres des montagnes) ; `cultures.json`, colonne `compensation_sans_ecole`.
10. **Génération brute des compétences** selon les règles propres à chaque famille, en sachant déjà si un bonus de génération existe.
11. **Application des modificateurs numériques de compétences** accumulés depuis la Matrice de génération.
   - **Ogres et bâtons** (Idan, 2026-10-29 : « le A est bien ! Et même encore trop de bâtons ») : depuis que le bâton est une arme de mage (doc 05), les ogres passent de +1 à **−1 en Bâtons** et perdent leur +1 en **Bâton long** ; ils gagnent **+1 en Armes contondantes** (massue, masse d’armes, marteau de guerre, pic de guerre). Sur 2 000 ogres : bâton en arme principale **48 % → 4,5 %** (surtout des érudits, que leur origine pousse vers le bâton), armes contondantes **17 % → 60 %**.
   - **Ajustements en D6 d’un peuple**, hors échelle de la Matrice (Idan, 2026-10-29) : **−1D6 de Discrétion aux Ogres** (« question de logique ») ; `peoples.json`, colonne `ajustements_d6`, appliquée après la Matrice, sans descendre sous 0.
   - **Sorts connus à la création** (doc 12, « Sorts connus à la création ») : trois tirages, école de la culture (`cultures.json`, colonne `ecole_magie`), meilleure et deuxième meilleure école.
12. **Domaine du mercenaire** (Idan, 2026-11-01 ; voir « Domaine du mercenaire » plus bas) : choisi d'après les tirages, puis accentué par des déplacements.
13. **Post-traitement** : valeurs dérivées initiales, réputation personnelle initiale et autres calculs dépendant du profil complet.

<aside>
🎛️

**La Matrice de génération est la source de vérité pour l’équilibrage.** Une case vide ou `0` signifie « aucun effet ». `+1 / +2 / +3` sont des bonus ; `−1 / −2 / −3` des malus. Les vues **Peuples / Ascendances / Cultures / Origines**, chacune déclinée en **Caractéristiques / Résistances / Compétences**, permettent de modifier les valeurs comme dans un tableau à double entrée sans toucher à la structure générale.

</aside>

<aside>
🎲

**Échelle D6 standard** : intensité 1 = `2D6`, 2 = `4D6`, 3 = `6D6`. Pour les ascendances : niveau 1 = `2D6 / 4D6 / 6D6` ; niveau 2 = `4D6 / 8D6 / 12D6` ; niveau 3 = `6D6 / 10D6 / 15D6`. Les prétentions salariales sont traitées comme un attribut Social caché avec leur propre tirage brut.

</aside>

<aside>
📈

**Scalabilité du recrutement** — Tous les jets de dés de `Create_Mercenary` doivent pouvoir être pondérés par la réputation du capitaine / de la compagnie. Les dés indiqués dans les règles de génération sont des **distributions de base**, pas des valeurs à coder en dur. À forte réputation, les candidats générés doivent pouvoir être sensiblement meilleurs qu'au début de partie.

</aside>

## Domaine du mercenaire

Idan, 2026-11-01 : les recrues étaient « encore un peu trop généralistes » (14 caractéristiques tirées chacune de leur
côté : tout le monde autour de 54). Après la première partie de la génération, chaque mercenaire reçoit un **grand
domaine**, **fixé à vie** (« c'est le titre qui montrera l'évolution »), puis on l'**accentue**. Données : `domains.json` ;
constantes `generation.domain.*` ; code : `game-core/mercenary-generator.js` (`chooseDomain`, `accentuateDomain`).

- **Trois domaines** : **Corps à corps**, **Distance**, **Mage**.
- **Le choix, d'après les tirages** (« il faut justement dans un peuple un peu de tout ») : le profil déjà calculé pour
  l'équipement de départ et l'avatar (meilleure arme ou école, et les caractéristiques qui vont avec). **Un sort tiré pousse
  vers Mage** quand la magie est à **5 points** ou moins du meilleur score (« il a tiré un sort de l'eau, on pousse vers
  ça ») : 12 % des recrues. Les archers restent tels quels (Idan).
- **L'accentuation : des déplacements** (Idan : dosage B), en moyenne à somme nulle sur les caractéristiques :
  - caractéristiques : **+2D6** sur les deux du domaine, **−2D6** sur deux autres :

    | Domaine | Monte | Baisse |
    |---|---|---|
    | Corps à corps | Force, Endurance | Puissance magique, Intelligence |
    | Distance | Perception, Dextérité | Force, Puissance magique |
    | Mage | Puissance magique, Intelligence | Force, Dextérité |

  - compétences, **sur ce qu'il utilise vraiment** : **+2D10** sur son arme (celle qu'il portera) et sa catégorie, **−2D10**
    sur la meilleure arme de l'autre famille et sa catégorie ; un mage gagne **2D10** (2 × 2D10 avant que les écoles soient divisées par deux, le 2026-11-05) dans l'école de son sort (sinon sa
    meilleure) et perd 2D10 sur sa meilleure arme de mêlée et sa meilleure arme de tir.
- **Rattrapage du mage** (Idan, 2026-11-01) : un Mage qui n'a tiré aucun sort en apprend un dans sa meilleure école
  (doc 12). Il n'y a plus de Mage sans sort.
- **L'équipement de départ et l'avatar suivent le domaine.** Sur la fiche, un **picto** à côté du nom (épée, arc, étoile),
  avec une infobulle. Les mercenaires créés avant prennent le profil de leur équipement de départ, sans rien changer à leurs
  chiffres.
- **Effet mesuré** (3 000 recrues) : domaine net (≥ 1 écart-type devant le deuxième) **36 % → 84 %** ; recrues sans titre
  (« Chair à canon ») **51 % → 31 %**. Comme on pousse les meilleures compétences et que la réputation compte les trois
  meilleures : réputation moyenne **+5 %** (134 → 141), salaire **+6 %** (47 → 50 PO par jour), PV **+2 %** (l'Endurance des
  combattants).
- Les mesures du besoin en avatars (`avatar-demand.json`) ont été refaites : l'arme en main dépend du domaine.

Rééquilibrage des cultures (Idan, 2026-11-01 : viser, pour chaque culture, entre 5 et 80 % dans chaque domaine), en
deux séries de points dans la Matrice de génération. Les **gnomes des villes** restent une exception (Idan) : ils ne
rentreraient qu'en retirant des points à leur culture ; le garde-fou de l'escouade leur donne un corps-à-corps au départ.

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

Répartition par culture après les deux séries (simulation, 1 000 recrues par culture, 2026-11-01 ; en gras, hors de 5 à
80 %). Elfes sylvains, gnomes des forêts et halflings des villages isolés sont à la limite : 4 à 6 % de corps à corps
selon les tirages.

| Peuple | Culture | Corps à corps | Distance | Mage |
|---|---|---|---|---|
| Elfe | Elfes des grandes cités | 6 % | 14 % | 80 % |
| Elfe | Elfes noirs | 18 % | 19 % | 63 % |
| Elfe | Elfes sylvains | **4 %** | 49 % | 47 % |
| Gnome | Gnomes des cavernes | 8 % | 20 % | 71 % |
| Gnome | Gnomes des forêts | **4 %** | 21 % | 76 % |
| Gnome | Gnomes des villes | **2 %** | 12 % | **87 %** |
| Gobelin | Caravanes de ferrailleurs | 17 % | 62 % | 21 % |
| Gobelin | Gobelins des cavernes | 32 % | 50 % | 18 % |
| Gobelin | Gobelins des villes | 26 % | 45 % | 30 % |
| Halfling | Explorateurs | 6 % | 50 % | 44 % |
| Halfling | Halflings des cités humaines | 5 % | 45 % | 50 % |
| Halfling | Halflings des villages isolés | **4 %** | 34 % | 62 % |
| Homme-bête | Clans des grandes steppes | 78 % | 8 % | 15 % |
| Homme-bête | Tribus des forêts anciennes | 64 % | 5 % | 31 % |
| Homme-bête | Tribus nordiques | 80 % | 5 % | 16 % |
| Humain | Cités libres | 49 % | 11 % | 41 % |
| Humain | Montagnes du Nord | 71 % | 9 % | 21 % |
| Humain | Royaumes du Soleil Levant | 62 % | 10 % | 28 % |
| Humain | Steppes désertiques | 48 % | 21 % | 31 % |
| Humain | Tribus de la jungle | 47 % | 15 % | 38 % |
| Nain | Nains des montagnes | 74 % | 13 % | 14 % |
| Nain | Nains du chaos | 33 % | 49 % | 19 % |
| Nain | Nains réduits en esclavage dans les colonies | 72 % | 21 % | 8 % |
| Ogre | Ogres des cités humaines | 75 % | 16 % | 10 % |
| Ogre | Ogres des montagnes | 78 % | 17 % | 6 % |
| Ogre | Ogres des steppes | 80 % | 14 % | 6 % |
| Orc | Orcs des steppes | 67 % | 13 % | 20 % |
| Orc | Orcs des villes | 51 % | 15 % | 33 % |
| Orc | Orcs noirs | 74 % | 8 % | 18 % |
| Reptilien | Reptiliens des cités-temples | 11 % | 12 % | 77 % |
| Reptilien | Reptiliens des marécages | 18 % | 21 % | 61 % |
| Reptilien | Reptiliens des villes | 23 % | 12 % | 65 % |

### Garde-fou de l'escouade initiale

Idan, 2026-11-01 : « Il faut 1 mage / 1 distance et 1 CAC sur une escouade. On peut forcer la génération d'un ou deux
mercenaires en plus si la chance n'a pas souri. » Code : `createInitialSquad` (`game-core/mercenary-generator.js`) ;
constante `generation.initial_squad.domain_attempts`.

- Après le tirage de l'escouade (le **capitaine ne compte pas**), chaque domaine absent ajoute **un mercenaire de plus**,
  du même peuple et de la même culture. L'escouade a toujours au moins un mercenaire : **au plus 2 en plus**.
- On le tire **normalement**, jusqu'à **30 fois**, et on garde le premier qui tombe dans le domaine. Si aucun n'y tombe, le
  dernier est tiré avec **ce domaine imposé** (accentué vers lui, comme les autres).
- Mesure (50 escouades par culture, 2026-11-01) : renfort dans **0 à 20 %** des escouades humaines et gobelines, **80 à
  95 %** chez les hommes-bêtes, les orcs noirs, les gnomes des villes et les elfes des grandes cités, **100 %** chez les
  ogres (presque toujours un archer et un mage, imposés une fois sur deux ou plus). Mesure faite avant le rattrapage du mage
  et le rééquilibrage des cultures ; depuis, tout Mage connaît au moins un sort.

## Noms des personnages

Décision d'Idan du 2026-10-21. Les données sont dans `data/reference/character-names.json`, la logique dans `game-core/names.js`.

- **Le prénom respecte le sexe.** Le sexe vient de l'avatar, attribué après la génération : le nom est tiré, puis le prénom est réaccordé dès que le portrait est posé. Les noms de famille qui s'accordent suivent aussi (russes : Volkov, Volkova).
- **Humains : la consonance suit la culture.** Le prénom et le nom de famille viennent toujours de la même consonance.

| Culture | Consonance |
|---|---|
| Royaumes du Soleil Levant | japonaise |
| Tribus de la jungle | africaine : ouest-africaine ou bantoue |
| Cités libres | Europe de l'Ouest : française, anglaise, germanique ou italienne |
| Montagnes du Nord | scandinave ou russe |
| Steppes désertiques | indienne |

- **Autres peuples** : prénoms propres au peuple, pour les femmes et pour les hommes ; noms de famille propres à la culture.
- **Capitaine** : son nom est saisi par le joueur et ne change jamais.
- **Anciennes sauvegardes** : les personnages déjà créés gardent leur nom.
- **Sans avatar sexué** (choix technique de JC3, à valider) : le sexe tiré pour le nom devient celui du personnage, et le portrait attribué plus tard le respecte.

## Avatars — attribution

Code : `game-core/avatars.js` ; outil de production : Design Lab, onglet Avatars (besoin en avatars : `game-core/avatar-demand.js`).

- **Obligatoires**, comme le peuple (Idan, 2026-10-25 : « culture et ascendance doivent matcher au même niveau que peuple ») : même **peuple**, même **culture** (l'avatar la porte dans ses tags), **ascendance compatible**, et même sexe s'il est déjà connu. Un mercenaire avec une ascendance prend un avatar de cette ascendance ; un mercenaire sans ascendance prend un avatar sans ascendance ou dont l'ascendance est **généraliste** (Idan : « un gobelin à sang d'orc ou un gobelin très baraqué, c'est compliqué à différencier »), un peu après un avatar sans ascendance (−4). Le mot-clé Bridge **« Ascendance only »** réserve l'avatar à son ascendance (un humain aux écailles de dragon). Sans avatar libre qui remplit tout cela, le mercenaire garde le **portrait générique** (choix d'Idan, plutôt qu'un avatar d'une autre culture).
- **Capitaine** (Idan, 2026-10-29) : le joueur choisit son portrait **après l'ascendance**, pour qu'il lui corresponde. L'assistant ne propose que les portraits de son peuple, de sa culture (quand l'avatar la porte) et de son ascendance, selon la règle ci-dessus : avec une ascendance, un portrait de cette ascendance ; sans ascendance, pas de portrait « Ascendance only ». Changer d'ascendance retire un portrait devenu incompatible.
- **Capitaine, 3 choix au moins** (Idan, 2026-11-01 : « un minimum de 3 choix : culture × ascendance × genre ») : avec une ascendance, s'il y a moins de 3 portraits de cette ascendance pour un genre, l'assistant complète avec ceux qu'aurait un capitaine sans ascendance (même culture, même genre), après ceux de l'ascendance, en attendant qu'ils soient produits. Code : `game-core/avatars.js` (`captainPortraits`). Le Design Lab (onglet Avatars, bloc de chaque culture) vérifie chaque ascendance possible du peuple × genre : portraits de l'ascendance, sans type ni école, et combien il en manque pour en avoir 3 (`captainCoverage`). Le 2026-11-01 : 706 portraits à produire, dont 696 d'ascendance ; aucun avatar humain des Steppes désertiques.
- **Priorités** ensuite (Idan, 2026-10-25) : profil 20 ; puis arme tenue en main (ou école du mage) 12 ; puis arme de dos (ou école d'un non-mage) 4 ; origine 2, alignement 1 ; hasard de 0 à 2. Les poids sont étagés : chaque rang l'emporte sur tous les suivants réunis.
- **Deux profils** possibles sur un avatar : il est regardé sous celui du mercenaire (« CAC + Mage + Hache + Feu » tient sa hache pour un guerrier, son école pour un mage). **Plusieurs cultures** possibles aussi (un ogre qui passe pour les villes et les montagnes) ; une **ascendance** se tague si elle se voit, avec « Ascendance only » si l'avatar ne peut pas passer pour un mercenaire sans ascendance.
- **Le profil de l'avatar dit quelle arme il tient** : « CAC + Hache + Arc » tient la hache et porte l'arc ; « Distance + Hache + Arc » tient l'arc et porte la hache ; un mage tient son école. Côté mercenaire : les armes de son profil sont en main, les autres dans son dos. Ainsi, à la hache, celui qui porte un arc passe avant celui qui porte une arbalète. Pas de nouveau tag dans Bridge : le profil suffit.
- **Plus précis** (Idan, 2026-10-25 : « regarde si le sélecteur d'avatar peut être plus précis ») : on compare l'image à **ce qui se voit** sur le mercenaire, les **armes qu'il porte** (et leurs catégories) plutôt que ses préférences, et une **école de magie** seulement pour un mage ou un mercenaire qui connaît un sort de cette école. Ce que l'image montre de **contraire** (profil, magie, arme, ascendance, culture) coûte autant qu'un tag juste rapporte : un avatar neutre passe avant un avatar qui contredit le mercenaire, sans qu'aucun ne soit exclu.
- Mesure (3 000 mercenaires, 464 avatars en ligne, le 2026-10-25) : **16 % n'ont aucun avatar de leur culture et de leur ascendance** (portrait générique ; nains 42 %, humains 31 %, ogres 22 %, elfes 20 %), plus encore dans une escouade de départ, qui a la culture du capitaine. Ceux qui ont un avatar : culture et ascendance toujours justes ; profil contredit 15 %, arme en main 42 %, arme de dos 8 %, magie 13 % : il manque des avatars par culture et par arme. Le Design Lab donne, par peuple, la part de portraits génériques et les combinaisons à produire.
- Design Lab, page Avatars (Idan, 2026-10-27) : tout était croisé par culture (combinaisons d'au moins 0,5 %, profils par culture, ascendances × cultures) ; remplacé le 2026-10-30 par le besoin en avatars ci-dessous.
- **Besoin en avatars** (Idan, 2026-10-30 ; il remplace dans l'onglet Avatars le besoin de 100 par peuple et les combinaisons d'au moins 0,5 %, qui sortaient de 500 tirages et bougeaient à chaque changement de la génération) :
  - **par culture** : dans une partie, un joueur voit passer **50 mercenaires d'une même culture** (`avatars.demand.mercenaries` : escouade de départ jusqu'à 22, embauches, Taverne) ; le peuple n'entre plus en compte ;
  - **case précise (PP)** = culture × ascendance × arme tenue en main (l'arme précise) ou école du mage. Sa part = part **exacte** de l'ascendance × part de l'arme ou de l'école chez les mercenaires de cette culture et de cette ascendance, **mesurée une fois** sur un grand nombre de tirages du vrai générateur (`data/reference/avatar-demand.json`, `scripts/build-avatar-demand.js` : 40 000 tirages sans ascendance, 8 000 par ascendance) ; les mesures ne changent que si on les refait, quand la génération change ;
  - **besoin d'une case** = nombre d'avatars pour que le risque d'en manquer sur 50 tirages reste sous **S = 10 %** pour les mercenaires sans ascendance, **20 %** avec (`avatars.demand.threshold`, `avatars.demand.threshold_ascendance` ; loi binomiale, calcul exact). Une case trop rare n'a pas de besoin précis : ses mercenaires passent au repli ;
  - **un avatar ne sert qu'une fois** (jamais deux fois le même visage ; ceux des morts ne reviennent pas) : chaque avatar va dans une seule case, de façon à couvrir le plus de besoins. Un avatar tagué d'une catégorie d'arme (« Armes de tir ») ne vaut pas une arme précise ;
  - **repli (PL)** = culture × ascendance × profil (corps à corps, distance, magie), avec les avatars restés libres ;
  - **couleurs** : vert, assez d'avatars précis ; orange, pas assez, mais avec le repli le risque de manquer reste sous **2 × S** (`avatars.demand.fallback_factor`) ; rouge, même avec le repli, ça ne suffit pas. Un **groupe de repli en manque dont aucune case n'est rouge** (ses cases sont trop rares ou déjà vertes) compte lui aussi comme une case rouge : à combler par un avatar de profil, toute arme ou toute école (Idan, 2026-10-30).
  - Ordre de grandeur (le 2026-10-30) : environ 85 avatars précis par culture naine, 263 pour les trois ; 2 773 pour les 32 cultures.
  - Onglet Avatars du Design Lab : bilan par culture (vertes, orange, rouges, à produire), puis pour chaque culture la liste **à produire** (rouges d'abord, plus gros manques en tête ; les groupes de repli en manque y figurent en « toute arme » ou « toute école »), les cases précises et le repli ; alerte si la génération a changé depuis les mesures.

## Génération brute des compétences — règles en cours

### Compétences martiales

Pour chaque sous-catégorie martiale :

- si le mercenaire possède un bonus issu du peuple, de l'ascendance, de la culture ou de l'origine : `2D20` ;
- sinon : `1D20`.

La valeur de la **catégorie martiale** est dérivée de sa meilleure sous-catégorie :

`Catégorie martiale = Max(sous-catégories) × Rand(0,8 ; 1,2)`.

### Animal

Pour chaque sous-compétence Animal :

- si bonus de génération : `2D20` ;
- sinon : 50 % de chance d'obtenir `1`, 50 % de chance d'obtenir `1D20`.

La valeur de la **catégorie Animal** est dérivée de sa meilleure sous-compétence :

`Animal = Max(sous-compétences Animal) × Rand(0,8 ; 1,2)`.

### Écoles de magie

Pour chaque école de magie :

- si le mercenaire possède un bonus sur cette école **ou** réussit un jet de présence à 50 %, alors : `École = Moyenne(Intelligence, Puissance magique, Réserve de mana) × Rand(0,5 ; 1,5) × 0,5` ;
- **les écoles à l'échelle des armes** (Idan, 2026-11-05 : « l'échelle arme / magie devrait être identique. Division par deux ») : le tirage et les dés de la Matrice sur une école sont multipliés par `generation.magic.school_scale` (0,5). Ce qui comparait une école à un nombre suit (seuils de magie des ports d'armure 25 et 37,5, diviseur de chance des sorts de départ 75, score Magie du profil d'équipement sans division par 2, accentuation du mage 2D10) : à tirage égal, mêmes domaines, mêmes sorts, mêmes ports d'armure. Mesure (4 000 recrues) : meilleure école d'un mage **54** en médiane (107 avant), d'un non-mage 34 (67 avant), arme d'un combattant 55 ; réputation médiane des mages 128 (159 avant ; 121 pour le corps à corps), salaire médian 44 PO par jour (54 avant) ;
- sinon : `École = 1`.

### Compétences non pratiquées (Idan, 2026-11-06)

« Que ce soit pour les armes ou la magie, je te propose qu'on passe à 1 ceux qui ont 20 ou moins » ; catégories et styles
aussi ; en fin de génération, après le domaine.

- Une **arme précise**, une **catégorie d'arme**, un **style** (Combat à une main, à deux mains, à deux armes, Boucliers) ou
  une **école de magie** à **20 ou moins** passe à **1**, **0 compris** (Idan : « On remonte les 0 à 1 » : un malus de
  peuple, de culture ou de domaine ne la laisse plus à 0) : « jamais pratiqué », comme une école absente
  (`generation.skills.unpracticed_max`, `generation.skills.unpracticed_value`). La trace de génération le montre
  (« Non pratiquée »).
- **Aucun sort ne se tire dans une école à 20 ou moins** (Idan : « il devrait pas connaître un sort dans une école où il a
  moins de 20 »). Avant, 63 sorts pour 4 000 recrues tombaient dans une telle école : surtout le tirage de l'**école de la culture** (qui ne
  regardait pas le niveau), puis celui de la deuxième école. Sorts par recrue : 0,82 → 0,79.
- Mesure (4 000 recrues) : 62 % des armes précises, 31 % des catégories, 8 % des styles et 12 % des écoles passent à 1 ; un
  mercenaire garde en médiane 14 armes au-dessus de 20 sur 38. Domaines, réputation (trois meilleures compétences) et
  équipement de départ (meilleure arme) ne bougent pas.

### Camp

Pour chaque compétence de la famille Camp :

`Camp = (0,5 + Charisme / 100 + 0,5 + Intelligence / 100) × 6D6`

Soit, sous forme simplifiée :

`Camp = (1 + (Charisme + Intelligence) / 100) × 6D6`.

### Artisanat

Pour chaque compétence de la famille Artisanat :

`Artisanat = (0,5 + Dextérité / 100 + 0,5 + Intelligence / 100) × 6D6`

Soit, sous forme simplifiée :

`Artisanat = (1 + (Dextérité + Intelligence) / 100) × 6D6`.

### Physiologie

- `Régénération = 0` au tirage brut initial. Seul le **sang de troll** en donne (matrice, intensité 2) : 4D6 pour un lointain ancêtre (≈ 14), 8D6 pour une lignée proche (≈ 27), 10D6 pour un bâtard (≈ 35) ; environ 2 % des recrues.
- **Ce qu'elle fait** (Idan, 2026-11-01 ; `game-core/regeneration.js`, constantes `regeneration.*`) :
  - **en combat**, au début de chacune de ses activations, s'il est debout : **ceil(2D6 × (0,5 + Régénération / 50)) PV**, sans dépasser ses PV max. Lointain ancêtre : 2 à 10 PV par tour ; lignée proche : 3 à 13 (≈ 2D6) ; bâtard : 3 à 15 ; à 100 : 5 à 30. Le Flétrissement l'empêche, comme les soins ;
  - **le feu la bloque** : brûlé depuis sa dernière activation, il ne régénère pas cette fois ;
  - **au camp**, une blessure guérit en **jours / (1 + Régénération / 100)** : deux fois plus vite à 100 ;
  - elle **monte à chaque brûlure** (validé par Idan, 2026-11-01) : +30 XP de Régénération par blessure de feu, pour qui en a déjà (`progression.regeneration.burn_xp`), sans plafond (Idan, 2026-11-06 : « sky is the limit ») ;
  - **sur la fiche** (Idan : « il faut ») : onglet Caractéristiques, groupe Défense, avec son infobulle ; la ligne n'apparaît que si elle est au-dessus de 0 (`character-sheet-copy.json`, `masquer_si_nul`).

### Social

Pour chaque compétence sociale :

`Social = 10D6`.

**Prétentions salariales** est conceptuellement un **attribut Social caché** et suit également un tirage brut `10D6`, mais reste stocké parmi les attributs cachés. Il est exclu du `Max Social` utilisé dans la réputation personnelle.

Ces règles sont elles aussi soumises au principe général de pondération future par la réputation du capitaine / de la compagnie. Les modificateurs de peuple, ascendance, culture et origine restent appliqués par le pipeline de génération après le tirage brut.

<aside>
🧩

**Ordre d’implémentation des compétences :** les bonus de peuple / ascendance / culture / origine doivent pouvoir être connus avant le tirage brut d’une compétence, puisqu’ils déterminent parfois si elle reçoit `1D20` ou `2D20`. En code, les bonus de compétences peuvent donc être **collectés / mis en attente** pendant la génération de l’identité, puis le tirage brut des compétences est effectué, puis les modificateurs numériques de la Matrice sont appliqués. Ne pas appliquer un bonus numérique à une compétence encore non initialisée.

</aside>

[Peuples](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Peuples%209a5cd156f4444837ae630b1862f60541.csv)

[Ascendances](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Ascendances%20e2bd4f129d754ce1885acf62ea90f487.csv)

[Cultures](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Cultures%20901364a7f401459594940d1e11ed10d2.csv)

[Origines sociales](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Origines%20sociales%2017bc7a7e1e6a45ef861358747dbafb83.csv)

[Alignements](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Alignements%20268aef3cc286435ea9aa0bcaaa5be428.csv)

[Étapes de génération](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/%C3%89tapes%20de%20g%C3%A9n%C3%A9ration%20905a18852ebc4f148f18e0b10c2ecca6.csv)

[Niveaux d’ascendance](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Niveaux%20d%E2%80%99ascendance%205b78a963a81e43f7869b1920e369efcd.csv)

[Compatibilités d’ascendance](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Compatibilit%C3%A9s%20d%E2%80%99ascendance%202104bbf4810e484ea41807534924b989.csv)

[Compatibilités culture–origine sociale](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Compatibilit%C3%A9s%20culture%E2%80%93origine%20sociale%2084e0baa713b547da90526b430d76a29c.csv)

[Matrice de génération](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/Matrice%20de%20g%C3%A9n%C3%A9ration%20fb435c78a6e74068965f53f164b0d8e7.csv)

[Échelle D6 — génération](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/01%20%E2%80%94%20G%C3%A9n%C3%A9ration%20%26%20identit%C3%A9/%C3%89chelle%20D6%20%E2%80%94%20g%C3%A9n%C3%A9ration%20b949e703e1b7435396a99b36ecf6e417.csv)

## Backlog narratif — biographies de mercenaires

Piste de conception retenue pour le futur générateur narratif : créer une **grande banque de biographies courtes, plutôt drôles et marquées**, puis faire correspondre ces biographies aux profils générés plutôt que rédiger systématiquement un texte depuis zéro.

Le matching pourra s'appuyer sur peuple, culture, origine sociale, caractéristiques dominantes/faibles, compétences, équipement, personnalité et particularités. Le système précis et le volume de biographies restent à définir.

## Alignement — affinité du peuple

Chaque peuple possède un **alignement principal** dans `peoples.json`.

Pour un mercenaire généré automatiquement :

- **40 %** : alignement principal du peuple ;
- **45 % au total** : répartis uniformément entre les cases qui touchent l'alignement principal dans la grille 3×3, **côtés et diagonales compris** ;
- **15 % au total** : répartis uniformément entre tous les autres alignements.

Grille canonique :

| | | |
|---|---|---|
| Loyal bon | Neutre bon | Chaotique bon |
| Loyal neutre | Neutre | Chaotique neutre |
| Loyal mauvais | Neutre mauvais | Chaotique mauvais |

Exemple : pour un peuple principalement **Chaotique bon** :

- Chaotique bon : **40 %**
- Chaotique neutre : **15 %**
- Neutre bon : **15 %**
- Neutre : **15 %**
- chacun des cinq autres alignements : **3 %**

Pour **Neutre**, les huit autres cases touchent la case centrale : elles se partagent donc les 60 % restants, soit **7,5 % chacune**.

Le capitaine choisi par le joueur peut toujours avoir un alignement forcé ; cette distribution ne s'applique qu'aux alignements générés automatiquement.

### Influence du capitaine

Après calcul de la distribution peuple/culture, `Create_Mercenary()` applique l’influence du capitaine :

- **+15 points de probabilité** sur l’alignement exact du capitaine ;
- réduction proportionnelle de toutes les autres probabilités pour conserver un total de 100 % ;
- aucun autre élément du profil n’est modifié par ce biais.

Le bonus est appliqué même si le peuple ou la culture du candidat ont un alignement principal très différent : le capitaine **attire** davantage de profils de sa propre orientation, sans créer d’exclusion.

### Exceptions culturelles — Elfes noirs, Nains du chaos

Avant application de la distribution 40/45/15, certaines cultures remplacent l'alignement principal de leur peuple (`culture_overrides` dans `alignment-generation.json`) :

- **Elfes noirs** : **Chaotique mauvais** au lieu de l'alignement principal du peuple Elfe ;
- **Nains du chaos** (Idan, 2026-10-23) : **Chaotique neutre** au lieu de l'alignement principal du peuple Nain.

## Affinité capitaine ↔ mercenaire (phase 1)

Décision Idan du 2026-10-20 (PR #114, code de Chatty). L'affinité mesure de **−100 à +100** comment un mercenaire perçoit son capitaine. C'est un score numérique, sans libellé qualitatif pour l'instant.

Affinité brute = **peuple** + **culture** + **alignement** :

- **Peuple** : matrice d'Idan, de −3 à +3, lue avec la ligne du peuple du mercenaire et la colonne du peuple du capitaine. Elle est volontairement asymétrique.
- **Culture** : +2 si le capitaine et le mercenaire ont la même culture, sinon 0.
- **Alignement** : `4 − 2 × distance`, où la distance compte les pas (sans diagonale) entre les deux alignements sur la grille 3×3 ci-dessus. 0 à 4 pas donnent +4, +2, 0, −2, −4.

L'affinité brute va de −7 à +9. Elle est normalisée sur deux branches, puis arrondie : négatif × 100 / 7, positif × 100 / 9. Par exemple, un brut de +5 donne +56 et un brut de −3 donne −43.

Score total = affinité initiale + affinité acquise (+ les points du Slip d'Affinité porté, doc 05 « Culottes »), borné à −100 / +100. L'**affinité acquise** (champ `affinityAcquired`, 0 par défaut) est réservée à la phase 2. La part initiale n'est pas figée : elle suivra un futur changement d'alignement du capitaine.

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

**Cultures à part** (Idan, 2026-10-31) : les **Nains du chaos** et les **Elfes noirs** ne suivent pas leur peuple. Leur part
« peuple » est remplacée, sauf entre membres de la même culture (rien ne change entre eux) :

- **Cousins haïs**, dans les deux sens : nain du chaos ↔ tout autre nain, elfe noir ↔ tout autre elfe : **−6** (deux fois le
  pire de la matrice ; la part initiale reste bornée à −100). Même avec le même alignement, ils restent en froid (−29).
- **Alliés**, dans les deux sens : nain du chaos ↔ elfe noir : **+2**.
- **Les autres** : envers tous les autres peuples, un nain du chaos ou un elfe noir a **2 points de moins** que la matrice
  (sans descendre sous −3). Dans leur sens seulement : les autres ne les détestent pas pour autant.

| Qui ressent → envers qui | Avant | Avec la règle |
|---|---|---|
| Nain du chaos chaotique neutre → nain des montagnes loyal bon | +11 | −100 |
| Nain du chaos chaotique neutre → nain des montagnes chaotique neutre | +78 | −29 |
| Elfe sylvain neutre bon → elfe noir chaotique mauvais | +11 | −100 |
| Nain du chaos chaotique neutre → elfe noir chaotique mauvais | +33 | +44 |
| Nain du chaos chaotique neutre → humain neutre | +44 | +22 |
| Elfe noir chaotique mauvais → humain neutre | +22 | 0 |
| Humain neutre → elfe noir chaotique mauvais | +22 | +22 |

Données : `data/reference/people-affinity.json` (matrice ; `cultures` : cultures à part, `haine_cousins`, `allies_points`,
`autres`) ; constantes `affinity.*` dans `formula-constants.json` ; code `game-core/affinity.js`.

État V1 :

- sur la fiche des membres de la compagnie, l'affinité s'affiche en **dix cœurs** et **une phrase**, sans score (décision Idan, PR #137) : un cœur plein par tranche de 20 au-dessus de −100, et dix phrases de « Rêve en permanence de vous arracher les organes. » (−100 à −80) à « Fantasme toutes les nuits en pensant à vous. » (80 à 100), chacune avec trois variantes de même sens (Idan, 2026-10-24) ; la phrase montrée dépend du mercenaire et du niveau, et ne change pas d'un affichage à l'autre (`data/reference/affinity-phrases.json`) ;
- à la Taverne, le score seul s'affiche sur la carte du candidat et dans l'entretien (décision Idan du 2026-10-20). L'alignement du candidat reste caché (14 §6), même si le score en laisse deviner une partie ;
- effets décidés par Idan le 2026-10-20 : salaire demandé × (1 − 0,2 × Affinité / 100) (doc 09 §4) et résistance à la négociation − 0,25 × Affinité (doc 14 §9) ;
- pas encore d'effet sur la négociation d'équipement ni sur d'autres interactions : coefficients à définir avec Idan ;
- **désertion** (Idan, 2026-11-04 ; doc 11 §11) : quand son affinité a baissé, un test chaque matin ; tous ratés, il part ;
- **renégociation salariale** (Idan, 2026-11-04 ; doc 09 §6) : son salaire théorique tient compte de son affinité du jour ;
  la négociation en fait gagner ou perdre.
