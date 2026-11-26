# Kit graphique : Royaumes du Soleil Levant

Le kit d'Idan reçu le 2026-11-26 (`humains.zip`, dossier « Soleil levant »). PNG transparents, renommés ici ;
`scripts/build-culture-kit.sh` en tire les versions du jeu (`prototype-web/assets/fiche/kits/royaumes-du-soleil-levant/`) ;
`scripts/build-pictos.sh` fait du logo le picto de la culture (`prototype-web/assets/pictos/culture-royaumes-du-soleil-levant.webp`), à la
place de l'ancien master `assets-src/Picto/Culture/royaumes-du-soleil-levant.jpg`.
Réglages : `data/reference/culture-kits.json`, repris des Nains des montagnes comme point de départ, à régler par Idan
dans le Design Lab (onglet Cultures). Pas d'ornement du titre dans le kit : la culture garde celui de la charte.

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Emblème solaire sakura des samouraïs.png` | 1269 × 1240 | Logo de la culture : le picto de culture. |
| `cadre.png` | `Cadre japonais double transparent aux sakura-13.png` | 1536 × 1024 | Le cadre en une pièce : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `cadre-variante-sakura.png` | `Cadre double aux branches de sakura.png` | 1536 × 1024 | Autre version du cadre : gardée ici, pas branchée (une culture n'a qu'un cadre). |
| `texture.png` | `Texture de soie sakura japonaise-1.png` | 1254 × 1254 | Fond du cartouche du nom et des barres. |
| `rond-central.png` | `Dragons samouraïs autour d’un cercle vide-6.png` | 1672 × 941 | Rond central de la barre du bas, autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `Emblème sakura, katana et armure-7.png` | 1448 × 1086 | Bout de la barre du haut. |
| `bouton-jour-suivant.png` | `Bouton Play tsuba au soleil vermillon-5.png` | 1254 × 1254 | Bouton Jour suivant. |
| `coin-orne-eventail.png` | `Coin samouraï laqué à éventail-9.png` | 1261 × 1247 | Ornement de coin. |
| `coin-orne-dragon.png` | `Ornement samouraï au dragon et sakura-4.png` | 1254 × 1254 | Ornement de coin. |
| `coin-orne-kabuto.png` | `Ornement supérieur droit au kabuto sakura-1.png` | 1254 × 1254 | Ornement de coin (dessiné pour le coin haut-droit, remis dans le sens du coin haut-gauche). |
| `coin-orne-kitsune.png` | `Ornement kitsune du coin inférieur gauche-2.png` | 1536 × 1024 | Ornement de coin (dessiné pour le coin bas-gauche, remis dans le sens du coin haut-gauche). |
| `coin-orne-taiko.png` | `Ornement taiko laqué du coin inférieur droit-3.png` | 1254 × 1254 | Ornement de coin (dessiné pour le coin bas-droit, remis dans le sens du coin haut-gauche). |
| `ornement-dragon.png` | `Dragon japonais sur branche de cerisier-11.png` | 2172 × 724 | Ornement posé. |
| `ornement-suspendu.png` | `Ornement suspendu aux sakura et nunchaku-10.png` | 1774 × 887 | Ornement suspendu. |
| `ornement-katana.png` | `Katana laqué aux fleurs de sakura-12.png` | 724 × 2172 | Ornement allongé. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut depuis y 20 (72 d'épaisseur), barre du milieu x 729–806 ;
  coin 140 × 140 depuis (18, 15) ; cellules des bordures et de la barre du milieu : un morceau suivi de son reflet
  (`120x72+150+20`, `76x120+24+120`, `78x120+729+300`) ; jonction en T de 158 × 64 px dans le jeu.
- **Rond central** recadré sur son dessin : trou centré en (49,63 % ; 49,48 %), 37,25 % de
  sa largeur.
- **Ornements de coin** : tous remis dans le sens du coin haut-gauche (miroir ou demi-tour) ; dans le jeu, chaque coin
  reprend son modèle et le retourne au besoin. Tous les modèles sont proposés au Design Lab.
