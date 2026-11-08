> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Réputation, renommée & salaires

<aside>
💰

**Version de travail consolidée — 2 octobre 2026.** Cette page distingue la réputation personnelle d’un mercenaire, la renommée de la compagnie et les mécanismes de rémunération. Les formules non encore chiffrées sont signalées comme telles.

</aside>

## 1 — Réputation personnelle

La réputation personnelle représente **ce que les autres perçoivent du mercenaire**, et non une mesure parfaite de sa valeur réelle. Elle est calculée dès la création du mercenaire puis **recalculable au cours de sa carrière**, notamment après les combats et les évolutions de caractéristiques / compétences.

### Pool utilisé

Le même pool sert à calculer la **moyenne**, le **maximum** et le **minimum** :

- Force ;
- Constitution ;
- Dextérité ;
- Vitesse ;
- Endurance ;
- Esquive ;
- Chance ;
- Charisme ;
- Courage ;
- Intelligence ;
- Volonté ;
- Perception ;
- Puissance magique ;
- Réserve de mana ;
- les 5 résistances ;
- les 3 meilleures compétences martiales ;
- les 3 meilleures écoles de magie, hors sorts ;
- la meilleure compétence Artisanat ;
- la meilleure compétence Animal ;
- la meilleure compétence Camp ;
- la meilleure compétence Physiologie ;
- la meilleure compétence Social, **comptée deux fois**.

Pour le Social ×2, la même valeur est insérée deux fois dans le pool ; elle n’est pas doublée numériquement.

Seules les valeurs **strictement supérieures à 0** sont retenues pour le calcul de la moyenne, du maximum et du minimum.

### Formule de réputation personnelle

$$
ReputationPerso = MoyennePool \times \left(1+\frac{Charisme}{100}\right) \times \left(1+\frac{MaxPool}{100}\right) \times \left(1+\frac{MinPool}{100}\right)
$$

Le Charisme intervient donc à la fois comme valeur du pool et comme multiplicateur de visibilité / aura.

<aside>
👁️

La valeur numérique peut rester cachée au joueur et être présentée sous forme qualitative. Elle sert néanmoins de vraie donnée de calcul.

</aside>

### Exploits et carrière

La réputation personnelle possède désormais une petite composante persistante de carrière en plus du socle calculé.

Événements validés en combat / fin de mission :

- **CC confirmé** : `+1 Réputation` ;
- **EC confirmé** : `−1 Réputation` ;
- **participation à la blessure d’un ennemi** : `+1 % de la RéputationPerso de cet ennemi` ;
- **coup de grâce / ennemi tué** : `+10 % supplémentaires de la RéputationPerso de cet ennemi` ;
- **revient vivant d’une mission mais blessé** : `+5 Réputation` ;
- **revient vivant d’une mission sans blessure** : `+10 Réputation`.

Retour de mission **divisé par deux** le 2026-11-08 (Idan : « +10 / +5 » ; auparavant +20 / +10) : la réputation montait
d'environ une étoile par mission.

**Sa monture** (Idan, 2026-11-07 : « réputation 1 ») : les exploits de sa monture équipée — participation à la blessure
d'un ennemi et coup de grâce — comptent pour son cavalier, qu'il la monte ou non, une fois par ennemi comme les siens (la
monture garde son XP). Sa meilleure compétence Animal est déjà dans le pool.

La participation à la blessure est comptée **une seule fois par mercenaire et par ennemi**, dès lors que le mercenaire a effectivement contribué à ses dégâts. Le mercenaire qui porte le coup de grâce reçoit donc normalement le bonus de participation (`1 %`) **plus** le bonus de coup de grâce (`10 %`), soit `11 %` de la réputation de la cible s’il avait participé à sa mise à mort.

Les bonus de retour de mission sont **exclusifs** : un mercenaire indemne reçoit `+10`, pas `+5 +10`. La fatigue seule n’est pas considérée comme une blessure pour cette règle.

On stocke donc un `ReputationCareerDelta` persistant, initialisé à `0`, puis modifié par ces événements.

La réputation totale devient :

$$
ReputationPerso = ReputationCalculee + ReputationCareerDelta
$$

