# Mouvement de fuite immédiat V1

Code: combat.morale.immediate_flee_movement
Domaine: Combat
Expression: on_fleeing_applied: flee_hex = remaining_movement_hex; move as far as possible away from fear_source using available movement; if remaining_movement_hex==0: stay_in_place && state_fleeing=true
Minimum: 0
Notes: Définit uniquement le déplacement immédiat lors du passage En Fuite. Le comportement persistant complet de l'état aux activations suivantes reste à définir.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Autre

Lorsqu'un personnage échoue à un test de Courage et passe **En Fuite**, il dépense immédiatement tout le mouvement qui lui reste pour s'éloigner autant que possible de l'adversaire ayant déclenché le test.

S'il ne lui reste aucun mouvement, il ne bouge pas mais conserve l'état **En Fuite**.

Le comportement complet de cet état lors des activations suivantes reste volontairement à définir.