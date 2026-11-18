# Questionnement équilibrage

Observations d'équilibrage relevées en simulation ou en partie, et pistes possibles. **Rien ici n'est une règle.** Une
décision prise à partir d'une question va dans la règle concernée, et la question quitte cette page. L'équilibrage est
traité **plus tard** (Idan, 2026-10-03).

## Méthode de mesure

Combats automatiques 3 contre 3 dans la Mission Test : notre équipe jouée par un bot simple (il attaque s'il peut,
sinon avance vers l'ennemi le plus proche), l'ennemi par l'IA V1 ; carte 9×7, équipes sur les bords, puis 13×9, équipes
à deux colonnes du bord (E2 bis). Les bots ne se placent pas, n'encerclent pas, n'évitent pas les attaques
d'opportunité : des **ordres de grandeur**, pas un verdict.

## Questions ouvertes

| # | Sujet | Observation | Statut |
|---|---|---|---|
| E1 | Courage | 41 % des tests de Courage échouent | Ouvert |
| E2 | Fuite et sortie de carte | Les fuyards sortent de la carte dans 71 % des combats (83 % sur la carte 13×9) | Ouvert |
| E3 | Encerclement | Un encerclement survient dans 81 % des combats | Ouvert |
| E4 | Avantage de l'équipe qui commence | Le joueur gagne environ 75 % des combats | À mesurer |
| E5 | Létalité de la chaîne de fuite | Sous-nombre → blessure → Fuite → attaques d'opportunité dans le dos | À mesurer |
| E6 | Fuite immédiate sans mouvement | Un personnage qui panique sans mouvement restant reste sur place | À observer en jeu |
| E8 | Fin de mission : poids de l'Endurance | Environ 7 points de risque de blessure entre un mercenaire peu et très endurant | Ouvert |

### E1 — Courage : 41 % d'échecs

2026-10-03, 200 combats : 2 541 tests, 1 038 paniques. Règles : [Courage post-attaque CAC
V1](/design/#doc=formulas/courage-post-attaque-cac-v1.md), [Courage post-tir V1](/design/#doc=formulas/courage-post-tir-v1.md),
[Courage en sous-nombre V1](/design/#doc=formulas/courage-en-sous-nombre-v1.md). Avec Courage ≈ 45, Volonté et
Intimidation de quelques dizaines, le score de tenue tourne autour de 40 à 50 % ; chaque blessure, même légère, déclenche
un test.

Pistes (rien n'est décidé) : l'échelle du Courage à la génération ; le coefficient −0,25 de l'Intimidation adverse ; des
objets ou effets de Courage. Idée d'Idan : une **amulette du courage** vendue partout pour 3 pièces d'or.

### E2 — Fuite : sorties de carte très fréquentes

2026-10-03, 200 combats : 236 sorties dans 142 combats ; 494 reprises de contrôle ; 356 tours de fuite. E2 bis (13×9,
équipes à deux colonnes du bord) : 347 sorties dans 165 combats : agrandir la carte **ne suffit pas**. Règles :
[Comportement automatique — En Fuite V1](/design/#doc=formulas/comportement-automatique-en-fuite-v1.md), [Reprise de
contrôle — En Fuite V1](/design/#doc=formulas/reprise-de-controle-en-fuite-v1.md).

Cause probable : un fuyard a `2 × MouvementBase` (souvent 6 à 10 cases) et, sur 9 lignes, aucune case n'est à plus de 4
lignes d'un bord : la sortie, prioritaire, est presque toujours atteignable en un tour.

Pistes : sorties limitées à certains bords (celui du déploiement de l'équipe) ; cartes plus hautes ; un coût de sortie ;
un autre statut pour un fuyard sorti (aujourd'hui hors combat).

### E3 — Encerclement fréquent

2026-10-03, 200 combats, avant le Courage : un encerclement dans 162 combats ; 935 coups contre une cible encerclée.
Règle : [Encerclement CAC V1](/design/#doc=formulas/encerclement-cac-v1.md). Deux combattants qui frappent la même cible
sans être côte à côte suffisent : en mêlée à plusieurs, la Frappe dans le dos devient la norme.

### E4 — Avantage de l'équipe qui commence

Le joueur gagne 74 à 79 % des combats. Il commence toujours et son bot diffère de l'IA ennemie : on ne sait pas lequel
explique l'écart. **À mesurer** : faire commencer l'ennemi, à bots identiques.

### E5 — Létalité de la chaîne de fuite

Sous-nombre → blessure → Fuite → attaques d'opportunité et Frappe dans le dos (Groky, Issue #4) : un personnage déjà mal
en point peut mourir en une seule activation adverse. **À mesurer** : taux de mise hors combat d'un fuyard dans les deux
tours après sa panique.

### E6 — Fuite immédiate sans mouvement restant

Conforme à [Mouvement de fuite immédiat V1](/design/#doc=formulas/mouvement-de-fuite-immediat-v1.md) : sans mouvement
restant, il reste sur place, puis peut parcourir jusqu'à `2 × MouvementBase` au tour suivant. Effet « arrêt sur image »
(Groky, Issue #4). **À observer** en jouant, avant tout changement.

### E8 — Fin de mission : poids de l'Endurance

Sur 3 000 mercenaires générés, l'Endurance va de 35 à 75 pour 80 % d'entre eux. Dans le jet de blessure
(`- Endurance / 6`), le risque ne varie que d'environ 7 points ; les PV restants décident presque tout. Piste : baisser
le diviseur de l'Endurance (doc 10 §4).
