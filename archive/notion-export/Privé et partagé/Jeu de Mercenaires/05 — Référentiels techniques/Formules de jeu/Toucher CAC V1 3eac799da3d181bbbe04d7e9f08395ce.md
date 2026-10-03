# Toucher CAC V1

Code: combat.melee.hit_probability
Domaine: Combat
Expression: delta = attacker.effective_dexterity + 0.2(attacker.weapon_category_mastery + attacker.weapon_mastery + attacker.perception + attacker.effective_speed) - defender.effective_dodge - 0.2(defender.perception + defender.effective_speed); p_hit = 10 + 80/(1 + exp(-delta/20))
Maximum: 90
Minimum: 10
Notes: Formule V1. effective_dexterity = Dextérité normale sauf combat à deux armes. effective_speed = Vitesse combat effective après armure et objets tenus. Les caractéristiques sauvegardées ne sont jamais modifiées.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Toucher

## Principe

Cette formule répond uniquement à la question : **l’attaque de corps-à-corps touche-t-elle la cible ?** Elle ne détermine ni la blessure ni les dégâts.

## Delta

$$
\Delta = DexteriteEffective_{att} + 0.2(MaitriseCategorieArme + MaitriseArme + Perception_{att} + VitesseCombatEffective_{att}) - EsquiveEffective_{def} - 0.2(Perception_{def} + VitesseCombatEffective_{def})
$$

## Probabilité de toucher

$$
P_{touche}=10+\frac{80}{1+e^{-\Delta/20}}
$$

La probabilité reste comprise entre **10 % et 90 %**. `DexteriteEffective` est égale à la Dextérité normale sauf en combat à deux armes. `VitesseCombatEffective` intègre les malus d’armure et des objets tenus, notamment le poids/inertie des armes. Les critiques sont traités par leurs règles dédiées.

## État : Au Sol

Si le défenseur possède l’état [Au Sol](../../03%20%E2%80%94%20Combat/%C3%89tats/Au%20Sol%203ebc799da3d1815fa0b3fe7c48c39602.md), alors `EsquiveEffective_def = 0` pour le calcul du toucher. Sa Perception et sa Vitesse effective restent utilisées normalement dans le score de défense.

## Bouclier

Un bouclier ne modifie pas directement $P_{touche}$. Après un Toucher réussi, [Blocage bouclier physique V1](Blocage%20bouclier%20physique%20V1%203ebc799da3d18126b594dcad23bb1b17.md) effectue un jet de sauvegarde basé sur la Dextérité du défenseur et ses maîtrises de bouclier. Un blocage réussi transforme le Toucher en **coup bloqué** avant le critique positif de Toucher.