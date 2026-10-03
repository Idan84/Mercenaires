# Attaque d'opportunité CAC V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ecc799da3d181559829dce0edf3a0d0?pvs=204
> Dernière édition Notion : 2026-10-01T16:49:42.728Z

## Zone de menace
Un combattant menace les hexagones qu'il peut atteindre avec son arme de mêlée : une arme standard menace à 1 hex ; une arme d'hast configurée `1–2` menace jusqu'à 2 hex.
Quitter une case tout en restant dans la même zone de menace ne déclenche rien. **Sortir de la zone menacée** déclenche la réaction.
## Déclencheurs V1
L'attaque d'opportunité se résout immédiatement lorsqu'un personnage :
- quitte volontairement la zone de menace d'un adversaire ;
- effectue une attaque à distance contre **une autre cible** alors qu'il est menacé par cet adversaire ;
- plus tard, effectue une action explicitement marquée comme exposante.
Chaque adversaire dont la zone de menace est concernée peut réagir. Aucun verrou n'empêche le déplacement : le personnage peut partir s'il accepte les conséquences.
## Toucher d'opportunité
La cible s'expose : son Esquive est divisée par deux et sa Perception défensive n'intervient pas.
$$
Delta_{opportunite}=Dex_{att}+0.2(MaitriseCategorie+MaitriseArme+Perception_{att}+VitesseEffective_{att})-0.5\times EsquiveEffective_{def}-0.2\times VitesseEffective_{def}
$$
$$
P_{toucher}=10+\frac{80}{1+e^{-Delta_{opportunite}/20}}
$$
Le reste suit le pipeline CAC normal : bouclier le cas échéant, critiques, Blesser, dégâts et Courage.
## Une ou deux armes
- Une arme tenue : **un seul coup d'opportunité**, sans enchaînement d'attaques.
- Combat à deux armes : **un coup avec chaque arme**, donc deux coups. Les règles normales du combat à deux armes et des critiques négatifs restent applicables, mais aucun troisième coup n'est généré par la cadence.
## Ordre de résolution
La réaction intervient **avant la fin de l'action qui l'a provoquée**. Si ses conséquences empêchent l'action annoncée, celle-ci est annulée ; sinon elle reprend ensuite.
Une fuite peut elle-même provoquer des attaques d'opportunité en quittant des zones de menace.

> 
	Toute attaque d'opportunité bénéficie de [Page Notion](https://app.notion.com/p/3ecc799da3d1819ba68cc80196e7861e) : Perception défensive annulée et résistance au type de dégâts divisée par deux pour l'étape Blesser. Le blocage au bouclier reste néanmoins possible.


