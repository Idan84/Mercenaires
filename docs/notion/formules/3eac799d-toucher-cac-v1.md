# Toucher CAC V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3eac799da3d181bbbe04d7e9f08395ce?pvs=204
> Dernière édition Notion : 2026-09-30T20:04:21.647Z

## Principe
Cette formule répond uniquement à la question : **l’attaque de corps-à-corps touche-t-elle la cible ?** Elle ne détermine ni la blessure ni les dégâts.
## Delta
$$
\Delta = DexteriteEffective_{att} + 0.2(MaitriseCategorieArme + MaitriseArme + Perception_{att} + VitesseCombatEffective_{att}) - EsquiveEffective_{def} - 0.2(Perception_{def} + VitesseCombatEffective_{def})
$$
## Probabilité de toucher
$$
P_{touche}=10+\frac{80}{1+e^{-\Delta/20}}
$$
La probabilité reste comprise entre **10 % et 90 %**. `DexteriteEffective` est égale à la Dextérité normale sauf en combat à deux armes. `VitesseCombatEffective` intègre les malus d’armure et des objets tenus, notamment le poids/inertie des armes. Les critiques sont traités par leurs règles dédiées.
## État : Au Sol
Si le défenseur possède l’état [Page Notion](https://app.notion.com/p/3ebc799da3d1815fa0b3fe7c48c39602), alors `EsquiveEffective_def = 0` pour le calcul du toucher. Sa Perception et sa Vitesse effective restent utilisées normalement dans le score de défense.
## Bouclier
Un bouclier ne modifie pas directement $`P_{touche}`$. Après un Toucher réussi, [Page Notion](https://app.notion.com/p/3ebc799da3d18126b594dcad23bb1b17) effectue un jet de sauvegarde basé sur la Dextérité du défenseur et ses maîtrises de bouclier. Un blocage réussi transforme le Toucher en **coup bloqué** avant le critique positif de Toucher.
