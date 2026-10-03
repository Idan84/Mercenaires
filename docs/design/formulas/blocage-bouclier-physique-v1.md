> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Blocage bouclier physique V1

Code: combat.physical.shield_block
Domaine: Combat
Expression: if defender.has_shield && hit_success: shield_mastery_effective=(defender.shield_category_mastery+defender.shield_mastery)/2; shield_block_bonus_effective=shield.block_bonus_base*item_quality.multiplier; p_block=min(combat.shield.block.max_probability,max(combat.shield.block.min_probability,(defender.dexterity+shield_mastery_effective)/2+shield_block_bonus_effective)); blocked=(d100<=p_block)
Maximum: 80
Minimum: 5
Notes: Même règle au CAC et contre les projectiles physiques. Le blocage reste possible même contre Frappe dans le dos / une attaque non détectée.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Toucher

## Principe

Le bouclier n'ajoute ni Esquive ni Agilité. Il intervient **après un jet de Toucher réussi** comme un jet de sauvegarde : l'attaque aurait touché, mais elle est interceptée par le bouclier.

La même règle s'applique au **CAC et aux projectiles physiques** : flèche, carreau, balle, fronde, etc. Aucun malus spécifique n'est appliqué contre un projectile en V1.

## Maîtrise effective du bouclier

$$
MaitriseBouclierEffective=\frac{MaitriseCategorieBoucliers+MaitriseBouclierPrecis}{2}
$$

## Bonus de bouclier

Le champ `Bonus blocage base` est une valeur positive d'item et suit donc la qualité générique :

$$
BonusBlocageEffectif=BonusBlocageBase\times MultiplicateurQualite
$$

## Probabilité de blocage

$$
P_{blocage}=min\left(80,max\left(5,\frac{Dexterite_{def}+MaitriseBouclierEffective}{2}+BonusBlocageEffectif\right)\right)
$$

On lance 1D100. Si le résultat est inférieur ou égal à $P_{blocage}$, le coup est **bloqué** et ne compte pas comme un toucher réel.

## Ordre dans le pipeline

`Jet Toucher → Toucher réussi → Blocage bouclier → Critique positif Toucher éventuel → Blesser`.

- Un coup bloqué ne déclenche ni critique positif de Toucher, ni Blesser, ni dégâts.
- Pour l'enchaînement normal, un blocage compte comme un non-toucher et casse la chaîne.
- En combat à deux armes, chaque attaque de la paire est résolue séparément ; la paire peut continuer si au moins une des deux attaques touche réellement.
- Le bouclier occupe la main secondaire : une arme `Au choix` est donc utilisée en mode une main.
- Le blocage reste autorisé contre une attaque bénéficiant de **Frappe dans le dos** ou une attaque non détectée : abstraction volontaire, le bouclier peut aussi protéger le dos.