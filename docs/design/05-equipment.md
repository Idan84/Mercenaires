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