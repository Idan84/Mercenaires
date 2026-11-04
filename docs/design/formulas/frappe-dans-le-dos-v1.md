> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Frappe dans le dos V1

Code: combat.position.backstab
Domaine: Combat
Expression: backstab = is_opportunity_attack || target_encircled || defender_is_fleeing || attack_not_detected; if backstab: defender_perception_for_hit=0; defender_damage_type_resistance_for_wound*=0.5; defender_physical_resistance_for_hp_damage unchanged
Notes: S'applique notamment à toute attaque d'opportunité, à l'encerclement, à une cible qui fuit et aux attaques non détectées. Pas de blocage au bouclier dans le dos (Idan, 2026-11-04).
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Toucher

## Déclencheurs

Une attaque bénéficie de **Frappe dans le dos** si au moins une condition est vraie :

- il s'agit d'une **attaque d'opportunité** ;
- la cible est **encerclée** ;
- la cible est **En Fuite**, quel que soit l'attaquant (décision Idan du 2026-10-03, PR #7) ;
- l'attaque n'a **pas été détectée** avant son déclenchement (camouflage, invisibilité, compétence, magie, embuscade, etc.).

## Effet sur Toucher

La Perception défensive est annulée :

$$
PerceptionDefensive=0
$$

## Effet sur Blesser

La résistance de la cible au **type de dégâts concerné** est divisée par deux avant le calcul du matchup de Blesser :

$$
ResistanceTypeEffective=0.5\times ResistanceType
$$

La **Résistance physique %** qui réduit ensuite les PV perdus n'est pas divisée par deux.

## Bouclier

Pas de blocage au bouclier contre une Frappe dans le dos, ni contre une attaque non détectée (Idan, 2026-11-04 : « 3 + limiter à un blocage par tour »).