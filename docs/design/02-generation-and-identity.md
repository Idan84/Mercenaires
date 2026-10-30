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
12. **Post-traitement** : valeurs dérivées initiales, réputation personnelle initiale et autres calculs dépendant du profil complet.

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

Code : `game-core/avatars.js` ; outil de production : Design Lab, onglet Avatars (`game-core/avatar-coverage.js`, et le besoin en avatars : `game-core/avatar-demand.js`).

- **Obligatoires**, comme le peuple (Idan, 2026-10-25 : « culture et ascendance doivent matcher au même niveau que peuple ») : même **peuple**, même **culture** (l'avatar la porte dans ses tags), **ascendance compatible**, et même sexe s'il est déjà connu. Un mercenaire avec une ascendance prend un avatar de cette ascendance ; un mercenaire sans ascendance prend un avatar sans ascendance ou dont l'ascendance est **généraliste** (Idan : « un gobelin à sang d'orc ou un gobelin très baraqué, c'est compliqué à différencier »), un peu après un avatar sans ascendance (−4). Le mot-clé Bridge **« Ascendance only »** réserve l'avatar à son ascendance (un humain aux écailles de dragon). Sans avatar libre qui remplit tout cela, le mercenaire garde le **portrait générique** (choix d'Idan, plutôt qu'un avatar d'une autre culture).
- **Capitaine** (Idan, 2026-10-29) : le joueur choisit son portrait **après l'ascendance**, pour qu'il lui corresponde. L'assistant ne propose que les portraits de son peuple, de sa culture (quand l'avatar la porte) et de son ascendance, selon la règle ci-dessus : avec une ascendance, un portrait de cette ascendance ; sans ascendance, pas de portrait « Ascendance only ». Changer d'ascendance retire un portrait devenu incompatible.
- **Priorités** ensuite (Idan, 2026-10-25) : profil 20 ; puis arme tenue en main (ou école du mage) 12 ; puis arme de dos (ou école d'un non-mage) 4 ; origine 2, alignement 1 ; hasard de 0 à 2. Les poids sont étagés : chaque rang l'emporte sur tous les suivants réunis.
- **Deux profils** possibles sur un avatar : il est regardé sous celui du mercenaire (« CAC + Mage + Hache + Feu » tient sa hache pour un guerrier, son école pour un mage). **Plusieurs cultures** possibles aussi (un ogre qui passe pour les villes et les montagnes) ; une **ascendance** se tague si elle se voit, avec « Ascendance only » si l'avatar ne peut pas passer pour un mercenaire sans ascendance.
- **Le profil de l'avatar dit quelle arme il tient** : « CAC + Hache + Arc » tient la hache et porte l'arc ; « Distance + Hache + Arc » tient l'arc et porte la hache ; un mage tient son école. Côté mercenaire : les armes de son profil sont en main, les autres dans son dos. Ainsi, à la hache, celui qui porte un arc passe avant celui qui porte une arbalète. Pas de nouveau tag dans Bridge : le profil suffit.
- **Plus précis** (Idan, 2026-10-25 : « regarde si le sélecteur d'avatar peut être plus précis ») : on compare l'image à **ce qui se voit** sur le mercenaire, les **armes qu'il porte** (et leurs catégories) plutôt que ses préférences, et une **école de magie** seulement pour un mage ou un mercenaire qui connaît un sort de cette école. Ce que l'image montre de **contraire** (profil, magie, arme, ascendance, culture) coûte autant qu'un tag juste rapporte : un avatar neutre passe avant un avatar qui contredit le mercenaire, sans qu'aucun ne soit exclu.
- Mesure (3 000 mercenaires, 464 avatars en ligne, le 2026-10-25) : **16 % n'ont aucun avatar de leur culture et de leur ascendance** (portrait générique ; nains 42 %, humains 31 %, ogres 22 %, elfes 20 %), plus encore dans une escouade de départ, qui a la culture du capitaine. Ceux qui ont un avatar : culture et ascendance toujours justes ; profil contredit 15 %, arme en main 42 %, arme de dos 8 %, magie 13 % : il manque des avatars par culture et par arme. Le Design Lab donne, par peuple, la part de portraits génériques et les combinaisons à produire.
- Design Lab, page Avatars (Idan, 2026-10-27 : la culture étant obligatoire, tout est croisé par culture) : par peuple, la part des mercenaires **sans avatar possible** ; les **combinaisons à produire**, rangées par culture (profil · arme tenue en main ou école du mage, celles d'au moins 0,5 %) ; les **profils par culture** et les **ascendances × cultures** (avatars possibles / cible par case, au moins 1 pour une ascendance).
- **Besoin en avatars** (Idan, 2026-10-30 ; il remplacera dans l'onglet Avatars le besoin de 100 par peuple et les combinaisons d'au moins 0,5 %, qui sortaient de 500 tirages et bougeaient à chaque changement de la génération) :
  - **par culture** : dans une partie, un joueur voit passer **50 mercenaires d'une même culture** (`avatars.demand.mercenaries` : escouade de départ jusqu'à 22, embauches, Taverne) ; le peuple n'entre plus en compte ;
  - **case précise (PP)** = culture × ascendance × arme tenue en main (l'arme précise) ou école du mage. Sa part = part **exacte** de l'ascendance × part de l'arme ou de l'école chez les mercenaires de cette culture et de cette ascendance, **mesurée une fois** sur un grand nombre de tirages du vrai générateur (`data/reference/avatar-demand.json`, `scripts/build-avatar-demand.js` : 40 000 tirages sans ascendance, 8 000 par ascendance) ; les mesures ne changent que si on les refait, quand la génération change ;
  - **besoin d'une case** = nombre d'avatars pour que le risque d'en manquer sur 50 tirages reste sous **S = 10 %** pour les mercenaires sans ascendance, **20 %** avec (`avatars.demand.threshold`, `avatars.demand.threshold_ascendance` ; loi binomiale, calcul exact). Une case trop rare n'a pas de besoin précis : ses mercenaires passent au repli ;
  - **un avatar ne sert qu'une fois** (jamais deux fois le même visage ; ceux des morts ne reviennent pas) : chaque avatar va dans une seule case, de façon à couvrir le plus de besoins. Un avatar tagué d'une catégorie d'arme (« Armes de tir ») ne vaut pas une arme précise ;
  - **repli (PL)** = culture × ascendance × profil (corps à corps, distance, magie), avec les avatars restés libres ;
  - **couleurs** : vert, assez d'avatars précis ; orange, pas assez, mais avec le repli le risque de manquer reste sous **2 × S** (`avatars.demand.fallback_factor`) ; rouge, même avec le repli, ça ne suffit pas.
  - Ordre de grandeur (le 2026-10-30) : environ 85 avatars précis par culture naine, 263 pour les trois.

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

- si le mercenaire possède un bonus sur cette école **ou** réussit un jet de présence à 50 %, alors : `École = Moyenne(Intelligence, Puissance magique, Réserve de mana) × Rand(0,5 ; 1,5)` ;
- sinon : `École = 1`.

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

- `Régénération = 0` au tirage brut initial.

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

Données : `data/reference/people-affinity.json` (matrice) ; constantes `affinity.*` dans `formula-constants.json` ; code `game-core/affinity.js`.

État V1 :

- sur la fiche des membres de la compagnie, l'affinité s'affiche en **dix cœurs** et **une phrase**, sans score (décision Idan, PR #137) : un cœur plein par tranche de 20 au-dessus de −100, et dix phrases de « Rêve en permanence de vous arracher les organes. » (−100 à −80) à « Fantasme toutes les nuits en pensant à vous. » (80 à 100), chacune avec trois variantes de même sens (Idan, 2026-10-24) ; la phrase montrée dépend du mercenaire et du niveau, et ne change pas d'un affichage à l'autre (`data/reference/affinity-phrases.json`) ;
- à la Taverne, le score seul s'affiche sur la carte du candidat et dans l'entretien (décision Idan du 2026-10-20). L'alignement du candidat reste caché (14 §6), même si le score en laisse deviner une partie ;
- effets décidés par Idan le 2026-10-20 : salaire demandé × (1 − 0,2 × Affinité / 100) (doc 09 §4) et résistance à la négociation − 0,25 × Affinité (doc 14 §9) ;
- pas encore d'effet sur la négociation d'équipement ni sur d'autres interactions : coefficients à définir avec Idan.
