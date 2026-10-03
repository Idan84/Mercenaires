# ⏱️ Fin de mission, temps & indisponibilités

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3edc799da3d181b593b4d808c233d592?pvs=204
> Dernière édition Notion : 2026-10-02T22:13:48.569Z


> 
	**Version de travail consolidée — 2 octobre 2026.** Cette page fixe le temps stratégique, la résolution de fin de mission et les états mort / blessé / fatigué. Les coefficients non encore choisis restent explicitement ouverts.


## 1 — Temps stratégique
La couche gestion du jeu fonctionne en **jours**.
- le temps de combat lui-même compte pour **0 jour** ;
- une mission située à `D` jours du camp immobilise normalement l’équipe pendant `D` jours à l’aller et `D` jours au retour ;
- donc, hors événement spécial :
$$
TempsMission = 2 \times DistanceCamp
$$
Le passage des jours doit faire progresser de façon cohérente :
- retour des équipes parties en mission ;
- guérison / indisponibilité ;
- récupération de fatigue ;
- construction et amélioration du château ;
- renouvellement des candidats à la taverne ;
- renouvellement des missions proposées ;
- salaires journaliers ;
- entraînements au camp.
Une fonction conceptuelle de type `AdvanceTime(days)` pourra centraliser ces changements.

> 
	Une Mission stocke la **distance aller en jours**. Le combat à destination ne rajoute pas une durée fixe « sur place » en V1.


## 2 — Seuil de 0 PV
`0 PV` est le seuil de mise hors combat, mais **pas encore la mort certaine**.
Règle retenue : un personnage en dessous de `0 PV` ne peut pas être simplement ramené au-dessus de zéro par un soin ordinaire pendant la résolution concernée ; sa survie est tranchée en fin de mission.
## 3 — Mort en fin de mission
Pour un mercenaire avec `PV_restants  
	Les soins restaurent les PV mais **n’effacent pas la contrainte physique déjà encaissée**. Il faut donc conserver un compteur de dégâts cumulés pour la mission.


La formule exacte de fatigue reste à définir.
## 6 — Durée d’une blessure
La durée d’indisponibilité d’un blessé dépend au minimum de :
- la gravité / profondeur du traumatisme ;
- l’Endurance ;
- les **capacités soignantes du camp**.
La formule exacte n’est pas encore validée.
## 7 — Chaîne de résolution post-mission
Ordre retenu :
1. `PV < 0` → jet de mort ;
2. mort → fin du traitement du personnage ;
3. survivant avec `PV < 0` → blessure automatique ;
4. `0 à 20 % PV max` → jet de blessure ;
5. tous les survivants non blessés → jet de fatigue ;
6. résolution des récompenses, réputation, XP, butin et retour.
Les sorties opérationnelles sont donc au minimum : **mort / blessé / fatigué / opérationnel**.
## 8 — Retour et paiement
La distance est comptée dans les deux sens : une équipe victorieuse n’est pas instantanément de retour au château.
Règle de rémunération retenue : **la prime de mission individuelle n’est payée que si le mercenaire revient**.
## 9 — Données à conserver dans MissionResult
En complément des données déjà prévues dans l’architecture :
- dégâts cumulés subis par chaque participant ;
- PV de fin de combat ;
- résultat du jet de mort si nécessaire ;
- blessure éventuelle et durée ;
- fatigue éventuelle ;
- date / jour de retour prévu ;
- statut de retour réel.
## 10 — Points encore ouverts
- formule du jet de blessure entre 0 et 20 % ;
- formule du jet de fatigue ;
- formule de durée des blessures ;
- moment exact où commencent les soins pendant le trajet retour ;
- influence précise des bâtiments médicaux ;
- séquelles permanentes.
