# Kit graphique : Empire de la nuit blanche

Le kit d'Idan reçu le 2026-11-26 (`humains.zip`, dossier « Nuit Blanche »). PNG transparents, renommés ici ;
`scripts/build-culture-kit.sh` en tire les versions du jeu (`prototype-web/assets/fiche/kits/empire-de-la-nuit-blanche/`) ;
`scripts/build-pictos.sh` fait du logo le picto de la culture (`prototype-web/assets/pictos/culture-empire-de-la-nuit-blanche.webp`), à la
place de l'ancien master `assets-src/Picto/Culture/empire-de-la-nuit-blanche.jpg`.
Réglages : `data/reference/culture-kits.json`, repris des Nains des montagnes comme point de départ, à régler par Idan
dans le Design Lab (onglet Cultures). Pas d'ornement du titre dans le kit : la culture garde celui de la charte.

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Loup blanc couronné, emblème d’argent cristallin.png` | 1254 × 1254 | Logo de la culture : le picto de culture. |
| `cadre.png` | `Cadre double nordique en argent cristallin-3.png` | 1536 × 1024 | Le cadre en une pièce : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `texture.png` | `Texture de cristal givré aux motifs slaves-2.png` | 1254 × 1254 | Fond du cartouche du nom et des barres. |
| `rond-central.png` | `Anneau argenté aux loups et cristal cyan-1.png` | 1774 × 887 | Rond central de la barre du bas, autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `Loup blanc couronné, hache d’argent.png` | 1585 × 992 | Bout de la barre du haut. |
| `bouton-jour-suivant.png` | `Bouton de lecture en argent et cristal-2.png` | 1254 × 1254 | Bouton Jour suivant. |
| `coin-orne-casque.png` | `Ornement d’angle argenté au casque nordique-3.png` | 1312 × 1199 | Ornement de coin. |
| `coin-orne-statue.png` | `Statue glacée en argent et cyan.png` | 1254 × 1254 | Ornement de coin. |
| `coin-orne-corbeau.png` | `Ornement d’angle argenté au corbeau-2.png` | 1275 × 1233 | Ornement de coin (dessiné pour le coin haut-droit, remis dans le sens du coin haut-gauche). |
| `coin-orne-cor.png` | `Ornement d’angle argenté au cor d’ivoire-5.png` | 1536 × 1024 | Ornement de coin (dessiné pour le coin bas-gauche, remis dans le sens du coin haut-gauche). |
| `coin-orne-ours.png` | `Ornement d’angle, ours polaire d’argent-4.png` | 1312 × 1199 | Ornement de coin (dessiné pour le coin bas-droit, remis dans le sens du coin haut-gauche). |
| `ornement-loup.png` | `Ornement du loup blanc impérial-1.png` | 2172 × 724 | Ornement posé. |
| `ornement-guirlande.png` | `Guirlande impériale d’argent et de glace-3.png` | 2172 × 724 | Ornement suspendu. |
| `ornement-hache.png` | `Hache nordique d’argent au cristal pâle-1.png` | 724 × 2172 | Ornement allongé. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut depuis y 61 (64 d'épaisseur), barre du milieu x 742–793 ;
  coin 150 × 150 depuis (54, 61) ; cellules des bordures et de la barre du milieu : un morceau suivi de son reflet
  (`120x64+195+61`, `66x120+54+200`, `52x120+742+400`) ; jonction en T de 122 × 69 px dans le jeu.
- **Rond central** recadré sur son dessin : trou centré en (49,83 % ; 50,65 %), 33,33 % de
  sa largeur.
- **Ornements de coin** : tous remis dans le sens du coin haut-gauche (miroir ou demi-tour) ; dans le jeu, chaque coin
  reprend son modèle et le retourne au besoin. Tous les modèles sont proposés au Design Lab.
