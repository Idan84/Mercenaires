> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Malus vitesse arme effectif V1

Code: combat.weapon.speed_penalty_effective
Domaine: Combat
Expression: quality_penalty = weapon.speed_penalty_base  item_quality.penalty_multiplier; mastery_factor = 1 - (weapon_category_mastery + weapon_mastery) / 400; penalty = quality_penalty  mastery_factor; if weapon.grip == 'Au choix' and active_two_handed: penalty *= 0.5
Minimum: 0
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Équipement

## Principe

Le **Malus vitesse arme base** représente poids, inertie et temps de récupération de l'objet tenu.

## Qualité et maîtrise

$$
MalusQualite=MalusBase\times MultiplicateurMalusQualite
$$

$$
FacteurMaitrise=1-\frac{MaitriseCategorieArme+MaitriseArme}{400}
$$

$$
MalusArmeEffectif=MalusQualite\times FacteurMaitrise
$$

Les deux maîtrises étant plafonnées à 100, un maître complet conserve au minimum **50 %** du malus de base avant les règles de prise.

## Arme « Au choix » utilisée à deux mains

Si l'autre main est vide, une arme `Au choix` est utilisée à deux mains et son malus effectif est encore multiplié par **0,5**.

<aside>
⚙️

La qualité utilise le **Multiplicateur malus** déjà commun aux items : Usée augmente le handicap, De bonne facture et De luxe le réduisent.

</aside>