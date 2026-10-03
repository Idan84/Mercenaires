# Vitesse après armure — intermédiaire

Code: combat.effective_speed
Domaine: Combat
Expression: effective_speed = max(1, character.speed - armor.effective_speed_penalty)
Notes: Étape intermédiaire : Vitesse après seul malus d'armure. La valeur finale utilisée par le CAC est combat.melee.effective_speed, qui retire ensuite les malus des objets tenus. La caractéristique sauvegardée n'est jamais modifiée.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Équipement