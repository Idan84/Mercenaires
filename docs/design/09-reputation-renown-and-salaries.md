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
- **revient vivant d’une mission mais blessé** : `+10 Réputation` ;
- **revient vivant d’une mission sans blessure** : `+20 Réputation`.

La participation à la blessure est comptée **une seule fois par mercenaire et par ennemi**, dès lors que le mercenaire a effectivement contribué à ses dégâts. Le mercenaire qui porte le coup de grâce reçoit donc normalement le bonus de participation (`1 %`) **plus** le bonus de coup de grâce (`10 %`), soit `11 %` de la réputation de la cible s’il avait participé à sa mise à mort.

Les bonus de retour de mission sont **exclusifs** : un mercenaire indemne reçoit `+20`, pas `+10 +20`. La fatigue seule n’est pas considérée comme une blessure pour cette règle.

On stocke donc un `ReputationCareerDelta` persistant, initialisé à `0`, puis modifié par ces événements.

La réputation totale devient :

$$
ReputationPerso = ReputationCalculee + ReputationCareerDelta
$$

`ReputationCalculee` continue d’être entièrement recalculée à partir du pool après progression ; `ReputationCareerDelta` conserve la mémoire des événements de carrière qui modifient directement la réputation : CC / EC, participation aux blessures d’ennemis, coups de grâce et retours de mission.

**Barème confirmé par Idan le 2026-10-20**, de préférence au barème proposé dans l'issue #110. Pour la mise hors combat, Idan a donné l'intention : « un mec qui massacre à lui tout seul une armée de troufions doit gagner en réputation ; un mec qui terrasse un dragon également ; un mec qui tue un gobelin sans intérêt, il gagne pas grand-chose ». La part de la réputation de l'ennemi, additionnée ennemi par ennemi, donne déjà ce résultat : elle est conservée telle quelle.

Mise en œuvre V1 (choix d'implémentation, relecture Chatty) :

- **CC / EC confirmés** : les mêmes événements que l'XP de Chance (doc 08) — chaque critique au Toucher et chaque critique au Blesser (+1 chacun) ; l'échec critique au Toucher (chute Au Sol) et l'échec critique au Blesser (contrecoup), −1 chacun.
- **Participation** : le premier coup qui inflige des dégâts (> 0) à un ennemi, une seule fois par ennemi ; un allié touché par accident ne compte pas ; un projectile perdu qui blesse un ennemi compte.
- **Coup de grâce** : le coup qui met l'ennemi hors combat (ennemi « tué » au sens V1).
- **Réputation de l'ennemi** : sa réputation pendant la mission ; elle ne bouge pas avant le bilan, puisque les gains sont appliqués en fin de mission. Ennemis générés : leur réputation de génération.
- **Retour de mission** (validé par Idan le 2026-10-20) : « revenir blessé » = finir la mission avec le statut « Blessé » (10-mission-time §7), qui donne `+10`. « Fatigué » donne `+20`, même si le mercenaire a perdu des PV ou a fui la carte. Un mort ne gagne rien.
- Le delta garde ses décimales ; la fiche et le bilan l'affichent arrondi. La fiche montre la réputation totale, puis « initiale » (part calculée) et « carrière » (delta) dès qu'il y a un gain.
- Un bilan déjà appliqué n'est pas crédité une seconde fois.
- Constantes : `reputation.career.*` dans `data/reference/formula-constants.json`.
- Pas encore branché : le recalcul de `ReputationCalculee` après progression (étape suivante) ; le contrat et le salaire ne changent pas avec la réputation ; les soins ne rapportent pas de réputation (absents du barème).

### Affichage en étoiles

Décision Idan du 2026-10-20 : dans le jeu, la réputation personnelle et la renommée de compagnie ne s'affichent plus en chiffres mais en **15 niveaux** : 1 à 5 étoiles de **bronze**, puis d'**argent**, puis d'**or**. 5 étoiles d'or est un maximum difficilement atteignable. La valeur chiffrée reste dans le moteur (salaires, renommée, prétendants) et apparaît au survol des étoiles, pour les tests du prototype.

Échelle V1 (`data/reference/reputation-stars.json`) : géométrique, environ ×1,25 par niveau ; la renommée utilise les mêmes seuils × 4.

| Niveau | Étoiles | Réputation dès | Renommée dès |
|---|---|---|---|
| 1 à 5 | 1 à 5 bronze | 0 · 100 · 125 · 160 · 200 | 0 · 400 · 500 · 640 · 800 |
| 6 à 10 | 1 à 5 argent | 250 · 320 · 400 · 500 · 640 | 1 000 · 1 280 · 1 600 · 2 000 · 2 560 |
| 11 à 15 | 1 à 5 or | 800 · 1 000 · 1 250 · 1 600 · 2 000 | 3 200 · 4 000 · 5 000 · 6 400 · 8 000 |

Repères mesurés :

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
RenommeeCompagnie = R_{capitaine} + \sum_{i \geq 1} \frac{R_i}{i^{1{,}5}} + Heritage
$$

- **Capitaine** : sa réputation personnelle totale (calculée + carrière), comptée entière.
- **Autres membres vivants** : classés par réputation personnelle totale décroissante ; le rang `i` (1, 2, 3…) compte pour `R_i / i^1,5`. À réputation égale, le plus ancien dans la compagnie est mieux classé. Tous les membres vivants comptent : la pondération remplace l'ancien « top 10 ».
- **Héritage** : quand un mercenaire autre que le capitaine meurt au combat, on calcule sa contribution pondérée juste avant son retrait et on ajoute **20 %** de cette contribution à un cumul permanent. Exemple : le premier du classement, à 500 de réputation, laisse +100. Les survivants sont ensuite reclassés ; l'héritage reste fixe (ni repondéré, ni recalculé), n'est compté qu'une fois et garde l'identité et le jour de la mort pour un futur mémorial.
- Si plusieurs mercenaires meurent pendant la même mission, leurs contributions sont calculées sur le classement du début de mission : l'ordre des morts ne change rien.
- Pas de plafond ; pas de perte de l'héritage. La mort du capitaine reste un Game Over.
- Constantes : `company.renown.rank_exponent` (1,5) et `company.renown.heritage_share` (0,2) dans `data/reference/formula-constants.json`.

**Ajouts futurs** : les points de missions et la réputation de développement du camp, prévus dans l'architecture d'origine (`PointsMissions + ReputationDeveloppementCamp + PrestigeTop10Mercenaires`), seront ajoutés quand ces systèmes existeront dans le jeu. Les effets de la renommée (qualité des recrues, missions, marchands, places de Taverne) attendent une validation distincte d'Idan.

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
3 \times SalaireDemande
\times FacteurCouragePrime
\times FacteurPretentionsPrime)
\]

