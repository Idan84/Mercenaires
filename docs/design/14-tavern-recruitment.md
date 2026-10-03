> **Statut : V1 de design validée sur les principes — coefficients de formule à playtester.**  
> Décisions d'Idan du 2026-10-03 intégrées. Les constantes marquées **PLAYTEST** peuvent être équilibrées sans changer le principe de la règle.

# Taverne — recrutement V1

La Taverne est le cœur du recrutement au début de partie. Les candidats sont de vrais mercenaires persistants, déjà générés, qui occupent physiquement une place de candidat tant qu'ils ne sont ni recrutés par le joueur ni engagés ailleurs.

## 1 — Candidats persistants

Un candidat est un objet `Mercenary` complet généré **avant** son recrutement.

Il conserve le même profil d'un jour à l'autre. Il n'est jamais régénéré lorsque le joueur ouvre sa fiche ou commence un entretien.

Conséquence voulue : un candidat médiocre peut rester assez longtemps pour occuper une place qui aurait pu accueillir un meilleur profil.

## 2 — Capacité de la Taverne

La Taverne possède **5 places de candidats au début de partie**.

`TavernCandidateSlots = 5` au départ.

La capacité doit ensuite augmenter avec la **Renommée de compagnie**. La formule de progression exacte est reportée : on fixe d'abord le comportement du système avec 5 places.

Cette capacité est totalement distincte de celle du Dortoir :

- Taverne : candidats non recrutés ;
- Dortoir : mercenaires membres de la compagnie ;
- Dortoir initial : **40 places** (décision Idan du 2026-10-03 ; constante `camp.dormitory.initial_capacity`).

Un candidat de la Taverne n'occupe aucune place de Dortoir.

## 3 — Boucle quotidienne

La Taverne est mise à jour au **début de chaque nouvelle journée**, via l'horloge stratégique commune.

Ordre V1 :

1. pour chaque candidat actuellement présent, effectuer son test **Engagé ailleurs** ;
2. retirer ceux qui ont été recrutés par une autre compagnie ;
3. compter les places désormais libres ;
4. générer exactement assez de nouveaux `Mercenary` pour remplir toutes les places libres ;
5. conserver sans modification tous les candidats qui n'ont pas quitté la Taverne.

Il n'existe donc pas « 5 nouveaux mercenaires par jour ». Il existe **5 places au départ**, remplies chaque matin si nécessaire.

Deux événements normaux libèrent une place :

- le joueur recrute le candidat ;
- une autre compagnie recrute le candidat lors du test du matin.

Les règles d'expulsion volontaire / refus définitif / retour futur d'un candidat pourront être ajoutées plus tard si elles deviennent utiles.

## 4 — Test quotidien « Engagé ailleurs »

Objectif :

- une forte Réputation personnelle augmente l'intérêt des compagnies concurrentes ;
- un salaire demandé élevé le rend moins attractif ;
- même « Marcel le Pignouf » doit finir par partir un jour.

### Formule PLAYTEST V1

```
P_EngageAilleurs (%) =
Clamp(
  2
  + 0.10 × ReputationPerso
  - 0.10 × SalaireDemande,
  2,
  35
)
```

Un seul `D100` est lancé chaque matin par candidat.

- réussite si `D100 <= P_EngageAilleurs` ;
- plancher : **2 % par jour** ;
- plafond : **35 % par jour**.

Exemples indicatifs :

| Réputation | Salaire demandé | P/jour | Médiane de présence approximative |
|---:|---:|---:|---:|
| 40 | 20 PO | 4 % | 17 jours |
| 150 | 50 PO | 12 % | 5,4 jours |
| 300 | 100 PO | 22 % | 2,8 jours |
| cas au plancher | — | 2 % | 34 jours |

Le plancher garantit qu'un candidat peu séduisant peut néanmoins finir par être recruté ailleurs au bout de quelques semaines.

Les coefficients sont des constantes de playtest ; le principe Réputation positive / salaire négatif est validé.

## 5 — Qualité des nouveaux candidats

La qualité des candidats générés doit dépendre de la **Renommée de compagnie**.

Ce principe est déjà commun au générateur général : les distributions actuelles de `Create_Mercenary()` sont des distributions de base destinées à être pondérées.

Le chiffrage de l'effet de Renommée sur :

