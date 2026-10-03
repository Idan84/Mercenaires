# Dégâts PV physiques distance V1

Code: combat.ranged.physical_hp_damage
Domaine: Combat
Expression: effective_weapon_damage_roll = weapon_damage_roll  item_quality.multiplier; hp_loss = ceil(10  effective_weapon_damage_roll  (1 - (defender.physical_resistance/100)  ((d3+8)/10)))
Minimum: 0
Notes: Pas de facteur Force à distance. Les dés de dégâts de l'arme encodent l'énergie propre du projectile. La résistance physique conserve sa variation D3.
Statut: Validée
Type attaque: Distance
Version: V1
Étape: Dégâts

## Formule

$$
DegatsArmeEffectifs=JetDegatsArme\times MultiplicateurQualite
$$

$$
PVPerdus=\left\lceil 10\times DegatsArmeEffectifs\times\left(1-\frac{ResistancePhysique}{100}\times\frac{D3+8}{10}\right)\right\rceil
$$

La Force de l'attaquant n'intervient pas dans les dégâts physiques d'un tir.