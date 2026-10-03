# Charge CAC V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d181a7b49bdb3808c3ddce?pvs=204
> Dernière édition Notion : 2026-10-01T19:16:48.748Z

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
