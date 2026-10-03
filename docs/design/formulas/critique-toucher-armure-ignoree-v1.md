> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Critique toucher — armure ignorée V1

Code: combat.melee.critical_armor_bypass
Domaine: Combat
Expression: if hit_critical_success: armor_resistance_effective[type] = 0 for wound resolution only; matchup[type] = weapon_wound_power[type]
Notes: Effet du critique positif obtenu après un toucher réussi. L'armure est ignorée uniquement pour l'étape Blesser. Endurance et Résistance physique restent actives ; les dégâts PV suivent ensuite leur formule normale.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Critique

## Principe

Un critique positif au **Toucher** représente un coup qui trouve une ouverture, un défaut ou une zone non protégée.

## Effet

Pour **cette attaque uniquement**, lors du calcul de Blesser :

$$
ResistanceArmureEffective[type]=0
$$

Donc :

$$
matchup[type]=PuissanceBlessureArme[type]
$$

Pour une arme multi-type, le choix du type se fait ensuite avec les matchups recalculés sans armure.

<aside>
🛡️

L'armure est ignorée uniquement à l'étape **Blesser**. **Endurance** reste dans le jet de blessure et **Résistance physique** reste active dans le calcul des PV perdus.

</aside>