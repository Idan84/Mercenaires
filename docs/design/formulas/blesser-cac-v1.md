> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Blesser CAC V1

Code: combat.melee.wound_probability
Domaine: Combat
Expression: two_handed_bonus = active_two_handed ? attacker.two_handed_mastery : 0; delta_wound = attacker.strength + 0.2*(attacker.weapon_category_mastery + attacker.weapon_mastery + two_handed_bonus) + selected_damage_matchup - defender.endurance; p_wound = 10 + 80/(1 + exp(-delta_wound/20))
Maximum: 90
Minimum: 10
Notes: Même courbe bornée que le toucher. Si l'arme active est réellement maniée à deux mains (Prise=2 mains ou Au choix avec main secondaire vide), Combat à deux mains est ajouté aux maîtrises avant le coefficient 0,2. L'armure intervient dans selected_damage_matchup sauf critique positif au toucher.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Blesser

## Principe

Cette formule répond uniquement à la question : **le coup qui a touché parvient-il à blesser ?** Elle ne calcule pas encore la perte de PV.

## Matchup arme contre armure

Pour chaque type physique utilisable par l’arme :

$$
matchup[type] = puissanceBlessureArme[type] - resistanceArmureEffective[type]
$$

Si l'attaque a obtenu un **critique positif au toucher**, la résistance d'armure effective est fixée à **0 pour cette attaque et uniquement pour cette étape Blesser**. On utilise alors :

$$
matchupCritique[type] = puissanceBlessureArme[type]
$$

L'Endurance du défenseur et sa Résistance physique restent inchangées.

Pour une arme multi-type, le matchup retenu est choisi par la règle [Sélection du type de dégâts par Intelligence](../../../archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/05%20%E2%80%94%20R%C3%A9f%C3%A9rentiels%20techniques/Formules%20de%20jeu/S%C3%A9lection%20du%20type%20de%20d%C3%A9g%C3%A2ts%20par%20Intelligence%203eac799da3d1813cab14d308c76d6773.md).

## Delta de blessure

$$
BonusDeuxMains=\begin{cases}MaitriseCombatDeuxMains & \text{si l'arme est réellement utilisée à deux mains}\\0 & \text{sinon}\end{cases}
$$

$$
\Delta_{blessure} = Force_{att} + 0.2(MaitriseCategorieArme + MaitriseArme + BonusDeuxMains) + matchupSelectionne - Endurance_{def}
$$

Une arme `2 mains` est toujours concernée. Une arme `Au choix` ne l'est que si la main secondaire est vide ; avec bouclier ou seconde arme, elle fonctionne à une main.

## Probabilité de blesser

$$
P_{blessure}=10+\frac{80}{1+e^{-\Delta_{blessure}/20}}
$$

La probabilité normale reste comprise entre **10 % et 90 %**.

<aside>
🛡️

**Résistance physique n’intervient pas ici.** Elle agit à l’étape suivante, lors du calcul des PV réellement perdus.

</aside>