# Kit graphique : Tribus de la jungle

Le kit d'Idan reçu le 2026-11-26 (`humains.zip`, dossier « Jungle »). PNG transparents, renommés ici ;
`scripts/build-culture-kit.sh` en tire les versions du jeu (`prototype-web/assets/fiche/kits/tribus-de-la-jungle/`) ;
`scripts/build-pictos.sh` fait du logo le picto de la culture (`prototype-web/assets/pictos/culture-tribus-de-la-jungle.webp`), à la
place de l'ancien master `assets-src/Picto/Culture/tribus-de-la-jungle.jpg`.
Réglages : `data/reference/culture-kits.json`, repris des Nains des montagnes comme point de départ, à régler par Idan
dans le Design Lab (onglet Cultures). Pas d'ornement du titre dans le kit : la culture garde celui de la charte.

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Emblème pentagonal du masque ancestral.png` | 1254 × 1254 | Logo de la culture : le picto de culture. |
| `cadre.png` | `Cadre de jeu double en bois nacré-2.png` | 1536 × 1024 | Le cadre en une pièce : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `texture.png` | `Texture d’écorce tissée vert forêt-1.png` | 1254 × 1254 | Fond du cartouche du nom et des barres. |
| `rond-central.png` | `Cadre circulaire en bois et nacre-3.png` | 1430 × 1100 | Rond central de la barre du bas, autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `Emblème de toucan en bois et nacre-2.png` | 1774 × 887 | Bout de la barre du haut. |
| `bouton-jour-suivant.png` | `Bouton de lecture en obsidienne et nacre-4.png` | 1254 × 1254 | Bouton Jour suivant. |
| `coin-orne-masque.png` | `Ornement d’angle au masque ancestral.png` | 1254 × 1254 | Ornement de coin. |
| `coin-orne-tortue.png` | `Ornement d’angle en acajou, tortue sculptée.png` | 1269 × 1240 | Ornement de coin. |
| `coin-orne-serpent.png` | `Ornement d’angle au serpent sculpté-2.png` | 1312 × 1199 | Ornement de coin (dessiné pour le coin haut-droit, remis dans le sens du coin haut-gauche). |
| `coin-orne-tambour.png` | `Coin en bois, tambour, perles et corde-1.png` | 1536 × 1024 | Ornement de coin (dessiné pour le coin bas-gauche, remis dans le sens du coin haut-gauche). |
| `coin-orne-crocodile.png` | `Ornement d’angle crocodile en bois précieux.png` | 1312 × 1199 | Ornement de coin (dessiné pour le coin bas-droit, remis dans le sens du coin haut-gauche). |
| `ornement-jaguar.png` | `Jaguar doré sur branche d’acajou-1.png` | 2172 × 724 | Ornement posé. |
| `ornement-statue.png` | `Statue féminine en bois d’ébène-2.png` | 2172 × 724 | Ornement posé. |
| `ornement-guirlande.png` | `Guirlande tribale suspendue en acajou-2.png` | 2172 × 724 | Ornement suspendu. |
| `ornement-lance.png` | `Lance cérémonielle en obsidienne et acajou-1.png` | 724 × 2172 | Ornement allongé. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut depuis y 39 (53 d'épaisseur), barre du milieu x 743–793 ;
  coin 200 × 200 depuis (24, 39) ; cellules des bordures et de la barre du milieu : un morceau suivi de son reflet
  (`120x53+215+39`, `52x120+24+110`, `51x120+743+400`) ; jonction en T de 181 × 96 px dans le jeu.
- **Rond central** recadré sur son dessin : trou centré en (49,33 % ; 51,14 %), 52,75 % de
  sa largeur.
- **Ornements de coin** : tous remis dans le sens du coin haut-gauche (miroir ou demi-tour) ; dans le jeu, chaque coin
  reprend son modèle et le retourne au besoin. Tous les modèles sont proposés au Design Lab.
