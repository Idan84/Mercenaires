# Marchands

> Ouvert le 2026-10-30 (Idan / JC3). **Étape 2 en place (2026-10-31)** : le premier vrai marchand, **Thorval
> Poudredefeu**, remplace le marchand test ; étal de 10 articles, affinité qui évolue, achat, revente, aide de
> l'intendant, et « Rien que pour toi, capitaine ». Chiffres proposés par JC3 et validés par Idan (« Go »). Tous sont des
> constantes `merchants.*` de `formula-constants.json`.

## 1 — L'idée (Idan, 2026-10-30)

- **Chaque jour, un tirage** : pas de marchand, ou un marchand parmi la liste.
- **Chaque marchand a de vraies caractéristiques** : les objets qu'il vend, et son **affinité avec le capitaine**.
- Les prix dépendent de l'affinité ; **l'intendant aide**. Les tiers proposés **dépendent de la renommée**.
- Ils sont **réticents à racheter les grandes quantités** (« le lot de 300 lances usées ») : les prix baissent avec la
  quantité.
- On pourra **négocier** ; on aura bien d'autres objets, et ils ne s'arrêtent pas au T4.

## 2 — Le passage

- Chaque matin, un marchand passe au camp avec une probabilité de **30 % + 4 % par étoile de renommée** (15 niveaux) :
  38 à 42 % pour une compagnie neuve, 54 % à 1 étoile d'argent, 90 % à 5 étoiles d'or. Il reste **la journée** et repart
  le lendemain matin. Le marchand qui passe est tiré parmi la liste selon son `poids`.
- La **notification du jour** annonce son arrivée ; le bouton **Marchand** du camp porte son nom (grisé sans marchand).

## 3 — Un marchand (Idan, 2026-10-31)

- Un **nom fixe**, un **portrait** fait pour lui seul, une **culture** (son peuple et l'alignement par défaut de sa
  culture), et la **liste des objets qu'il vend** : on ne trouve **jamais** autre chose chez lui, sauf l'objet « rien que
  pour toi » (§9).
