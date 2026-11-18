# Fin de mission, temps & indisponibilités

Le temps stratégique, la résolution de fin de mission et les états mort / blessé / fatigué. Les coefficients PLAYTEST
s'ajustent dans `data/reference/formula-constants.json` (constantes `mission.*`), sans toucher au code.

## 1 — Temps stratégique

La couche gestion avance en **jours**. Le combat compte pour **0 jour** ; une mission à `D` jours du camp immobilise
l'équipe `D` jours à l'aller et `D` au retour :

$$
TempsMission = 2 \times DistanceCamp
$$

Une Mission stocke la **distance aller** ; pas de durée fixe « sur place » en V1.

**Une seule fonction centrale** fait avancer, **jour par jour** (5 jours = cinq résolutions d'une journée, pour garder
l'ordre des événements) : retours de mission, guérisons, fatigue, constructions, candidats de la taverne, missions
proposées, salaires, entraînements.

## 2 — Seuil de 0 PV

`0 PV` met hors combat, mais n'est **pas encore la mort certaine**. Sous `0 PV`, un soin ordinaire ne ramène pas
au-dessus de zéro pendant la résolution concernée ; la survie se tranche en fin de mission.

## 3 — Mort en fin de mission

Pour un mercenaire avec `PV_restants < 0` :

$$
P(mort)\% = Clamp\left(-500 \times \frac{PV_{restants}}{PV_{max}} - \frac{Volonte}{20},\ 0,\ 90\right)
$$

Exemple : à `-20 %` des PV max, la base vaut `100 %`, moins `Volonté / 20`, plafonnée à **90 %** (Idan, 2026-11-07 :
« Il faut des cas où le mercenaire meurt »). Défaite comprise (doc 17 §8). Un mercenaire relevé en zombie meurt toujours.
Les montures suivent la même règle.

Un mercenaire qui rate le jet meurt. **La mort du capitaine entraîne Game Over.**

## 4 — Blessure

**Survivant revenu de PV négatifs** : blessure **automatique**.

**Entre 0 et 50 % des PV max** (`0 ≤ PV_restants ≤ 0,5 × PV_max`) : **jet de blessure**, plus probable près de 0 PV,
réduit par l'Endurance. Formule PLAYTEST V1 (volontairement agressive, pour faire tourner le roster) :

$$
DangerBlessure = 100 \times \left(1 - \frac{PV_{restants}}{0.5 \times PV_{max}}\right)
$$

$$
P_{Blessure}\% = Clamp\left(35 + 0.65 \times DangerBlessure - \frac{Endurance}{6},\ 20,\ 95\right)
$$

Zone de 0 à 50 % (Idan, 2026-10-03 : on veut plus de blessés que de morts). Avec Endurance 50 : ~27 % à 50 % PV, ~43 % à
37,5 %, ~59 % à 25 %, ~75 % à 12,5 %, ~92 % à 0 PV. Le plancher de 20 % est voulu : finir dans la zone de blessure doit
déjà être dangereux.

## 5 — Fatigue

Pas de jet : tout survivant **non blessé** finit la mission fatigué ; un blessé n'a pas de compteur Fatigue en plus. La
durée dépend de l'Endurance et des **dégâts cumulés subis pendant toute la mission**, même sous 0 : les soins rendent
des PV, pas l'effort encaissé (un tank soigné peut rentrer à pleins PV mais rincé). Formule PLAYTEST V1 (la fatigue
doit approcher la semaine) :

$$
JoursFatigue = Clamp\left(Ceil\left(5 + 2 \times \frac{DegatsCumulesSubis}{PV_{max}} - \frac{Endurance}{100}\right),\ 1,\ 7\right)
$$

Avec Endurance 50 : 5 jours sans dégâts, 6 jours après 0,5 × PV max encaissés, 7 jours dès 1 × PV max. Ensuite :

1. **Qualité du dortoir** (Idan, 2026-11-08 ; doc 11 §4) : −10 % des jours par niveau, arrondi au jour supérieur ; au
   niveau 10, plus de fatigue ;
2. **Bains chauds** (Idan, 2026-11-01 ; doc 11 §9) : 1 jour de moins par niveau, au moins 1 jour.

**Partir fatigué** (Idan, 2026-11-10) : un fatigué peut partir en mission (contrat, chasse, garde du corps, Mission
Test) ; un blessé, non. Sa fatigue continue de s'écouler en route. S'il lui en reste au début du combat, il se bat **à
80 %** tout ce combat : caractéristiques, résistances et compétences (armes, styles, écoles et sorts, Magie en armure,
compagnon animal), l'équipement en pourcentage suivant. PV max et Réserve de mana restent entiers ; la fin de mission
(§7) lit ses valeurs reposées. Fatigué pour 4 jours, sur une mission à 5 jours de marche, il arrive reposé (le choix de
l'escouade dit « −20 % au combat » ou « reposé à l'arrivée »). Le reste du
camp (entraînement, corvées, défi du capitaine) attend qu'il soit remis.