- qualité moyenne ;
- variance ;
- probabilité de profils exceptionnels ;
- future capacité de la Taverne ;

sera traité séparément après validation de la boucle V1.

## 6 — Informations visibles avant entretien

Le joueur voit directement :

- Peuple ;
- Culture ;
- profil de combat principal : **CAC / Distance / Magie** ;
- prédilection associée :
  - CAC → arme de mêlée de prédilection ;
  - Distance → arme à distance de prédilection ;
  - Magie → école de magie de prédilection ;
- Réputation personnelle ;
- Salaire journalier demandé ;
- Prime de mission demandée.

Le générateur possède déjà un profil technique `equipment.profile.type` avec les valeurs `melee / ranged / magic` ainsi que les meilleures prédilections. La Taverne doit réutiliser ce calcul plutôt que créer un second classement.

Les autres caractéristiques et compétences ne sont pas affichées librement pendant l'entretien.

## 7 — Entretien : trois questions

Le joueur peut poser **3 questions** par candidat.

Chaque question cible une valeur chiffrée cachée du mercenaire : caractéristique, compétence ou autre valeur explicitement autorisée par l'interface.

### Avec un Intendant

L'Intendant est un **rôle que le joueur assigne** à un mercenaire de la compagnie. Sans assignation, la compagnie n'a pas d'Intendant (décision Idan du 2026-10-03, PR #11).

L'Intendant utilise sa compétence Camp **Intendance** pour estimer la valeur réelle.

Formule PLAYTEST :

```
ErreurMax = 0.20 × (1 - Clamp(Intendance, 0, 100) / 100)

Estimation =
Arrondi(
  ValeurReelle × Rand(1 - ErreurMax ; 1 + ErreurMax)
)
```

Ordres de grandeur :

- Intendance 0 → ±20 % ;
- Intendance 50 → ±10 % ;
- Intendance 75 → ±5 % ;
- Intendance 100 → estimation exacte.

Le joueur reçoit une **estimation**, pas la valeur réelle stockée.

### Sans Intendant

Le joueur pose directement la question au candidat.

Formule PLAYTEST volontairement peu fiable :

```
EstimationCandidate =
Arrondi(
  ValeurReelle × Rand(1.10 ; 3.00)
)
```

Le candidat se survend donc systématiquement dans cette première version. Les bornes seront équilibrées après quelques recrutements réels.

**Décision V1 : ce mensonge reste volontairement simple.** Charisme, Intelligence ou d'autres caractéristiques n'affinent pas encore l'auto-évaluation. L'objectif est notamment de rendre l'Intendant rapidement désirable ; ses autres utilités seront définies plus tard.

Les 3 questions constituent un budget commun : avec ou sans Intendant, pas de questions supplémentaires gratuites.

## 8 — Salaire journalier et prime de mission

Le recrutement négocie **deux composantes simultanément** :

1. Salaire journalier ;
2. Prime de mission.

Le salaire demandé conserve la formule définie dans `09-reputation-renown-and-salaries.md`.

### Prime de mission demandée — PLAYTEST V1

Le Courage doit réduire directement la prime : un mercenaire courageux exige moins de « prime de risque ».

```
FacteurCouragePrime =
Clamp(1.5 - Courage / 100, 0.5, 1.5)

FacteurPretentionsPrime =
1 + (PretentionsSalariales - 35) / 200

PrimeMissionDemandee =
Arrondi(
  3
  × SalaireDemande
  × FacteurCouragePrime
  × FacteurPretentionsPrime
)
```

Le salaire demandé apporte déjà indirectement Réputation, Intelligence et Prétentions salariales ; le second facteur de Prétentions n'est donc qu'une déformation supplémentaire légère.

Exemple avec salaire demandé 50 PO et prétentions 35 :

- Courage 20 → environ **195 PO** ;
- Courage 50 → **150 PO** ;
- Courage 100 → **75 PO**.

La constante `3` est un coefficient d'échelle de playtest.

La prime contractuelle est payée uniquement si le mercenaire **revient** de mission, conformément aux règles de fin de mission.

