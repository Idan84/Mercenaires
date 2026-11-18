# 04 — Équipement

La **qualité est commune à tous les items** ; résistances, malus de mobilité et altération magique sont portés par
chaque type d’armure. Données : `data/reference/item-qualities.json`, `base-armors.json`, `weapons.json`.

## Règles d'équipement actives

- **Qualité** : `Multiplicateur qualité` sur les valeurs positives ; `Multiplicateur malus` sur les handicaps, malus
  vitesse d’arme compris.
- Prise et bonus `1 main / 2 mains / Au choix` : [Prise d'arme et mode deux mains V1](/design/#doc=formulas/prise-d-arme-et-mode-deux-mains-v1.md) ;
  malus vitesse réel : [Malus vitesse arme effectif V1](/design/#doc=formulas/malus-vitesse-arme-effectif-v1.md).
- **La fronde se tient à deux mains** (Idan, 2026-10-25) : une main la fait tourner, l’autre recharge ; ni bouclier ni
  arme en main secondaire.

## Portée, tir et charge

- Mêlée sans portée explicite : **1–1** ; armes d’hast : **1–2**, et elles peuvent contre-charger.
- Cadence `Répétable` (arc, arbalète, fronde, sarbacane) ou `Tir unique` (armes à feu).
- Le **Tromblon** est une attaque de zone ; sa géométrie viendra avec les attaques de zone.
- `Bonus charge base` : **1**, ou **2** pour les armes d’hast et les armes `2 mains`.

## Sets d'armes & armes à feu

- Deux sets ; **changer de set = 1 Action rapide** ([Permutation de set d'armes V1](/design/#doc=formulas/permutation-de-set-d-armes-v1.md)).
- Épée + pistolet ou deux pistolets : combat à deux armes (inerties cumulées, une attaque de base par arme utilisable).
- **Recharger une arme à feu = 1 Action rapide** ; déchargée, elle est indisponible sans gêner l’autre arme du set
  ([Armes à feu — recharge et double pistolet V1](/design/#doc=formulas/armes-a-feu-recharge-et-double-pistolet-v1.md)).

## Boucliers

- Même jet de blocage au **CAC et contre les projectiles physiques**, Frappe dans le dos comprise : un jet de sauvegarde
  après un Toucher réussi ([Blocage bouclier physique V1](/design/#doc=formulas/blocage-bouclier-physique-v1.md)).
- Pas des armures ; leur propre **malus de vitesse**.
- **Altération magique** (Idan, 2026-11-09) : Rondache **10**, Écu **15**, Pavois **20**, × le malus de la qualité,
  seulement pour le bouclier du set actif ; elle se retire de la réussite des sorts avec celle de l’armure et du casque
  (doc 12, « Magie en armure »).

## Équipement de départ — V1 active

Un mercenaire généré reçoit du **matériel personnel persistant** : chaque objet a un seul propriétaire, lui. Le joueur
ne le déplace pas librement : voir « Échanges d’équipement ».

### Slots canoniques

- Casque / Chapeau ; Amulette ; Armure ; Gants ; Ceinturon ; Culotte ; Bottes ; Cape ;
- **6 bagues** ;
- **2 sets d’armes** (arme principale + main secondaire) ;
- **4 équipements de ceinture** (potions, consommables, petits objets actifs) ;
- **1 Monture / Animal de combat**.

À la création, seuls l’**armure**, le **set d’armes 1** (arme principale, parfois la main secondaire) et éventuellement le
**set d’armes 2** sont remplis. Les autres slots restent vides.

### Profil temporaire d’équipement

Trois scores non persistants orientent le matériel initial :

- `CAC = 0,6 × (meilleure arme CAC / 2) + 0,4 × moyenne(Force, Dextérité, Endurance, Courage)` ;
- `Distance = 0,6 × (meilleure arme Distance / 2) + 0,4 × moyenne(Dextérité, Perception, Vitesse)` ;
- `Magie = 0,6 × meilleure école + 0,4 × moyenne(Intelligence, Puissance magique, Réserve de mana)` (école déjà à
  l’échelle d’une arme, doc 02).

Meilleure arme : `Maîtrise catégorie + Maîtrise arme précise`. Un profil Magie reçoit pour l’instant sa meilleure arme
réelle.

### Arme secondaire

**50 % de chance**, dans le set 2 : la meilleure arme Distance si la principale est CAC, et inversement. Seulement une
arme **pratiquée** (au-dessus de 1).

### Main secondaire (Idan, 2026-11-04)

Seulement avec une arme principale de **corps à corps à une main** (« 1 main » ou « Au choix ») :

- **Boucliers ≥ 50** : le bouclier qu’il maîtrise le mieux (Écu, Rondache ou Pavois ; même score que les armes) ;
- **Combat à deux armes ≥ 50** : sa meilleure **arme légère** pratiquée (au-dessus de 1), sinon la **Dague**. Arme
  légère : malus de vitesse de base ≤ 8 (Dague, Sai, Fouet, Bâton court, Kukri, Épée courte, Nunchaku, Estoc,
  Hachette) ;
- les deux : la meilleure des deux compétences décide (à égalité, le bouclier) ;
- même table de tier, tirée en dernier (après la fiole) ; capitaine compris.

### Armure

Une armure au hasard dans la catégorie la plus lourde qu’il sait porter : **Lourde → Intermédiaire → Légère →
Vêtement** (catégorie propre, sans aptitude). **Sans le port, pas d’armure** (doc 03, « Sans le port, pas d’armure »).

### Tier / qualité

Chaque objet tire son tier **indépendamment**, selon la réputation personnelle du mercenaire (interpolation linéaire) :

| Réputation | T1 | T2 | T3 |
|---:|---:|---:|---:|
| 0 | 90 % | 9 % | 1 % |
| 100 | 82 % | 16 % | 2 % |
| 200 | 65 % | 30 % | 5 % |
| 300 | 45 % | 40 % | 15 % |
| 400+ | 25 % | 45 % | 30 % |

Une qualité par tier (Idan, 2026-11-01) : **T1 Usée**, **T2 Correcte**, **T3 De bonne facture**, **T4 De luxe** (valeurs
bénéfiques +40 %, malus −40 %, prix × 2,5). T5, T6 et les cristaux sur les armes viendront.

**Le joueur ne voit jamais le tier** (Idan, 2026-10-30) : un **cadre de couleur** dit la qualité, et un **nom public**
subtil, drôle et décalé dit le niveau (« Pétoire rafistolée » pour une arquebuse T1 ; `item-titles.json`), avec le nom de
base en petit quand il diffère.

**Piste (rien de décidé)** : des tiers jusqu’au **T6** au moins, et des **cristaux** qui ajoutent des caractéristiques à
tous les objets, proche des matérias de Final Fantasy VII.

### Valeur d’un objet (Idan, 2026-10-24)

**Valeur cachée en PO = prix de base × tier × qualité**, arrondie ; elle sert aux marchands (prix : doc 18).

- **Prix de base** (T1, Correcte ; colonne `prix_base`) :
  - armes : 40 + 10 × dégât maximal, × 1,5 pour les armes à feu, arrondi à 5 (Dague 80, Épée longue 120, Épée à deux
    mains 200, Pistolet 180, Arquebuse 240) ;
  - armures : Vêtements 20, Gambison 60, Armure de cuir 90, Cuir renforcé 160, Brigandine 220, Cotte de mailles 260,
    Armure d’écailles 380, Armure de plates 600 ;
  - bottes, ceintures, capes, gants, culottes, casques et chapeaux 100 ; amulettes et bagues 150.
- **Tier** : T1 × 1, T2 × 3, T3 × 8, T4 × 25.
- **Qualité** : Usée × 0,6, Correcte × 1, De bonne facture × 1,5, De luxe × 2,5.

Épée longue : T1 Usée 72 PO, T2 Correcte 360, T3 De bonne facture 1 440, T4 De luxe 7 500. Sans prix de base, pas de
valeur.

### Carte d’objet (Idan, 2026-10-24)

Au survol, une carte de jeu : l’image dans le cadre du tier, un **titre selon le tier** (Vieille lance / Lance basique /
Lance de guerrier / Lance luxueuse) et les **effets réels**, qualité comprise, tels que le combat les applique.

### Caractéristiques équipées (Idan, 2026-10-24)

L’onglet Caractéristiques montre les valeurs **au combat**, équipement compris (set 1 en main) : rouge si elles baissent,
vert si elles montent, détail au survol (Vitesse : handicap de l’armure et poids des objets tenus ; Esquive : handicap de
l’armure ; Initiative ; Dextérité : combat à deux armes). Les résistances du personnage ne changent pas : celles de
l’armure s’opposent à la puissance des armes, à Blesser. La Taverne compare sans équipement. Trois colonnes (Idan,
2026-10-31) :
**Attaque**, **Défense** ; **Vitesse**, **Magie**, **Moral et commandement** ; **Protection de l’armure** (tranchant,
perforant, contondant) et **Résistances** (feu, froid, foudre, poison).

### Bottes (Idan, 2026-10-24)

Règle des **accessoires à bonus**, ici et plus bas : trois types par emplacement ; **+5 / 10 / 15 / 20 %** (T1 à T4) de
la **caractéristique de base** ; la qualité ne change pas le bonus ; au combat, la valeur bonifiée remplace la base ; la
fiche la montre en vert, avec la ligne de l’objet ; **5 %** de chance d’en avoir un à la création (type au hasard, tier
selon la réputation) ; **1D6** au stock de départ (doc 11 §16).

Bottes (`boots.json`) : **de vitesse**, **d’esquive**, **de perception**. Vitesse au combat = Vitesse × (1 + bonus) −
handicaps (Initiative et déplacement en profitent) ; Esquive au combat = Esquive × (1 + bonus) − handicap de l’armure ;
Perception : Toucher, Perception défensive, Blesser à distance.

### Ceintures (Idan, 2026-10-24)

Emplacement **Ceinturon** (pas les poches ; `belts.json`) : **de mana** (Réserve de mana), **d’endurance**, **de
courage**. Endurance : déplacement, défense à Blesser, et en fin de mission blessure et convalescence ; Courage :
Initiative, tests de Courage ; Réserve de mana : magie.

### Amulettes (Idan, 2026-10-24)

**De puissance magique**, **de volonté**, **de chance** (`amulets.json`). Volonté : déplacement, Initiative, tests de
Courage, et en fin de mission le risque de mort ; Chance : probabilité de critique et test qui confirme un échec
critique.

### Capes (Idan, 2026-10-24)

(`capes.json`) **D’esquive** (Toucher) et **de discrétion** (camouflage, doc 04 « Discrétion et camouflage ») en
pourcentage ; **de résistance physique** : **+5 / 10 / 15 / 20 points** (médiane 5, trop petite pour un pourcentage ;
chaque point retire environ 1 % des dégâts physiques reçus, dans la limite de 50 ; elle compte aussi pour le contrecoup
d’un échec critique de blessure).

### Gants (Idan, 2026-10-24)

(`gloves.json`) **De pièges** (Pièges, sans règle de jeu pour l’instant), **de dextérité** (Toucher, blocage au
bouclier ; le combat à deux armes la divise ensuite), **de force** (dégâts et Blesser au corps à corps). L’XP de Force
(charge portée) se calcule sans les gants.

### Culottes (Idan, 2026-10-24)

(`pants.json`) **String du Charisme** et **Culotte d’Intimidation** en pourcentage ; **Slip d’Affinité** : **+5 / 10 /
15 / 20 points** d’affinité avec le capitaine.

- L’Intimidation bonifiée de l’adversaire pèse sur les tests de Courage et les reprises de contrôle (−0,25 ×
  Intimidation). Le Charisme du capitaine, String compris, compte dans son aura (25 %, doc 13).
- Les points du Slip porté s’ajoutent au score total d’affinité (borné à ±100) : cœurs, négociation à la Taverne, échanges
  d’équipement. Retirer le Slip retire ses points ; l’affinité acquise ne change pas. Sur la fiche, pas de score : « Avec
  son Slip d’Affinité ».

### Bagues (Idan, 2026-10-24)

Onze bagues (`rings.json`), **six emplacements** ; **des bagues identiques se cumulent**. À la création, la bague va dans
le premier emplacement.

- **De la chance** (critiques et échecs critiques) et **du courage** (tests de Courage, reprises de contrôle) : en
  pourcentage.
- **Une par école de magie** : Bague de Feu, de l’Eau, de la Foudre, de l’invocation, de la transmutation, du
  nécromancien (Nécromancie), du soigneur (Vie), de l’illusionniste (Illusion), de la télékinésie :
  **+10 / 15 / 20 / 25 %** de la maîtrise de base de l’école, **−15 / 10 / 5 / 0 %** de celle des **deux écoles opposées**
  (doc 12) ; l’onglet Magie les montre en vert ou en rouge.

### Casques et chapeaux (Idan, 2026-10-25)

Emplacement **Casque / Chapeau** (`helmets.json`) ; ils tombent aussi du coffre d’un camp.

- **Casque de constitution** : Constitution en pourcentage ; en contrepartie **−20 / 15 / 10 / 5 %** de Puissance magique
  et **−4 / 3 / 2 / 1 de Vitesse** (son poids, avec l’armure et les armes tenues), sans effet de la qualité. Il gêne les
  sorts : **5 d’Altération magique** × la qualité du tier (Idan, 2026-11-09 : T1 × 1,2, T2 × 1, T3 × 0,8, T4 × 0,6 ;
  doc 12). Les chapeaux ne gênent pas.
- **Chapeau d’intelligence** (Initiative, choix du type de dégâts) ; **Chapeau du dresseur** (compétence Compagnon
  animal, en pourcentage).
- La Vitesse compte pour le déplacement et l’Initiative.
- La Constitution compte dans les **PV max**, qui suivent Constitution, Endurance et Volonté équipées
  (`formulas/pv-maximum-v1.md`).

### Potions et fioles (Idan, 2026-10-29)

Trois consommables (`potions.json`) dans les **4 emplacements de ceinture**, sans tier ni qualité pour l’instant :

- **Potion de soins** : **20 %** des PV max (arrondi au supérieur, sans dépasser le maximum) ; rien pour un flétri.
- **Potion de mana** : **20 %** du mana max.
- **Fiole de poison** : l’**arme active** est enduite **3 tours** ; chaque coup qui **blesse**, mêlée ou tir, empoisonne
  (poison du doc 12 : **10 PV par tour**, 3 tours, jet de résistance à chaque activation). **Seulement une arme
  tranchante ou perforante, jamais une arme à feu** (Idan, 2026-11-12) : ni bâtons, fléau, fronde, marteau, masse,
  massue, nunchaku, boucliers ; le Pic de guerre s’empoisonne. **Il faut l’aptitude Empoisonnement des armes** (Idan,
  2026-11-03 ; Labo d’alchimie, doc 11 §7) : sinon la fiole reste à la ceinture et ne compte pas dans le profil. La
  sarbacane empoisonne d’elle-même.
- **Usage** : en combat, **action rapide**, **sur soi seulement** ; consommée. Les autres repartent avec le mercenaire.
- **Distribution libre** : elles se donnent et se reprennent sans jet, sans affinité, sans limite, sans historique
  (première poche libre).
- **Génération** : **1D6 de chaque sorte** au stock de départ (doc 11 §16) ; **5 %** de chance qu’une recrue en ait une
  (sorte au hasard). **Valeur** : 25 PO (soins, mana), 20 PO (poison).
- **IA et combat automatique** : soins sous 30 % des PV ; mana quand il ne suffit plus pour aucun sort connu ; poison au
  premier contact, juste avant de frapper. Pas de potions pour les ennemis pour l’instant.
- **XP** : les PV rendus comptent pour la Constitution (doc 08).

### Bâtons (Idan, 2026-10-29)

Tenus dans le set actif, en main principale ou secondaire : **Bâton long** +5 / 10 / 15 / 20 % (T1 à T4) de Puissance
magique, **Bâton court** autant de Réserve de mana ; deux bâtons se cumulent. La qualité ne change rien ; dans l’autre
set, rien. Le combat et la magie (effet des sorts, mana maximum) lisent la valeur bonifiée.

### Traits des armes (Idan, 2026-10-29)

Chaque arme a sa raison d’être, « un choix de construction » : un trait (`weapons.json`), sur la carte d’objet, actif tant
qu’elle est tenue dans le set actif. La qualité ne le change pas ; seuls les bonus de caractéristique et l’aura du fouet
varient avec le tier (Idan, 2026-11-05).

| Arme | Trait |
|---|---|
| Bâton long, Bâton court | voir « Bâtons » |
| Saï | **pare 5 %** des coups tranchants de mêlée, **10 %** avec deux saïs (doc 04, « Parade du saï ») |
| Fouet | **+5 / 10 / 15 / 20 % de Charisme** (T1 à T4) ; **allonge 2** ; **+5 / 10 / 15 / 20 % du Courage** de base des autres alliés à **3 cases** ou moins (en plus de l'aura du capitaine ou du lieutenant ; plusieurs fouets ne se cumulent pas : le plus fort compte) |
| Fléau d'armes | le bouclier adverse bloque **deux fois moins** souvent (−50 % de sa chance de blocage) |
| Trident | **+5 / 10 / 15 / 20 %** en magie de l'**Eau** (T1 à T4) |
| Marteau de guerre | **+3 / 6 / 9 / 12 %** en magie de la **Foudre** (T1 à T4) |
| Épée à deux mains | **+3 / 6 / 9 / 12 %** en magie du **Feu** (T1 à T4 ; la « flamberge ») |
| Nunchaku | en attaquant avec lui, **+10 % de sa Télékinésie** en Dextérité (Toucher et enchaînements) |
| Sarbacane | une fléchette qui **blesse** (elle passe par l'armure, comme une flèche) **empoisonne** la cible : le poison du doc 12, 3 tours, 10 PV par tour (× la qualité), jet de résistance à chaque activation |

### Échanges d’équipement : Donner, Retirer, Troquer (Idan, 2026-10-24)

Depuis la fiche ou l’Intendance, le capitaine peut **Donner** un objet du stock, **Retirer** un objet au mercenaire (il
part au stock) ou **Troquer** (les deux). Le mercenaire accepte ou refuse, dans une boîte de dialogue.

**Valeur perçue** (le tier seul pour l’instant, T1 = 1 … T4 = 4) :

- objet qu’il possède : tier × Int/100 + **3,5** × (1 − Int/100) — plus il est bête, plus il tient à ce qu’il a ;
- objet proposé : tier × Int/100 + **2,5** × (1 − Int/100) — plus il est bête, moins il voit la différence.

**Jet** : Δ = **20** × (valeur reçue − valeur cédée) + **0,5** × Affinité ; chance d’accord = 10 + 80 / (1 + e^(−Δ/20))
(10 à 90 %, cachée) ; D100, accord si le jet ne la dépasse pas.

| Situation (affinité 0) | Int 80 | Int 20 |
|---|---|---|
| Donner un T2 | 81 % | 83 % |
| Troquer son T1 contre un T3 | 74 % | 42 % |
| Troquer son T4 contre un T1 | 16 % | 26 % |
| Retirer son T3 | 13 % | 13 % |

**Affinité** : accord ou refus, l’affinité acquise change de **2 × (valeur reçue − valeur cédée)**, arrondi (Donner un
T2 : +4 ou +5 ; Retirer son T3 : −6 ou −7). Reprendre ce qu’on vient de donner coûte plus qu’on n’a gagné.

**Après un refus** (Idan, 2026-11-04) : **Intimider**, **Convaincre** ou **Laisser tomber**, une seule relance (doc 11
§7). L’affinité de l’échange est revue : une perte × 2 (intimidé) ou × 0,5 (convaincu) ; un gain accordé, rien s’il a été
intimidé. Exemple : lui reprendre un sabre (−6) ; refus, intimidation, refus : −12 ; refus, conviction, il le rend : −3.
Plus tard peut-être : défier en combat singulier.

**Règles** : pas de limite par jour (Idan, 2026-11-04) ; le capitaine s’équipe librement, sans jet ni dialogue ; un objet
donné appartient au mercenaire, un objet retiré retourne au stock sans propriétaire ; les armes se placent selon leur
prise (une arme à deux mains libère la main secondaire, un bouclier va en main secondaire).

**Inventaire** (Idan, 2026-10-30) :

- chaque mercenaire a un **inventaire sans limite**, au dortoir : ce qu’il possède sans le porter. **Donner** l’y met
  (même jet) ; depuis la fiche, on peut donner directement sur un emplacement ;
- entre ses propres objets (emplacements, **set 1, set 2**, inventaire), tout est **libre** : ni jet, ni affinité (bouton
  ⇄ pour échanger les sets). L’objet déplacé prend la place libérée s’il y va, sinon l’inventaire ;
- **Retirer** peut reprendre un objet de l’inventaire (même jet) ; les fioles restent dans les poches de ceinture ;
- au camp, mission programmée comprise ; pas pendant une mission ;
- s’il **meurt en mission**, son inventaire retourne à l’Intendance ; ce qu’il portait reste avec lui (butin d’une
  victoire, perdu sur une défaite).

**Interface** : un clic sur une case de la fiche (**Retirer**, **Troquer contre**, **Donner**) ou sur une ligne du stock
de l’Intendance (**Donner à…**, avec ce que l’objet remplacerait). Le mercenaire répond selon l’action, l’accord ou le
refus et son humeur (`equipment-dialogue.json`).

### Dégâts des sets d’armes (Idan, 2026-10-24)

L’onglet Équipement montre, pour chaque set et chaque arme qui frappe, **quatre scores pour comparer les mercenaires**
(Idan, 2026-10-30 : des scores, pas des chances) :

- **Précision** (sa part du Toucher, face à l’Esquive) : Dextérité effective + 0,2 × (maîtrises de catégorie et d’arme +
  Perception + Vitesse au combat) ;
- **Puissance** (sa part de Blesser, face à l’Endurance) : Force (Perception au tir) + 0,2 × (maîtrises de catégorie et
  d’arme + Combat à deux mains si l’arme est maniée à deux mains au corps à corps) ;
- **Dégâts** : du plus petit au plus grand coup, en PV, avec le type ; avant la Résistance physique de la cible, sans la
  charge ;
- **Pénétration d’armure** : la puissance de l’arme par type, qui s’ajoute à la Puissance moins la **Protection** de
  l’armure de la cible.

Infobulles : usage et écart (extrêmes de 3 000 recrues ; pour la Pénétration, des armes). Sur les armures, les valeurs
par type s’appellent **Protection** (Idan, 2026-10-30), à ne pas confondre avec la Résistance physique du porteur.

La fiche affiche tous les slots autour d’une silhouette ; au survol, la fiche de l’objet. Pas de glisser-déposer.
