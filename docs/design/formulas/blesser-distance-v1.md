> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Blesser distance V1

Code: combat.ranged.wound_probability
Domaine: Combat
Expression: delta_wound = attacker.perception + 0.2*(attacker.weapon_category_mastery + attacker.weapon_mastery) + selected_damage_matchup - defender.endurance; p_wound = 10 + 80/(1 + exp(-delta_wound/20))
Maximum: 90
Minimum: 10
Notes: À distance, la Force de l'attaquant n'intervient pas. Perception représente le placement du projectile ; la puissance intrinsèque reste portée par l'arme et le matchup dégâts/armure.
Statut: Validée
Type attaque: Distance
Version: V1
Étape: Blesser

## Formule

$$
DeltaBlesserDistance=Perception+0.2\times(MaitriseCategorie+MaitriseArme)+MatchupDegats-Endurance_{def}
$$

$$
P_{blesser}=10+\frac{80}{1+e^{-DeltaBlesserDistance/20}}
$$

`MatchupDegats` conserve la logique arme contre résistance d'armure du type physique sélectionné.

La **Force est exclue** du Blesser à distance.