> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Résistance effective d'armure

Code: equipment.armor.effective_resistance
Domaine: Combat
Expression: if (base_resistance[type] >= 0) effective_resistance[type] = base_resistance[type] * item_quality.multiplier + enchantment_resistance_bonus[type]; else effective_resistance[type] = base_resistance[type] / item_quality.multiplier + enchantment_resistance_bonus[type]
Notes: Aucun plafond supérieur. Une résistance négative représente une vulnérabilité. La qualité d’item doit toujours améliorer l’armure : pour une résistance positive, elle multiplie la valeur ; pour une résistance négative, elle divise la vulnérabilité par le multiplicateur qualité. En V1, enchantment_resistance_bonus = 0.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Équipement