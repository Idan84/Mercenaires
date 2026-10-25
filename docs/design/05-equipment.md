> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# 04 — Équipement

Référentiels d’équipement. La **qualité est commune à tous les items** ; les résistances, malus de mobilité et altération magique sont portés directement par chaque type d’armure.

[Qualités d'item](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/04%20%E2%80%94%20%C3%89quipement/Qualit%C3%A9s%20d%27item%20786aac3436ff470a8a92d8fdd0b152cb.csv)

[Armures de base](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/04%20%E2%80%94%20%C3%89quipement/Armures%20de%20base%20f4f4cb3ca59c4e9aa987205928976f58.csv)

[Sans titre](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/04%20%E2%80%94%20%C3%89quipement/Sans%20titre%203ebc799da3d1814dab67dac17219fbf4.csv)

## Règles d'équipement actives

- La **qualité d'item** est commune : `Multiplicateur qualité` agit sur les valeurs positives ; `Multiplicateur malus` agit sur les handicaps, y compris désormais le malus vitesse d'arme.
- La prise et les bonus `1 main / 2 mains / Au choix` sont définis dans [Prise d'arme et mode deux mains V1](/design/#doc=formulas/prise-d-arme-et-mode-deux-mains-v1.md).
- Le calcul du malus vitesse réel d'une arme est défini dans [Malus vitesse arme effectif V1](/design/#doc=formulas/malus-vitesse-arme-effectif-v1.md).

<aside>
⚖️

La vue **Armes — équilibrage** est la table à modifier pour ajuster dégâts, puissance de blessure, prise, inertie, portée, bonus de charge et capacité de contre-charge sans toucher aux formules.

</aside>

## Portée, tir et charge

Les fiches d'armes portent désormais les champs `Portée min hex`, `Portée max hex`, `Cadence tir`, `Recharge action rapide`, `Contre-charge`, `Bonus charge base` et `Attaque de zone`.

- Une arme de mêlée ordinaire sans portée explicite est traitée comme **1–1**.
- Les armes d'hast configurées ici sont **1–2** et peuvent contre-charger.
- Les armes de tir disposent de leurs portées V1 et de leur cadence `Répétable` ou `Tir unique`.
- Les armes à feu sont à tir unique et nécessitent une Action rapide pour recharger.
- Le **Tromblon** est marqué comme attaque de zone ; sa géométrie sera définie avec les attaques de zone.
- `Bonus charge base` est renseigné sur les armes : **1** par défaut, **2** pour les armes d'hast et les armes `2 mains`. Ce premier équilibrage pourra être affiné arme par arme.

La vue **Tir — portée & cadence** expose les paramètres utiles au réglage des armes à distance.

## Sets d'armes & armes à feu

- Deux sets peuvent être préparés ; [Permutation de set d'armes V1](/design/#doc=formulas/permutation-de-set-d-armes-v1.md) : **changer de set = 1 Action rapide**.
- Épée + pistolet ou deux pistolets utilisent la logique générale du combat à deux armes : inerties cumulées et une attaque de base par arme utilisable.
- [Armes à feu — recharge et double pistolet V1](/design/#doc=formulas/armes-a-feu-recharge-et-double-pistolet-v1.md) : **recharger une arme à feu = 1 Action rapide** ; une arme déchargée devient indisponible sans empêcher l'autre arme du set de fonctionner.

## Boucliers

Le même jet de blocage est utilisé au **CAC et contre les projectiles physiques**, y compris lorsqu'une attaque bénéficie de Frappe dans le dos.

Les boucliers ne sont pas traités comme des armures. Ils ajoutent leur propre **malus de vitesse** et utilisent [Blocage bouclier physique V1](/design/#doc=formulas/blocage-bouclier-physique-v1.md) comme jet de sauvegarde après un Toucher réussi.

Ils possèdent aussi désormais le champ numérique **`Altération magique base`**, identique à celui des armures, afin que les boucliers métalliques puissent pénaliser ultérieurement les mécaniques de magie sans passer par le système d'armure.

La vue **Boucliers — équilibrage** expose `Bonus blocage base`, `Malus vitesse arme base` et `Altération magique base` ensemble.

[Sans titre](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/04%20%E2%80%94%20%C3%89quipement/Sans%20titre%203ebc799da3d18124874bfce7508cfe33.csv)

[Slots d’équipement & Pierres magiques — chantier](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/04%20%E2%80%94%20%C3%89quipement/Slots%20d%E2%80%99%C3%A9quipement%20%26%20Pierres%20magiques%20%E2%80%94%20chantier%203ecc799da3d1818bb33ae8a5b3100288.md)
## Équipement de départ — V1 active

`Create_Mercenary()` génère maintenant du **matériel personnel persistant**. Chaque objet est une `ItemInstance` avec un `owner` unique correspondant au mercenaire. Le joueur ne déplace pas librement ces objets : les futurs changements d’équipement passeront par une règle `change_item` (Intelligence, Volonté, négociation, échange/troc, etc.).

### Slots canoniques

- Casque / Chapeau ; Amulette ; Armure ; Gants ; Ceinturon ; Culotte ; Bottes ; Cape (Gants et Culotte : Idan, 2026-10-24) ;
- **6 bagues** ;
- **2 sets d’armes**, chacun avec arme principale + main secondaire ;
- **4 équipements de ceinture** (potions / consommables / petits objets actifs) ;
- **1 Monture / Animal de combat**.

À la création, seuls l’**armure**, le **set d’armes 1** et éventuellement le **set d’armes 2** sont remplis. Tous les autres slots existent mais restent vides.

### Profil temporaire d’équipement

Trois scores non persistants comme « classe » sont comparés : **CAC**, **Distance**, **Magie**. Ils servent uniquement à orienter le matériel initial.

- `CAC = 0,6 × (meilleure arme CAC / 2) + 0,4 × moyenne(Force, Dextérité, Endurance, Courage)` ;
- `Distance = 0,6 × (meilleure arme Distance / 2) + 0,4 × moyenne(Dextérité, Perception, Vitesse)` ;
- `Magie = 0,6 × (meilleure école / 2) + 0,4 × moyenne(Intelligence, Puissance magique, Réserve de mana)`.

**Décision Idan + Chatty du 2026-10-03 (Issue #12)** : la meilleure école est divisée par 2, comme la meilleure arme, pour comparer les trois profils sur la même échelle. Avant cette correction, 89 % des mercenaires générés sortaient « Magie ». Mesure après correction (4 000 mercenaires) : 48 % CAC, 27 % Magie, 26 % Distance ; Ogres 98 % CAC, Orcs et Hommes-bêtes 80 % CAC, Halflings et Gobelins ~58 % Distance, Gnomes 67 % Magie. Cette répartition n'est pas une cible : elle sera observée en playtest.

La meilleure arme est déterminée avec le score existant `Maîtrise catégorie + Maîtrise arme précise`. Un profil Magie reçoit pour l’instant sa meilleure arme réelle, sans créer de focus magique artificiel.

### Arme secondaire

Après l’arme principale : **50 % de chance** de recevoir une arme complémentaire. Si l’arme principale est CAC, on cherche la meilleure arme Distance ; si elle est Distance, on cherche la meilleure arme CAC. Cette seconde arme va dans le set d’armes 2.

### Armure

Le mercenaire reçoit au hasard une armure de la catégorie la plus lourde qu’il sait porter : **Lourde → Intermédiaire → Légère → Vêtement**. `Vêtement` est désormais une catégorie propre, inférieure à légère et ne nécessitant aucune aptitude.

### Tier / qualité

Chaque objet tire son tier **indépendamment** selon la réputation personnelle du mercenaire, avec interpolation linéaire entre ces points :

| Réputation | T1 | T2 | T3 |
|---:|---:|---:|---:|
| 0 | 90 % | 9 % | 1 % |
| 100 | 82 % | 16 % | 2 % |
| 200 | 65 % | 30 % | 5 % |
| 300 | 45 % | 40 % | 15 % |
| 400+ | 25 % | 45 % | 30 % |

Mapping actuel vers les qualités existantes : **T1 = Usée**, **T2 = Correcte**, **T3 = Grand Luxe**.

### Valeur d’un objet (Idan, 2026-10-24)

Chaque objet a une **valeur en pièces d’or, cachée** : rien ne l’affiche au joueur. Elle servira aux marchands.

**Valeur = prix de base × tier × qualité**, arrondie à la pièce (`game-core/item-value.js`).

- **Prix de base** (objet T1, qualité Correcte) : colonne `prix_base` des fichiers d’équipement, modifiable à la main.
  - Armes (`weapons.json`) : 40 + 10 × dégât maximal, × 1,5 pour les armes à feu, arrondi à 5. Par exemple Dague 80, Épée longue 120, Grande épée 200, Pistolet 180, Arquebuse 240.
  - Armures (`base-armors.json`) : Vêtements 20, Gambison 60, Armure de cuir 90, Cuir renforcé 160, Brigandine 220, Cotte de mailles 260, Armure d’écailles 380, Armure de plates 600.
  - Bottes, ceintures, capes, gants, culottes : 100. Amulettes et bagues : 150.
- **Tier** : T1 × 1, T2 × 3, T3 × 8, T4 × 25 (`economy.item_value.tier_<n>_multiplier`).
- **Qualité** : Usée × 0,6, Correcte × 1, Grand Luxe × 1,5 (`item-qualities.json`, `multiplicateur_prix`).

Exemples : Épée longue T1 Usée 72 PO, T2 Correcte 360 PO, T3 Grand Luxe 1 440 PO, T4 Grand Luxe 4 500 PO. Un objet sans prix de base n’a pas de valeur. Casques et chapeaux : 100 PO de base, comme les autres objets à bonus.

Le prix d’achat et de revente chez un marchand viendra avec les marchands (il dépendra de l’intendant, entre autres).

### Carte d’objet (Idan, 2026-10-24)

Au survol d’une arme ou d’une armure (fiche, Intendance), une carte de jeu présente l’objet : son image dans le cadre de son tier, un **titre selon le tier** (`data/reference/item-titles.json`, par ex. Vieille lance / Lance basique / Lance de guerrier / Lance luxueuse) et ses **effets réels**, qualité comprise, tels que le combat les applique : dégâts, puissances, portée, prise, poids, charge, blocage, contre-charge, recharge, tirs enchaînés, attaque de zone pour une arme ; résistances et handicap (esquive, vitesse, magie) pour une armure. Aucune règle nouvelle : la carte lit les mêmes valeurs que le moteur (`game-core/item-card.js`).

### Caractéristiques équipées (Idan, 2026-10-24)

L’onglet Caractéristiques de la fiche montre les valeurs **au combat**, avec l’équipement (set d’armes 1 en main), en rouge si elles baissent et en vert si elles montent ; au survol, le détail : valeur de base, ce que retire chaque objet, valeur au combat. Ce sont les effets que le combat applique déjà (`game-core/equipment-effects.js`, à partir de `combat-engine.js`) : Vitesse (handicap de l’armure, poids des objets tenus), Esquive (handicap de l’armure), Initiative (calculée avec la Vitesse au combat) et Dextérité (combat à deux armes). Les cinq résistances du personnage ne sont pas modifiées : les résistances d’armure s’opposent à la puissance des armes, à l’étape Blesser. La caractéristique sauvegardée ne change pas ; la Taverne compare toujours les valeurs sans équipement.

### Bottes (Idan, 2026-10-24)

Trois types de bottes (`data/reference/boots.json`), chacun lié à une caractéristique : **Bottes de vitesse** (Vitesse), **Bottes d’esquive** (Esquive), **Bottes de perception** (Perception). Portées dans l’emplacement « Bottes », elles ajoutent un pourcentage de la **caractéristique de base** du porteur selon leur tier : **+5 %** (T1), **+10 %** (T2), **+15 %** (T3), **+20 %** (T4). La qualité ne change pas ce bonus.

- Au combat (`combat-engine.js`, `statWithBoots`), la caractéristique bonifiée remplace la caractéristique de base : Vitesse au combat = Vitesse × (1 + bonus) − handicaps (donc l’Initiative et le déplacement en profitent), Esquive au combat = Esquive × (1 + bonus) − handicap de l’armure, Perception (Toucher, Perception défensive, Blesser à distance).
- Sur la fiche, l’onglet Caractéristiques montre la valeur bonifiée en vert, avec la ligne des bottes dans le détail.
- À la création d’un mercenaire : **5 %** de chance d’avoir une paire (`starting-equipment-generation.json`, `boots_chance`), d’un type tiré au hasard ; tier selon la réputation, comme le reste de l’équipement.
- Stock de départ de la compagnie : **1D6** paires (doc 11 §16).

### Ceintures (Idan, 2026-10-24)

« Même règles que pour les bottes » : trois types de ceintures (`data/reference/belts.json`), portées dans l’emplacement **Ceinturon** (pas dans les poches de ceinture) : **Ceinture de mana** (Réserve de mana — « le mana, c’est la réserve magique »), **Ceinture d’endurance** (Endurance), **Ceinture de courage** (Courage). Bonus de **+5 / 10 / 15 / 20 %** de la caractéristique de base selon le tier (T1 à T4) ; la qualité ne le change pas.

- Au combat (`statWithGear`, qui réunit bottes et ceinture) : Endurance pour le déplacement et la défense à l’étape Blesser ; Courage pour l’Initiative et les tests de Courage (tenir, se reprendre). En fin de mission, l’Endurance bonifiée compte aussi pour la blessure et la convalescence. La Réserve de mana servira à la magie.
- Sur la fiche, Endurance, Courage et Réserve de mana (onglet Magie) montrent la valeur bonifiée, avec la ligne de la ceinture ; l’Initiative montre la part du Courage bonifié.
- **5 %** de chance d’en avoir une à la création (`belt_chance`), d’un type tiré au hasard ; **1D6** ceintures dans le stock de départ (doc 11 §16).

### Amulettes (Idan, 2026-10-24)

Mêmes règles que les bottes et les ceintures : trois types d’amulettes (`data/reference/amulets.json`), portées dans l’emplacement **Amulette** : **Amulette de puissance magique** (Puissance magique), **Amulette de volonté** (Volonté), **Amulette de chance** (Chance). Bonus de **+5 / 10 / 15 / 20 %** de la caractéristique de base selon le tier (T1 à T4) ; la qualité ne le change pas.

- Au combat (`statWithGear`) : Volonté pour le déplacement, l’Initiative et les tests de Courage (tenir, se reprendre) ; Chance pour la probabilité de critique et le test qui confirme un échec critique. En fin de mission, la Volonté bonifiée compte aussi pour le risque de mort. La Puissance magique servira à la magie.
- Sur la fiche, Puissance magique (onglet Magie), Volonté et Chance montrent la valeur bonifiée, avec la ligne de l’amulette ; l’Initiative montre la part de la Volonté bonifiée.
- **5 %** de chance d’en avoir une à la création (`amulet_chance`), d’un type tiré au hasard ; **1D6** amulettes dans le stock de départ (doc 11 §16).

### Capes (Idan, 2026-10-24)

Trois types de capes (`data/reference/capes.json`), portées dans l’emplacement **Cape** : **Cape de résistance physique** (Résistance physique), **Cape d’esquive** (Esquive), **Cape de discrétion** (Discrétion). La qualité ne change pas le bonus.

- Esquive et Discrétion : mêmes règles que les bottes, **+5 / 10 / 15 / 20 %** de la valeur de base selon le tier.
- Résistance physique : **+5 / 10 / 15 / 20 points** selon le tier (choix d’Idan : la Résistance physique, médiane 5, est trop petite pour un pourcentage ; chaque point retire environ 1 % des dégâts physiques reçus, dans la limite de 50).
- Au combat (`statWithGear`) : Esquive pour le Toucher ; Résistance physique pour la réduction des dégâts physiques (et le contrecoup d’un échec critique de blessure). La Discrétion servira quand elle aura une règle de jeu.
- Sur la fiche, Résistance physique (Caractéristiques), Esquive et Discrétion (Compétences) montrent la valeur bonifiée, avec la ligne de la cape.
- **5 %** de chance d’en avoir une à la création (`cape_chance`), d’un type tiré au hasard ; **1D6** capes dans le stock de départ (doc 11 §16).

### Gants (Idan, 2026-10-24)

Mêmes règles que les bottes : trois types de gants (`data/reference/gloves.json`), portés dans l’emplacement **Gants** : **Gants de pièges** (Pièges), **Gants de dextérité** (Dextérité), **Gants de force** (Force). Bonus de **+5 / 10 / 15 / 20 %** de la valeur de base selon le tier ; la qualité ne le change pas.

- Au combat (`statWithGear`) : Force pour les dégâts et l’étape Blesser au corps à corps ; Dextérité pour le Toucher et le blocage au bouclier (le combat à deux armes la divise ensuite). Les Pièges serviront quand ils auront une règle de jeu. L’XP de Force (charge portée) reste calculée sur la Force du mercenaire, sans les gants.
- Sur la fiche, Force et Dextérité (Caractéristiques) et Pièges (Compétences) montrent la valeur bonifiée, avec la ligne des gants ; la case des dégâts compte la Force bonifiée.
- **5 %** de chance d’en avoir une paire à la création (`gloves_chance`), d’un type tiré au hasard ; **1D6** paires dans le stock de départ (doc 11 §16).

### Culottes (Idan, 2026-10-24)

Trois types de culottes (`data/reference/pants.json`), portées dans l’emplacement **Culotte** : **String du Charisme** (Charisme) et **Culotte d’Intimidation** (Intimidation), **+5 / 10 / 15 / 20 %** de la valeur de base selon le tier comme les bottes ; **Slip d’Affinité**, **+5 / 10 / 15 / 20 points** d’affinité avec le capitaine. La qualité ne change pas le bonus.

- Au combat (`statWithGear`) : l’Intimidation bonifiée de l’adversaire pèse sur les tests de Courage et les reprises de contrôle (−0,25 × Intimidation). Le Charisme du capitaine, String compris, compte dans son aura (25 %, doc 13).
- Affinité (`game-core/affinity.js`, `memberAffinity`) : les points du Slip porté s’ajoutent au score total (initiale + acquise + Slip, borné à −100 / +100) ; ils comptent donc pour les cœurs, la négociation à la Taverne et les échanges d’équipement. Retirer le Slip retire ses points ; l’affinité acquise ne change pas.
- Sur la fiche, Charisme et Intimidation (Caractéristiques) montrent la valeur bonifiée, avec la ligne de la culotte ; sous les cœurs d’affinité, « Avec son Slip d’Affinité » (pas de score affiché).
- **5 %** de chance d’en avoir une à la création (`pants_chance`), d’un type tiré au hasard ; **1D6** culottes dans le stock de départ (doc 11 §16).

### Bagues (Idan, 2026-10-24)

Onze bagues (`data/reference/rings.json`), portées dans les **six emplacements Bague**. **Plusieurs bagues identiques se cumulent** : chacune ajoute sa ligne.

- **Bague de la chance** (Chance) et **Bague du courage** (Courage) : **+5 / 10 / 15 / 20 %** de la valeur de base selon le tier, comme les bottes.
- **Bagues de magie**, une par école : Bague de Feu, de l’Eau, de la Foudre, de l’invocation, de la transmutation, du nécromancien (Nécromancie), du soigneur (Vie), de l’illusionniste (Illusion), de la télékinésie. **+10 / 15 / 20 / 25 %** de la maîtrise de base de leur école, et **−15 / 10 / 5 / 0 %** de la maîtrise de base des **deux écoles opposées** (doc 12, `ecoles_opposees`).
- Au combat (`statWithGear`) : la Chance (critiques et échecs critiques) et le Courage (tests de Courage, reprises de contrôle). Les écoles de magie serviront avec la magie en combat.
- Sur la fiche : Chance et Courage (Caractéristiques) ; dans l’onglet Magie, la roue et les écoles de prédilection montrent la maîtrise avec les bagues, en vert ou en rouge, et leur détail au survol.
- **5 %** de chance d’en avoir une à la création (`ring_chance`), dans le premier emplacement ; **1D6** bagues dans le stock de départ (doc 11 §16).
- Images : la Bague de la télékinésie T1 et T2 sont arrivées sans tier dans leur nom ; T1 = l’anneau rouillé, T2 = l’anneau d’acier noir (choix de JC, à corriger si besoin).

### Casques et chapeaux (Idan, 2026-10-25)

Trois coiffes (`data/reference/helmets.json`), portées dans l’emplacement **Casque / Chapeau** :

- **Casque de constitution** : **+5 / 10 / 15 / 20 %** de la Constitution de base selon le tier ; en contrepartie, **−20 / 15 / 10 / 5 %** de la Puissance magique de base et **−4 / 3 / 2 / 1 de Vitesse** (le poids du casque, compté avec l’armure et les armes tenues). La qualité ne change ni le bonus ni les malus.
- **Chapeau d’intelligence** : **+5 / 10 / 15 / 20 %** de l’Intelligence de base.
- **Chapeau du dresseur** : **+5 / 10 / 15 / 20 %** de la compétence animale (Compagnon animal).
- Au combat (`statWithGear`) : la Vitesse (déplacement, Initiative) ; l’Intelligence pour l’Initiative et le choix du type de dégâts. La Constitution compte dans les **PV max** (Idan, 2026-10-25 : ils suivent la Constitution, l’Endurance et la Volonté équipées, voir `formulas/pv-maximum-v1.md`) ; la Puissance magique et le Compagnon animal servent à des systèmes à venir : la fiche montre les valeurs bonifiées (Caractéristiques, Magie, Compétences) avec la ligne du casque.
- **5 %** de chance d’en avoir un à la création (`helmet_chance`) ; **1D6** au stock de départ (doc 11 §16) ; ils peuvent tomber du coffre d’un camp. Titres par tier : `item-titles.json` (JC). Images : `assets-src/Equipements/Casques/` (Jean-Mimi).

### Échanges d’équipement : Donner, Retirer, Troquer (Idan, 2026-10-24)

Depuis l’onglet Équipement de la fiche ou l’Intendance, le capitaine peut **Donner** un objet du stock (emplacement vide), **Retirer** un objet au mercenaire (il part au stock) ou **Troquer** (les deux à la fois). Le mercenaire répond dans une boîte de dialogue, positivement ou négativement ; seule réponse possible pour l’instant : **Partir** (plus tard : convaincre, intimider, défier en combat singulier).

**Valeur perçue** d’un objet (le tier seul pour l’instant, T1 = 1 … T4 = 4) :
- objet que le mercenaire possède : tier × Int/100 + **3,5** × (1 − Int/100) — plus il est bête, plus il tient à ce qu’il a, même cassé ;
- objet qu’on lui propose : tier × Int/100 + **2,5** × (1 − Int/100) — plus il est bête, moins il voit la différence entre un T1 et un T4.

**Jet** : Δ = **20** × (valeur perçue reçue − valeur perçue cédée) + **0,5** × Affinité ; chance d’accord = 10 + 80 / (1 + e^(−Δ/20)), la courbe du combat (10 à 90 %) ; D100, accord si le jet ne dépasse pas la chance. La chance n’est pas montrée au joueur.

| Situation (affinité 0) | Int 80 | Int 20 |
|---|---|---|
| Donner un T2 | 81 % | 83 % |
| Troquer son T1 contre un T3 | 74 % | 42 % |
| Troquer son T4 contre un T1 | 16 % | 26 % |
| Retirer son T3 | 13 % | 13 % |

**Affinité** (formule de JC, demandée par Idan) : accord ou refus, l’affinité acquise (`affinityAcquired`) change de **2 × (valeur perçue reçue − valeur perçue cédée)**, arrondi. Un cadeau la fait monter (Donner un T2 : +4 ou +5), un équipement rétrogradé ou repris la fait baisser (Retirer son T3 : −6 ou −7). Reprendre ce qu’on vient de donner coûte plus qu’on n’a gagné : pas de boucle pour gonfler l’affinité.

**Règles** : une seule tentative par mercenaire et par jour ; le capitaine s’équipe librement (ni jet, ni affinité, ni limite) ; un objet donné appartient ensuite au mercenaire, un objet retiré retourne au stock sans propriétaire. Emplacements : armure, bottes, armes selon la prise (une arme à deux mains en arme principale avec la main secondaire libre, un bouclier en main secondaire). Constantes `equipment_deal.*` ; code `game-core/equipment-deals.js`.

**Interface** (`prototype-web/deal-ui.js`) : dans l’onglet Équipement de la fiche d’un membre de la compagnie, un clic sur une case ouvre un menu — **Retirer** (case remplie), **Troquer contre** ou **Donner** (objets de l’Intendance qui vont dans cet emplacement, un exemplaire par objet et par tier, du meilleur tier au moins bon). À l’Intendance, un clic sur une ligne du stock propose **Donner à…** : chaque membre qui peut porter l’objet, emplacement par emplacement, avec ce qu’il remplacerait. Le mercenaire répond dans une boîte de dialogue : la proposition du capitaine, sa réplique (selon l’action, l’accord ou le refus et son humeur : content si l’objet reçu lui semble valoir plus que l’objet cédé), puis ce qui change ; seule réponse : **Partir**. Le capitaine s’équipe sans dialogue. Textes : `data/reference/equipment-dialogue.json` (4 variantes par cas, écrites par JC).

### Dégâts des sets d’armes (Idan, 2026-10-24)

L’onglet Équipement montre, pour le set 1 et le set 2, les dégâts que fait le mercenaire **avant l’armure et la résistance de la cible**, pour voir d’un coup d’œil s’il fait mal. Pour chaque arme qui frappe (l’arme principale, et la main secondaire au combat à deux armes) : le mode (mêlée ou tir), la moyenne, la fourchette du jet minimum au jet maximum, les types de dégâts avec leur puissance, et ce qui change les dégâts (dé de l’arme, qualité, prise à deux mains, Force en mêlée). C’est la formule des dégâts physiques du combat (`physicalDamage`) contre une cible sans Résistance physique (`game-core/equipment-effects.js`, `attacks`) ; la charge n’est pas comptée.

La fiche du mercenaire affiche tous les slots autour d’une silhouette simplifiée. Les cases remplies utilisent une icône provisoire et exposent la fiche de l’item au survol ; aucun drag & drop n’est prévu.
