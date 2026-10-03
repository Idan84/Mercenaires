> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Armes à feu — recharge et double pistolet V1

Code: combat.ranged.firearm_loaded_state
Domaine: Combat
Expression: firearm_shot requires loaded=true; after_shot loaded=false; one quick_action reloads one firearm; mixed_or_dual_wield_pair uses normal two_weapon logic; each currently usable weapon may attack once in the base pair; unloaded firearm is skipped while the other weapon remains usable
Notes: Pas de stock de munitions normales. Épée + pistolet et deux pistolets sont des cas ordinaires de combat à deux armes : inerties cumulées, une attaque de base par arme utilisable. Une arme à feu déchargée ne bloque pas l'autre arme.
Statut: Validée
Type attaque: Distance
Version: V1
Étape: Équipement

## État chargé

Une arme à feu doit être **chargée** pour tirer. Après son tir, elle devient déchargée.

Une **Action rapide recharge une arme à feu**. La V1 considère la recharge arme par arme.

## Combat mixte et deux armes

**Épée + pistolet**, **deux pistolets** et les autres combinaisons compatibles suivent la logique générale du combat à deux armes :

- les malus / inerties des deux objets tenus se cumulent ;
- la paire de base peut utiliser **chaque arme actuellement utilisable une fois** ;
- deux pistolets chargés peuvent donc tirer une fois chacun ;
- une arme à feu déchargée est simplement indisponible jusqu'à sa recharge : elle ne bloque pas l'autre arme du set.

Il n'existe pas de stock de munitions ordinaires. Seules les munitions spéciales sont suivies comme objets ou effets.