# Blocage bouclier physique V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d18126b594dcad23bb1b17?pvs=204
> Dernière édition Notion : 2026-10-01T16:48:22.503Z

## Principe
Le bouclier n'ajoute ni Esquive ni Agilité. Il intervient **après un jet de Toucher réussi** comme un jet de sauvegarde : l'attaque aurait touché, mais elle est interceptée par le bouclier.
La même règle s'applique au **CAC et aux projectiles physiques** : flèche, carreau, balle, fronde, etc. Aucun malus spécifique n'est appliqué contre un projectile en V1.
## Maîtrise effective du bouclier
$$
MaitriseBouclierEffective=\frac{MaitriseCategorieBoucliers+MaitriseBouclierPrecis}{2}
$$
## Bonus de bouclier
Le champ `Bonus blocage base` est une valeur positive d'item et suit donc la qualité générique :
$$
BonusBlocageEffectif=BonusBlocageBase\times MultiplicateurQualite
$$
## Probabilité de blocage
$$
P_{blocage}=min\left(80,max\left(5,\frac{Dexterite_{def}+MaitriseBouclierEffective}{2}+BonusBlocageEffectif\right)\right)
$$
On lance 1D100. Si le résultat est inférieur ou égal à $`P_{blocage}`$, le coup est **bloqué** et ne compte pas comme un toucher réel.
## Ordre dans le pipeline
`Jet Toucher → Toucher réussi → Blocage bouclier → Critique positif Toucher éventuel → Blesser`.
- Un coup bloqué ne déclenche ni critique positif de Toucher, ni Blesser, ni dégâts.
- Pour l'enchaînement normal, un blocage compte comme un non-toucher et casse la chaîne.
- En combat à deux armes, chaque attaque de la paire est résolue séparément ; la paire peut continuer si au moins une des deux attaques touche réellement.
- Le bouclier occupe la main secondaire : une arme `Au choix` est donc utilisée en mode une main.
- Le blocage reste autorisé contre une attaque bénéficiant de **Frappe dans le dos** ou une attaque non détectée : abstraction volontaire, le bouclier peut aussi protéger le dos.
