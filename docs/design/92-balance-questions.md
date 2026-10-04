# Questionnement équilibrage

Registre des **observations d'équilibrage** relevées en simulation ou en partie, et des pistes possibles. Rien ici n'est une règle : les règles validées restent dans leurs documents. Une décision prise à partir d'une de ces questions est écrite dans la règle concernée, et la question est marquée « tranchée ».

Décision d'Idan du 2026-10-03 : l'équilibrage est traité **plus tard**. Ce fichier sert à ne rien perdre d'ici là.

## Méthode de mesure actuelle

Combats automatiques 3 contre 3 dans la Mission Test, exécutés dans un navigateur par JC3 :

- l'équipe du joueur est jouée par un bot simple : il attaque s'il le peut, sinon il avance vers l'ennemi le plus proche ;
- l'équipe ennemie utilise l'IA V1 de la Mission Test ;
- carte 9×7 avec des équipes sur les bords, puis 13×9 avec des équipes à deux colonnes du bord (à partir de la mesure E2 bis).

Les bots ne cherchent ni à se placer, ni à encercler, ni à éviter les attaques d'opportunité. Les chiffres donnent des **ordres de grandeur**, pas un verdict.

## Questions ouvertes

| # | Sujet | Observation | Statut |
|---|---|---|---|
| E1 | Courage | 41 % des tests de Courage échouent | Ouvert |
| E2 | Fuite et sortie de carte | Les fuyards sortent de la carte dans 71 % des combats (83 % sur la carte 13×9) | Ouvert |
| E3 | Encerclement | Un encerclement survient dans 81 % des combats | Ouvert |
| E4 | Avantage de l'équipe qui commence | Le joueur gagne environ 75 % des combats | À mesurer |
| E5 | Létalité de la chaîne de fuite | Sous-nombre → blessure → Fuite → attaques d'opportunité dans le dos | À mesurer |
| E6 | Fuite immédiate sans mouvement | Un personnage qui panique sans mouvement restant reste sur place | À observer en jeu |
| E7 | Fin de mission : mort sous 0 PV | 76 % des mercenaires tombés sous 0 PV meurent ; le capitaine meurt dans 12 % des combats où il se bat | Blessés : tranché (zone 0–50 %) ; morts : ouvert |
| E8 | Fin de mission : poids de l'Endurance | Environ 7 points de risque de blessure entre un mercenaire peu et très endurant | Ouvert |

### E1 — Courage : 41 % d'échecs

**Mesure (2026-10-03, 200 combats)** : 2 541 tests de Courage, 1 038 paniques.

