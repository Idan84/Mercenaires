> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# En Fuite

Catégorie: Mental
Code: state.fleeing
Effet mécanique: État appliqué après un échec de Courage. À l'application, le personnage dépense immédiatement tout mouvement restant pour s'éloigner. Au début de chacun de ses tours, il tente une reprise de contrôle de plus en plus facile ; en cas d'échec, un D3 impose Course effrénée, Cachons-nous ou Feu à volonté.
Utilise l'esquive en défense: Yes

## Principe

L'état **En Fuite** représente un personnage qui décide de rompre le combat après un échec de Courage.

Il n'est pas assimilé à `Au Sol` : le personnage reste mobile et conserve son Esquive tant qu'aucune autre règle ne la modifie.

## Effet immédiat V1

À l'application de l'état, [Mouvement de fuite immédiat V1](/design/#doc=formulas/mouvement-de-fuite-immediat-v1.md) utilise **tout le mouvement restant** pour éloigner le personnage autant que possible de l'adversaire ayant déclenché la fuite.

S'il ne reste aucun mouvement disponible, le personnage ne bouge pas mais demeure **En Fuite**.

## Tours suivants — reprise de contrôle

Au début de chaque tour commencé **En Fuite**, résoudre [Reprise de contrôle — En Fuite V1](/design/#doc=formulas/reprise-de-controle-en-fuite-v1.md).

- réussite : l'état est retiré immédiatement ; le joueur récupère le contrôle et joue une activation normale complète ;
- échec : le personnage reste En Fuite et son activation est remplacée par [Comportement automatique — En Fuite V1](/design/#doc=formulas/comportement-automatique-en-fuite-v1.md).

Le test devient progressivement plus facile à chaque tour passé En Fuite. La première valeur d'équilibrage est **+10 au score de récupération par tour**, plafonnée par la borne générale de 95 %.

## Comportements automatiques sur `1D3`

1. **Course effrénée** : jusqu'à `2 × MouvementBase` en s'éloignant au maximum de l'ennemi le plus proche, avec priorité à la sortie de carte si elle est accessible ; les attaques d'opportunité s'appliquent normalement.
2. **Cachons-nous** : jusqu'à `2 × MouvementBase` vers l'abri total valide le plus proche situé dans la direction opposée à l'ennemi le plus proche ; le chemin ne doit pas entrer dans un hexagone adjacent à un ennemi. **Si aucun abri total valide n'existe, il continue de fuir vers une sortie de carte** en s'éloignant des ennemis.
3. **Feu à volonté** : tirer sur l'ennemi le plus proche au maximum de la cadence actuellement disponible ; si aucun tir légal n'est possible, rester sur place.

<aside>
🏃

Tant que l'état persiste, le même cycle recommence au début du tour suivant : **test de reprise de contrôle → D3 seulement en cas d'échec**.

</aside>