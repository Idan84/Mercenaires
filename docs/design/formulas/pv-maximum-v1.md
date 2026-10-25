> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# PV maximum V1

Code: character.max_hp
Domaine: Personnage
Expression: ceil(3  (constitution + 0.2  endurance + 0.1 * willpower))
Notes: PV maximum calculés directement sur cette échelle. Aucun multiplicateur global ×10 n'est appliqué aux PV maximum. La létalité V1 vise environ trois gros coups pour un mercenaire moyen, avec possibilité de mort beaucoup plus rapide sur gros jet ou critique. Les équipements, effets et enchantements pourront modifier les caractéristiques contributrices ou les PV.
Calcul (Idan, 2026-10-25) : les PV max ne sont plus figés à la création. Ils se calculent avec la Constitution, l'Endurance et la Volonté du moment, **équipement compris** (Casque de constitution, ceinture, amulette…) et avec ce que le mercenaire a gagné en mission. Le moteur (`maxHp`, `game-core/combat-engine.js`) les calcule au départ de chaque mission ; la fiche montre la valeur équipée et son détail. Les ennemis gardent les PV de leur fiche d'archétype (doc 17 §10).
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Autre