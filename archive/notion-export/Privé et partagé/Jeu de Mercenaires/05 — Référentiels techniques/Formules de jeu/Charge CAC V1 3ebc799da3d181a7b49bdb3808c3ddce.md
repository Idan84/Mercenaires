# Charge CAC V1

Code: combat.melee.charge
Domaine: Combat
Expression: valid_charge = straight_line && distance_hex>=base_movement_hex && distance_hex<=2base_movement_hex; if d100<=2: move_to_intended_end; apply_prone; cancel_attack; else charge_bonus_effective=weapon.charge_bonus_baseitem_quality.multiplier; charge_power=distance_hex*charge_bonus_effective; effective_strength=strength+charge_power; charge_damage_multiplier=1+charge_power/100
Minimum: 0
Notes: La charge combine déplacement + attaque. Bonus charge base V1 : 1 par défaut sur les armes, 2 pour les armes d'hast et les armes à 2 mains. Valeurs destinées à être affinées. Le terrain pourra modifier ultérieurement le risque de chute.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Autre

## Conditions

- trajectoire **en ligne droite** ;
- distance minimale : `MouvementBase` ;
- distance maximale : `2 × MouvementBase` ;
- arrivée suivie d'une attaque si aucun événement ne l'annule.

## Chute de charge

Avant résolution : `D100 ≤ 2` → chute.

Le chargeur atteint la case d'arrivée prévue, passe **Au Sol** et son attaque est annulée. Le terrain pourra augmenter ce risque ultérieurement.

## Puissance de charge

Chaque arme de la V1 possède désormais un `Bonus charge base` :

- **1** pour une arme ordinaire ;
- **2** pour une arme d'hast ou une arme dont la `Prise` est `2 mains`.

Ces valeurs constituent le premier équilibrage et seront affinées arme par arme plus tard.

$$
BonusChargeEffectif=BonusChargeBase\times MultiplicateurQualite
$$

$$
PuissanceCharge=DistanceHex\times BonusChargeEffectif
$$

Pour Blesser :

$$
ForceEffectiveCharge=Force+PuissanceCharge
$$

Pour les dégâts physiques :

$$
MultiplicateurDegatsCharge=1+\frac{PuissanceCharge}{100}
$$

L'effet dépend de la **distance absolue** afin que les futures montures très rapides puissent produire des charges extrêmes.