Le coefficient \(3\) est une constante d'échelle de playtest. Le salaire demandé transmet déjà indirectement la Réputation, l'Intelligence et les Prétentions salariales à la prime.

**V1 : la prime de mission contractuelle est fixe**, quelle que soit la mission. Une éventuelle prime de risque liée au danger sera traitée plus tard comme un mécanisme séparé afin de ne pas ajouter une troisième couche de négociation au recrutement.

La négociation conjointe **Salaire + Prime de mission** est définie dans [Taverne — recrutement V1](/design/#doc=14-tavern-recruitment.md).

### Contrats et paie — implémentation V1

- **L’escouade initiale est sous contrat** (décision Idan, 2026-10-04), aux conditions qu’elle demande : salaire demandé et prime de mission demandée, sans négociation. Le capitaine n’a pas de contrat. Validé par Idan après la review de Chatty (PR #37).
- Les recrues de la Taverne gardent le contrat négocié (`14-tavern-recruitment.md`).
- Le **salaire contractuel est versé chaque jour** par `AdvanceTime`, après la guérison et avant la Taverne, à tous les membres sous contrat. Les blessés et les fatigués sont payés à 100 % pour l’instant (Idan, 2026-10-04) ; le taux deviendra une option de l’Intendance avec la politique des blessés (§7).
- La prime de mission est payée au retour de mission (`10-mission-time-and-unavailability.md` §8 et §11).
- Si l’or manque, le trésor passe sous 0, sans conséquence pour l’instant (Idan, 2026-10-04). Dette, impayés et départs restent à concevoir.

## 7 — Politique des blessés — « T’es pas à la Sécu ici »

La compagnie pourra définir un **taux de salaire des blessés de 0 à 100 %**.

Un taux faible :

- économise de l’or à court terme ;
- rend la compagnie moins attractive ;
- augmente le risque de départ des blessés ;
- peut conduire un mercenaire à partir avec l’équipement qui lui avait été confié.

Les formules exactes de loyauté, départ et attractivité restent à définir.

## 8 — Points encore ouverts

- négociation du salaire contractuel ;
- évolution des prétentions salariales ;
- règles de renégociation en cours de carrière ;
- arrondi / granularité d’affichage du salaire demandé ;
- pondération exacte du Top 10 dans la renommée de compagnie ;
- conversion des points de mission et du développement du camp en renommée ;
- éventuels nouveaux gains directs de réputation liés au camp.