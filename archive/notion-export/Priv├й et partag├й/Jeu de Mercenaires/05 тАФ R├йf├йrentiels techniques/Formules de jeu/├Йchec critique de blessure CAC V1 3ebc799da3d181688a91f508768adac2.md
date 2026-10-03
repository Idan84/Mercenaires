# Échec critique de blessure CAC V1

Code: combat.melee.wound_critical_failure
Domaine: Combat
Expression: if wound_roll >= 96: fumble_roll = d100; if fumble_roll > attacker.luck: grip_damage_multiplier = (weapon.grip == 'Au choix' && active_two_handed) ? 1.5 : 1; self_damage = ceil(10  weapon_damage_min  item_quality.multiplier  grip_damage_multiplier  (2  attacker.strength / 100)  (1 - (attacker.physical_resistance / 100) * 1.1))
Maximum: 100
Minimum: 96
Notes: Un naturel 96–100 au jet de Blesser déclenche le test d'échec critique. Si l'attaquant échoue à son test de Chance, il subit les dégâts minimum de son propre coup, y compris l'éventuel multiplicateur ×1,5 d'une arme Au choix effectivement utilisée à deux mains.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Critique

## Déclenchement

Si le jet naturel de **Blesser** donne **96 à 100**, le coup échoue normalement mais déclenche un test d'échec critique.

## Test de Chance

On lance **1D100** :

$$
D100>Chance_{att}\Rightarrow EchecCritique
$$

## Effet : l'attaquant se blesse lui-même

L'attaquant subit les **dégâts minimum** correspondant à son propre coup.

Le jet de dégâts de l'arme prend sa valeur minimale : **1D8 → 1 ; 2D6 → 2**, etc.

Sa propre Résistance physique s'applique avec la variation la plus favorable à la réduction des dégâts :

$$
\frac{D3+8}{10}=1.1
$$

Si l'arme est `Au choix` et réellement utilisée à deux mains, le contrecoup utilise lui aussi le multiplicateur de prise **×1,5** : Gérard profite donc pleinement de sa propre violence.

$$
DegatsAuto=\left\lceil 10\times DegatsArmeMin\times Qualite\times MultiplicateurPrise\times\frac{2Force_{att}}{100}\times\left(1-\frac{ResistancePhysique_{att}}{100}\times1.1\right)\right\rceil
$$

<aside>
🤕

Le défenseur ne subit aucun dégât : l'attaque n'a pas blessé. Les PV perdus sont ceux de **l'attaquant**, qui encaisse le contrecoup de sa propre frappe.

</aside>