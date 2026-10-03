# Toucher distance V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d181a3ba94d19f810bed85?pvs=204
> Dernière édition Notion : 2026-09-30T22:24:23.987Z

## Distance
$$
PorteeSansMalus=\left\lceil\frac{PorteeMax}{4}\right\rceil
$$
Si `Distance ≤ PorteeSansMalus`, `MalusDistance = 0`. Sinon :
$$
MalusDistance=40\times\frac{Distance-PorteeSansMalus}{PorteeMax-PorteeSansMalus}
$$
## Toucher
Le noyau de Toucher reste celui du CAC, auquel on soustrait `MalusDistance` avant la fonction logistique.
La couverture est appliquée **après** le calcul de la probabilité :
- aucune : `×1` ;
- partielle : `×0,5` ;
- forte / quasi totale : `×0,25`.
Une absence réelle de ligne de vue rend le tir impossible ; `×0,25` représente une cible presque entièrement cachée, pas un tir à travers un mur.
