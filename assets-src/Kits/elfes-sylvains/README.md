# Kit graphique des Elfes sylvains

Le kit déposé par Idan le 2026-11-18 sur Hostinger (`media/pictos/Culture/Elfes.zip`, dossier des Elfes sylvains) : bois vert, branches, dryades, dragon.
PNG transparents, renommés ici ; `scripts/build-culture-kit.sh` en tire les versions du jeu
(`prototype-web/assets/fiche/kits/elfes-sylvains/`) ; `scripts/build-pictos.sh` fait du logo le picto de la culture
(`prototype-web/assets/pictos/culture-elfes-sylvains.webp`), à la place de l'ancien master `assets-src/Picto/Culture/elfes-sylvains.jpg`.
Réglages d'Idan (planches « Fiches des Elfes » et « Barres des Elfes », 2026-11-18) : `data/reference/culture-kits.json`.

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Emblème des elfes sylvestres-2.png` | 1086 × 1448 | Logo de la culture : le picto de culture. |
| `cadre.png` | `d5c5183f-…png` | 1536 × 1024 | Le cadre en une pièce : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `texture.png` | `ee4689b1-…png` | 1254 × 1254 | Le cuir vert : fond du cartouche du nom et des barres. |
| `coin-orne-riche.png` | `c99af432-…png` | 1254 × 1254 | Ornement de coin riche (dragon). |
| `coins-orne-bois-branche.png` | `45162529-…png` | 1774 × 887 | Deux ornements de coin dans la même image : le bois en L (à gauche, x 0–853 : « courbe ») et la branche (à droite, x 913–1774 : « léger »). |
| `ornement-arbre.png` | `cce79161-…png` | 2172 × 724 | Ornement posé : visage d'arbre. |
| `ornement-dryade-couchee.png` | `0048c625-…png` | 2172 × 724 | Ornement posé : dryade couchée (la fiche). |
| `ornement-dragon-couche.png` | `166abbaf-…png` | 2172 × 724 | Ornement posé : dragon couché (la barre du bas). |
| `ornement-guirlande.png` | `011a680f-…png` | 2172 × 724 | Ornement suspendu : guirlande. |
| `ornement-dryade-debout.png` | `e84628dc-…png` | 793 × 1983 | Ornement allongé : dryade debout, répétée le long de la barre du milieu. |
| `ornement-titre.png` | `dad5a25b-… copie.png` | 1376 × 768 | Ornement du titre (silhouette : le CSS s'en sert comme masque). |
| `rond-central.png` | `ba6e6322-…png` | 1678 × 937 | Rond central de la barre du bas, autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `d8aa9859-…png` | 1346 × 1169 | Bout de la barre du haut (dryade ovale). |
| `bouton-jour-suivant.png` | `d3cb67b1-…png` | 1254 × 1254 | Bouton Jour suivant. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut y 65–155 (91), bande de gauche x 56–135 (80), barre du milieu x 725–811 (87) ;
  les bandes horizontales sont 14 % plus épaisses que les verticales (gardé comme dans le dessin). Sans clous : chaque
  cellule est un morceau suivi de son reflet (pas de joint visible). Coin 280 × 280 depuis l'angle extérieur (56, 65),
  bras coupés en x 244 et y 225 ; cellule du haut x 300–419 (+ reflet), de gauche y 290–409 (+ reflet), de la barre du
  milieu y 300–419 (+ reflet) ; jonction en T : x 680–856, y 110–195, bords fondus.
- **Rond central** recadré sur son dessin : trou centré en (49,92 % ; 47,12 %), 25,83 % de sa largeur.
