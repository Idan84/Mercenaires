# Courage en sous-nombre V1

Code: combat.melee.courage_outnumbered
Domaine: Combat
Expression: enemy_surplus=max(0,local_enemy_count-local_ally_count_including_subject); penalty=10enemy_surplus; hold=min(95,max(5,courage+0.25will-0.25*opponent_intimidation-penalty)); when outnumbered, test immediately after each wound received; on fail apply fleeing and interrupt remaining sequence if target moved
Maximum: 95
Minimum: 5
Notes: Mêlée locale = groupe connecté de combattants liés par leurs zones de menace CAC. Le coefficient -10 par ennemi de surplus est la valeur V1 retenue à surveiller en playtest.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Autre

## Sous-nombre local

`N_ennemis` et `N_allies` sont comptés dans la **mêlée locale** ; le personnage testé est inclus dans `N_allies`.

$$
SurplusEnnemis=max(0,N_{ennemis}-N_{allies})
$$

$$
MalusSurnombre=10\times SurplusEnnemis
$$

## Courage

$$
Score=Courage+0.25\times Volonte-0.25\times IntimidationAdverse-MalusSurnombre
$$

$$
P_{tenir}=min(95,max(5,Score))
$$

## Fréquence

Un personnage en sous-nombre teste **après chaque blessure réellement reçue**, et non seulement en fin de séquence. Un échec applique immédiatement En Fuite ; si le déplacement change la position de la cible, la séquence offensive en cours est interrompue.