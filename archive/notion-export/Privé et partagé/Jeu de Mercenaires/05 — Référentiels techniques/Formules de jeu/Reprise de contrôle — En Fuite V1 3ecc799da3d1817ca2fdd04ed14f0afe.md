# Reprise de contrôle — En Fuite V1

Code: combat.morale.flee_recovery
Domaine: Combat
Expression: enemy_ref = nearest_active_enemy; base = character.courage + 0.25character.will - 0.25enemy_ref.intimidation; p_recover = min(95, max(5, base + 10*flee_turn_index)); if d100 <= p_recover: remove_state('state.fleeing'); player_control = true; else: flee_failed_turns += 1; resolve_flee_behavior_d3()
Maximum: 95
Minimum: 5
Notes: Test au début de chaque tour tant que state.fleeing est actif. flee_turn_index=1 au premier tour complet passé En Fuite, puis 2, 3... Le coefficient +10 par tour est une première valeur d'équilibrage à tester. Réussite : récupération immédiate du contrôle et activation normale complète.
Statut: À tester
Type attaque: N/A
Version: V1
Étape: Autre

## Test de reprise de contrôle

Au **début de son tour**, un personnage **En Fuite** tente immédiatement de reprendre ses esprits.

L'adversaire de référence est l'**ennemi actif le plus proche** au moment du test.

$$
ScoreRecuperation=Courage+0.25\times Volonte-0.25\times Intimidation_{ennemi\ proche}+10\times TourFuite
$$

$$
P_{recuperation}=min(95,max(5,ScoreRecuperation))
$$

`TourFuite = 1` au premier tour complet commencé dans l'état **En Fuite**, puis augmente de 1 à chaque nouveau tour tant que l'état persiste.

- `D100 ≤ P_recuperation` : retirer **En Fuite** ; le joueur reprend immédiatement le contrôle et dispose de son activation normale complète.
- Échec : le joueur ne contrôle pas le personnage pendant cette activation ; lancer `1D3` et appliquer le comportement de fuite.

<aside>
🧠

Le bonus de **+10 par tour** est la première valeur d'équilibrage proposée. La logique d'augmentation progressive est validée ; ce coefficient pourra être ajusté après playtest.

</aside>