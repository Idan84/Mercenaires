> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Prise d'arme et mode deux mains V1

Code: combat.weapon.grip_mode
Domaine: Combat
Expression: if grip='2 mains': active_two_handed=true and offhand_forbidden; if grip='1 main': active_two_handed=false; if grip='Au choix': active_two_handed = offhand_empty and two_hand_attack_chosen; when optional active_two_handed: base_damage = 1.5
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Équipement

## Trois prises possibles

- **1 main** : l'autre main reste disponible.
- **2 mains** : l'autre main est obligatoirement vide ; aucun bouclier ni seconde arme.
- **Au choix** : tenue seule, elle l'est **à une main par défaut**, la main libre (Combat à une main, doc 04). Le joueur choisit à chaque tour : le bouton **« Attaquer à deux mains »** l'empoigne à deux mains pour cette attaque, et il le reste jusqu'à la prochaine activation du combattant (il perd l'esquive de la main libre). Avec un bouclier ou une seconde arme, elle fonctionne à une main (Idan, 2026-11-02).
- **IA** (ennemis, combat automatique) : elle empoigne à deux mains quand sa compétence Combat à deux mains vaut au moins Combat à une main.

## Bonus du mode deux mains pour une arme « Au choix »

Quand une arme `Au choix` est effectivement utilisée à deux mains :

- `Dégâts de base × 1,5` ;
- son malus de vitesse **n'est plus divisé par deux** (Idan, 2026-11-02 : « ça rééquilibrera un peu ») ;
- la maîtrise **Combat à deux mains** entre dans le jet de Blesser.

## Armes exclusivement à deux mains

Elles utilisent également **Combat à deux mains** pour Blesser, mais leurs dés de dégâts sont déjà équilibrés comme des valeurs deux mains : **on ne leur applique pas à nouveau ×1,5**.

<aside>
🛡️

Une arme `Au choix` équipée avec un bouclier ou une seconde arme perd tous les bonus du mode deux mains.

</aside>