- **Thorval Poudredefeu** : Nain, Nains du chaos, Chaotique neutre. Il vend **Pistolet, Tromblon, Canon à main,
  Arquebuse**. Son portrait est à venir (`portrait` vide : l'écran montre ses initiales en attendant).

## 4 — L'étal

- **10 articles par passage**, pour tous les marchands (`merchants.stock.size`). Chacun est tiré au hasard dans sa liste
  (doublons possibles) et ne se vend qu'une fois.
- **Tier** (pour l'instant T2 à T4) selon le niveau d'étoiles de la renommée (1 à 15) :
  T2 = 70 − 4 × niveau, T3 = 25 + 2 × niveau, T4 = 5 + 2 × niveau (en %, la somme fait 100).

| Renommée | T2 | T3 | T4 |
|---|---|---|---|
| 2 étoiles de bronze (compagnie neuve) | 62 % | 29 % | 9 % |
| 1 étoile d'argent | 46 % | 37 % | 17 % |
| 5 étoiles d'or | 10 % | 55 % | 35 % |

## 5 — L'affinité avec le marchand

- **Initiale** : comme celle d'un mercenaire avec le capitaine (doc 02 : peuple, culture, alignement). Exemples avec
  Thorval : capitaine nain du chaos +100, humain chaotique neutre +44, humain neutre +22, orc loyal bon −71, nain des
  montagnes chaotique neutre −29 (les Nains du chaos haïssent les autres nains : doc 02, « Cultures à part »).
- **Acquise** : **+2 par article acheté** ; **−3 à chaque passage sans aucun achat ni aucune vente** (quand il repart).
- Bornée de −100 à +100. **Elle n'est pas affichée.** Sauvegarde : `state.market.merchants[id].acquired`.

## 6 — L'intendant

Si l'affinité du marchand avec l'intendant (initiale) est d'au moins **+20**, l'intendant négocie : **1 % par tranche de
10 points d'Intendance** (jusqu'à 10 %), en moins sur vos achats et en plus sur vos ventes. L'écran montre seulement son
visage (« … négocie pour vous »).

## 7 — Vous achetez

Prix = valeur cachée (doc 05) × **1,5** × (1 − **0,2** × Affinité / 100) × (1 − bonus de l'intendant), arrondi. L'or de
la compagnie doit suffire ; l'objet rejoint l'**Intendance**, sans propriétaire.

## 8 — Vous vendez (depuis l'Intendance)

Prix = valeur × **0,8** × (1 + **0,2** × Affinité / 100) × (1 + bonus de l'intendant), puis :

- **Hors de sa liste** : × **0,4**.
- **Quantité** : × **0,85** par exemplaire du même objet au même tier déjà vendu pendant ce passage (10 exemplaires
  rapportent environ 5,3 fois le prix d'un seul).
- **Rareté**, sur sa liste : **+20 % pour un T3, +40 % pour un T4** à 1 étoile de bronze, qui diminue linéairement
  jusqu'à 0 à 5 étoiles d'or : une compagnie neuve vend très cher un T4.
- **Plafond** : jamais plus de **90 %** du prix qu'il en demanderait lui-même (pas d'aller-retour gagnant chez le même
  marchand).
- Ce qu'il rachète disparaît.

Ainsi, on gagne un peu en achetant un T3 ou un T4 là où l'affinité est bonne, pour le revendre à un autre marchand qui a
cette arme dans sa liste, tant que la compagnie est jeune.

**Exemples** (compagnie neuve, capitaine humain chaotique neutre : affinité +44, sans intendant) : Pistolet T2 739 PO à l'achat,
470 PO à la vente ; Tromblon T4 7 182 PO à l'achat, 6 267 PO à la vente (5 092 PO pour une compagnie à 1 étoile d'or) ;
10 épées longues T1 : environ 133 PO en tout (25 PO la première).

## 9 — « Rien que pour toi, capitaine » (Idan, 2026-10-31)

- **Quand** : son affinité avec le capitaine est à **+100**, vérifiée pendant tout son passage (donc aussi juste après
  l'achat qui l'y porte). Avec Thorval, un capitaine nain du chaos y est d'emblée (+100) ; il faut 28 achats à un humain
  chaotique neutre (+44), 39 à un humain neutre (+22). S'il repart sans affaire (97), l'offre ne revient qu'une fois remonté à +100.
- **Une offre par passage**, qui reste jusqu'à son départ si on ne la prend pas tout de suite.
- **L'objet** : jamais dans sa liste ; une famille d'équipement au hasard (arme, armure, casque, bottes, ceinture,
  amulette, cape, gants, culotte, bague ; pas de fiole), puis un objet de cette famille ; **T3 ou T4**, avec les chances
  de l'étal ramenées à ces tiers (compagnie neuve : environ 76 % de T3, 24 % de T4).
- **Prix** : **50 %** de ce qu'il en demanderait normalement (à +100, 0,6 × la valeur) : un arc T3 à 720 PO au lieu de
  1 440. Revendu à un marchand qui vend des arcs, c'est un bon bénéfice : il ne sait pas l'estimer.
- **Dialogue** : le bouton **Parler**, à côté de son nom, s'allume ; sa réplique (`repliques.rien_que_pour_toi`, une
  phrase tirée parmi ses variantes, `{objet}` et `{prix}`), la carte de l'objet, « Je prends (… PO) » ou « Pas
  aujourd'hui ». Pas d'annonce dans la notification du jour : la surprise reste au camp.
- Constantes `merchants.special.*` (affinité 100, prix 0,5, tier minimal 3) ; sauvegarde `state.market.visit.special`.

## 10 — L'écran

Portrait et nom, la caisse ; onglets **Acheter** (l'étal, du plus cher au moins cher) et **Vendre** (le stock de
l'Intendance, deux objets identiques en une case « × 2 », ses armes d'abord avec un liseré doré) ; une case par objet,
la carte d'objet au survol, le prix dessous.

## 11 — Comment c'est fait

- Règles : `game-core/merchants.js` (`morning`, `visitOf`, `buy`, `sell`, `sellPrice`, `buybackPrice`, `tierChances`,
  `stewardHelp`, `buySpecial`, `ensureSpecial`). Le marchand passe pendant le passage de la journée (`campaign.js`, `advanceOneDay`). Un article est
  créé par `createItemByName` (`mercenary-generator.js` : type, nom, tier).
- Données : `data/reference/merchants.json` (`nom`, `sexe`, `portrait`, `peuple`, `culture`, `alignement`, `poids`,
  `vend`, `repliques`) et les constantes `merchants.*`.
- Interface : `prototype-web/merchant-ui.js`.
- Sauvegarde : `state.market.visit` (marchand, jour, étal, ventes du passage, affaire faite, objet « rien que pour
  toi ») et
  `state.market.merchants` (affinité acquise).
- Tests : `tests/merchants.test.js`, `tests/merchant-ui.test.js`.

## 12 — Étapes suivantes

1. Les autres marchands (Idan prépare leurs personae).
2. **Négociation**, sur le modèle de celle de la Taverne (doc 14 §9).