## 6 — Durée d'une blessure

Elle dépend de la gravité, de l'Endurance et des **capacités soignantes du camp**. Formule PLAYTEST V1 (une blessure dure
de 7 à 60 jours, Idan, 2026-10-03) :

$$
Gravite = Clamp\left(50 - 250 \times \frac{PV_{restants}}{PV_{max}},\ 0,\ 100\right)
$$

Repères : 0 à 20 % PV, 25 à 10 %, 50 à 0 PV, 75 à -10 %, 100 à -20 %.

$$
JoursBlessure = Ceil\left(Clamp\left((7 + Gravite) \times \left(1 - \frac{Endurance}{300}\right) \times FacteurSoinsCamp,\ 7,\ 60\right)\right)
$$

Soit 7 jours, plus 1 jour par point de gravité, réduits par l'Endurance, entre 7 et 60 jours. `FacteurSoinsCamp = 1`.
**Dispensaire** (Idan, 2026-11-01 ; doc 11 §9) : la durée bornée est ensuite multipliée par 1 − 0,1 × son niveau (au
moins 1 jour) : 7 → 4 jours, 60 → 30 au niveau 5. Avec Endurance 50 : gravité 0 → 7 jours, 25 → 27, 50 → 48, 75 → 60.

## 7 — Chaîne de résolution post-mission

1. `PV < 0` → jet de mort ; un mercenaire **relevé en zombie** par un nécromancien le rate forcément (Idan, 2026-10-28,
   doc 12) ;
2. mort → fin du traitement du personnage ;
3. survivant avec `PV < 0` → blessure automatique ;
4. `0 à 50 % PV max` → jet de blessure ;
5. tous les survivants non blessés → fatigue automatique, seule la durée varie ;
6. récompenses, réputation, XP, butin et retour.

Sorties : **mort / blessé / fatigué / opérationnel** (après récupération).

## 8 — Retour et paiement

La distance compte dans les deux sens : une équipe victorieuse n'est pas instantanément de retour. **La prime de mission
individuelle n'est payée que si le mercenaire revient.**

## 9 — Données à conserver dans MissionResult

En plus de l'architecture (doc 07) : dégâts cumulés subis par participant, PV de fin de combat, jet de mort éventuel,
blessure et durée, fatigue, jour de retour prévu, statut de retour réel.

**La convalescence commence dès la fin du combat** (Idan, 2026-10-04) : le retour compte comme du repos. Un blessé à
7 jours, sur une mission à 3 jours du camp, n'a plus que 4 jours d'indisponibilité en rentrant.

## 10 — Points encore ouverts

- coefficients PLAYTEST de blessure, de fatigue et de durée, à ajuster en jeu ;
- influence précise des bâtiments médicaux ;
- séquelles permanentes (reportées, décision Idan) ;
- sort exact des mercenaires sortis de la carte en fuite, capturés ou disparus ; abandon et extraction des personnages
  laissés sur place (défaite d'une mission « Faire le ménage » : jet de mort à probabilité doublée, doc 17 §8) ;
- un combat interrompu (page rechargée) revient à l'état d'avant le combat : un combat en cours n'est pas sauvegardé.

## 11 — Application à la compagnie

Décisions d'Idan du 2026-10-03 et du 2026-10-20 :

- La chaîne §7 s'applique après une victoire comme après une défaite, et à un mercenaire sorti de la carte en fuite
  (avec ses PV restants) ; pas aux ennemis.
- Un mort quitte la compagnie ; s'il était intendant, la compagnie n'en a plus.
- Blessé ou fatigué : un compteur de jours, −1 chaque jour (avant la Taverne) ; un blessé ne part pas en mission avant
  la fin, un fatigué si (§5). Mission Test, sans trajet : le compteur part du jour du combat.
- La prime de mission (§8) est payée à chaque survivant sous contrat ; si la caisse ne suffit pas, au prorata, et le
  reste lui est dû (les dettes, doc 09 ; Idan, 2026-11-10). Le capitaine n'a pas de contrat, donc pas de prime.
  L'escouade initiale est sous contrat ; les salaires sont versés chaque jour (doc 09 §6).
- La mort du capitaine met fin à la partie : **la sauvegarde est effacée**.
