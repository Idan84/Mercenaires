# Frappe dans le dos V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ecc799da3d1819ba68cc80196e7861e?pvs=204
> Dernière édition Notion : 2026-10-01T16:49:11.003Z

## Déclencheurs
Une attaque bénéficie de **Frappe dans le dos** si au moins une condition est vraie :
- il s'agit d'une **attaque d'opportunité** ;
- la cible est **encerclée** ;
- la cible est en train de **fuir l'attaquant** ;
- l'attaque n'a **pas été détectée** avant son déclenchement (camouflage, invisibilité, compétence, magie, embuscade, etc.).
## Effet sur Toucher
La Perception défensive est annulée :
$$
PerceptionDefensive=0
$$
## Effet sur Blesser
La résistance de la cible au **type de dégâts concerné** est divisée par deux avant le calcul du matchup de Blesser :
$$
ResistanceTypeEffective=0.5\times ResistanceType
$$
La **Résistance physique %** qui réduit ensuite les PV perdus n'est pas divisée par deux.
## Bouclier
Le blocage au bouclier reste possible, même contre une attaque non détectée ou venue du dos.
