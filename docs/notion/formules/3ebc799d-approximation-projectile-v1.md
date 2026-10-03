# Approximation projectile V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d181a4be4dcbd527f992e8?pvs=204
> Dernière édition Notion : 2026-09-30T22:07:40.309Z

## Principe
Lorsqu'un tir rate sa cible principale, le moteur cherche les personnages présents dans le **couloir de tir**.
Ordre :
1. candidat le plus proche de la cible initiale ;
2. en cas d'égalité, priorité à un ennemi ;
3. puis candidats suivants avec un facteur décroissant.
Pour le candidat d'indice `i` :
$$
FacteurApprox_i=0.35\times0.5^{i-1}
$$
$$
P_{accident,i}=P_{touche,candidat}\times FacteurApprox_i
$$
Dès qu'un candidat est touché, le projectile s'arrête et ce personnage devient la cible réelle pour **critique → Blesser → dégâts → Courage éventuel**.