`ReputationCalculee` continue d’être entièrement recalculée à partir du pool après progression ; `ReputationCareerDelta` conserve la mémoire des événements de carrière qui modifient directement la réputation : CC / EC, participation aux blessures d’ennemis, coups de grâce et retours de mission.

**Barème confirmé par Idan le 2026-10-20**, de préférence au barème proposé dans l'issue #110. Pour la mise hors combat, Idan a donné l'intention : « un mec qui massacre à lui tout seul une armée de troufions doit gagner en réputation ; un mec qui terrasse un dragon également ; un mec qui tue un gobelin sans intérêt, il gagne pas grand-chose ». La part de la réputation de l'ennemi, additionnée ennemi par ennemi, donne déjà ce résultat : elle est conservée telle quelle.

Mise en œuvre V1 (choix d'implémentation, relecture Chatty) :

- **CC / EC confirmés** : les mêmes événements que l'XP de Chance (doc 08) — chaque critique au Toucher et chaque critique au Blesser (+1 chacun) ; l'échec critique au Toucher (chute Au Sol) et l'échec critique au Blesser (contrecoup), −1 chacun. Les critiques des sorts aussi : coup critique +1, échec critique confirmé −1 (Idan, 2026-10-25).
- **Participation** : le premier coup qui inflige des dégâts (> 0) à un ennemi, une seule fois par ennemi ; un allié touché par accident ne compte pas ; un projectile perdu qui blesse un ennemi compte.
- **Coup de grâce** : le coup qui met l'ennemi hors combat (ennemi « tué » au sens V1).
- **Réputation de l'ennemi** : sa réputation pendant la mission ; elle ne bouge pas avant le bilan, puisque les gains sont appliqués en fin de mission. **Ennemis tirés d'une fiche** (Idan, 2026-11-08) : **3 × les points de combat** de la fiche (`reputation.enemy.points_factor`), par exemple 12 à 18 pour un gobelin novice, 306 pour le chef de clan gobelin, 540 pour le troll d'élite ; auparavant, la réputation du personnage généré sous la fiche (100 à 180, même pour un novice). Les bêtes des chasses (fiches de `mounts.json`) n'ont pas de points : elles ne rapportent rien.
- **Retour de mission** (validé par Idan le 2026-10-20) : « revenir blessé » = finir la mission avec le statut « Blessé » (10-mission-time §7), qui donne `+5`. « Fatigué » donne `+10`, même si le mercenaire a perdu des PV ou a fui la carte. Un mort ne gagne rien.
- Le delta garde ses décimales ; la fiche et le bilan l'affichent arrondi. La fiche montre la réputation totale, puis « initiale » (part calculée) et « carrière » (delta) dès qu'il y a un gain.
- Un bilan déjà appliqué n'est pas crédité une seconde fois.
- Constantes : `reputation.career.*` dans `data/reference/formula-constants.json`.
- **Recalcul de `ReputationCalculee`** (Idan, 2026-11-08 : « brancher le recalcul ») : chaque matin, après la guérison et l'entraînement, avant la renégociation salariale, la part calculée est recalculée pour toute la compagnie avec les valeurs du jour (même formule qu'à la création, `recalculateReputation` de `mercenary-generator.js`) ; le delta de carrière est gardé. Une réputation de mercenaire progresse donc aussi avec ses caractéristiques et ses compétences.
- Pas encore branché : le contrat et le salaire ne changent pas avec la réputation (hors renégociation à l'étoile gagnée) ; les soins ne rapportent pas de réputation (absents du barème).

### Affichage en étoiles

Décision Idan du 2026-10-20 : dans le jeu, la réputation personnelle et la renommée de compagnie ne s'affichent plus en chiffres mais en **15 niveaux** : 1 à 5 étoiles de **bronze**, puis d'**argent**, puis d'**or**. 5 étoiles d'or est un maximum difficilement atteignable. La valeur chiffrée reste dans le moteur (salaires, renommée, prétendants) et apparaît au survol des étoiles, pour les tests du prototype.

Échelle (`data/reference/reputation-stars.json`) : géométrique, **× 1,5 par niveau** depuis le 2026-11-08 ; la renommée utilise les mêmes seuils × 4.

**Écartée le 2026-11-08** (Idan : « × 1,5 par étoile ») : la réputation montait d'environ une étoile par mission (23 à 56 points
entre deux étoiles) ; chaque seuil vaut désormais 1,5 fois le précédent à partir de 2 étoiles de bronze = 93, arrondi.
Effet sur les recrues (600 tirées, médiane 124) : ≈ 2 % 1 étoile, 80 % 2 étoiles, 18 % 3 étoiles de bronze. Les salaires
ne changent pas (ils suivent la valeur, pas l'étoile) ; le salaire de référence du garde du corps, le niveau des
missions et les places de la Taverne suivent les nouveaux seuils (au-delà de 15★, × 1,5).

**Recalée le 2026-11-06** (Idan : « recale les étoiles ») : les écoles de magie, divisées par deux, gonflaient la réputation
(médiane des recrues 138 → 123) ; les seuils de 2 à 5 étoiles de bronze redonnent aux recrues la même répartition
qu'avant (≈ 1 / 25 / 52 / 19 / 3 %), puis ×1,25 par niveau à partir de 160. Auparavant : 0 · 100 · 125 · 160 · 200 ·
250 · 320 · 400 · 500 · 640 · 800 · 1 000 · 1 250 · 1 600 · 2 000. Ce qui suit les seuils suit avec eux (salaire de
référence du garde du corps, niveau des missions, places de la Taverne…).

| Niveau | Étoiles | Réputation dès | Renommée dès |
|---|---|---|---|
| 1 à 5 | 1 à 5 bronze | 0 · 93 · 140 · 209 · 314 | 0 · 372 · 560 · 836 · 1 256 |
| 6 à 10 | 1 à 5 argent | 471 · 706 · 1 059 · 1 589 · 2 383 | 1 884 · 2 824 · 4 236 · 6 356 · 9 532 |
| 11 à 15 | 1 à 5 or | 3 575 · 5 363 · 8 044 · 12 066 · 18 100 | 14 300 · 21 452 · 32 176 · 48 264 · 72 400 |

Seuils du 2026-11-06 au 2026-11-08 : réputation 0 · 93 · 113 · 137 · 160 · 200 · 256 · 320 · 400 · 512 · 640 · 800 · 1 000 ·
1 280 · 1 600.

Repères mesurés (avant les recalages du 2026-11-06 et du 2026-11-08, à relire avec les seuils d'alors) :

- recrues générées (réputation 87 à 260, médiane 137) : surtout 2 à 4 étoiles de bronze ; 5 étoiles de bronze ou 1 d'argent pour les profils exceptionnels ;
- un vétéran revenu d'environ 25 missions (≈ 550) : 4 étoiles d'argent ; l'or commence à 800 ; 5 étoiles d'or (2 000) demandent une très longue carrière ;
- une compagnie démarre entre 410 et 590 de renommée (2 ou 3 étoiles de bronze) ; environ 1 000 après 25 missions (1 étoile d'argent) ; 5 étoiles d'or (8 000) suppose une compagnie entière de légendes et un long héritage.

Phrase de la fiche : chaque niveau porte une phrase qui explique la réputation du mercenaire (Idan, 2026-10-21), et trois variantes de même sens (Idan, 2026-10-24). La fiche en montre une, choisie selon le mercenaire et le niveau : deux mercenaires du même niveau n'ont pas forcément la même, et elle ne change pas d'un affichage à l'autre.

## 2 — Renommée de la compagnie

La réputation générale de la compagnie correspond à sa **renommée / célébrité**, pas à sa moralité.

Elle doit servir notamment à :

- attirer davantage de mercenaires ;
- attirer des mercenaires de meilleure qualité ;
- ouvrir l’accès à des missions plus difficiles ;
- fournir une valeur synthétique comparable entre compagnies / parties.

### Formule V1 (décision Idan du 2026-10-20, issue #111)

$$
RenommeeCompagnie = R_{capitaine} + \sum_{i \geq 2} \frac{R_i}{i^{1{,}5}} + Heritage
$$

- **Capitaine** : sa réputation personnelle totale (calculée + carrière), comptée entière ; il est toujours **1er** du classement (Idan, 2026-11-08 : « on descend d'un cran : le 1er mercenaire est le capitaine et il compte toujours à 100 %, puis le plus fort guerrier passe en 2 forcément »).
- **Autres membres vivants** : classés par réputation personnelle totale décroissante, à partir du rang 2 ; le rang `i` (2, 3, 4…) compte pour `R_i / i^1,5` (÷ 2,8, ÷ 5,2, ÷ 8…). Avant le 2026-11-08, le meilleur mercenaire était 1er et comptait entier : dans la partie n°5 (365 jours), un seul elfe à 542 faisait 28 % de la renommée. À réputation égale, le plus ancien dans la compagnie est mieux classé. Tous les membres vivants comptent : la pondération remplace l'ancien « top 10 ».
- **Héritage** : quand un mercenaire autre que le capitaine meurt au combat, on calcule sa contribution pondérée juste avant son retrait et on ajoute **20 %** de cette contribution à un cumul permanent. Exemple : le meilleur mercenaire (2e), à 500 de réputation, laisse 20 % de 500 / 2^1,5, soit +35 (+100 avant le 2026-11-08). Les survivants sont ensuite reclassés ; l'héritage reste fixe (ni repondéré, ni recalculé), n'est compté qu'une fois et garde l'identité et le jour de la mort pour un futur mémorial. Un déserteur tué en combat singulier par le capitaine en laisse un aussi (Idan, 2026-11-04 : « Il est mort dans un combat » ; doc 11 §11).
- Si plusieurs mercenaires meurent pendant la même mission, leurs contributions sont calculées sur le classement du début de mission : l'ordre des morts ne change rien.
- Pas de plafond ; pas de perte de l'héritage. La mort du capitaine reste un Game Over.
- Constantes : `company.renown.rank_exponent` (1,5) et `company.renown.heritage_share` (0,2) dans `data/reference/formula-constants.json`.

**Points de mission** (doc 17 §8, 2026-10-24) : un contrat échoué retire 30 points de renommée (`company.missionRenown`, compté dans le total) ; une garde du corps en ajoute **+3** (doc 17 §12 ; +5 avant le 2026-11-08). Un contrat gagné n'en ajoute pas. **Dortoir** (doc 11 §4, Idan 2026-10-25) : chaque niveau de qualité atteint ajoute sa Renommée (+50 par niveau), pour de bon (part « dortoir »). **Ajouts futurs** : les points de missions et la réputation de développement du camp, prévus dans l'architecture d'origine (`PointsMissions + ReputationDeveloppementCamp + PrestigeTop10Mercenaires`), seront ajoutés quand ces systèmes existeront dans le jeu. Les effets de la renommée (qualité des recrues, missions, marchands) attendent une validation distincte d'Idan ; places de Taverne : 3 + niveau de renommée (Idan, 2026-11-04 ; doc 14 §2).

<aside>
📈

La renommée de la compagnie doit également influencer les distributions de génération de `Create_Mercenary()` : les jets de début de partie sont des distributions de base, pas des constantes rigides.

</aside>

## 3 — Alignement de compagnie

L’alignement est distinct de la renommée.

Le capitaine est l’identité de la compagnie : **l’alignement du capitaine fait donc office d’alignement de compagnie**.

Il évolue selon les choix du joueur et influence notamment :

- les profils de mercenaires attirés ;
- les types de missions proposés ;
- les tensions / départs des mercenaires d’alignement très opposé ;
- certains conflits internes.

Ces effets doivent être probabilistes plutôt que des exclusions automatiques.

Pour `Create_Mercenary()`, cet effet est désormais chiffré : l’alignement exact du capitaine reçoit **+15 points de probabilité** dans le tirage du candidat. Les autres alignements sont réduits proportionnellement pour conserver une distribution totale de 100 %. Ce biais ne modifie que l’orientation générée du mercenaire.

## 4 — Salaire : formule V1

Le salaire ne mesure pas la valeur réelle du mercenaire.

> **On n’est pas payé ce qu’on vaut : on est payé selon ce que les autres perçoivent et selon la manière dont on se vend.**
> 

La **Réputation personnelle** fournit la part principale du salaire. **Prétentions salariales** et **Intelligence** ne créent pas la valeur marchande : elles la **déforment**.

La caractéristique maximale n’intervient plus directement dans le salaire : elle influence déjà indirectement la Réputation personnelle via le pool et `MaxPool`.

### Salaire de base — Réputation

$$
SalaireBase = max\left(1, \frac{ReputationPerso}{30}\right)
$$

`10–100 PO/jour` correspond désormais à la plage normale d’un mercenaire ordinaire, **pas à un plafond**. L’échelle monétaire des salaires est multipliée par `10` afin d’offrir davantage de granularité en pièces d’or. Un vétéran célèbre ou une légende peut dépasser largement `100 PO/jour`.

### Déformation — Prétentions salariales

Avec `PretentionsSalariales = 10D6`, centrées autour de `35` :

$$
FacteurPretentions = 1 + \frac{PretentionsSalariales - 35}{100}
$$

Ordres de grandeur : `10 → ×0,75`, `35 → ×1`, `60 → ×1,25`.

### Déformation — Intelligence

L’Intelligence suit une courbe en U centrée sur `100` :

$$
FacteurIntelligence = 1 + 0,25 \times \left(\frac{Intelligence - 100}{100}\right)^2
$$

- autour de `100` : déformation minimale ;
- sous `100` : le mercenaire peut se **survendre** ;
- au-dessus de `100` : il sait mieux **négocier sa valeur**.

### Déformation — Affinité avec le capitaine

Décision Idan du 2026-10-20 : un mercenaire qui apprécie son capitaine demande moins, celui qui le rejette demande plus.

$$
FacteurAffinite = 1 - 0,2 \times \frac{Affinite}{100}
$$

L'affinité (doc 02) va de −100 à +100 : le facteur va donc de `×1,2` à `×0,8`. Exemple sur 48 PO : `+100 → 38`, `+56 → 43`, `−71 → 55`. Il s'applique à tout mercenaire généré avec un capitaine, **escouade de départ comprise** ; le capitaine lui-même et les ennemis n'en ont pas (facteur 1). La prime de mission demandée, calculée à partir du salaire, suit. Constante : `salary.affinity.max_effect`.

### Formule finale V1

$$
SalaireDemande = arrondi\left(
10 \times
max\left(1, \frac{ReputationPerso}{30}\right)
\times \left(1 + \frac{PretentionsSalariales - 35}{100}\right)
\times \left[1 + 0,25 \times \left(\frac{Intelligence - 100}{100}\right)^2\right]
\times \left(1 - 0,2 \times \frac{Affinite}{100}\right)
\right)
$$

Le multiplicateur `×10` est une **échelle monétaire** : il ne change pas la hiérarchie relative des mercenaires, mais permet de manipuler davantage de pièces d’or et rend les écarts de salaire plus granulaires.

Le résultat est exprimé en **pièces d’or entières par jour**, arrondi à l’entier le plus proche, et n’a pas de plafond.
## 5 — Prétentions salariales

`Prétentions salariales` reste un **attribut caché**, mais appartient conceptuellement au domaine **Social caché**.

Tirage brut initial :

$$
PretentionsSalariales = 10D6
$$

Cette valeur :

- est générée à la création ;
- est évolutive ;
- entre dans les futures formules de salaire ;
- **n’entre jamais dans le Max Social utilisé pour calculer la réputation personnelle**.

## 6 — Éléments de rémunération

Le salaire de base est une **rémunération journalière**, cohérente avec la couche gestion en jours.

À distinguer conceptuellement :

- **salaire demandé** : prétention du mercenaire ;
- **salaire contractuel** : rémunération acceptée lors du recrutement / renégociée ;
- **prime de mission** : rémunération supplémentaire liée à une mission ;
- **salaire réellement versé** : peut dépendre des politiques de la compagnie.

Règle retenue pour les primes : **la prime de mission est payée au mercenaire s’il revient**.

### Prime de mission demandée — PLAYTEST V1

La prime contractuelle de mission est distincte du salaire journalier. Elle représente notamment la prime de risque : **plus le Courage est élevé, plus cette prime baisse**.

\[
FacteurCouragePrime = Clamp(1.5 - Courage/100,\ 0.5,\ 1.5)
\]

\[
FacteurPretentionsPrime = 1 + \frac{PretentionsSalariales - 35}{200}
\]

\[
PrimeMissionDemandee = Arrondi(
1{,}5 \times SalaireDemande
\times FacteurCouragePrime
\times FacteurPretentionsPrime)
\]

Le coefficient est une constante d'échelle de playtest (`tavern.mission_bonus.salary_multiplier`) : **3** au départ, **divisé par deux (1,5) par Idan le 2026-10-25** (« les temps sont durs ») ; dans une partie commencée avant, les primes des contrats signés et des négociations en cours sont divisées par deux une fois. Le salaire demandé transmet déjà indirectement la Réputation, l'Intelligence et les Prétentions salariales à la prime.

**V1 : la prime de mission contractuelle est fixe**, quelle que soit la mission. Une éventuelle prime de risque liée au danger sera traitée plus tard comme un mécanisme séparé afin de ne pas ajouter une troisième couche de négociation au recrutement.

La négociation conjointe **Salaire + Prime de mission** est définie dans [Taverne — recrutement V1](/design/#doc=14-tavern-recruitment.md).

### Contrats et paie — implémentation V1

- **L’escouade initiale est sous contrat** (décision Idan, 2026-10-04), aux conditions qu’elle demande : salaire demandé et prime de mission demandée, sans négociation. Le capitaine n’a pas de contrat. Validé par Idan après la review de Chatty (PR #37).
- Les recrues de la Taverne gardent le contrat négocié (`14-tavern-recruitment.md`).
- Le **salaire contractuel est versé chaque jour** par `AdvanceTime`, après la guérison et avant la Taverne, à tous les membres sous contrat. Les fatigués sont payés à 100 % ; les blessés et les corvées suivent la politique sociale de l'Intendance (§7 ; Idan, 2026-11-04 : blessés à 50 % par défaut).
- La prime de mission est payée au retour de mission (`10-mission-time-and-unavailability.md` §8 et §11).
- Si l’or manque, le trésor passe sous 0, sans conséquence pour l’instant (Idan, 2026-10-04). Dette, impayés et départs restent à concevoir.

### Renégociation salariale (Idan, 2026-11-04)

« Quand un mercenaire gagne une étoile de réputation, il fait un test (entre salaire perçu et salaire théorique). En fonction
de son intelligence, il vient demander un meilleur salaire au capitaine… On rentre dans une phase de négociation. Avec gain ou
perte d'affinité » ; « oui » ; « parfait ».

- **Le test** : le matin, un membre au camp (pas en mission, pas au cachot : il viendra le premier matin où il y est) qui a
  gagné une étoile depuis la dernière fois compare son salaire à son **salaire théorique** : la formule du §4 avec ses valeurs
  du jour (réputation, prétentions, Intelligence, affinité avec le capitaine). Assez payé : rien. Sinon, chance de venir
  réclamer = **100 / (1 + e^(−Δ/10))**, **Δ = 100 × écart + (Intelligence − 50) / 2 − 15**, de 5 à 95 %
  (`salary_review.chance.*` ; écart = théorique ÷ salaire − 1). Une étoile, pour une recrue moyenne, c'est environ 16 %
  d'écart : 29 % à 30 d'Intelligence, 56 % à 53, 82 % à 79. S'il ne vient pas, rien avant sa prochaine étoile.
- **La demande** : son salaire théorique ; la prime de mission ne bouge pas.
- **La scène**, au début de la journée (après celle d'un déserteur), qui bloque le jeu ; une ligne dans la notification du
  jour (« … veut vous parler de son salaire ») : **Accepter**, **Négocier**, **Refuser**. On négocie comme à la Taverne
  (doc 14 §9, sur le salaire seul) : jamais moins que son salaire actuel, ni que l'offre refusée ; il accepte, fait une
  contre-proposition, ou **rompt** (il garde son salaire). Mais la **concession se compte sur l'augmentation** qu'on lui
  refuse (Idan, 2026-11-04 : « Oui ») : **concession = 50 × (1 − augmentation offerte ÷ augmentation demandée)**
  (`salary_review.concession_weight`). Il demande 55, il touche 47 (résistance 40) : 47, aucune augmentation, 5 % qu'il
  accepte ; 51, la moitié, 49 % ; 53, les trois quarts, 74 %. Avec la concession de la Taverne, ne rien lui accorder
  passait 7 fois sur 10.
- **Affinité** : **+5** s'il obtient tout ce qu'il demande (ou plus) ; **0** si on tombe d'accord plus bas ; **−10** si on
  refuse ou s'il rompt (`salary_review.affinity.*`). Après une rupture, la relance (doc 11 §7) : **Intimider** ou
  **Convaincre** pour qu'il accepte la dernière offre (chance d'accepter cette offre + Intimidation ou Charisme ÷ 2, au plus
  95 %) ; ratée : −20 (intimidé) ou −5 (convaincu) ; ou **Laisser tomber** (−10). Une baisse d'affinité déclenche le test de
  désertion du lendemain (doc 11 §11).
- Historique : « Obtient une augmentation : de 47 à 55 PO par jour. », « Réclame une augmentation ; n'obtient rien. ». Code
  `game-core/salary-review.js` (le salaire théorique : `salaryDemand`, `mercenary-generator.js`),
  `prototype-web/salary-review-ui.js` ; textes `salary-review-dialogue.json` ; test `tests/salary-review.test.js`.

## 7 — Politique des blessés — « T’es pas à la Sécu ici »

**La politique sociale, à l'Intendance** (Idan, 2026-11-04 : « Un mercenaire blessé touche 50 % de son salaire pendant les
jours où il est blessé (c'est la nouvelle norme par défaut). Dans l'intendance, on a un curseur qu'on déplace librement de 0
à 100 %. Plus le taux est bas, plus l'affinité baisse sur les jours de blessure. A contrario, au-dessus de 50, on gagne de
l'affinité. On va faire la même chose pour chaque corvée, mais par défaut, c'est 100 %. Avec les corvées, on perd moins
d'affinité quand on monte le salaire. Un curseur par corvée » ; « Parfait et oui à tout ») :

- **Les blessés** touchent le **taux des blessés** × leur salaire, chaque jour de blessure : **50 % par défaut**, de 0 à
  100 %, y compris dans les parties en cours. Chaque jour de blessure, leur affinité avec le capitaine bouge de
  **(taux − 50) ÷ 25** : −2 à 0 %, −1 à 25 %, 0 à 50 %, +1 à 75 %, +2 à 100 % (`social.wounded.*`). Un **fatigué** touche
  tout son salaire. La prime de mission ne bouge pas.
- **Les corvées** (Bûcherons, Mineurs, Palais des plaisirs), **un curseur chacune** : le salaire des jours de corvée,
  **100 % par défaut**, de 0 à 200 % ; la perte d'affinité du jour × **(2 − taux ÷ 100)** : −2 à 0 %, −1 à 100 %, −0,5 à
  150 %, 0 à 200 % ; jamais de gain ; puis × 2 s'il a été intimidé pour y aller, × 0,5 s'il a été convaincu
  (`social.chore.*`).
- **Interface** : à l'Intendance, un menu « Politique sociale » : un curseur par ligne (par pas de 5 %) et son pourcentage,
  sans autre texte ; le curseur d'une corvée n'apparaît que si son bâtiment est construit ; pas besoin d'intendant.
- Une baisse d'affinité déclenche le test de désertion du lendemain (doc 11 §11) : un blessé mal payé peut filer.
- Code `game-core/social-policy.js` (salaire du jour dans `campaign.js`, perte des corvées dans `lumber.js`),
  `prototype-web/social-policy-ui.js` ; textes `social-policy-copy.json` ; test `tests/social-policy.test.js`.

Plus tard : l'attractivité de la compagnie à la Taverne.

## 8 — Points encore ouverts

- négociation du salaire contractuel ;
- évolution des prétentions salariales ;
- règles de renégociation en cours de carrière ;
- arrondi / granularité d’affichage du salaire demandé ;
- pondération exacte du Top 10 dans la renommée de compagnie ;
- conversion des points de mission et du développement du camp en renommée ;
- éventuels nouveaux gains directs de réputation liés au camp.