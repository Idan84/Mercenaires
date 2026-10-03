# Dégâts PV physiques V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3eac799da3d181c38685f9fb040d3bdf?pvs=204
> Dernière édition Notion : 2026-09-30T19:15:01.236Z

## Principe
Cette formule s’applique **uniquement après un toucher et une blessure réussis**. Elle répond à la question : combien de PV sont réellement perdus ?
## Jet de dégâts de l’arme
L’arme fournit son dé de dégâts PV. La qualité de l’item modifie ce jet : **Usée ×0,8 · Correcte ×1 · Grand Luxe ×1,2**.
Si une arme `Au choix` est réellement maniée à deux mains, elle reçoit en plus **×1,5** sur son jet de dégâts. Une arme exclusivement `2 mains` n'applique pas ce multiplicateur : ses dés de base sont déjà équilibrés comme des dégâts deux mains.
$$
JetArmeEffectif=JetArme\times Qualite\times MultiplicateurPrise
$$
avec `MultiplicateurPrise = 1,5` uniquement pour une arme `Au choix` utilisée à deux mains, sinon `1`.
## Force
$$
facteurForce=\frac{2\times Force_{att}}{100}
$$
À Force 50, le facteur vaut ×1 ; à Force 100, ×2.
## Résistance physique
On lance un D3. La résistance nominale varie légèrement à chaque impact :
$$
facteurResistance=1-\frac{ResistancePhysique}{100}\times\frac{D3+8}{10}
$$
Le D3 fait donc varier l’efficacité de la résistance à **90 % / 100 % / 110 %** de sa valeur nominale. La Résistance physique est exprimée en pourcentage et sa valeur réelle est prévue entre **0 % et 50 % maximum**.
## Perte de PV
$$
PertePV=\left\lceil 10\times JetArmeEffectif\times\frac{2Force_{att}}{100}\times\left(1-\frac{ResistancePhysique}{100}\times\frac{D3+8}{10}\right)\right\rceil
$$
Le résultat final est multiplié par **10** puis arrondi à l’entier supérieur pour conserver de la granularité dans les petits effets de dégâts, poison, saignement ou régénération.
## Overrides critiques CAC V1
Après une blessure réussie, [Page Notion](https://app.notion.com/p/3ebc799da3d181488d08f35e58215458) peut remplacer les composantes aléatoires du calcul par leur maximum favorable à l'attaquant.
Sur un résultat naturel **96–100** au jet de Blesser, [Page Notion](https://app.notion.com/p/3ebc799da3d181688a91f508768adac2) peut au contraire infliger à l'attaquant les dégâts minimum de son propre coup.

> 
	La formule de dégâts de base reste inchangée : les critiques fournissent des **overrides** au jet de dégâts et à la variation de Résistance physique.


