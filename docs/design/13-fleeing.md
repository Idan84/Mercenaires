# En Fuite

État **mental** appliqué après un échec de Courage. Le personnage rompt le combat : il dépense aussitôt tout son
mouvement restant pour s'éloigner ; au début de chacun de ses tours, il tente une reprise de contrôle de plus en plus
facile ; en cas d'échec, un D3 impose Course effrénée, Cachons-nous ou Feu à volonté.

Ce n'est pas `Au Sol` : le personnage reste mobile et **garde son Esquive** tant qu'aucune autre règle ne la modifie.

## Effet immédiat V1

[Mouvement de fuite immédiat V1](/design/#doc=formulas/mouvement-de-fuite-immediat-v1.md) : **tout le mouvement
restant** l'éloigne autant que possible de l'adversaire qui a déclenché la fuite. Sans mouvement restant, il ne bouge pas
mais reste **En Fuite**.

## Règles complémentaires (Idan, 2026-10-03)

- Déjà **En Fuite**, il ne reteste pas son Courage quand il est de nouveau blessé : son seul test est la reprise de
  contrôle au début de ses tours.
- **En Fuite**, il ne fait pas d'attaque d'opportunité.
- Un ennemi **actif** est vivant et n'est pas En Fuite.

## Aura du capitaine (Idan, 2026-10-24)

Tant que le capitaine est sur le champ de bataille (vivant, sur la carte), ses alliés à **10 cases ou moins** gagnent en
Courage, pour leurs tests de Courage et leurs reprises de contrôle, **35 % de son Courage + 25 % de son Charisme**,
équipement compris, arrondi ; lui-même n'en profite pas. Sur sa fiche, cette aura remplace la mention du salaire. But :
inciter à emmener son capitaine au combat (il y gagne aussi de l'expérience), à bien le choisir et l'équiper. Au départ,
médiane +30 (de +21 à +40 pour 90 % des capitaines), puis l'aura grandit avec lui.

## Tours suivants — reprise de contrôle

Au début de chaque tour commencé **En Fuite** : [Reprise de contrôle — En Fuite
V1](/design/#doc=formulas/reprise-de-controle-en-fuite-v1.md).

- réussite : l'état est retiré aussitôt ; le joueur reprend le contrôle et joue une activation normale complète ;
- échec : il reste En Fuite et son activation est remplacée par [Comportement automatique — En Fuite
  V1](/design/#doc=formulas/comportement-automatique-en-fuite-v1.md).

Le test devient plus facile à chaque tour passé En Fuite : **+10 au score de récupération par tour**, plafonné par la
borne générale de 95 %.

## Comportements automatiques sur `1D3`

1. **Course effrénée** : jusqu'à `2 × MouvementBase` en s'éloignant au maximum de l'ennemi le plus proche, sortie de
   carte prioritaire si elle est accessible ; les attaques d'opportunité s'appliquent normalement.
2. **Cachons-nous** : jusqu'à `2 × MouvementBase` vers l'abri total valide le plus proche, à l'opposé de l'ennemi le
   plus proche ; le chemin n'entre dans aucune case adjacente à un ennemi. **Sans abri total valide, il fuit vers une
   sortie de carte** en s'éloignant des ennemis.
3. **Feu à volonté** : tirer sur l'ennemi le plus proche au maximum de la cadence disponible ; sans tir légal, rester
   sur place.

Tant que l'état persiste, le cycle recommence au tour suivant : **reprise de contrôle → D3 seulement en cas d'échec**.
