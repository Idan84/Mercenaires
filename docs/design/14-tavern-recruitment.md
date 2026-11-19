> Principes validés par Idan. Les coefficients marqués **PLAYTEST** peuvent être équilibrés sans changer la règle.

# Taverne — recrutement V1

La Taverne est le cœur du recrutement en début de partie. Les candidats sont de vrais mercenaires persistants, déjà
générés, qui occupent une place de candidat tant qu'ils ne sont ni recrutés par le joueur ni engagés ailleurs.

## 1 — Candidats persistants

Un candidat est un mercenaire complet, généré **avant** son recrutement. Il garde le même profil d'un jour à l'autre ; il
n'est jamais régénéré quand on ouvre sa fiche ou qu'on lui parle. Voulu : un candidat médiocre peut occuper longtemps une
place qui aurait pu accueillir un meilleur profil.

## 2 — Capacité de la Taverne

**Places = 3 + niveau de renommée de la compagnie** (Idan, 2026-11-04 ; niveau de 1 à 15 : 1 à 5 étoiles de bronze,
puis d'argent, puis d'or), soit **4 à 18 places**. Une compagnie neuve démarre le plus souvent au niveau 2 : 5 places
(sur 200 compagnies simulées : niveau 1 pour 15, 2 pour 185 ; renommée 345 à 490, médiane 415).

- Les places sont recalculées chaque matin, avant le remplissage : une place gagnée se remplit le lendemain matin.
- Si la renommée baisse, **personne n'est chassé** : aucun nouveau candidat tant que la Taverne est au-dessus de ses
  places.
- Écran « Recruter » : les candidats **défilent en carrousel** (flèches grisées au bout, molette ou doigt) ; si tout
  tient à l'écran, la rangée est centrée, sans flèches.

Ces places n'ont rien à voir avec le **Dortoir** (les membres de la compagnie) : un candidat n'y occupe aucune place.

- Dortoir initial : **25 places** (Idan, 2026-11-01) ; le capitaine et l'intendant n'en prennent pas.
- Un ogre prend deux places ; un halfling, un gnome ou un gobelin une demie ; tout autre mercenaire une ; le capitaine et
  l'intendant aucune (Idan, 2026-10-24). Sans assez de places pour le candidat, la signature est impossible (« Il me faut
  deux lits, capitaine » pour un ogre).

## 3 — Boucle quotidienne

Chaque matin (horloge commune, §11) : chaque candidat fait son test **Engagé ailleurs** ; ceux recrutés par une autre
compagnie partent ; on génère exactement assez de nouveaux mercenaires pour remplir les places libres ; les autres
candidats restent sans changement. Pas de « N nouveaux par jour », donc : des places, remplies si besoin.

Une place se libère quand le joueur recrute le candidat ou qu'une autre compagnie le recrute au test du matin.
Expulsion, refus définitif ou retour d'un candidat : plus tard, si utile.

## 4 — Test quotidien « Engagé ailleurs »

Une forte Réputation personnelle attire les compagnies concurrentes ; un salaire demandé élevé les rebute ; même
« Marcel le Pignouf » doit finir par partir.

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

Un `D100` par candidat chaque matin : il part si `D100 <= P_EngageAilleurs`. Plancher **2 % par jour**, plafond **35 %**.

| Réputation | Salaire demandé | P/jour | Médiane de présence approximative |
|---:|---:|---:|---:|
| 40 | 20 PO | 4 % | 17 jours |
| 150 | 50 PO | 12 % | 5,4 jours |
| 300 | 100 PO | 22 % | 2,8 jours |
| cas au plancher | — | 2 % | 34 jours |

Le plancher garantit qu'un candidat peu séduisant finit par partir au bout de quelques semaines. Le principe (Réputation
en plus, salaire en moins) est validé ; les coefficients sont à playtester.

## 5 — Qualité des nouveaux candidats

**Le tavernier présente le meilleur de N prétendants** (Idan, 2026-10-20) : pour chaque place libre, le jeu génère N
mercenaires et garde celui qui a la meilleure réputation personnelle. Les formules de génération ne changent pas : la
réputation résume déjà caractéristiques et compétences.

```
N = Clamp(1 + ⌊(RenommeeCompagnie − 500) / 250⌋, 1, 5)
```

| Renommée | Prétendants |
|---|---|
| moins de 750 | 1 |
| 750 à 999 | 2 |
| 1000 à 1249 | 3 |
| 1250 à 1499 | 4 |
| 1500 et plus | 5 |

