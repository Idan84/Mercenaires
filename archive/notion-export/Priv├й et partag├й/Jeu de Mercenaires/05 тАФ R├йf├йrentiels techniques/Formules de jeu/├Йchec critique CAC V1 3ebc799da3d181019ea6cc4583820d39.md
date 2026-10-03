# Échec critique CAC V1

Code: combat.melee.critical_failure
Domaine: Combat
Expression: if hit_roll >= 96: fumble_roll = d100; if fumble_roll > attacker.luck: apply_state(attacker, state.prone)
Maximum: 100
Minimum: 96
Notes: Le test d'échec critique ne se déclenche que sur un résultat naturel de 96 à 100 au jet de toucher. On lance alors 1D100 ; si le résultat est strictement supérieur à Chance, l'attaquant reçoit l'état Au Sol.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Critique

## Déclenchement

Le test n'est effectué que si le **résultat naturel du D100 de toucher est compris entre 96 et 100**.

Cette zone est indépendante de la probabilité calculée de toucher et constitue toujours un échec, puisque la probabilité normale de toucher est plafonnée à 90 %.

## Jet de sauvegarde de Chance

On lance un nouveau D100 :

$$
D100>Chance\Rightarrow échec\ critique
$$

En cas d'échec critique, l'attaquant reçoit l'état [Au Sol](../../03%20%E2%80%94%20Combat/%C3%89tats/Au%20Sol%203ebc799da3d1815fa0b3fe7c48c39602.md).

## Conséquence

Un personnage avec **Chance ≥ 100** ne peut pas tomber à cause de ce test, mais peut toujours effectuer le raté total initial sur 96–100.