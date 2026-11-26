# Kit graphique : Terres des Deux Fleuves

Le kit d'Idan reçu le 2026-11-26 (`humains.zip`, dossier « 2 fleuves »). PNG transparents, renommés ici ;
`scripts/build-culture-kit.sh` en tire les versions du jeu (`prototype-web/assets/fiche/kits/terres-des-deux-fleuves/`) ;
`scripts/build-pictos.sh` fait du logo le picto de la culture (`prototype-web/assets/pictos/culture-terres-des-deux-fleuves.webp`), à la
place de l'ancien master `assets-src/Picto/Culture/terres-des-deux-fleuves.jpg`.
Réglages : `data/reference/culture-kits.json`, repris des Nains des montagnes comme point de départ, à régler par Idan
dans le Design Lab (onglet Cultures). Pas d'ornement du titre dans le kit : la culture garde celui de la charte.

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Éléphant royal des Deux Fleuves-2.png` | 1269 × 1240 | Logo de la culture : le picto de culture. |
| `cadre.png` | `Double cadre indien teal et or-1.png` | 1536 × 1024 | Le cadre en une pièce : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `texture.png` | `Jacquard lotus paisley bleu paon-2.png` | 1254 × 1254 | Fond du cartouche du nom et des barres. |
| `rond-central.png` | `Anneau de lotus aux éléphants d’ivoire-10.png` | 1774 × 887 | Rond central de la barre du bas, autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `Emblème royal de l’éléphant, or et turquoise-12.png` | 1448 × 1086 | Bout de la barre du haut. |
| `bouton-jour-suivant.png` | `Bouton de lecture indien, or et ivoire-9.png` | 1254 × 1254 | Bouton Jour suivant. |
| `coin-orne-sculpte.png` | `Cadre indien sculpté en or et turquoise-7.png` | 1254 × 1254 | Ornement de coin. |
| `coin-orne-lotus.png` | `Coin lotus indien en émail et or-8.png` | 1254 × 1254 | Ornement de coin. |
| `coin-orne-elephant.png` | `Ornement d’angle indien en or et turquoise-4.png` | 1254 × 1254 | Ornement de coin. |
| `coin-orne-paon.png` | `Ornement d’angle au paon indien-3.png` | 1254 × 1254 | Ornement de coin (dessiné pour le coin haut-droit, remis dans le sens du coin haut-gauche). |
| `coin-orne-bouclier.png` | `Bouclier indien, tulwar et lotus-5.png` | 1254 × 1254 | Ornement de coin (dessiné pour le coin bas-gauche, remis dans le sens du coin haut-gauche). |
| `coin-orne-veena.png` | `Veena royale aux lotus et joyaux-6.png` | 1254 × 1254 | Ornement de coin (dessiné pour le coin bas-droit, remis dans le sens du coin haut-gauche). |
| `ornement-tigre.png` | `Tigre d’ivoire sur lotus doré-13.png` | 2172 × 724 | Ornement posé. |
| `ornement-toran.png` | `Toran indien en or, perles et lotus-11.png` | 1774 × 887 | Ornement suspendu. |
| `ornement-masse.png` | `Masse cérémonielle indienne ornée de rubis-14.png` | 724 × 2172 | Ornement allongé. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut depuis y 31 (64 d'épaisseur), barre du milieu x 737–798 ;
  coin 100 × 100 depuis (27, 31) ; cellules des bordures et de la barre du milieu : un morceau suivi de son reflet
  (`120x64+117+31`, `62x120+27+121`, `62x120+737+300`) ; jonction en T de 122 × 61 px dans le jeu.
- **Rond central** recadré sur son dessin : trou centré en (49,88 % ; 45,77 %), 30,60 % de
  sa largeur.
- **Ornements de coin** : tous remis dans le sens du coin haut-gauche (miroir ou demi-tour) ; dans le jeu, chaque coin
  reprend son modèle et le retourne au besoin. Tous les modèles sont proposés au Design Lab.
