> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# 04 — Équipement

Référentiels d’équipement. La **qualité est commune à tous les items** ; les résistances, malus de mobilité et altération magique sont portés directement par chaque type d’armure.

[Qualités d'item](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/04%20%E2%80%94%20%C3%89quipement/Qualit%C3%A9s%20d%27item%20786aac3436ff470a8a92d8fdd0b152cb.csv)

[Armures de base](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/04%20%E2%80%94%20%C3%89quipement/Armures%20de%20base%20f4f4cb3ca59c4e9aa987205928976f58.csv)

[Sans titre](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/04%20%E2%80%94%20%C3%89quipement/Sans%20titre%203ebc799da3d1814dab67dac17219fbf4.csv)

## Règles d'équipement actives

- La **qualité d'item** est commune : `Multiplicateur qualité` agit sur les valeurs positives ; `Multiplicateur malus` agit sur les handicaps, y compris désormais le malus vitesse d'arme.
- La prise et les bonus `1 main / 2 mains / Au choix` sont définis dans [Prise d'arme et mode deux mains V1](/design/#doc=formulas/prise-d-arme-et-mode-deux-mains-v1.md).
- **La fronde se tient à deux mains** (Idan, 2026-10-25) : une main la fait tourner, l'autre tient et recharge les pierres ; pas de bouclier ni d'arme en main secondaire avec elle. Dans une partie commencée avant, l'objet tenu en main secondaire avec une arme à deux mains retourne à l'Intendance.
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

**Sans le port, pas d’armure** (Idan, 2026-11-03) : on ne peut équiper que les armures dont on a le port (doc 03, « Sans le port, pas d’armure »).

### Tier / qualité

Chaque objet tire son tier **indépendamment** selon la réputation personnelle du mercenaire, avec interpolation linéaire entre ces points :

| Réputation | T1 | T2 | T3 |
|---:|---:|---:|---:|
| 0 | 90 % | 9 % | 1 % |
| 100 | 82 % | 16 % | 2 % |
| 200 | 65 % | 30 % | 5 % |
| 300 | 45 % | 40 % | 15 % |
| 400+ | 25 % | 45 % | 30 % |

Une qualité par tier (Idan, 2026-11-01 : « Usée, Correcte, De bonne facture, De luxe ») : **T1 = Usée**, **T2 = Correcte**, **T3 = De bonne facture** (ex-« Grand Luxe »), **T4 = De luxe** (valeurs bénéfiques +40 %, malus −40 %, prix × 2,5). T5, T6 et les cristaux sur les armes viendront.

**Ce que voit le joueur (Idan, 2026-10-30)** : jamais le tier. Les T1, T2, T3… servent à l'équipe, pas au joueur : ils n'apparaissent nulle part dans le jeu. Le **cadre de couleur** dit la qualité, et chaque objet porte un **nom public** qui reflète son niveau de façon subtile, drôle et décalée (`item-titles.json`, par ex. « Pétoire rafistolée » pour une arquebuse T1). Le nom de base de l'objet (« Arquebuse ») s'affiche en petit quand il diffère.

**Vision (Idan, 2026-10-30, en réflexion)** : les tiers iront **au moins jusqu'au T6**, et tous les objets auront un **système de cristaux** qui ajoutent des caractéristiques, proche des matérias de Final Fantasy VII. Rien n'est encore décidé.

### Valeur d’un objet (Idan, 2026-10-24)

Chaque objet a une **valeur en pièces d’or, cachée** : rien ne l’affiche au joueur. Elle servira aux marchands.

**Valeur = prix de base × tier × qualité**, arrondie à la pièce (`game-core/item-value.js`).

- **Prix de base** (objet T1, qualité Correcte) : colonne `prix_base` des fichiers d’équipement, modifiable à la main.
  - Armes (`weapons.json`) : 40 + 10 × dégât maximal, × 1,5 pour les armes à feu, arrondi à 5. Par exemple Dague 80, Épée longue 120, Grande épée 200, Pistolet 180, Arquebuse 240.
  - Armures (`base-armors.json`) : Vêtements 20, Gambison 60, Armure de cuir 90, Cuir renforcé 160, Brigandine 220, Cotte de mailles 260, Armure d’écailles 380, Armure de plates 600.
  - Bottes, ceintures, capes, gants, culottes : 100. Amulettes et bagues : 150.
- **Tier** : T1 × 1, T2 × 3, T3 × 8, T4 × 25 (`economy.item_value.tier_<n>_multiplier`).
- **Qualité** : Usée × 0,6, Correcte × 1, De bonne facture × 1,5, De luxe × 2,5 (`item-qualities.json`, `multiplicateur_prix`).

Exemples : Épée longue T1 Usée 72 PO, T2 Correcte 360 PO, T3 De bonne facture 1 440 PO, T4 De luxe 7 500 PO. Un objet sans prix de base n’a pas de valeur. Casques et chapeaux : 100 PO de base, comme les autres objets à bonus.

Le prix d’achat et de revente chez un marchand en découle (doc 18 : affinité, intendant, quantité, rareté).

### Carte d’objet (Idan, 2026-10-24)

Au survol d’une arme ou d’une armure (fiche, Intendance), une carte de jeu présente l’objet : son image dans le cadre de son tier, un **titre selon le tier** (`data/reference/item-titles.json`, par ex. Vieille lance / Lance basique / Lance de guerrier / Lance luxueuse) et ses **effets réels**, qualité comprise, tels que le combat les applique : dégâts, puissances, portée, prise, poids, charge, blocage, contre-charge, recharge, tirs enchaînés, attaque de zone pour une arme ; protection et handicap (esquive, vitesse, magie) pour une armure ; les autres objets montrent leurs lignes de bonus et de malus, sans phrase qui les répète (Idan, 2026-10-30). Aucune règle nouvelle : la carte lit les mêmes valeurs que le moteur (`game-core/item-card.js`).

### Caractéristiques équipées (Idan, 2026-10-24)

L’onglet Caractéristiques de la fiche montre les valeurs **au combat**, avec l’équipement (set d’armes 1 en main), en rouge si elles baissent et en vert si elles montent ; au survol, le détail : valeur de base, ce que retire chaque objet, valeur au combat. Ce sont les effets que le combat applique déjà (`game-core/equipment-effects.js`, à partir de `combat-engine.js`) : Vitesse (handicap de l’armure, poids des objets tenus), Esquive (handicap de l’armure), Initiative (calculée avec la Vitesse au combat) et Dextérité (combat à deux armes). Les cinq résistances du personnage ne sont pas modifiées : les résistances d’armure s’opposent à la puissance des armes, à l’étape Blesser. La caractéristique sauvegardée ne change pas ; la Taverne compare toujours les valeurs sans équipement.

Rangement par fonction (Idan, 2026-10-31 : « voir ce que vaut notre mercenaire sans équipement et avec son équipement ») : trois colonnes, **Attaque** et **Défense** ; **Vitesse**, **Magie**, **Moral et commandement** ; **Protection de l’armure** (tranchant, perforant, contondant : ce que l’armure portée oppose à la Pénétration d’armure, comparée au survol avec le reste de la compagnie) et **Résistances** (feu, froid, foudre, poison). L’ordre est dans `character-sheet-copy.json` (`stats_layout`), les textes des protections dans `protections`.

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
- Au combat (`statWithGear`) : Esquive pour le Toucher ; Résistance physique pour la réduction des dégâts physiques (et le contrecoup d’un échec critique de blessure). La Discrétion sert au camouflage en combat (doc 04, « Discrétion et camouflage »).
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

### Potions et fioles (Idan, 2026-10-29)

Trois consommables (`data/reference/potions.json`), rangés dans les **4 emplacements de ceinture** (`belt_item_1` à `belt_item_4`) :

- **Potion de soins** : rend **20 %** des PV max (arrondi au supérieur, sans dépasser le maximum) ; un mercenaire flétri (Flétrissement, doc 12) n’en profite pas.
- **Potion de mana** : rend **20 %** du mana max.
- **Fiole de poison** : enduit l’**arme active** pendant **3 tours** ; chaque coup qui **blesse**, au corps à corps comme au tir (Idan : « oui » pour les armes à distance), **empoisonne** la cible : le poison du doc 12, **10 PV par tour** pendant 3 tours, jet de résistance à chaque activation.
  **Il faut l’aptitude Empoisonnement des armes** (Idan, 2026-11-03 : « Seul ceux qui ont la compétence peuvent empoisonner leur arme en utilisant une potion ») : sans elle, la fiole reste à la ceinture (« Il ne sait pas empoisonner une arme. ») et ne compte pas dans le profil. La sarbacane empoisonne d’elle-même. L’aptitude s’apprend au Labo d’alchimie (doc 11 §7).
- **Usage** : en combat, **action rapide**, **sur soi seulement** (Idan, 2026-10-29) ; la fiole est **consommée**. Celles qui restent dans la ceinture repartent avec le mercenaire.
- **Pas de tier ni de qualité** pour l’instant : l’effet est fixe.
- **Distribution libre** : à l’Intendance ou sur la fiche, une fiole se donne ou se reprend sans jet, sans affinité, sans limite par jour et sans entrer dans l’historique (ce sont les consommables de la compagnie). « Donner à… » la range dans la première poche libre.
- **Génération** : **1D6 de chaque sorte** au stock de départ (doc 11 §16, « comme les autres objets ») ; **5 %** de chance qu’une recrue arrive avec une fiole d’une sorte tirée au hasard (`potion_chance`), dans la première poche.
- **Valeur cachée** (Idan : « je te laisse faire ») : `prix_base` 25 PO (soins), 25 PO (mana), 20 PO (poison) ; sans tier ni qualité, la valeur est le prix de base.
- **Écran de combat** : un bouton par sorte dans la barre des sorts (« Potion de soins ×2 »), grisé quand l'action rapide est prise ou que la fiole ne servirait à rien (PV ou mana au maximum, flétri). Un chiffre saute au-dessus du pion ; la fiche de survol montre « Arme empoisonnée ».
- **Combat automatique et IA** : une potion de soins sous 30 % des PV ; une potion de mana quand le mana ne suffit plus pour aucun sort connu ; la fiole de poison au premier contact, juste avant de frapper. Les ennemis n'en ont pas pour l'instant.
- **XP** : les PV rendus par la potion de soins comptent pour la Constitution, comme les autres soins (doc 08).
- **Icônes** : à venir (Idan) ; en attendant, le picto de poche de ceinture. Dépôt : `assets-src/Potions/<code>.jpg`.

### Bâtons (Idan, 2026-10-29)

Tenus dans le set d’armes actif, en main principale ou secondaire, les bâtons servent la magie : le **Bâton long** donne **+5 %** de la Puissance magique de base, le **Bâton court** **+10 %** de la Réserve de mana de base. Le tier et la qualité ne changent rien ; rangé dans l’autre set, le bâton ne donne rien. Le combat et la magie (effet des sorts, mana maximum) lisent la valeur bonifiée ; la fiche (onglet Magie) et la carte d’objet la montrent. Données : `weapons.json`, colonnes `bonus_caracteristique` et `bonus_pourcentage`.

### Traits des armes (Idan, 2026-10-29)

Idan : chaque arme doit avoir sa raison d'être, « un choix de construction ». Un trait par arme, en données (`weapons.json`), affiché sur la carte d'objet ; il compte tant que l'arme est tenue dans le set actif. Le tier et la qualité ne le changent pas.

| Arme | Trait |
|---|---|
| Bâton long | **+5 %** de Puissance magique |
| Bâton court | **+10 %** de Réserve de mana |
| Saï | **pare 5 %** des coups tranchants de mêlée, **10 %** avec deux saïs (doc 04, « Parade du saï ») |
| Fouet | **+10 % de Charisme** ; **allonge 2** ; **+10 % du Courage** de base des autres alliés à **3 cases** ou moins (en plus de l'aura du capitaine ou du lieutenant ; plusieurs fouets ne se cumulent pas) |
| Fléau d'armes | le bouclier adverse bloque **deux fois moins** souvent (−50 % de sa chance de blocage) |
| Trident | **+20 %** en magie de l'**Eau** |
| Marteau de guerre | **+10 %** en magie de la **Foudre** |
| Grande épée | **+10 %** en magie du **Feu** (la « flamberge ») |
| Nunchaku | en attaquant avec lui, **+10 % de sa Télékinésie** en Dextérité (Toucher et enchaînements ; la fiche le montre) |
| Sarbacane | une fléchette qui **blesse** (elle passe par l'armure, comme une flèche) **empoisonne** la cible : le poison du doc 12, 3 tours, 10 PV par tour (× la qualité), jet de résistance à chaque activation ; Idan : « peut-être un bonus plus tard » |

Colonnes : `bonus_caracteristique` et `bonus_pourcentage` (une caractéristique ou une école de magie), `parade_type` et `parade_chance`, `aura_caracteristique`, `aura_pourcentage` et `aura_portee`, `malus_blocage_pourcentage`, `empoisonne`, `attaque_caracteristique`, `attaque_source` et `attaque_part` ; l'allonge du fouet est sa `portee_max_hex`.

### Échanges d’équipement : Donner, Retirer, Troquer (Idan, 2026-10-24)

Depuis l’onglet Équipement de la fiche ou l’Intendance, le capitaine peut **Donner** un objet du stock (emplacement vide), **Retirer** un objet au mercenaire (il part au stock) ou **Troquer** (les deux à la fois). Le mercenaire répond dans une boîte de dialogue, positivement ou négativement. Après un refus (Idan, 2026-11-04 : « vas-y pour les équipements ») : **Intimider**, **Convaincre** ou **Laisser tomber** — une seule relance, sur le même échange (doc 11 §7, « Relance après un refus ») ; l’affinité de l’échange, déjà comptée, est revue : une perte × 2 (intimidé) ou × 0,5 (convaincu), accord ou refus ; un gain accordé, rien s’il a été intimidé. Exemple : lui reprendre un sabre (−6) ; refus, intimidation, refus : −12 ; refus, conviction, il le rend : −3. Plus tard peut-être : défier en combat singulier.

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

**Inventaire et réaménagement libre** (Idan, 2026-10-30) :
- chaque mercenaire a un **inventaire** : les objets qu’il possède sans les porter, gardés au dortoir, **sans limite** ;
- **Donner** met l’objet dans son inventaire (même jet, même affinité qu’avant ; plus besoin d’emplacement vide). Depuis la fiche, Donner sur un emplacement reste possible (l’objet est donné puis équipé) ; à l’Intendance, « Donner à… » propose l’inventaire en premier ;
- entre ses propres objets — emplacements portés, **set 1, set 2**, inventaire — tout est **libre** : ni jet, ni affinité, ni limite par jour (ranger dans l’inventaire, prendre dans l’inventaire, passer une arme d’un set à l’autre, bouton ⇄ pour échanger les deux sets). L’objet qui occupait la place prend celle qui se libère s’il y va, sinon il part dans l’inventaire ; une arme à deux mains en arme principale libère la main secondaire ;
- **Retirer** peut aussi reprendre un objet de l’inventaire (même jet) ; les fioles restent dans les poches de ceinture ;
- possible au camp, mission programmée comprise ; pas pendant une mission ;
- s’il **meurt en mission**, son inventaire retourne à l’Intendance ; ce qu’il portait reste avec lui (butin d’une victoire, perdu sur une défaite).

Code : `inventoryOf`, `rearrange`, `placeOptions`, `swapSets` (`game-core/equipment-deals.js`) ; retour au stock : `applyMissionAftermath` (`game-core/campaign.js`) ; interface : `prototype-web/deal-ui.js`, case Inventaire de l’onglet Équipement.

**Interface** (`prototype-web/deal-ui.js`) : dans l’onglet Équipement de la fiche d’un membre de la compagnie, un clic sur une case ouvre un menu — **Retirer** (case remplie), **Troquer contre** ou **Donner** (objets de l’Intendance qui vont dans cet emplacement, un exemplaire par objet et par tier, du meilleur tier au moins bon). À l’Intendance, un clic sur une ligne du stock propose **Donner à…** : chaque membre qui peut porter l’objet, emplacement par emplacement, avec ce qu’il remplacerait. Le mercenaire répond dans une boîte de dialogue : la proposition du capitaine, sa réplique (selon l’action, l’accord ou le refus et son humeur : content si l’objet reçu lui semble valoir plus que l’objet cédé), puis ce qui change ; après un refus, la relance (`prototype-web/persuasion-ui.js`), sinon **Partir**. Le capitaine s’équipe sans dialogue. Textes : `data/reference/equipment-dialogue.json` (4 variantes par cas, écrites par JC).

### Dégâts des sets d’armes (Idan, 2026-10-24)

L’onglet Équipement montre, pour le set 1 et le set 2, **quatre chiffres pour comparer les mercenaires** (Idan, 2026-10-30 : des scores, pas des chances, qui dépendraient de l’adversaire). Pour chaque arme qui frappe (l’arme principale, et la main secondaire au combat à deux armes) :

- **Précision** : la part de l’attaquant dans le Toucher — Dextérité effective + 0,2 × (maîtrises de catégorie et d’arme + Perception + Vitesse au combat). Elle fait face à l’Esquive de la cible.
- **Puissance** : la part de l’attaquant dans Blesser — Force (Perception au tir) + 0,2 × (maîtrises de catégorie et d’arme + Combat à deux mains si l’arme est réellement maniée à deux mains au corps à corps). Elle fait face à l’Endurance de la cible.
- **Dégâts** : du plus petit au plus grand coup, en PV, avec le type (« en perforant », « en tranchant ou perforant ») ; avant la Résistance physique de la cible. Formule des dégâts physiques du combat (`physicalDamage`) ; la charge n’est pas comptée.
- **Pénétration d’armure** : la puissance de l’arme par type, qui s’ajoute à la Puissance moins la **Protection** de l’armure de la cible.

Chaque libellé a une infobulle : à quoi il sert et son écart (Précision et Puissance : le plus bas et le plus haut de 3 000 recrues générées ; Pénétration : la plus faible et la plus forte des armes). Textes : `data/reference/character-sheet-copy.json` (`attack_usage`). Code : `attackPrecision` et `attackPower` (`game-core/combat-engine.js`, utilisés aussi par le Toucher et Blesser), `attacks` (`game-core/equipment-effects.js`).

Sur les armures, les valeurs par type s’appellent **Protection** (Idan, 2026-10-30), pour ne pas les confondre avec la Résistance physique du porteur, qui réduit les PV perdus.

La fiche du mercenaire affiche tous les slots autour d’une silhouette simplifiée. Les cases remplies utilisent une icône provisoire et exposent la fiche de l’item au survol ; aucun drag & drop n’est prévu.
