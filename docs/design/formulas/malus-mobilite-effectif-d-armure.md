> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Malus mobilité effectif d'armure

Code: equipment.armor.effective_mobility_penalty
Domaine: Combat
Expression: effective_dodge_penalty = base_dodge_penalty  item_quality.penalty_multiplier; effective_speed_penalty = base_speed_penalty  item_quality.penalty_multiplier
Notes: Qualité d’item : Usée ×1,2 ; Correcte ×1 ; Grand Luxe ×0,8 sur les malus. Ces valeurs servent à calculer Esquive/Vitesse effectives sans modifier les caractéristiques sauvegardées.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Équipement