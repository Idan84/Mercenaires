# Courage post-attaque CAC V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d181feab89f2e269b76863?pvs=204
> Dernière édition Notion : 2026-10-01T16:50:18.226Z

## Score de Courage
Le même noyau est utilisé dans les deux cas :
$$
ScoreCourage=Courage+0.25\times Volonte-0.25\times Intimidation_{adverse}
$$
$$
P_{tenir,base}=min(95,max(5,ScoreCourage))
$$
## Cas 1 — l'attaquant a blessé sa cible
À la fin de la séquence offensive, si **au moins un jet de Blesser a réussi** et que la cible est encore en état de fuir, le **défenseur** effectue le test.
$$
P_{tenir}=P_{tenir,base}
$$
`D100 > P_tenir` → appliquer [Page Notion](https://app.notion.com/p/3ebc799da3d1817a804fd813fe29a521).
## Cas 2 — l'attaquant n'a blessé personne
Si **aucun jet de Blesser n'a réussi** pendant la séquence, c'est normalement l'**attaquant** qui teste son Courage face à l'Intimidation du défenseur.
**Exception encerclement :** si l'attaquant participe à un [Page Notion](https://app.notion.com/p/3ecc799da3d181ae8e82ccd7c73a1cc7) valide contre cette cible, **aucun test n'est effectué**. Il compte sur ses alliés.
Dans les autres cas, la probabilité de fuite est divisée par deux :
$$
P_{fuite,base}=100-P_{tenir,base}
$$
$$
P_{fuite}=\frac{P_{fuite,base}}{2}
$$
soit directement :
$$
P_{tenir}=100-\frac{100-P_{tenir,base}}{2}
$$
Ainsi, avec la borne de base 5–95 %, ce cas donne une probabilité réelle de tenir comprise entre **52,5 % et 97,5 %**.
## Fréquence du test
En situation normale, le test n'est effectué **qu'une fois à la fin de la séquence/activation offensive**, pas après chaque coup individuel.
**Exception sous-nombre :** une cible en sous-nombre utilise [Page Notion](https://app.notion.com/p/3ecc799da3d1812e9014c8e88ce61b72) et teste **immédiatement après chaque blessure réellement reçue**. Un échec applique En Fuite sur-le-champ et peut interrompre la séquence si la cible se déplace.

> 
	Le manque de Courage reste dangereux, mais échouer à blesser n'est pas une invitation quasi automatique à fuir : dans ce second cas, seule la moitié des échecs de Courage provoque réellement la Fuite.


