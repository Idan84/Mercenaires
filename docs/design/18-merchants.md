# Marchands

> Ouvert le 2026-10-30 (Idan / JC3). **Étape 1 en place** : le passage du jour et l'achat. Plusieurs points sont **provisoires** et seront affinés par Idan (§4).

## 1 — L'idée (Idan, 2026-10-30)

- **Chaque jour, un tirage** : pas de marchand, ou un marchand parmi la liste.
- **Chaque marchand a de vraies caractéristiques** : les objets qu'il vend et ceux qu'il achète, et son **affinité avec le capitaine**, selon le peuple, la culture et l'alignement du capitaine.
- Cela fixe un **coefficient d'achat** et un **coefficient de vente**, donc les prix.
- Les marchands n'ont pas tous les objets. Ce qu'ils ont en stock **dépend de la renommée** de la compagnie.
- Ils sont **réticents à racheter les grandes quantités** (« le lot de 300 lances usées ») : les prix baissent avec la quantité.
- On pourra **négocier**, et **faire évoluer l'affinité** avec le marchand.
- **Côté RP**, globalement un marchand par culture, qui vend surtout des spécialités culturelles ; la liste sera **plus fine que la culture**.
- On aura bien d'autres objets, et ils ne s'arrêtent pas au T4.

## 2 — Décidé et en place (étape 1)

- **Passage** : chaque matin, un marchand passe au camp avec une probabilité de **30 % + 4 % par étoile de renommée** (15 niveaux). Une compagnie neuve (2 ou 3 étoiles de bronze) a donc 38 à 42 % de chances, une compagnie d'une étoile d'argent 54 %, et une compagnie légendaire (5 étoiles d'or) 90 %. On vient voir plus souvent une grande compagnie qu'un camp avec trois paysans. Constantes `merchants.arrival.base` et `merchants.arrival.per_star`.
- **Durée** : il reste **la journée** et repart le lendemain matin.
- **Nouvelles du jour** : une pop-up à chaque passage de journée reprend tout ce que le journal annonce (guérisons, salaires, Taverne, contrats, expéditions, chantier, marchand). Les rapports des lieutenants et l'arrivée d'une escouade s'affichent ensuite.
- **Bouton « Marchand »** dans le menu du camp. Il est grisé quand aucun marchand n'est là, et affiche le nom du marchand présent. L'écran est **fonctionnel** pour l'instant : le fond, les emplacements et les portraits des marchands viendront plus tard.
- **Affinité** marchand ↔ capitaine : la même formule que pour un mercenaire (doc 02 : peuple, culture, alignement), de −100 à +100, affichée **en cœurs**, sans phrase.
- **Prix demandé** = valeur cachée de l'objet (doc 05) × **1,5** × (1 − **0,2** × Affinité / 100), arrondi à la pièce. Avec une affinité de +56, une épée longue T2 (360 PO) coûte 480 PO ; à 0, 540 PO ; à −43, 586 PO. Constantes `merchants.price.sell_margin` et `merchants.price.affinity_factor`.
- **Achat** : on ne peut pas dépenser plus que l'or de la compagnie. L'objet acheté rejoint l'**Intendance**, sans propriétaire.

## 3 — Comment c'est fait

- Règles : `game-core/merchants.js`. Le marchand passe pendant le passage de la journée (`campaign.js`, `advanceOneDay`). Le stock est créé par `createMerchantStock` (`mercenary-generator.js`).
- Données : `data/reference/merchants.json` (liste des marchands) et les constantes `merchants.*` de `formula-constants.json`.
- Interface : `prototype-web/merchant-ui.js` (écran du marchand) ; Nouvelles du jour dans `tavern-ui.js`.
- Sauvegarde : `state.market`, qui contient les marchands déjà venus et la visite du jour.
- Tests : `tests/merchants.test.js`.

## 4 — Provisoire, à affiner avec Idan

- **La liste des marchands** : pour l'instant, un par culture (32), tous de même fréquence (`poids`). Idan fera une liste plus fine que la culture.
- **Identité** : peuple de la culture, alignement principal de la culture, nom tiré dans les noms de la culture à sa première visite. Le marchand reste ensuite le même toute la partie.
- **Spécialités** : les armes de son peuple et de sa culture, tirées comme le stock de départ de la compagnie (poids 1 + 2 × A, A = intensités de la matrice de génération). C'est une tendance, pas une exclusivité. Par exemple, chez les Nains du chaos : arquebuses, canons à main, haches et marteaux de guerre ; chez les Elfes sylvains : surtout des arcs.
- **Stock** : 6 + 1D6 objets ; deux tiers d'armes (ses spécialités) ; le reste parmi les armures, les objets à bonus et les potions. Constantes `merchants.stock.*`.
- **Tiers** : la table de l'équipement de départ (doc 05), avec la renommée de la compagnie ÷ 4 à la place de la réputation. Elle s'arrête au T3 pour l'instant. Le code accepte d'autres tiers dès que leurs chiffres seront décidés.

## 5 — Étapes suivantes

1. **Revente** au marchand : ce qu'il rachète, et à quel prix.
2. **Baisse du prix de rachat avec la quantité** (proposition JC3 : chaque exemplaire identique racheté pendant un même passage est payé 15 % de moins que le précédent ; un lot ne rapporte jamais plus d'environ 7 fois le prix d'un seul).
3. **Négociation**, sur le modèle de celle de la Taverne (doc 14 §9).
4. **Affinité acquise** avec le marchand, et rôle de l'intendant.