**Décision V1 : la Prime de mission contractuelle est un montant fixe.** Elle n'est pas recalculée selon le danger de la mission. Une éventuelle **prime de risque** liée à une mission dangereuse pourra être ajoutée plus tard comme mécanisme séparé ; elle est volontairement hors V1 afin de conserver seulement deux montants négociés au recrutement : salaire journalier + prime de mission.

## 9 — Négociation du contrat

Le candidat commence avec un package demandé :

- `SalaireCourant = SalaireDemande` ;
- `PrimeCourante = PrimeMissionDemandee`.

Le joueur peut :

- accepter immédiatement le package courant ;
- proposer un salaire et/ou une prime plus faibles.

### Acceptation garantie

L'acceptation automatique est évaluée **composante par composante** :

```
SalairePropose >= SalaireCourant
ET
PrimeProposee >= PrimeCourante
```

Si les deux conditions sont vraies, le candidat accepte automatiquement.

Un excès sur une composante **ne compense jamais automatiquement** un manque sur l'autre. Le package demandé initialement reste donc toujours recrutable si le joueur peut le payer et dispose d'une place au Dortoir.

### Valeur relative de l'offre

Pour une proposition inférieure :

```
RatioSalaire =
si SalaireCourant <= 0 : 1
sinon Min(SalairePropose / SalaireCourant, 1)

RatioPrime =
si PrimeCourante <= 0 : 1
sinon Min(PrimeProposee / PrimeCourante, 1)

RatioPackage =
0.65 × RatioSalaire
+ 0.35 × RatioPrime

ConcessionDemandee =
100 × (1 - RatioPackage)
```

Le salaire journalier pèse davantage car il s'applique chaque jour ; la prime reste néanmoins importante.

### Résistance à la négociation

Formule PLAYTEST :

```
ResistanceNegociation =
Clamp(
  0.50 × PretentionsSalariales
  + 0.25 × Intelligence
  + 0.25 × Volonte,
  0,
  100
)
```

### Probabilité d'accepter une offre basse

Si `RatioPackage < 1` :

```
P_Accepter (%) =
Clamp(
  95
  - 2.0 × ConcessionDemandee
  - 0.4 × (ResistanceNegociation - 50),
  5,
  95
)
```

Exemples avec résistance 50 :

- package à 90 % → 75 % d'acceptation ;
- package à 80 % → 55 % ;
- package à 70 % → 35 % ;
- package à 60 % → 15 %.

### Après un refus : départ ou contre-proposition

Après un refus :

```
P_QuitterNegociation (%) =
Clamp(
  5
  + 1.5 × ConcessionDemandee
  + 0.10 × PretentionsSalariales
  + 0.10 × Volonte,
  5,
  95
)
```

