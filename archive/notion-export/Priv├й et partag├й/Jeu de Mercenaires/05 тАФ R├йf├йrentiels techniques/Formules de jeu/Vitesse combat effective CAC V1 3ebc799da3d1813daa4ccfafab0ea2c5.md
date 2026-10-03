# Vitesse combat effective CAC V1

Code: combat.melee.effective_speed
Domaine: Combat
Expression: effective_speed = max(1, base_speed - effective_armor_speed_penalty - sum(effective_speed_penalty_of_held_items))
Minimum: 1
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Équipement

## Principe

La Vitesse utilisée pendant le combat n'altère jamais la caractéristique sauvegardée.

$$
VitesseCombatEffective=\max(1,Vitesse-MalusVitesseArmureEffectif-\sum MalusObjetsTenusEffectifs)
$$

Le malus d'une arme vient de `Malus vitesse arme base`, corrigé par sa qualité, les maîtrises et éventuellement sa prise à deux mains.

Pour **deux armes**, les deux malus sont additionnés et cette même Vitesse combat effective est utilisée pour tous les jets de la séquence.

Un bouclier occupe également une main ; sa valeur de malus vitesse est stockée dans la même table afin d'être utilisable par les mécaniques de combat.