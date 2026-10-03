# Mouvement hexagonal V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d18139a297ecfe65b067ae?pvs=204
> Dernière édition Notion : 2026-09-30T22:07:40.309Z

## Formule
$$
ScoreMobilite=VitesseCombatEffective+0.25\times Endurance+0.10\times Volonte
$$
$$
MouvementBase=\max(1,\lceil ScoreMobilite/15\rceil)
$$
`MouvementBase` est exprimé en **hexagones par action de Mouvement**.
- Mouvement + Attaque : jusqu'à `MouvementBase`, fractionnable.
- Attaque sacrifiée : une seconde action de Mouvement permet jusqu'à `2 × MouvementBase` sur l'activation.
- Aucun plafond artificiel n'est appliqué en V1.
