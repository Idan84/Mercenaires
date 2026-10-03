# Approximation projectile V1

Code: combat.ranged.stray_projectile
Domaine: Combat
Expression: on primary_miss: candidates=shooting_corridor ordered by distance_to_initial_target ASC, enemy_first_on_tie; for i>=1: p_accident_i=p_hit_candidate_i(0.35pow(0.5,i-1)); stop at first success
Minimum: 0
Notes: Alliés et ennemis sont éligibles. P_hit_candidate_i est recalculée normalement contre chaque candidat (distance, esquive, couverture). Géométrie exacte du couloir de tir à définir avec LOS/terrain. Ne s'applique pas aux attaques de zone.
Statut: Validée
Type attaque: Distance
Version: V1
Étape: Toucher

## Principe

Lorsqu'un tir rate sa cible principale, le moteur cherche les personnages présents dans le **couloir de tir**.

Ordre :

1. candidat le plus proche de la cible initiale ;
2. en cas d'égalité, priorité à un ennemi ;
3. puis candidats suivants avec un facteur décroissant.

Pour le candidat d'indice `i` :

$$
FacteurApprox_i=0.35\times0.5^{i-1}
$$

$$
P_{accident,i}=P_{touche,candidat}\times FacteurApprox_i
$$

Dès qu'un candidat est touché, le projectile s'arrête et ce personnage devient la cible réelle pour **critique → Blesser → dégâts → Courage éventuel**.