**Réglage Idan du 2026-10-03 (PR #11)** : coefficient de concession porté de 0,75 à **1,5** et plafond de 75 à **95 %**, pour que les offres très basses ne deviennent pas une loterie. Constantes `tavern.negotiation.quit_concession_coefficient` et `tavern.negotiation.quit_max`.

Mesure sur 3 000 mercenaires générés (première offre à une fraction de la demande, puis acceptation de la contre-proposition) :

| Première offre | Avant (0,75 / 75) | Après (1,5 / 95) |
|---:|---|---|
| 90 % | 95 % signés, à 91 % du salaire demandé | 93 % signés, à 91 % |
| 80 % | 87 % signés, à 84 % | 82 % signés, à 84 % |
| 50 % | 53 % signés, à 76 % | 17 % signés, à 71 % |
| 2 % | 29 % signés, à 47 % | 10 % signés, à 25 % |

Les 10 % restants des offres extrêmes viennent du plancher de 5 % de `P_Accepter` et de la contre-proposition, qui part de l'offre du joueur.

- réussite du jet → le candidat quitte immédiatement la Taverne ;
- échec → il fait une contre-proposition.

### Contre-proposition

```
Tenacite = Clamp(ResistanceNegociation / 100, 0, 1)

FacteurContre =
Clamp(
  0.35
  + 0.45 × Tenacite
  + Rand(-0.10 ; +0.10),
  0.25,
  0.90
)

NouveauSalaireCourant =
Max(
  SalairePropose,
  ArrondiSup(
    SalairePropose
    + FacteurContre × (SalaireCourant - SalairePropose)
  )
)

NouvellePrimeCourante =
Max(
  PrimeProposee,
  ArrondiSup(
    PrimeProposee
    + FacteurContre × (PrimeCourante - PrimeProposee)
  )
)
```

Un personnage difficile à négocier reste donc plus proche de ses exigences précédentes.

**Règle absolue : une contre-proposition ne peut jamais être inférieure à l'offre que le joueur vient de faire sur aucune composante.** Si le joueur a déjà proposé davantage que la demande courante sur le salaire ou la prime, le candidat conserve au minimum ce montant généreux dans sa contre-proposition.

La négociation peut recommencer jusqu'à :

- acceptation ;
- acceptation par le joueur d'une contre-proposition ;
- départ du candidat.

### Règle anti-spam

Après un refus, la nouvelle proposition du joueur ne peut pas être inférieure à l'offre refusée précédente :

```
SalaireNouveau >= SalaireRefuse
PrimeNouvelle >= PrimeRefusee
```

Cette règle évite de marteler des offres de plus en plus insultantes en espérant gagner un jet aléatoire.

**Décision V1 : le plancher reste composante par composante.** On ne peut donc pas compenser une baisse supplémentaire de salaire par une hausse de prime, ni l'inverse, après qu'une offre a déjà été refusée. Une négociation de package global pourra être envisagée plus tard si la V1 paraît trop rigide.

## 10 — Dortoir plein

Le joueur peut :

- consulter le candidat ;
- poser ses questions ;
- négocier.

Mais il ne peut pas finaliser le recrutement si le Dortoir est à sa capacité maximale.

Les indemnités de licenciement et les moyens plus... créatifs de libérer une place sont hors périmètre V1.

## 11 — Temps stratégique commun

**Décision validée :** le jeu possède une seule horloge stratégique en jours.

Point d'entrée conceptuel :

```
AdvanceTime(days)
```

Chaque jour doit être résolu séquentiellement afin que les événements quotidiens conservent un ordre déterministe.

`AdvanceTime(5)` équivaut donc conceptuellement à cinq appels successifs de `AdvanceTime(1)`, et non à un saut opaque de cinq jours.

Les systèmes qui se brancheront sur cette horloge comprennent notamment :

- Taverne ;
- salaires ;
- départs / loyauté ;
- missions et délais avant départ ;
- trajets et retours de mission ;
- soins ;
- fatigue ;
- constructions ;
- entraînements ;
- renouvellement des missions.

Pour la Taverne : **départs du matin puis remplissage des places libres**.

## 12 — Dépendances techniques

La Taverne dépend de :

- `Create_Mercenary()` ;
- `AdvanceTime(days)` ;
- un état de partie persistant `Game / Company` dans `game-core/` ;
- Renommée de compagnie ;
- capacité du Dortoir ;
- système de contrat.

Le besoin d'un état de partie persistant a été signalé par JC3 : les candidats ne peuvent pas rester plusieurs jours si l'état stratégique reste uniquement dans l'interface web.

**Implémentation** : `game-core/tavern.js` (règles de la Taverne), `game-core/campaign.js` (état de partie, `AdvanceTime`, signature) et `prototype-web/tavern-ui.js` (écran Taverne : candidats, entretien, négociation, signature, jour suivant). Dans l'écran V1, une question peut viser une caractéristique, une résistance ou la compétence de prédilection affichée. Choix V1 confirmés en review PR #11 : 3 questions pour tout le séjour d'un candidat, réponse figée une fois obtenue ; une négociation interrompue reprend au package courant. Le Dortoir compte le capitaine.

## 13 — Points encore à arbitrer / playtester

Les principes ci-dessus sont suffisamment définis pour permettre un prototype. Restent à traiter séparément :

1. formule exacte Renommée → nombre de places de Taverne ;
2. formule Renommée → qualité des nouveaux candidats ;
3. constantes du test `Engagé ailleurs` ;
4. coefficients exacts de la prime de mission ;
5. coefficients de négociation ;
6. qualité du mensonge sans Intendant (`Rand 1.10–3.00`) ;
7. liste exacte des valeurs qu'une question d'entretien peut cibler ;
8. future renégociation après recrutement ;
9. licenciement / indemnités ;
10. future **prime de risque** éventuelle, séparée de la prime de mission contractuelle fixe.

Ces points peuvent être équilibrés sans remettre en cause la boucle fondamentale.
