# Réputation, renommée & salaires

La réputation personnelle d’un mercenaire, la renommée de la compagnie et la rémunération. Constantes :
`data/reference/formula-constants.json`.

## 1 — Réputation personnelle

**Ce que les autres perçoivent du mercenaire**, pas sa valeur réelle. Calculée à la création, recalculée en carrière.

### Pool utilisé

Pour la moyenne, le maximum et le minimum, valeurs **strictement supérieures à 0** seulement :

- Force, Constitution, Dextérité, Vitesse, Endurance, Esquive, Chance, Charisme, Courage, Intelligence, Volonté,
  Perception, Puissance magique, Réserve de mana ; les 5 résistances ;
- les 3 meilleures compétences martiales ; les 3 meilleures écoles de magie, hors sorts ;
- la meilleure compétence Artisanat, Animal, Camp et Physiologie ;
- la meilleure compétence Social, **comptée deux fois** (la même valeur insérée deux fois, pas doublée).

### Formule de réputation personnelle

$$
ReputationPerso = MoyennePool \times \left(1+\frac{Charisme}{100}\right) \times \left(1+\frac{MaxPool}{100}\right) \times \left(1+\frac{MinPool}{100}\right)
$$

Le Charisme compte deux fois : dans le pool et comme multiplicateur de visibilité / aura.

### Exploits et carrière

`ReputationPerso = ReputationCalculee + ReputationCareerDelta` : la part calculée suit le pool ; le delta (0 au départ)
garde les exploits. Barème (Idan, 2026-10-20) :

- **CC confirmé** `+1` ; **EC confirmé** `−1` : les événements de l’XP de Chance (doc 08), critique au Toucher ou au
  Blesser ; échec critique au Toucher (chute Au Sol) ou au Blesser (contrecoup) ; aussi les sorts (Idan, 2026-10-25) ;
- **participation à la blessure d’un ennemi** : `+1 %` de sa réputation — le premier coup qui lui inflige des dégâts,
  **une fois par mercenaire et par ennemi** (un allié touché par accident ne compte pas ; un projectile perdu, oui) ;
- **coup de grâce** (il le met hors combat) : `+10 %` de plus, soit normalement **11 %** au total ;
- **retour de mission** : `+5` avec le statut « Blessé » (doc 10 §7), `+10` sinon (« Fatigué » compris, même avec des
  PV perdus ou après avoir fui la carte) ; exclusifs ; un mort ne gagne rien.

Intention d’Idan : « un mec qui massacre à lui tout seul une armée de troufions doit gagner en réputation ; un mec qui
terrasse un dragon également ; un mec qui tue un gobelin sans intérêt, il gagne pas grand-chose ».

- **Sa monture** (Idan, 2026-11-07) : ses participations et coups de grâce comptent pour son cavalier, qu’il la monte ou
  non, une fois par ennemi ; la monture garde son XP.
- **Réputation de l’ennemi** : celle qu’il a pendant la mission ; les gains s’appliquent au bilan, une seule fois. Ennemi
  tiré d’une fiche (Idan, 2026-11-08) : **3 × ses points de combat** (12 à 18 pour un gobelin novice, 306 pour le chef de
  clan gobelin, 540 pour le troll d’élite). Les bêtes des chasses ne rapportent rien.
- Le delta garde ses décimales, affiché arrondi ; la fiche montre la réputation totale, puis « initiale » et
  « carrière » dès qu’il y a un gain.
- **Recalcul** (Idan, 2026-11-08) : chaque matin, après la guérison et l’entraînement, avant la renégociation salariale,
  la part calculée de toute la compagnie suit les valeurs du jour ; le delta reste.
- Le contrat ne suit pas la réputation, sauf la renégociation à l’étoile gagnée (§6). Les soins ne rapportent rien.

### Affichage en étoiles

Idan, 2026-10-20 : réputation et renommée s’affichent en **15 niveaux**, 1 à 5 étoiles de **bronze**, d’**argent**, puis
d’**or** (5 d’or : difficilement atteignable). La valeur chiffrée reste dans le moteur, cachée ; au survol des étoiles
pour les tests du prototype.

