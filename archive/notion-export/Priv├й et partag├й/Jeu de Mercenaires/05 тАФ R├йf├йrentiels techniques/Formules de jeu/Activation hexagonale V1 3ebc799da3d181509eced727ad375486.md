# Activation hexagonale V1

Code: combat.turn.activation
Domaine: Combat
Expression: activation = movement_action + quick_action + attack_action; order=free; movement may be split; attack_action may be replaced by a second movement_action
Notes: Grille hexagonale. V1 : 1 personnage = 1 hex. L'ordre Mouvement / Action rapide / Attaque est libre. Le quota de la première action Mouvement peut être fractionné avant et après les autres actions.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Autre

## Structure d'une activation

Une activation fournit **une action de Mouvement + une Action rapide + une Attaque**.

- L'ordre est libre.
- Le mouvement peut être fractionné avant et après les autres actions tant que le total ne dépasse pas son quota.
- L'Attaque peut être sacrifiée pour obtenir une **seconde action de Mouvement**.
- La grille est **hexagonale** ; en V1 un personnage standard occupe **1 hexagone**.

Les créatures multi-hex sont réservées à une extension ultérieure.