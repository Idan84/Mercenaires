# Reprise de contrôle — En Fuite V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ecc799da3d1817ca2fdd04ed14f0afe?pvs=204
> Dernière édition Notion : 2026-10-01T05:26:21.295Z

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

> 
	Le bonus de **+10 par tour** est la première valeur d'équilibrage proposée. La logique d'augmentation progressive est validée ; ce coefficient pourra être ajusté après playtest.


