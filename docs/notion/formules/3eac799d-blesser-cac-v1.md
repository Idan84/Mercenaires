# Blesser CAC V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3eac799da3d181c5965ef78a521d952c?pvs=204
> Dernière édition Notion : 2026-09-30T19:14:38.098Z

## Principe
Cette formule répond uniquement à la question : **le coup qui a touché parvient-il à blesser ?** Elle ne calcule pas encore la perte de PV.
## Matchup arme contre armure
Pour chaque type physique utilisable par l’arme :
$$
matchup[type] = puissanceBlessureArme[type] - resistanceArmureEffective[type]
$$
Si l'attaque a obtenu un **critique positif au toucher**, la résistance d'armure effective est fixée à **0 pour cette attaque et uniquement pour cette étape Blesser**. On utilise alors :
$$
matchupCritique[type] = puissanceBlessureArme[type]
$$
L'Endurance du défenseur et sa Résistance physique restent inchangées.
Pour une arme multi-type, le matchup retenu est choisi par la règle [Page Notion](https://app.notion.com/p/3eac799da3d1813cab14d308c76d6773).
## Delta de blessure
$$
BonusDeuxMains=\begin{cases}MaitriseCombatDeuxMains & \text{si l'arme est réellement utilisée à deux mains}\\0 & \text{sinon}\end{cases}
$$
$$
\Delta_{blessure} = Force_{att} + 0.2(MaitriseCategorieArme + MaitriseArme + BonusDeuxMains) + matchupSelectionne - Endurance_{def}
$$
Une arme `2 mains` est toujours concernée. Une arme `Au choix` ne l'est que si la main secondaire est vide ; avec bouclier ou seconde arme, elle fonctionne à une main.
## Probabilité de blesser
$$
P_{blessure}=10+\frac{80}{1+e^{-\Delta_{blessure}/20}}
$$
La probabilité normale reste comprise entre **10 % et 90 %**.

> 
	**Résistance physique n’intervient pas ici.** Elle agit à l’étape suivante, lors du calcul des PV réellement perdus.


