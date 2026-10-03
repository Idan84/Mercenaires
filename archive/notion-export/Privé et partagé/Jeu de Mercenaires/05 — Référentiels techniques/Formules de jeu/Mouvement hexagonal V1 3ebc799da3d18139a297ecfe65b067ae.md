# Mouvement hexagonal V1

Code: combat.movement.base_hex
Domaine: Combat
Expression: mobility_score = effective_combat_speed + 0.25endurance + 0.10will; base_movement_hex = max(1, ceil(mobility_score/15))
Minimum: 1
Notes: MouvementBase est le quota d'une action de Mouvement. Double mouvement = 2 × MouvementBase. Vitesse combat effective inclut déjà armure + objets tenus.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Autre

## Formule

$$
ScoreMobilite=VitesseCombatEffective+0.25\times Endurance+0.10\times Volonte
$$

$$
MouvementBase=\max(1,\lceil ScoreMobilite/15\rceil)
$$

`MouvementBase` est exprimé en **hexagones par action de Mouvement**.

- Mouvement + Attaque : jusqu'à `MouvementBase`, fractionnable.
- Attaque sacrifiée : une seconde action de Mouvement permet jusqu'à `2 × MouvementBase` sur l'activation.
- Aucun plafond artificiel n'est appliqué en V1.