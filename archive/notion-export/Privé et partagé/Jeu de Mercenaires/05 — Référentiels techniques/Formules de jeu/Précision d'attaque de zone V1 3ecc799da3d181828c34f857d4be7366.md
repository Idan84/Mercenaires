# Précision d'attaque de zone V1

Code: combat.area.hit_falloff
Domaine: Combat
Expression: p_hit_target = max(0, p_hit_targeted_hex - 10*hex_distance_from_targeted_hex)
Minimum: 0
Notes: Chaque attaque de zone cible une case. Chaque cible potentielle subit -10 points de probabilité de toucher par hex d'écart à la case ciblée. Le rayon et la forme restent propres à l'arme ou au sort.
Statut: Validée
Type attaque: Zone
Version: V1
Étape: Toucher

## Principe

Une attaque de zone vise d'abord **une case**. Pour une cible située à une distance hexagonale `d` de cette case :

$$
P_{touche}(d)=max(0,P_{touche,centre}-10\times d)
$$

- `d=0` : aucun malus ;
- `d=1` : −10 points ;
- `d=2` : −20 points ; etc.

Le rayon et la forme de zone sont définis séparément par chaque attaque.