**Règles concernées** : [Courage post-attaque CAC V1](/design/#doc=formulas/courage-post-attaque-cac-v1.md), [Courage post-tir V1](/design/#doc=formulas/courage-post-tir-v1.md), [Courage en sous-nombre V1](/design/#doc=formulas/courage-en-sous-nombre-v1.md).

Avec des valeurs générées typiques (Courage autour de 45, Volonté et Intimidation de quelques dizaines), le score de tenue tourne autour de 40 à 50 %. Chaque blessure reçue, même légère, déclenche un test.

**Pistes à discuter (aucune n'est décidée)** :
- l'échelle du Courage à la génération ;
- le coefficient −0,25 de l'Intimidation adverse ;
- des objets ou effets de Courage. Idée d'Idan : une **amulette du courage** vendue partout pour 3 pièces d'or.

### E2 — Fuite : sorties de carte très fréquentes

**Mesure (2026-10-03, 200 combats)** : 236 sorties de carte dans 142 combats sur 200 ; 494 reprises de contrôle ; 356 tours de fuite subis.

**Règles concernées** : [Comportement automatique — En Fuite V1](/design/#doc=formulas/comportement-automatique-en-fuite-v1.md), [Reprise de contrôle — En Fuite V1](/design/#doc=formulas/reprise-de-controle-en-fuite-v1.md).

La carte 9×7 et des points d'apparition collés au bord rendent la sortie presque toujours atteignable.

**Mesure E2 bis (2026-10-03, carte 13×9, équipes à deux colonnes du bord, 200 combats)** : 347 sorties de carte dans 165 combats sur 200. Agrandir la carte **ne suffit pas**.

Cause probable : un fuyard dispose de `2 × MouvementBase` (souvent 6 à 10 hexagones), alors que sur 9 lignes aucune case n'est à plus de 4 lignes du bord haut ou bas. La sortie est donc presque toujours atteignable en un tour, et la règle la rend prioritaire.

**Pistes à discuter (aucune n'est décidée)** : sorties limitées à certains bords (par exemple le bord de déploiement de l'équipe) ; cartes plus hautes ; un coût de sortie ; un autre statut pour un fuyard sorti (aujourd'hui hors combat dans la Mission Test).

### E3 — Encerclement fréquent

**Mesure (2026-10-03, 200 combats, avant le Courage)** : un encerclement dans 162 combats ; 935 coups portés contre une cible encerclée.

**Règle concernée** : [Encerclement CAC V1](/design/#doc=formulas/encerclement-cac-v1.md).

Dès que deux combattants frappent la même cible, il suffit qu'ils ne soient pas côte à côte. En mêlée à plusieurs, la Frappe dans le dos devient la norme.

### E4 — Avantage de l'équipe qui commence

**Mesures** : le joueur gagne entre 74 et 79 % des combats selon les séries. Le joueur commence toujours, et son bot diffère de l'IA ennemie : on ne sait pas encore lequel des deux explique l'écart.

**À mesurer** : faire commencer l'ennemi et comparer, à bots identiques.

### E5 — Létalité de la chaîne de fuite

Déjà demandé par le [backlog](/design/#doc=90-mechanics-backlog.md) et relevé par Groky (Issue #4) : sous-nombre → blessure → Fuite → attaques d'opportunité et Frappe dans le dos. Un personnage déjà mal en point peut mourir en une seule activation adverse.

**À mesurer** : taux de mise hors combat d'un fuyard dans les deux tours qui suivent sa panique.

### E6 — Fuite immédiate sans mouvement restant

Conforme à [Mouvement de fuite immédiat V1](/design/#doc=formulas/mouvement-de-fuite-immediat-v1.md) : sans mouvement restant, le personnage reste sur place, puis peut parcourir jusqu'à `2 × MouvementBase` au tour suivant. Relevé par Groky (Issue #4) : effet « arrêt sur image ».

**À observer** en jouant, avant tout changement.

### E7 — Fin de mission : mort sous 0 PV

Mesure sur 800 combats : 8 compagnies différentes, équipe de 3 tirée au hasard dans la compagnie à chaque combat (capitaine compris), avec les valeurs PLAYTEST de [Fin de mission](/design/#doc=10-mission-time-and-unavailability.md) et les durées ajustées par Idan (blessure de 7 à 60 jours, fatigue de base 5 jours) :

| Bilan | Part des mercenaires | Durée |
|---|---:|---|
| Mort | 15 % | — |
| Blessé | 8,5 % | 43 jours en moyenne (médiane 47, de 9 à 60 ; 6 % au plafond) |
| Fatigué | 76 % | 5 jours : 60 %, 6 jours : 36 %, 7 jours : 4 % |

**Cause** : le jet de mort (formule validée) vaut 100 % dès -10 % des PV max, et un coup retire souvent bien plus que cela. 76 % des mercenaires tombés sous 0 PV meurent. Le capitaine meurt dans 12 % des combats où il se bat, de 3 % à 27 % selon le capitaine : ce serait un Game Over en campagne.

**Pistes** : aucune pour l'instant ; à rejouer avec de vraies missions, où le joueur choisira d'engager ou non son capitaine.

**Décision d'Idan (2026-10-03)** : « on tue assez, on ne blesse pas assez ». Les morts restent inchangés, et la zone du jet de blessure passe de 0–20 % à **0–50 % des PV max**, pour avoir plus de blessés que de morts. Seuls 7 % des combattants finissent entre 0 et 20 % de leurs PV, et 59 % au-dessus de la moitié : augmenter la probabilité dans l'ancienne zone ne faisait passer les blessés que de 8,5 % à 9,5 %.

Espérance mesurée sur les mêmes 800 combats :

| Jet de blessure entre… | Morts | Blessés | Fatigués | Durée moyenne d'une blessure |
|---|---:|---:|---:|---:|
| 0 et 20 % (avant) | 14,5 % | 8,5 % | 77 % | 42 j |
| 0 et 30 % | 14,5 % | 10,5 % | 75 % | 37 j |
| 0 et 40 % | 14,5 % | 13,4 % | 72 % | 31 j |
| **0 et 50 % (retenu)** | 14,5 % | **16,3 %** | 69 % | 27 j |

### E8 — Fin de mission : poids de l'Endurance

Relevé par JC3 (Issue #14) sur 3 000 mercenaires générés : l'Endurance va de 35 à 75 pour 80 % d'entre eux. Dans le jet de blessure (`- Endurance / 6`), cela ne fait varier le risque que d'environ 7 points ; ce sont les PV restants qui décident presque tout.

**Piste** : si l'Endurance doit compter davantage, baisser le diviseur `mission.wound.endurance_divisor`.
