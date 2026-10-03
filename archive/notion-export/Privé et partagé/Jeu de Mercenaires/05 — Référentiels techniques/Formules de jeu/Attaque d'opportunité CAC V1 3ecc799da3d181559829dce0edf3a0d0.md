# Attaque d'opportunité CAC V1

Code: combat.melee.opportunity_attack
Domaine: Combat
Expression: trigger = leaves_enemy_threat_zone || (performs_ranged_attack && ranged_target != threatening_enemy) || future_action_flagged_as_exposing; for each threatening_enemy: attacks = dual_wield ? [weapon_1, weapon_2] : [selected_melee_weapon]; for each opportunity_attack: delta = attacker.effective_dexterity + 0.2(attacker.weapon_category_mastery + attacker.weapon_mastery + attacker.perception + attacker.effective_speed) - 0.5defender.effective_dodge - 0.2*defender.effective_speed; p_hit = 10 + 80/(1 + exp(-delta/20)); resolve_normal_melee_pipeline_without_extra_chain
Maximum: 90
Minimum: 10
Notes: Réaction immédiate avant l'achèvement de l'action déclenchante. Chaque ennemi dont la zone de menace est quittée peut réagir. Combat à deux armes : une attaque avec chaque arme, donc deux coups, sans enchaînement supplémentaire. Toute attaque d'opportunité bénéficie de Frappe dans le dos.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Toucher

## Zone de menace

Un combattant menace les hexagones qu'il peut atteindre avec son arme de mêlée : une arme standard menace à 1 hex ; une arme d'hast configurée `1–2` menace jusqu'à 2 hex.

Quitter une case tout en restant dans la même zone de menace ne déclenche rien. **Sortir de la zone menacée** déclenche la réaction.

## Déclencheurs V1

L'attaque d'opportunité se résout immédiatement lorsqu'un personnage :

- quitte volontairement la zone de menace d'un adversaire ;
- effectue une attaque à distance contre **une autre cible** alors qu'il est menacé par cet adversaire ;
- plus tard, effectue une action explicitement marquée comme exposante.

Chaque adversaire dont la zone de menace est concernée peut réagir. Aucun verrou n'empêche le déplacement : le personnage peut partir s'il accepte les conséquences.

## Toucher d'opportunité

La cible s'expose : son Esquive est divisée par deux et sa Perception défensive n'intervient pas.

$$
Delta_{opportunite}=Dex_{att}+0.2(MaitriseCategorie+MaitriseArme+Perception_{att}+VitesseEffective_{att})-0.5\times EsquiveEffective_{def}-0.2\times VitesseEffective_{def}
$$

$$
P_{toucher}=10+\frac{80}{1+e^{-Delta_{opportunite}/20}}
$$

Le reste suit le pipeline CAC normal : bouclier le cas échéant, critiques, Blesser, dégâts et Courage.

## Une ou deux armes

- Une arme tenue : **un seul coup d'opportunité**, sans enchaînement d'attaques.
- Combat à deux armes : **un coup avec chaque arme**, donc deux coups. Les règles normales du combat à deux armes et des critiques négatifs restent applicables, mais aucun troisième coup n'est généré par la cadence.

## Ordre de résolution

La réaction intervient **avant la fin de l'action qui l'a provoquée**. Si ses conséquences empêchent l'action annoncée, celle-ci est annulée ; sinon elle reprend ensuite.

Une fuite peut elle-même provoquer des attaques d'opportunité en quittant des zones de menace.

<aside>
🗡️

Toute attaque d'opportunité bénéficie de [Frappe dans le dos V1](Frappe%20dans%20le%20dos%20V1%203ecc799da3d1819ba68cc80196e7861e.md) : Perception défensive annulée et résistance au type de dégâts divisée par deux pour l'étape Blesser. Le blocage au bouclier reste néanmoins possible.

</aside>