Seuils (`reputation-stars.json`, Idan, 2026-11-08) : **× 1,5 par niveau** à partir de 2 bronze = 93, arrondi ; renommée :
mêmes seuils × 4. Recrues (600, médiane 124) : ≈ 2 % 1 étoile, 80 % 2, 18 % 3. Les salaires suivent la valeur, pas
l’étoile ; le salaire de référence du garde du corps, le niveau des missions et les places de la Taverne suivent les
seuils (au-delà de 15★, × 1,5).

| Niveau | Étoiles | Réputation dès | Renommée dès |
|---|---|---|---|
| 1 à 5 | 1 à 5 bronze | 0 · 93 · 140 · 209 · 314 | 0 · 372 · 560 · 836 · 1 256 |
| 6 à 10 | 1 à 5 argent | 471 · 706 · 1 059 · 1 589 · 2 383 | 1 884 · 2 824 · 4 236 · 6 356 · 9 532 |
| 11 à 15 | 1 à 5 or | 3 575 · 5 363 · 8 044 · 12 066 · 18 100 | 14 300 · 21 452 · 32 176 · 48 264 · 72 400 |

Chaque niveau a une phrase qui explique la réputation, en trois variantes (Idan, 2026-10-21 et 2026-10-24), choisie
selon le mercenaire et le niveau, stable d’un affichage à l’autre.

## 2 — Renommée de la compagnie

Sa célébrité, pas sa moralité. Elle sert à attirer plus de mercenaires, et de meilleurs ; à ouvrir des missions plus
dures ; à comparer les compagnies / parties.

### Formule V1 (Idan, 2026-10-20)

$$
RenommeeCompagnie = R_{capitaine} + \sum_{i \geq 2} \frac{R_i}{i^{1{,}5}} + Heritage
$$

- **Capitaine** : toujours **1er**, compté entier (Idan, 2026-11-08).
- **Autres membres vivants**, tous comptés : classés par réputation totale décroissante dès le rang 2 ; le rang `i` vaut
  `R_i / i^1,5` (÷ 2,8, ÷ 5,2, ÷ 8…). À égalité, le plus ancien passe devant.
- **Héritage** : à la mort au combat d’un autre que le capitaine, **20 %** de sa contribution pondérée juste avant son
  retrait s’ajoute pour de bon (le 2e à 500 laisse 20 % de 500 / 2^1,5 = +35). Les survivants sont reclassés ; l’héritage
  reste fixe, compté une fois ; il garde l’identité et le jour de la mort
  pour un futur mémorial. Aussi pour un déserteur tué en combat singulier par le capitaine (doc 11 §11). Plusieurs
  morts dans une mission : classement du début de mission.
- Pas de plafond. La mort du capitaine est un Game Over.

**Points de mission** (doc 17 §8) : contrat échoué **−30** ; garde du corps **+3** (doc 17 §12) ; contrat gagné, rien.
**Dortoir** (doc 11 §4) : **+50** par niveau de qualité atteint, pour de bon. **À venir** (architecture d’origine) :
points de missions et développement du camp. Effets de la renommée (recrues, missions, marchands) : à valider par Idan ;
places de Taverne : 3 + niveau de renommée (doc 14 §2). Elle doit aussi pondérer les dés de génération des recrues.

## 3 — Alignement de compagnie

**L’alignement du capitaine fait office d’alignement de compagnie**, distinct de la renommée. Il évolue selon les choix
du joueur et pèse, de façon probabiliste et sans exclusion, sur les mercenaires attirés, les missions proposées, les
tensions et départs des alignements très opposés, certains conflits internes. À la génération : **+15 points de
probabilité** sur l’alignement exact du capitaine (doc 02, « Influence du capitaine »).

## 4 — Salaire : formule V1

> **On n’est pas payé ce qu’on vaut : on est payé selon ce que les autres perçoivent et selon la manière dont on se
  vend.**

