# Critique de blessure positif CAC V1

Code: combat.melee.wound_critical_success
Domaine: Combat
Expression: if wound_success: p_crit = min(25, max(1, attacker.luck / 10)); if d100 <= p_crit: damage_roll = weapon_damage_max; grip_damage_multiplier = (weapon.grip == 'Au choix' && active_two_handed) ? 1.5 : 1; physical_resistance_variation = 0.9
Maximum: 25
Minimum: 1
Notes: Après une blessure réussie, le critique impose le jet de dégâts maximal. Le multiplicateur de prise ×1,5 reste applicable à une arme Au choix réellement utilisée à deux mains ; les armes exclusivement 2 mains sont déjà équilibrées dans leur dé de base.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Critique

## Déclenchement

Uniquement après un **jet de Blesser réussi**.

## Probabilité

$$
P_{crit}=min(25,max(1,Chance/10))
$$

On lance **1D100**. Si le résultat est inférieur ou égal à $P_{crit}$, le critique réussit.

## Effet : dégâts maximum

Le jet de dégâts de l'arme prend sa valeur maximale possible : **1D8 → 8 ; 2D6 → 12**, etc.

La variation de Résistance physique prend également la valeur la plus favorable à l'attaquant :

$$
\frac{D3+8}{10}=0.9
$$

La perte de PV devient donc :

Pour une arme `Au choix` utilisée à deux mains, le multiplicateur de prise **×1,5** reste actif.

$$
PertePV_{crit}=\left\lceil 10\times DegatsArmeMax\times Qualite\times MultiplicateurPrise\times\frac{2Force_{att}}{100}\times\left(1-\frac{ResistancePhysique_{def}}{100}\times0.9\right)\right\rceil
$$

<aside>
💥

La **Résistance physique** du défenseur reste active. Le critique maximise les dégâts ; il ne rend pas le corps du défenseur inexistant.

</aside>