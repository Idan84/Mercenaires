# Critique positif CAC V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d18157b83cf6fb1a9d8ea2?pvs=204
> Dernière édition Notion : 2026-09-30T17:50:57.262Z

## Déclenchement
Le test n'est effectué **que si le jet de toucher a réussi**.
## Probabilité
$$
P_{crit}=\min(25,\max(1,Chance/10))
$$
On lance ensuite un D100 :
$$
D100\le P_{crit}\Rightarrow critique\ positif
$$
La probabilité est donc comprise entre **1 % et 25 %**.
## Résultat moteur
Une réussite pose `critical_success = true`.

> 
	L'effet exact du critique sur l'armure est traité séparément afin de pouvoir l'ajuster sans modifier la probabilité de critique.