Pour une compagnie neuve (§2), rien ne change au début. Sur 600 candidats :
réputation médiane 140 avec 1 prétendant, 156 avec 3, 165 avec 5 ; les profils exceptionnels deviennent plus fréquents,
et de meilleures recrues demandent un meilleur salaire. L'écran Taverne affiche le nombre de prétendants.

## 6 — Informations visibles avant entretien

L'écran Recruter montre seulement le **portrait en pied**, le **nom**, le **peuple**, la **culture**, l'**ascendance**
s'il en a une (ajoutée par Idan le 2026-11-19), la **réputation** et le **nombre de jours** à l'auberge (Idan, 2026-10-21).
Le reste se découvre dans le dialogue (§6 bis) : la fiche du candidat se remplit avec les réponses du candidat et de
l'aubergiste.

- L'alignement du candidat reste caché ; le détail peuple / culture / alignement de l'affinité (doc 02, de −100 à +100)
  ne s'affiche que sur la fiche, après l'embauche.
- Les autres caractéristiques et compétences ne sont pas montrées.

## 6 bis — Dialogue de recrutement : la fiche et la discussion (conception, Idan, 2026-11-19 ; à coder)

« Aller lui parler » ouvre le dialogue : la **fiche du candidat**, sur le modèle de la fiche au survol, à côté d'une
**discussion** (un chat, qui remplace la fenêtre actuelle). On peut partir à tout moment.

- **La salutation** reste : 20 phrases selon l'affinité avec le capitaine, de franchement hostile (−100) à admirative
  (+100), une par tranche de 10 points. Ce n'est qu'un indice.
