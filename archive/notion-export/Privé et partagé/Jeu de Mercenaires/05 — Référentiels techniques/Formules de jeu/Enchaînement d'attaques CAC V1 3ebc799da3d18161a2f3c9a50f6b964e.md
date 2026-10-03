# Enchaînement d'attaques CAC V1

Code: combat.melee.attack_chain
Domaine: Combat
Expression: attack_1 = automatic_attempt; for next_attack_number N >= 2: if previous_attack_real_hit && !negative_critical && target_alive: p_next = min(100, (effective_dexterity + effective_speed) / N); continue if d100 <= p_next else stop
Maximum: 100
Minimum: 0
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Autre

## Première attaque

La première attaque du tour est toujours tentée.

## Attaques suivantes

Pour tenter l'attaque numéro $N$, avec $N\ge2$ :

$$
P_N=\min\left(100,\frac{DexteriteEffective+VitesseCombatEffective}{N}\right)
$$

On lance **1D100**. Si le résultat est inférieur ou égal à $P_N$, une nouvelle attaque complète est tentée.

## Conditions de poursuite

- L'attaque précédente doit avoir **réellement touché** après éventuel jet de bouclier. Un coup bloqué ne poursuit pas la chaîne.
- La cible doit encore être vivante pour ouvrir une nouvelle attaque.
- Un **critique positif** au Toucher ou à Blesser n'arrête pas l'enchaînement.
- Un **critique négatif** au Toucher ou à Blesser arrête immédiatement toute la chaîne.
- Un raté normal au Toucher arrête la chaîne puisqu'il ne satisfait plus la condition « avoir touché ».

<aside>
⚔️

Il n'y a pas de plancher de probabilité. Le diviseur $N$ fait naturellement s'effondrer les très longues rafales.

</aside>