> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Prise d'arme et mode deux mains V1

Code: combat.weapon.grip_mode
Domaine: Combat
Expression: if grip='2 mains': active_two_handed=true and offhand_forbidden; if grip='1 main': active_two_handed=false; if grip='Au choix': active_two_handed = offhand_empty; when optional active_two_handed: speed_penalty = 0.5 and base_damage = 1.5
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Équipement

## Trois prises possibles

- **1 main** : l'autre main reste disponible.
- **2 mains** : l'autre main est obligatoirement vide ; aucun bouclier ni seconde arme.
- **Au choix** : si l'autre main est vide, l'arme passe automatiquement en mode deux mains ; si un bouclier ou une seconde arme est équipé, elle fonctionne à une main.

## Bonus du mode deux mains pour une arme « Au choix »

Quand une arme `Au choix` est effectivement utilisée à deux mains :

- `Malus vitesse arme effectif × 0,5` ;
- `Dégâts de base × 1,5` ;
- la maîtrise **Combat à deux mains** entre dans le jet de Blesser.

## Armes exclusivement à deux mains

Elles utilisent également **Combat à deux mains** pour Blesser, mais leur malus et leurs dés de dégâts sont déjà équilibrés comme des valeurs deux mains : **on ne leur applique pas à nouveau ×0,5 et ×1,5**.

<aside>
🛡️

Une arme `Au choix` équipée avec un bouclier ou une seconde arme perd tous les bonus du mode deux mains.

</aside>