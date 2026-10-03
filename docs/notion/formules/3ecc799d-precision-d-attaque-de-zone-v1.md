# Précision d'attaque de zone V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ecc799da3d181828c34f857d4be7366?pvs=204
> Dernière édition Notion : 2026-10-01T16:47:18.078Z

## Principe
Une attaque de zone vise d'abord **une case**. Pour une cible située à une distance hexagonale `d` de cette case :
$$
P_{touche}(d)=max(0,P_{touche,centre}-10\times d)
$$
- `d=0` : aucun malus ;
- `d=1` : −10 points ;
- `d=2` : −20 points ; etc.
Le rayon et la forme de zone sont définis séparément par chaque attaque.
