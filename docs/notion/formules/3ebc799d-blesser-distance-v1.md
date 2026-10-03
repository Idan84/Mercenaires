# Blesser distance V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d1818e9a97facf95fbd163?pvs=204
> Dernière édition Notion : 2026-09-30T22:07:40.309Z

## Formule
$$
DeltaBlesserDistance=Perception+0.2\times(MaitriseCategorie+MaitriseArme)+MatchupDegats-Endurance_{def}
$$
$$
P_{blesser}=10+\frac{80}{1+e^{-DeltaBlesserDistance/20}}
$$
`MatchupDegats` conserve la logique arme contre résistance d'armure du type physique sélectionné.
La **Force est exclue** du Blesser à distance.
