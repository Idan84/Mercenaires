# Portée d'arme V1

Code: combat.weapon.range
Domaine: Combat
Expression: min_range = weapon.range_min_hex ?? 1; max_range = weapon.range_max_hex ?? 1; attack_allowed = distance_hex >= min_range && distance_hex <= max_range
Minimum: 1
Notes: Une arme de mêlée ordinaire sans valeur explicite vaut 1–1. Les armes d'hast configurées à 1–2 utilisent le pipeline CAC même à 2 hex. Les armes de tir utilisent le pipeline Distance.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Équipement

## Convention

Si `Portée min hex` / `Portée max hex` sont vides sur une arme de mêlée ordinaire, la portée implicite est **1–1**.

Les armes d'hast à portée **1–2** restent des attaques de **CAC** : elles n'utilisent pas le malus de distance du tir.

Une attaque est impossible si la cible est en dehors de l'intervalle de portée de l'arme.