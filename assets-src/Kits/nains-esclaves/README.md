# Kit graphique des Nains esclaves

Le kit d'Idan reçu le 2026-11-19 (`nains.zip`, dossier des Nains esclaves) : fer rouillé, chaînes et fers brisés,
pioches et marteaux, bois et cordes. PNG transparents, renommés ici ; `scripts/build-culture-kit.sh` en tire les
versions du jeu (`prototype-web/assets/fiche/kits/nains-esclaves/`) ; `scripts/build-pictos.sh` fait du logo le picto de
la culture (`prototype-web/assets/pictos/culture-nains-esclaves.webp`), à la place de l'ancien master
`assets-src/Picto/Culture/nains-esclaves.jpg` (le même emblème, sur fond blanc).
Réglages : `data/reference/culture-kits.json`, repris des Elfes sylvains comme point de départ, à régler par Idan dans le
Design Lab (onglet Cultures).

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Iron_shackle_and_broken_hammer_b7607a37.png` | 1024 × 1024 | Logo de la culture : le picto de culture. |
| `cadre.png` | `fd30aac1-…png` | 1536 × 1024 | Le cadre en une pièce (des chaînes sur une plaque de fer rouillé) : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `texture.png` | `541eeee7-…png` | 1254 × 1254 | Le cuir brun : fond du cartouche du nom et des barres. |
| `coin-orne-riche.png` | `5bf2317b-…png` | 1254 × 1254 | Ornement de coin riche (pioche). |
| `coin-orne-leger.png` | `ed28ff68-…png` | 1254 × 1254 | Ornement de coin léger (équerre au fer brisé). |
| `coin-orne-courbe.png` | `f3861105-…png` | 1254 × 1254 | Ornement de coin courbe (fer et chaîne, cordes). |
| `ornement-chopes.png` | `1d74da12-…png` | 2172 × 724 | Ornement posé : chopes et tonneau (la fiche). |
| `ornement-outils.png` | `ce19a719-…png` | 2172 × 724 | Ornement posé : marteau et pioche croisés, fer brisé (la barre du bas). |
| `ornement-lanterne.png` | `27f38c2c-…png` | 2172 × 724 | Ornement suspendu : corde et lanterne. |
| `ornement-pioche.png` | `cf85972d-…png` | 724 × 2172 | Ornement allongé : pioche. |
| `ornement-titre.png` | `Dwarven_hammer_mug_and_chains_f83c96a4.png` | 1376 × 768 | Ornement du titre : marteau, chaîne et chope (silhouette : le CSS s'en sert comme masque). |
| `rond-central.png` | `8f5d758d-…png` | 1681 × 936 | Rond central de la barre du bas (marteau, pioche, fers), autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `59746775-…png` | 1374 × 1145 | Bout de la barre du haut (marteau brisant ses chaînes). |
| `bouton-jour-suivant.png` | `d7a1a676-…png` | 1254 × 1254 | Bouton Jour suivant. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut y 37–137 (101), bande de gauche x 40–148 (109), barre du milieu x 715–820
  (106). Une chaîne sur une plaque : les maillons (un de face, un de chant) reviennent au pas de 132 dans les trois
  bandes ; milieux des maillons en haut x 175, 241, 307, 372, 439…, à gauche y 199, 266, 331, 397…, dans la barre
  y 264, 327, 396… Cinq maillons brisés, à éviter : en haut vers x 1060–1110, en bas vers x 455–490, à gauche vers
  y 470–590, dans la barre vers y 480–560, à droite vers y 360–440. Comme les clous des Elfes noirs, chaque cellule est
  un pas, d'un milieu de maillon de chant au suivant, sans reflet. Coin 280 × 280 depuis l'angle extérieur (40, 37), bras
  coupés au milieu d'un maillon de chant (x 267 et y 229) ; cellule du haut x 307–438, de gauche y 266–397, de la barre
  du milieu y 264–395 ; jonction en T : x 685–850, y 125–149 (le bas de la plaque, sous la chaîne, et le haut de la
  chaîne de la barre), bords fondus.
- **Rond central** recadré sur son dessin : trou centré en (49,40 % ; 47,89 %), 38,04 % de sa largeur (le bouton passe
  à 144 px pour le remplir, au lieu de 98).
