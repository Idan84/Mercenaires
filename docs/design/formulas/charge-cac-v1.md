> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

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

- trajectoire **en ligne droite**, dans **n'importe quelle direction** (Idan, 2026-11-04 : « La charge devrait être possible si dans la ligne droite entre le chargeur et le chargé, il n'y a aucun obstacle ou personnage, alors, on peut charger ») : la ligne droite d'hexagones entre le chargeur et la cible (`hexLine`), pas seulement les 6 axes ; aucune case de la ligne entre les deux ne doit contenir un personnage, une flaque de magma ou un bourbier (le brouillard ne gêne pas) ; la charge finit sur la dernière case, au contact de la cible ;
- distance minimale : `MouvementBase` ;
- distance maximale : `2 × MouvementBase` ;
- arrivée suivie d'une attaque si aucun événement ne l'annule.

À l'écran (Idan, 2026-11-14 : « j'arrive pas à charger » ; la règle reste) : le bouton **Charger** est grisé quand aucun
ennemi ne peut être chargé, et son infobulle rappelle la course demandée (`MouvementBase` à `2 × MouvementBase` cases en
ligne droite libre) ; en mode charge, le survol d'un ennemi qu'on ne peut pas charger dit pourquoi (trop près, trop loin,
un personnage ou un décor infranchissable sur la ligne, un bourbier, une falaise, une course qui monte de plus d'un niveau…).
Code : `missionChargeCheck` (`prototype-web/mission.js`).

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