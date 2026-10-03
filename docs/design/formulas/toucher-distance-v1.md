> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Toucher distance V1

Code: combat.ranged.hit_probability
Domaine: Combat
Expression: free_range=ceil(weapon.range_max_hexhttp://combat.ranged.free_range_fraction); distance_penalty=(distance_hex<=free_range)?0:combat.ranged.max_distance_delta_penalty(distance_hex-free_range)/(weapon.range_max_hex-free_range); delta=attacker.effective_dexterity+0.2(attacker.weapon_category_mastery+attacker.weapon_mastery+attacker.perception+attacker.effective_speed)-defender.effective_dodge-0.2(defender.perception+defender.effective_speed)-distance_penalty; p_base=10+80/(1+exp(-delta/20)); p_hit=p_base*cover_multiplier
Maximum: 90
Minimum: 2,5
Notes: Nécessite une ligne de vue et une distance dans la portée légale. Aucun malus jusqu'au quart de la portée max. Couverture : 1 / 0,5 / 0,25. Le multiplicateur de couverture est appliqué après la fonction logistique et peut donc descendre sous le plancher 10 %.
Statut: Validée
Type attaque: Distance
Version: V1
Étape: Toucher

## Distance

$$
PorteeSansMalus=\left\lceil\frac{PorteeMax}{4}\right\rceil
$$

Si `Distance ≤ PorteeSansMalus`, `MalusDistance = 0`. Sinon :

$$
MalusDistance=40\times\frac{Distance-PorteeSansMalus}{PorteeMax-PorteeSansMalus}
$$

## Toucher

Le noyau de Toucher reste celui du CAC, auquel on soustrait `MalusDistance` avant la fonction logistique.

La couverture est appliquée **après** le calcul de la probabilité :

- aucune : `×1` ;
- partielle : `×0,5` ;
- forte / quasi totale : `×0,25`.

Une absence réelle de ligne de vue rend le tir impossible ; `×0,25` représente une cible presque entièrement cachée, pas un tir à travers un mur.