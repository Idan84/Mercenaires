# Kit graphique : Cités libres

Le kit d'Idan reçu le 2026-11-26 (`humains.zip`, dossier « Cités Libres »). PNG transparents, renommés ici ;
`scripts/build-culture-kit.sh` en tire les versions du jeu (`prototype-web/assets/fiche/kits/cites-libres/`) ;
`scripts/build-pictos.sh` fait du logo le picto de la culture (`prototype-web/assets/pictos/culture-cites-libres.webp`), à la
place de l'ancien master `assets-src/Picto/Culture/cites-libres.jpg`.
Réglages : `data/reference/culture-kits.json`, repris des Nains des montagnes comme point de départ, à régler par Idan
dans le Design Lab (onglet Cultures). Pas d'ornement du titre dans le kit : la culture garde celui de la charte.

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Masque des Nuits Libres.png` | 1312 × 1199 | Logo de la culture : le picto de culture. |
| `cadre.png` | `Cadre vénitien double en ivoire et or.png` | 1536 × 1024 | Le cadre en une pièce : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `cadre-variante-rinceaux.png` | `Cadre de jeu doré sur fond transparent-6.png` | 1536 × 1024 | Autre version du cadre : gardée ici, pas branchée (une culture n'a qu'un cadre). |
| `texture.png` | `Damas vénitien en soie bordeaux-2.png` | 1254 × 1254 | Fond du cartouche du nom et des barres. |
| `rond-central.png` | `Anneau vénitien orné d’éventails et de perles-1.png` | 1448 × 1086 | Rond central de la barre du bas, autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `Médaillon vénitien au lion et masque-2.png` | 1774 × 887 | Bout de la barre du haut. |
| `bouton-jour-suivant.png` | `Bouton lecture vénitien en grenat-3.png` | 1254 × 1254 | Bouton Jour suivant. |
| `coin-orne-eventail.png` | `Équerre dorée à l’éventail vénitien-4.png` | 1263 × 1246 | Ornement de coin. |
| `coin-orne-gobelet.png` | `Ornement vénitien au gobelet et aux raisins-2.png` | 1536 × 1024 | Ornement de coin (dessiné pour le coin haut-droit, remis dans le sens du coin haut-gauche). |
| `coin-orne-des.png` | `Ornement vénitien, dés et pièces d’or-1.png` | 1536 × 1024 | Ornement de coin (dessiné pour le coin bas-gauche, remis dans le sens du coin haut-gauche). |
| `coin-orne-luth.png` | `Ornement d’angle vénitien au luth miniature-4.png` | 1312 × 1199 | Ornement de coin (dessiné pour le coin bas-droit, remis dans le sens du coin haut-gauche). |
| `ornement-gondole.png` | `Frise de gondole vénitienne dorée-5.png` | 2172 × 724 | Ornement posé. |
| `ornement-masques.png` | `Guirlande vénitienne aux masques dorés-3.png` | 2172 × 724 | Ornement suspendu. |
| `ornement-drape.png` | `Ornement vénitien en soie et perles-5.png` | 2172 × 724 | Ornement suspendu de plus : gardé ici, pas branché (une seule place d'ornement suspendu). |
| `ornement-lustre.png` | `Suspension vénitienne en verre et or-6.png` | 2172 × 724 | Ornement suspendu de plus : gardé ici, pas branché (une seule place d'ornement suspendu). |
| `ornement-rapiere.png` | `Rapière vénitienne au ruban de soie-3.png` | 724 × 2172 | Ornement allongé. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut depuis y 54 (51 d'épaisseur), barre du milieu x 742–794 ;
  coin 115 × 115 depuis (40, 47) ; cellules des bordures et de la barre du milieu : un morceau suivi de son reflet
  (`120x51+150+54`, `56x120+47+155`, `53x120+742+300`) ; jonction en T de 71 × 75 px dans le jeu.
- **Rond central** recadré sur son dessin : trou centré en (49,29 % ; 49,94 %), 47,00 % de
  sa largeur.
- **Ornements de coin** : tous remis dans le sens du coin haut-gauche (miroir ou demi-tour) ; dans le jeu, chaque coin
  reprend son modèle et le retourne au besoin. Tous les modèles sont proposés au Design Lab.
