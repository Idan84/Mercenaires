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

- Casque / Chapeau ; Amulette ; Armure ; Bottes ; Ceinturon ; Cape ;
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

La fiche du mercenaire affiche tous les slots autour d’une silhouette simplifiée. Les cases remplies utilisent une icône provisoire et exposent la fiche de l’item au survol ; aucun drag & drop n’est prévu.