- **On ne pose que des questions dont la réponse remplit une case de la fiche.** La fiche garde ce qu'on a appris.
- **Deux sources** : le **candidat** et l'**aubergiste**. L'Intendant est laissé de côté (§7).
- Le candidat répond à toutes les questions, sans limite ; une question posée disparaît. L'aubergiste : **1 PO** la
  question (rien n'est gratuit dans ce bas monde), sans limite.
- Une réponse reste figée : reposer la question redonne la même réponse (chez l'aubergiste, elle se paie encore).

| Case de la fiche | Au départ | Question | Source | Réponse | Biais (§7) |
|---|---|---|---|---|---|
| Titre | ligne vide | « Comment on t'appelle, dans le métier ? » | Candidat | son titre | vantardise : le titre recalculé sur ses valeurs telles qu'il les annonce |
| Titre | ligne vide | « Qu'est-ce qu'on dit de lui ? » | Aubergiste | son titre | précision de l'aubergiste : le titre recalculé sur ses estimations |
| Origines | visibles | — | — | — | — |
| Réputation | visible | — | — | — | — |
| Affinité | vide | « Il m'apprécierait, à ton avis ? » | Aubergiste seul | Hostile / Neutre / Amical | précision de l'aubergiste sur le score, puis le palier |
| Salaire et prime | vides | « Combien demandes-tu ? » | Candidat | sa demande, puis ses contre-propositions | aucun |
| Set 1 | vide | « Quelle arme de corps à corps manies-tu ? » | Candidat | l'arme qu'il porte (pas sa meilleure) | aucun |
| Set 2 | vide | « Quelle arme de tir as-tu ? » | Candidat | l'arme de tir qu'il porte | aucun |
| Armure | vide | « Quelle armure portes-tu ? » | Candidat | son armure | aucun |
| Magie | vide | « Connais-tu des sorts de [école] ? », une question par école | Candidat | oui / non : le picto de l'école s'affiche | aucun : réponse exacte |
| Tags | vides | à définir avec la refonte des tags (doc 20) | — | — | biais de niveau et de précision |

Le titre (doc 19) se calcule sur les notes de ses rôles : avec un biais, on recalcule ces notes sur les valeurs annoncées
ou estimées, d'où des titres justes et des titres faux (« Mage Légendaire Omnipotent »). La fiche montre le **salaire**
à côté de la prime.

**Le salaire et la prime** : « Pour devenir votre combattant, je demande X par jour et Y par mission. » Ensuite seulement
apparaissent **Négocier** et **Signer** ; les cases suivent la dernière contre-proposition.

- **Négocier** : le joueur saisit un salaire et une prime ; les règles du §9 s'appliquent, la réponse est dialoguée :
  contre-proposition (« Disons X et Y, non ? »), refus d'une offre plus basse qu'une offre déjà refusée, ou départ (il
  renverse la table, la fenêtre se ferme).
- **Signer** accepte les conditions sur la table (demande initiale ou dernière contre-proposition) : acceptation
  garantie (§9), il rejoint la compagnie (« Parfait. Ravi de faire partie de la compagnie… »). Dortoir plein : il
  accepte, mais la signature attend une place (§10).

Retirées (Idan, 2026-11-19 : « y'en a beaucoup trop ») : arme de prédilection, style de combat préféré, arme de tir de
prédilection, magie de prédilection, métier avant d'être mercenaire, et les conseils du tavernier sur les
caractéristiques (physique, mental, résistances, magie). Textes : `data/reference/tavern-dialogue.json`.

## 7 — La précision des réponses (Idan, 2026-11-19)

Le « facteur de précision » : le candidat se vante, l'aubergiste estime.

**Vantardise du candidat** (PLAYTEST), volontairement peu fiable :

```
EstimationCandidate =
Arrondi(
  ValeurReelle × Rand(1.10 ; 3.00)
)
```

Il se survend toujours ; ce mensonge reste simple : Charisme, Intelligence ou autre n'affinent pas encore
l'auto-évaluation.

**Précision de l'aubergiste** : l'échelle de l'Intendant ci-dessous, figée à **50 d'Intendance**, soit **±10 %** :

```
EstimationAubergiste =
Arrondi(
  ValeurReelle × Rand(0.90 ; 1.10)
)
```

Pour l'affinité, l'estimation du score (−100 à +100) est ramenée à trois zones égales (Idan, 2026-11-19) : **Hostile**
sous −33,3, **Neutre** de −33,3 à +33,3, **Amical** au-dessus de +33,3.

### En suspens : 3 questions et estimation de l'Intendant

L'Intendant est laissé de côté (Idan, 2026-11-19). L'ancienne règle, en attendant qu'Idan décide de la rebrancher ou de
la retirer : **3 questions** par candidat pour tout son séjour (budget commun avec ou sans Intendant ; réponse figée),
chacune sur une valeur chiffrée cachée (caractéristique, résistance, compétence de prédilection). L'Intendant est un rôle
que le joueur assigne (sans assignation, pas d'Intendant ; Idan, 2026-10-03). Il estime avec sa compétence
**Intendance** (PLAYTEST) :

```
ErreurMax = 0.20 × (1 - Clamp(Intendance, 0, 100) / 100)

Estimation =
Arrondi(
  ValeurReelle × Rand(1 - ErreurMax ; 1 + ErreurMax)
)
```

Intendance 0 → ±20 % ; 50 → ±10 % ; 75 → ±5 % ; 100 → exact. Le joueur reçoit une estimation, pas la valeur stockée.

## 8 — Salaire journalier et prime de mission

Le recrutement négocie **deux montants à la fois** : le salaire journalier (formule du doc 09) et la prime de mission.

### Prime de mission demandée — PLAYTEST V1

Un mercenaire courageux exige moins de « prime de risque » : le Courage réduit directement la prime.

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

Le salaire demandé porte déjà Réputation, Intelligence et Prétentions : le facteur de Prétentions n'est qu'une légère
déformation en plus. Le `3` est un
coefficient d'échelle de playtest.

Exemple, salaire demandé 50 PO, prétentions 35 : Courage 20 → environ **195 PO** ; 50 → **150 PO** ; 100 → **75 PO**.

- La prime est payée seulement si le mercenaire **revient** de mission (règles de fin de mission).
- C'est un **montant fixe**, jamais recalculé selon le danger. Une éventuelle **prime de risque** de mission dangereuse
  serait un mécanisme séparé, hors V1.

## 9 — Négociation du contrat

Le candidat part de sa demande : `SalaireCourant = SalaireDemande`, `PrimeCourante = PrimeMissionDemandee`. Le joueur
accepte ce package ou propose un salaire et/ou une prime plus faibles. Une négociation interrompue reprend au package
courant.

### Acceptation garantie

```
SalairePropose >= SalaireCourant
ET
PrimeProposee >= PrimeCourante
```

Si les deux sont vraies, il accepte. Un excès sur un montant **ne compense jamais** un manque sur l'autre. Le package
demandé reste donc toujours recrutable si le joueur peut le payer et a une place au Dortoir.

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

Le salaire pèse plus, car il se paie chaque jour.

### Résistance à la négociation

Formule PLAYTEST :

```
ResistanceNegociation =
Clamp(
  0.50 × PretentionsSalariales
  + 0.25 × Intelligence
  + 0.25 × Volonte
  - 0.25 × Affinite,
  0,
  100
)
```

`Affinite` : celle du candidat avec le capitaine qui négocie (doc 02, de −100 à +100 ; Idan, 2026-10-20). Une bonne
affinité le rend plus facile à convaincre et ses contre-offres plus souples : une offre 10 % sous la demande, acceptée à
75 % avec une affinité nulle, passe à environ 81 % avec +56 et 68 % avec −71. La chance de partir après un refus n'en
dépend pas.

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

Avec une résistance de 50 : package à 90 % → 75 % d'acceptation ; 80 % → 55 % ; 70 % → 35 % ; 60 % → 15 %.

### Après un refus : départ ou contre-proposition

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

Réussite : il quitte aussitôt la Taverne ; échec : il fait une contre-proposition. Coefficient 1,5 et plafond 95 % (Idan,
2026-10-03) : les offres très basses ne doivent pas devenir une loterie. Mesure sur 3 000 mercenaires (première offre à
une fraction de la demande, puis contre-proposition acceptée) :

| Première offre | Résultat |
|---:|---|
| 90 % | 93 % signés, à 91 % du salaire demandé |
| 80 % | 82 % signés, à 84 % |
| 50 % | 17 % signés, à 71 % |
| 2 % | 10 % signés, à 25 % |

Les 10 % des offres extrêmes viennent du plancher de 5 % de `P_Accepter` et de la contre-proposition, qui part de l'offre
du joueur.

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

Un personnage difficile reste plus près de ses exigences. **Règle absolue : une contre-proposition n'est jamais
inférieure à l'offre que le joueur vient de faire, sur aucun montant** (s'il a offert plus que la demande sur l'un, le
candidat garde au moins ce montant). On recommence jusqu'à l'acceptation, l'acceptation d'une contre-proposition par le
joueur, ou le départ du candidat.

### Règle anti-spam

Après un refus, la nouvelle offre ne peut pas être inférieure à l'offre refusée, **montant par montant** :

```
SalaireNouveau >= SalaireRefuse
PrimeNouvelle >= PrimeRefusee
```

On ne martèle pas des offres de plus en plus insultantes en espérant un bon jet, et on ne compense pas une baisse de
salaire par une hausse de prime (ni l'inverse). Une négociation du package global pourra venir si la V1 est trop rigide.

## 10 — Dortoir plein

Le joueur peut consulter le candidat, lui parler et négocier, mais pas finaliser le recrutement si le Dortoir est plein.
Licenciement, indemnités et moyens plus… créatifs de libérer une place : hors V1.

## 10 bis — Arrivée le lendemain matin (Idan, 2026-11-02)

« On recrute immédiatement, mais on paye le salaire à j+1 […]. Seul l'équipement est immédiat. »

- Signée au jour J, la recrue est **dans la compagnie** (et au Dortoir) tout de suite ; son contrat court à partir de
  J + 1.
- On peut l'**équiper** et l'inscrire pour une **mission qui part le lendemain matin**.
- Son **premier salaire** est payé le lendemain matin, avec les autres.
- **Aucun poste avant le lendemain matin** : intendant, médecin, directeur de l'École, maître (Doctore, Vétéran, Maître
  des lames), lieutenant (« Il rejoint la compagnie demain matin. ») ; grisée dans les listes de nomination ; effectif :
  « Disponible demain ».
- Règle générale : doc 16, « Au jour J, on organise J+1 ».

## 11 — Temps stratégique commun

Une seule horloge stratégique, en jours. Les jours se résolvent **l'un après l'autre**, dans un ordre déterministe :
avancer de 5 jours, c'est résoudre 5 fois un jour, jamais un saut opaque.

Elle cadence notamment : Taverne, salaires, départs / loyauté, missions et délais avant départ, trajets et retours,
soins, fatigue, constructions, entraînements, renouvellement des missions. Pour la Taverne : **départs du matin, puis
remplissage des places libres**.

## 12 — Dépendances techniques

La Taverne s'appuie sur la génération des mercenaires, l'horloge commune (§11), un état de partie persistant (sans lui,
les candidats ne restent pas plusieurs jours), la renommée, la capacité du Dortoir et les contrats.

## 13 — Points à arbitrer / playtester

1. constantes du test « Engagé ailleurs » ;
2. coefficients de la prime de mission ;
3. coefficients de négociation ;
4. qualité du mensonge du candidat (`Rand 1.10–3.00`) ;
5. les questions sur les tags, avec leurs biais de niveau et de précision (§6 bis, refonte des tags du doc 20) ;
6. renégociation après recrutement ;
7. licenciement / indemnités ;
8. **prime de risque** éventuelle, séparée de la prime de mission fixe.

Ces points s'équilibrent sans remettre en cause la boucle.