La **réputation** fait le salaire ; **prétentions**, **Intelligence** et **affinité** le **déforment**. La caractéristique
maximale n’y entre pas directement (elle est déjà dans `MaxPool`).

### Salaire de base — Réputation

`SalaireBase = max(1, ReputationPerso / 30)`

### Déformation — Prétentions salariales

`FacteurPretentions = 1 + (PretentionsSalariales − 35) / 100` : `10 → ×0,75`, `35 → ×1`, `60 → ×1,25`.

### Déformation — Intelligence

`FacteurIntelligence = 1 + 0,25 × ((Intelligence − 100) / 100)²` : courbe en U, minimale à 100 ; en dessous il se
**survend**, au-dessus il **négocie** mieux.

### Déformation — Affinité avec le capitaine

`FacteurAffinite = 1 − 0,2 × Affinite / 100` (Idan, 2026-10-20) : de `×1,2` (−100) à `×0,8` (+100). Sur 48 PO :
`+100 → 38`, `+56 → 43`, `−71 → 55`. Pour tout mercenaire généré avec un capitaine, **escouade de départ comprise** ;
facteur 1 pour le capitaine et les ennemis. La prime de mission suit.

### Formule finale V1

`SalaireDemande = arrondi(10 × SalaireBase × FacteurPretentions × FacteurIntelligence × FacteurAffinite)`, en **PO
entières par jour**, sans plafond. Le `×10` est une échelle monétaire (des écarts plus fins). 10 à 100 PO/jour : un
mercenaire ordinaire ; une légende peut dépasser largement 100.

## 5 — Prétentions salariales

Attribut **caché** (Social caché), `PretentionsSalariales = 10D6`, généré à la création, évolutif. Il entre dans le
salaire, **jamais dans le Max Social de la réputation**.

## 6 — Éléments de rémunération

Salaire **journalier**. À distinguer : **salaire demandé** (sa prétention), **salaire contractuel** (accepté au
recrutement ou renégocié), **prime de mission**, **salaire réellement versé** (selon les politiques de la compagnie). **La
prime de mission est payée au mercenaire s’il revient.**

### Prime de mission demandée — PLAYTEST V1

