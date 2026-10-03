# 04 — Équipement

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3eac799da3d1816f9fbde097e65f5e65?pvs=204
> Dernière édition Notion : 2026-10-01T19:18:30.103Z

Référentiels d’équipement. La **qualité est commune à tous les items** ; les résistances, malus de mobilité et altération magique sont portés directement par chaque type d’armure.
**Base Notion :** [Qualités d'armure](https://app.notion.com/p/786aac3436ff470a8a92d8fdd0b152cb)
**Base Notion :** [Armures de base — CLEAN](https://app.notion.com/p/f4f4cb3ca59c4e9aa987205928976f58)

## Règles d'équipement actives
- La **qualité d'item** est commune : `Multiplicateur qualité` agit sur les valeurs positives ; `Multiplicateur malus` agit sur les handicaps, y compris désormais le malus vitesse d'arme.
- La prise et les bonus `1 main / 2 mains / Au choix` sont définis dans [Page Notion](https://app.notion.com/p/3ebc799da3d18153820fd1d9f3bcc82b).
- Le calcul du malus vitesse réel d'une arme est défini dans [Page Notion](https://app.notion.com/p/3ebc799da3d1811fab4fd320244be6f8).

> 
	La vue **Armes — équilibrage** est la table à modifier pour ajuster dégâts, puissance de blessure, prise, inertie, portée, bonus de charge et capacité de contre-charge sans toucher aux formules.


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
- Deux sets peuvent être préparés ; [Page Notion](https://app.notion.com/p/3ecc799da3d1817dbe21fd70f8711f59) : **changer de set = 1 Action rapide**.
- Épée + pistolet ou deux pistolets utilisent la logique générale du combat à deux armes : inerties cumulées et une attaque de base par arme utilisable.
- [Page Notion](https://app.notion.com/p/3ebc799da3d181f1aa6be53eb35e371e) : **recharger une arme à feu = 1 Action rapide** ; une arme déchargée devient indisponible sans empêcher l'autre arme du set de fonctionner.
## Boucliers
Le même jet de blocage est utilisé au **CAC et contre les projectiles physiques**, y compris lorsqu'une attaque bénéficie de Frappe dans le dos.
Les boucliers ne sont pas traités comme des armures. Ils ajoutent leur propre **malus de vitesse** et utilisent [Page Notion](https://app.notion.com/p/3ebc799da3d18126b594dcad23bb1b17) comme jet de sauvegarde après un Toucher réussi.
Ils possèdent aussi désormais le champ numérique **`Altération magique base`**, identique à celui des armures, afin que les boucliers métalliques puissent pénaliser ultérieurement les mécaniques de magie sans passer par le système d'armure.
La vue **Boucliers — équilibrage** expose `Bonus blocage base`, `Malus vitesse arme base` et `Altération magique base` ensemble.

[Slots d’équipement & Pierres magiques — chantier](https://app.notion.com/p/3ecc799da3d1818bb33ae8a5b3100288)
