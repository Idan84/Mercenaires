# Sélection du type de dégâts par Intelligence

Code: http://combat.weapon.select_damage_matchup
Domaine: Combat
Expression: roll = d100(); if (roll < attacker.intelligence) selected_matchup = MAX(matchups); else if ((roll / 2) > attacker.intelligence) selected_matchup = MIN(matchups); else selected_matchup = AVERAGE(matchups)
Notes: Pour une arme disposant de plusieurs modes de dégâts alternatifs. D100 de 1 à 100. Si résultat < Intelligence : meilleur matchup (MAX). Sinon si résultat/2 > Intelligence : pire matchup (MIN). Sinon : moyenne des matchups. Les égalités tombent donc dans MOYENNE. Les dégâts magiques simultanés seront traités séparément.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Blesser