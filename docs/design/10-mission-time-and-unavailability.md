> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Fin de mission, temps & indisponibilités

<aside>
⏱️

**Version de travail consolidée — 2 octobre 2026.** Cette page fixe le temps stratégique, la résolution de fin de mission et les états mort / blessé / fatigué. Les coefficients non encore choisis restent explicitement ouverts.

</aside>

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

**Décision validée :** une fonction centrale `AdvanceTime(days)` fait avancer tous ces systèmes. Le temps stratégique est résolu **jour par jour** : `AdvanceTime(5)` doit être équivalent à cinq résolutions successives d’une journée, afin de conserver l’ordre des événements quotidiens.

<aside>
🗺️

Une Mission stocke la **distance aller en jours**. Le combat à destination ne rajoute pas une durée fixe « sur place » en V1.

</aside>

## 2 — Seuil de 0 PV

`0 PV` est le seuil de mise hors combat, mais **pas encore la mort certaine**.

Règle retenue : un personnage en dessous de `0 PV` ne peut pas être simplement ramené au-dessus de zéro par un soin ordinaire pendant la résolution concernée ; sa survie est tranchée en fin de mission.

## 3 — Mort en fin de mission

Pour un mercenaire avec `PV_restants < 0` :

$$
P(mort)\% = Clamp\left(-1000 \times \frac{PV_{restants}}{PV_{max}} - \frac{Volonte}{20},\ 0,\ 100\right)
$$

Exemple : à `-10 %` des PV max, la base vaut `100 %`, diminuée de `Volonté / 20`.

Un mercenaire qui échoue au jet meurt. **La mort du capitaine entraîne Game Over.**

## 4 — Blessure

### Survivant revenu de PV négatifs

Si le mercenaire avait `PV_restants < 0` et survit au jet de mort, il reçoit **automatiquement une blessure**.

### Mercenaire entre 0 et 20 % de ses PV max

Si :

$$
0 \le PV_{restants} \le 0.2 \times PV_{max}
$$

alors un **jet de blessure** est effectué.

La probabilité doit :

- augmenter en se rapprochant de 0 PV ;
- être réduite par l’Endurance.

**Formule PLAYTEST V1** (Issue #14 : courbe volontairement agressive, pour que l’indisponibilité fasse tourner le roster) :

$$
DangerBlessure = 100 \times \left(1 - \frac{PV_{restants}}{0.2 \times PV_{max}}\right)
$$

$$
P_{Blessure}\% = Clamp\left(35 + 0.65 \times DangerBlessure - \frac{Endurance}{6},\ 20,\ 95\right)
$$

Avec Endurance 50 : ~27 % à 20 % PV, ~43 % à 15 %, ~59 % à 10 %, ~75 % à 5 %, ~92 % à 0 PV. Le plancher de 20 % est voulu : finir une mission dans la zone critique doit déjà être dangereux.

## 5 — Fatigue

**Décision Idan (Issue #14) :** la fatigue n’est pas un jet. Tout mercenaire survivant **non blessé** termine la mission fatigué. Un blessé n’a pas de compteur Fatigue en plus de sa blessure.

La **durée** de fatigue dépend de :

- l’Endurance ;
- la **quantité cumulée de dégâts réellement subis pendant toute la mission**.

<aside>
🩸

Les soins restaurent les PV mais **n’effacent pas la contrainte physique déjà encaissée**. Il faut donc conserver un compteur de dégâts cumulés pour la mission.

</aside>

**Formule PLAYTEST V1** (Issue #14) :

$$
JoursFatigue = Clamp\left(Ceil\left(1 + 2 \times \frac{DegatsCumulesSubis}{PV_{max}} - \frac{Endurance}{100}\right),\ 1,\ 7\right)
$$

Avec Endurance 50 : 1 jour sans dégâts, 2 jours après 0,5 × PV max encaissés, 3 jours après 1 × PV max, 5 jours après 2 × PV max, 7 jours après 3 × PV max. Un tank soigné plusieurs fois peut revenir à pleins PV mais complètement rincé.

## 6 — Durée d’une blessure

La durée d’indisponibilité d’un blessé dépend au minimum de :

- la gravité / profondeur du traumatisme ;
- l’Endurance ;
- les **capacités soignantes du camp**.

**Formule PLAYTEST V1** (proposition Chatty, Issue #14) :

$$
Gravite = Clamp\left(50 - 250 \times \frac{PV_{restants}}{PV_{max}},\ 0,\ 100\right)
$$

Repères : 0 à 20 % PV, 25 à 10 %, 50 à 0 PV, 75 à -10 %, 100 à -20 %.

$$
JoursBlessure = Ceil\left(Max\left(1,\ \left(1 + \frac{Gravite}{10}\right) \times \left(1 - \frac{Endurance}{300}\right) \times FacteurSoinsCamp\right)\right)
$$

En V1, `FacteurSoinsCamp = 1` ; les bâtiments médicaux le feront baisser. Avec Endurance 50 : gravité 25 → 3 jours, 50 → 5 jours, 75 → 8 jours, 100 → 10 jours.

## 7 — Chaîne de résolution post-mission

Ordre retenu :

1. `PV < 0` → jet de mort ;
2. mort → fin du traitement du personnage ;
3. survivant avec `PV < 0` → blessure automatique ;
4. `0 à 20 % PV max` → jet de blessure ;
5. tous les survivants non blessés → fatigue automatique, dont seule la durée varie ;
6. résolution des récompenses, réputation, XP, butin et retour.

Les sorties opérationnelles sont donc au minimum : **mort / blessé / fatigué / opérationnel** (après récupération).

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

- coefficients PLAYTEST des formules de blessure, de fatigue et de durée, à ajuster en jeu ;
- moment exact où commencent les soins : dès la fin du combat (le trajet retour compte) ou seulement au retour au camp ;
- influence précise des bâtiments médicaux ;
- séquelles permanentes (reportées, décision Idan) ;
- sort exact des mercenaires ayant fui hors de la carte, capturés ou disparus, abandon et extraction des personnages laissés sur place.

## 11 — Implémentation (prototype)

- Les règles §3 à §7 sont codées dans `game-core/mission-end.js`, sans dépendance à l’interface. Toutes les valeurs PLAYTEST sont des constantes `mission.*` de `data/reference/formula-constants.json` : on les ajuste sans toucher au code.
- Le moteur de combat tient le compteur de dégâts cumulés de chaque personnage : les PV perdus à chaque coup reçu, y compris sous 0 PV. Cette part sous 0 ne change aucun résultat, puisqu’un blessé n’a pas de compteur Fatigue.
- Mission Test : à la fin du combat, votre équipe passe la chaîne §7 et un bilan s’affiche (mort, blessé ou fatigué, durée d’indisponibilité, détail des jets). Ce bilan **n’est pas encore appliqué à la compagnie**.
- Choix d’implémentation à confirmer, en attendant les règles du §10 : la chaîne s’applique après une victoire comme après une défaite ; un mercenaire sorti de la carte en fuite la passe comme tout survivant, avec ses PV restants ; les ennemis ne la passent pas.
