> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Courage post-attaque CAC V1

Code: combat.melee.courage_resolution
Domaine: Combat
Expression: base_hold=min(95,max(5,subject.courage+0.25subject.will-0.25opponent.intimidation)); if defender_outnumbered && wound_received: use combat.melee.courage_outnumbered immediately per wound; else if any_wound_inflicted && target_alive: defender tests once at sequence end; else if !any_wound_inflicted && attacker_participates_in_valid_encirclement: no_courage_test; else if !any_wound_inflicted: attacker tests with flee_probability=(100-base_hold)*0.5
Maximum: 97,5
Minimum: 5
Notes: Règle générale de fin de séquence, avec deux exceptions V1 : un attaquant soutenu par un encerclement valide ne teste pas s'il ne blesse pas ; une cible en sous-nombre teste immédiatement après chaque blessure via combat.melee.courage_outnumbered.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Autre

## Score de Courage

Le même noyau est utilisé dans les deux cas :

$$
ScoreCourage=Courage+0.25\times Volonte-0.25\times Intimidation_{adverse}
$$

$$
P_{tenir,base}=min(95,max(5,ScoreCourage))
$$

## Cas 1 — l'attaquant a blessé sa cible

À la fin de la séquence offensive, si **au moins un jet de Blesser a réussi** et que la cible est encore en état de fuir, le **défenseur** effectue le test.

$$
P_{tenir}=P_{tenir,base}
$$

`D100 > P_tenir` → appliquer [En Fuite](/design/#doc=13-fleeing.md).

## Cas 2 — l'attaquant n'a blessé personne

Si **aucun jet de Blesser n'a réussi** pendant la séquence, c'est normalement l'**attaquant** qui teste son Courage face à l'Intimidation du défenseur.

**Exception encerclement :** si l'attaquant participe à un [Encerclement CAC V1](/design/#doc=formulas/encerclement-cac-v1.md) valide contre cette cible, **aucun test n'est effectué**. Il compte sur ses alliés.

Dans les autres cas, la probabilité de fuite est divisée par deux :

$$
P_{fuite,base}=100-P_{tenir,base}
$$

$$
P_{fuite}=\frac{P_{fuite,base}}{2}
$$

soit directement :

$$
P_{tenir}=100-\frac{100-P_{tenir,base}}{2}
$$

Ainsi, avec la borne de base 5–95 %, ce cas donne une probabilité réelle de tenir comprise entre **52,5 % et 97,5 %**.

## Fréquence du test

En situation normale, le test n'est effectué **qu'une fois à la fin de la séquence/activation offensive**, pas après chaque coup individuel.

**Exception sous-nombre :** une cible en sous-nombre utilise [Courage en sous-nombre V1](/design/#doc=formulas/courage-en-sous-nombre-v1.md) et teste **immédiatement après chaque blessure réellement reçue**. Un échec applique En Fuite sur-le-champ et peut interrompre la séquence si la cible se déplace.

<aside>
🧠

Le manque de Courage reste dangereux, mais échouer à blesser n'est pas une invitation quasi automatique à fuir : dans ce second cas, seule la moitié des échecs de Courage provoque réellement la Fuite.

</aside>