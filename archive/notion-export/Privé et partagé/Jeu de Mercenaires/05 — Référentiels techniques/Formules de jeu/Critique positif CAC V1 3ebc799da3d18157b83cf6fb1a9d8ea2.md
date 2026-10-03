# Critique positif CAC V1

Code: combat.melee.critical_success
Domaine: Combat
Expression: if hit_success: p_crit = min(25, max(1, attacker.luck / 10)); critical_success = d100 <= p_crit
Maximum: 25
Minimum: 1
Notes: Déclenché uniquement après un toucher réussi. Un critique réussi active le drapeau critical_success. Son effet sur l'armure est défini séparément ; la probabilité elle-même est validée.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Critique

## Déclenchement

Le test n'est effectué **que si le jet de toucher a réussi**.

## Probabilité

$$
P_{crit}=\min(25,\max(1,Chance/10))
$$

On lance ensuite un D100 :

$$
D100\le P_{crit}\Rightarrow critique\ positif
$$

La probabilité est donc comprise entre **1 % et 25 %**.

## Résultat moteur

Une réussite pose `critical_success = true`.

<aside>
🛡️

L'effet exact du critique sur l'armure est traité séparément afin de pouvoir l'ajuster sans modifier la probabilité de critique.

</aside>