`PrimeMissionDemandee = arrondi(1,5 × SalaireDemande × FacteurCouragePrime × FacteurPretentionsPrime)`, avec
`FacteurCouragePrime = Clamp(1,5 − Courage / 100 ; 0,5 ; 1,5)` (plus de Courage, moins de prime de risque) et
`FacteurPretentionsPrime = 1 + (PretentionsSalariales − 35) / 200`. Coefficient 1,5 (Idan, 2026-10-25 : « les temps sont
durs »). **En V1, la prime est fixe** quelle que soit la mission ; une prime liée au danger viendra à part. Négociation :
[Taverne — recrutement V1](/design/#doc=14-tavern-recruitment.md).

### Contrats et paie — implémentation V1

- **L’escouade initiale est sous contrat** (Idan, 2026-10-04), aux conditions qu’elle demande, sans négociation ; le
  capitaine, non. Les recrues gardent le contrat négocié à la Taverne.
- Le **salaire est versé chaque jour**, après la guérison et avant la Taverne. Fatigués : 100 % ; blessés et corvées :
  politique sociale (§7). La prime est payée au retour (doc 10 §8 et §11).
- **Les dettes** (Idan, 2026-11-10 : « on ne passe pas en négatif, on reste à 0 et on a des dettes envers chaque
  mercenaire ») :
  - quand la caisse ne suffit pas (salaires et entretien des montures du matin ; primes), elle est vidée **au prorata**
    de ce qui est dû ; le reste devient une **dette** envers chacun, en PO entières ;
  - **entretien d’une monture** : dû à son mercenaire ; sans propriétaire (celle du capitaine comprise), au **Dresseur** ;
    sans Dresseur, elle est **relâchée** ;
  - une dette s’éteint au remboursement ou à la **mort** du créancier ; un déserteur la garde (marqué « parti ») et peut
    encore être remboursé ;
  - **rembourser** n’est jamais automatique : menu **Dettes** de l’Intendance ; « Rembourser » paie **toute** la dette
    d’un mercenaire, s’il y a assez d’or.
- **La mutinerie** (Idan, 2026-11-10) :
  - **mutin** : un membre (pas le capitaine) à qui l’on doit de l’argent ; **−10 d’affinité** chaque matin ; il ne passe
    plus le test de désertion ;
  - **test général**, chaque matin avec des dettes, si le capitaine est au camp et qu’un mutin peut venir (au camp, pas
    blessé) : chance = 100 / (1 + e^(−Δ/10)), de 1 à 99 %, **Δ = 5 × J − Intimidation du capitaine ÷ 2 − affinité
    moyenne des mutins ÷ 2** (J : jours d’affilée avec des dettes) ;
  - **test de chacun**, si elle éclate : même courbe, **Δ = 5 × ses jours de dette + (son Courage − Intimidation du
    capitaine) ÷ 2 − son affinité ÷ 2 − 20** ; ceux qui le réussissent viennent parler au capitaine ;
  - **la scène** est une Discussion (doc 16), que le jour suivant attend. Rembourser l’un d’eux (toute sa dette) le fait
    sortir du groupe ; **Promettre** : Charisme ÷ (Charisme + 10 × la somme de leurs jours de dette) ; **Faire peur** :
    Intimidation ÷ (Intimidation + la somme de leurs Courages). Réussi : camp tranquille pour la journée. Raté : « la
    conversation s’échauffe », combat contre tous les mutins ;
  - **le combat**, dans l’arène du duel : le capitaine et ses alliés contre les mutins, sans monture, sans se cacher.
    Allié : chaque membre au camp, pas blessé, hors mutins, avec **0,5 × son affinité** % de chances (0 si négative), un
    tirage par combat. **Gagné** (mutins à terre, ou enfuis : rattrapés, comme au duel) : **épargner ou mise à mort**
    pour chacun ; dettes toujours dues aux épargnés ; les **bonus du défi pour chaque mutin** (XP d’Intimidation et de
    Charisme, effets d’affinité, +50 pour l’épargné) ; camp tranquille pour la journée. **Perdu** (capitaine à terre ou
    hors de l’arène, même si ses alliés tiennent) : **Game Over**, même s’il a survécu. Les morts vont au Mémorial
    (« mutinerie ») ; le combat entre dans l’historique.
- **L’usurier** (Idan, 2026-11-11) :
  - à la Taverne, on demande au tavernier s’il connaîtrait quelqu’un… ; **le lendemain matin, l’usurier arrive** (une
    scène qui bloque la journée) ;
  - **emprunt** : jusqu’à **10 000 PO par étoile** de la compagnie (1 à 15), remboursement au plus tard dans **2 ×
    étoiles** jours ; à rendre = montant × (1 + **0,02** × jours depuis l’emprunt). **Un seul emprunt à la fois**,
    jamais prolongé (« C’est pas la BCE ici ! ») ;
  - **rembourser** à tout moment à la Taverne (« Faire porter son dû ») ; à l’échéance, l’usurier vient réclamer :
    payer, ou « Je ne peux pas payer » ;
  - **défaut** : le lendemain, une armée du camp des voleurs (budget **5 × PC du capitaine**, PC = réputation ÷ 3) ;
    **le capitaine, seul**, joue un tour, sans rien compter (ni XP, ni morts, ni blessures) ; ils reviendront la semaine
    prochaine ;
  - **menace** : après **7 jours**, un jet chaque matin, **5 %** puis **le double** chaque jour (10, 20, 40, 80, 100 %) ;
    quand il passe, les voleurs reviennent **dès que le capitaine est au camp**, vrai combat, **seul**. Payer l’arrête ;
    les intérêts courent toujours ;
  - **combat final** gagné : XP du combat, équipement des voleurs à l’Intendance, **plus de dette, mais plus jamais
    d’emprunt**. Perdu (capitaine à terre ou hors de la carte) : **Game Over**, même s’il a survécu.

### Renégociation salariale (Idan, 2026-11-04)

« Quand un mercenaire gagne une étoile de réputation, il fait un test (entre salaire perçu et salaire théorique). En
fonction de son intelligence, il vient demander un meilleur salaire au capitaine. »

- **Test**, le matin, pour un membre au camp (pas en mission, pas au cachot : sinon au premier matin où il y est) qui a
  gagné une étoile : son **salaire théorique** (§4, valeurs du jour) contre son salaire. Assez payé : rien. Sinon,
  chance = **100 / (1 + e^(−Δ/10))**, **Δ = 100 × écart + (Intelligence − 50) / 2 − 15**, de 5 à 95 % (écart = théorique
  ÷ salaire − 1). Une étoile ≈ 16 % d’écart pour une recrue moyenne : 29 % à 30 d’Intelligence, 56 % à 53, 82 % à 79.
  S’il ne vient pas, rien avant la prochaine étoile.
- **Demande** : son salaire théorique ; la prime ne bouge pas.
- **Scène**, en début de journée (après celle d’un déserteur) : une Discussion (doc 16), que le jour suivant attend ; une
  ligne dans la notification du jour. **Accepter**, **Négocier** ou **Refuser**. On négocie comme à la Taverne (doc 14
  §9, salaire seul), jamais sous son salaire actuel ni sous l’offre refusée ; il accepte, contre-propose ou **rompt** (il
  garde son salaire). **Concession = 50 × (1 − augmentation offerte ÷ augmentation demandée)**. Il demande 55, touche 47
  (résistance 40) : 47, 5 % qu’il accepte ; 51, 49 % ; 53, 74 %.
- **Affinité** : **+5** s’il obtient tout ; **0** pour un accord plus bas ; **−10** si on refuse ou s’il rompt. Après
  une rupture, la relance (doc 11 §7) : **Intimider** ou **Convaincre** pour la dernière offre (chance de l’accepter +
  Intimidation ou Charisme ÷ 2, au plus 95 % ; ratée : −20 (intimidé) ou −5 (convaincu)), ou **Laisser tomber** (−10).
  Une baisse d’affinité déclenche le test de désertion du lendemain (doc 11 §11).

## 7 — Politique des blessés — « T’es pas à la Sécu ici »

**Politique sociale** (Idan, 2026-11-04) : un menu de l’Intendance, un curseur par ligne (pas de 5 %), sans intendant :

- **Blessés** : **50 % du salaire par défaut**, de 0 à 100 %, chaque jour de blessure ; leur affinité bouge chaque jour
  de **(taux − 50) ÷ 25** (−2 à 0 %, −1 à 25 %, 0 à 50 %, +1 à 75 %, +2 à 100 %). Un **fatigué** touche tout. La prime
  ne bouge pas.
- **Corvées** (Bûcherons, Mineurs, Palais des plaisirs ; le curseur apparaît une fois le bâtiment construit) : **100 % par
  défaut**, de 0 à 200 % ; perte d’affinité du jour × **(2 − taux ÷ 100)** (−2 à 0 %, −1 à 100 %, −0,5 à 150 %, 0 à
  200 %), jamais de gain ; × 2 s’il a été intimidé pour y aller, × 0,5 s’il a été convaincu.
- Une baisse d’affinité déclenche le test de désertion du lendemain (doc 11 §11).

Plus tard : l’attractivité de la compagnie à la Taverne.

## 8 — Points encore ouverts

- négociation du salaire contractuel ;
- évolution des prétentions salariales ;
- règles de renégociation en cours de carrière ;
- arrondi / granularité d’affichage du salaire demandé ;
- pondération exacte du Top 10 dans la renommée de compagnie ;
- conversion des points de mission et du développement du camp en renommée ;
- éventuels nouveaux gains directs de réputation liés au camp.
