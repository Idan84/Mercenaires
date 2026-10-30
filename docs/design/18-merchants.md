# Marchands

> Ouvert le 2026-10-30 (Idan / JC3). **Étape 1 en place, avec un seul marchand test** : le passage du jour et l'achat. Idan répartit les biens entre les marchands ; ce que chacun vend n'est **pas encore défini** (§4).

## 1 — L'idée (Idan, 2026-10-30)

- **Chaque jour, un tirage** : pas de marchand, ou un marchand parmi la liste.
- **Chaque marchand a de vraies caractéristiques** : les objets qu'il vend et ceux qu'il achète, et son **affinité avec le capitaine**, selon le peuple, la culture et l'alignement du capitaine.
- Cela fixe un **coefficient d'achat** et un **coefficient de vente**, donc les prix. **L'intendant aidera aussi.**
- Les marchands n'ont pas tous les objets. Ce qu'ils ont en stock **dépend de la renommée** de la compagnie.
- Ils sont **réticents à racheter les grandes quantités** (« le lot de 300 lances usées ») : les prix baissent avec la quantité.
- On pourra **négocier**, et **faire évoluer l'affinité** avec le marchand.
- On aura bien d'autres objets, et ils ne s'arrêtent pas au T4.

## 2 — Décidé et en place (étape 1)

- **Passage** : chaque matin, un marchand passe au camp avec une probabilité de **30 % + 4 % par étoile de renommée** (15 niveaux). Une compagnie neuve (2 ou 3 étoiles de bronze) a donc 38 à 42 % de chances, une compagnie d'une étoile d'argent 54 %, et une compagnie légendaire (5 étoiles d'or) 90 %. On vient voir plus souvent une grande compagnie qu'un camp avec trois paysans. Constantes `merchants.arrival.base` et `merchants.arrival.per_star`.
- **Durée** : il reste **la journée** et repart le lendemain matin.
- **Nouvelles du jour** : une pop-up à chaque passage de journée reprend tout ce que le journal annonce (guérisons, salaires, Taverne, contrats, expéditions, chantier, marchand). Les rapports des lieutenants et l'arrivée d'une escouade s'affichent ensuite.
- **Bouton « Marchand »** dans le menu du camp. Il est grisé quand aucun marchand n'est là, et affiche le nom du marchand présent. L'écran est **fonctionnel** pour l'instant : le fond, les emplacements et les portraits des marchands viendront plus tard.
- **L'affinité avec le capitaine n'est pas affichée.**
- **Prix demandé** = valeur cachée de l'objet (doc 05) × **1,5** × (1 − **0,2** × Affinité / 100), arrondi à la pièce. Constantes `merchants.price.sell_margin` et `merchants.price.affinity_factor`. L'affinité se calcule comme celle d'un mercenaire (doc 02) dès qu'un marchand a un peuple et un alignement ; sans eux, elle est nulle.
- **Achat** : on ne peut pas dépenser plus que l'or de la compagnie. L'objet acheté rejoint l'**Intendance**, sans propriétaire.

## 3 — Le marchand test

Un seul marchand pour l'instant, « Marchand test », sans peuple ni alignement (affinité nulle). Il ne vend que des **épées longues T1** (Usées), sans limite de quantité : 72 PO de valeur, donc **108 PO** pièce.

## 4 — Pas encore défini

- **La liste des marchands** et **ce que chacun vend** : Idan répartit les biens entre les marchands. Les marchands ne sont pas construits sur la culture ni sur la table de génération des mercenaires.
- **Le stock** : sa taille, la quantité de chaque objet, le lien avec la renommée, les tiers.
- **L'aide de l'intendant.**

## 5 — Comment c'est fait

- Règles : `game-core/merchants.js`. Le marchand passe pendant le passage de la journée (`campaign.js`, `advanceOneDay`). Un objet en vente est créé par `createItemByName` (`mercenary-generator.js` : type, nom, tier).
- Données : `data/reference/merchants.json` (marchands et lignes de stock : type d'objet, nom, tier) et les constantes `merchants.*` de `formula-constants.json`.
- Interface : `prototype-web/merchant-ui.js` (écran du marchand) ; Nouvelles du jour dans `tavern-ui.js`.
- Sauvegarde : `state.market.visit`, la visite du jour.
- Tests : `tests/merchants.test.js`.

## 6 — Étapes suivantes

1. **Revente** au marchand : ce qu'il rachète, et à quel prix.
2. **Baisse du prix de rachat avec la quantité** (proposition JC3, non validée : chaque exemplaire identique racheté pendant un même passage est payé 15 % de moins que le précédent ; un lot ne rapporte jamais plus d'environ 7 fois le prix d'un seul).
3. **Négociation**, sur le modèle de celle de la Taverne (doc 14 §9).
4. **Affinité acquise** avec le marchand, et aide de l'intendant.
