# Enchaînement de tirs distance V1

Code: combat.ranged.attack_chain
Domaine: Combat
Expression: shot_1=automatic_attempt; for N>=2 if http://weapon.fire_rate='Répétable' && previous_shot_hit && !negative_critical && target_alive: p_next=min(100,(effective_dexterity+effective_speed)/(1.5*N)); continue if d100<=p_next else stop
Maximum: 100
Minimum: 0
Notes: Cadence volontairement plus restrictive qu'au CAC. Les armes marquées Tir unique n'entrent pas dans cette boucle.
Statut: Validée
Type attaque: Distance
Version: V1
Étape: Autre

## Cadence répétable

Le premier tir est automatiquement **tenté**.

Pour un tir supplémentaire numéro `N ≥ 2` :

$$
P_N=\min\left(100,\frac{DexEffective+VitesseEffective}{1.5\times N}\right)
$$

La boucle n'est accessible qu'aux armes `Cadence tir = Répétable`. Elle s'arrête sur un tir qui ne touche pas réellement, un critique négatif ou une cible devenue invalide.