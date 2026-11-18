# Kit graphique des Elfes des grandes cités

Le kit déposé par Idan le 2026-11-18 sur Hostinger (`media/pictos/Culture/Elfes.zip`, dossier des Elfes des grandes cités) : or, nacre, cuir ivoire, soleil, dragons.
PNG transparents, renommés ici ; `scripts/build-culture-kit.sh` en tire les versions du jeu
(`prototype-web/assets/fiche/kits/elfes-des-grandes-cites/`) ; `scripts/build-pictos.sh` fait du logo le picto de la culture
(`prototype-web/assets/pictos/culture-elfes-des-grandes-cites.webp`), à la place de l'ancien master `assets-src/Picto/Culture/elfes-des-grandes-cites.jpg`.
Réglages d'Idan (planches « Fiches des Elfes » et « Barres des Elfes », 2026-11-18) : `data/reference/culture-kits.json`.

Le zip contient aussi l'ancien découpage du cadre en pièces séparées (coin `a883dc18`, barre `2c3ebe0b`, T `fe6624d2`),
doublon du cadre en une pièce : pas repris.

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Emblème solaire des elfes citadins-1.png` | 1086 × 1448 | Logo de la culture : le picto de culture. |
| `cadre.png` | `05be5e7d-…png` | 1536 × 1024 | Le cadre en une pièce (or, coins en onglet) : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `texture.png` | `6b7948c9-…png` | 1254 × 1254 | Le cuir ivoire : fond du cartouche (nom à l'encre) et des barres (textes et pictos dorés). |
| `coin-orne-riche.png` | `cece068d-…png` | 1254 × 1254 | Ornement de coin riche (dragon). |
| `coin-orne-leger.png` | `9186404f-…png` | 1254 × 1254 | Ornement de coin léger (filigrane). |
| `coin-orne-courbe.png` | `6ec41774-…png` | 1287 × 1222 | Ornement de coin courbe (nacre). |
| `ornement-arc.png` | `9ddd6d18-…png` | 2061 × 763 | Ornement posé : arc à l'étoile. |
| `ornement-drape.png` | `45e5c4f7-…png` | 2172 × 724 | Ornement suspendu : drapé de soie. |
| `ornement-treillis.png` | `3c194352-…png` | 846 × 1860 | Ornement allongé : treillis. |
| `ornement-titre.png` | `8803492c-…png` | 2172 × 724 | Ornement du titre : arabesque (silhouette : le CSS s'en sert comme masque). |
| `rond-central.png` | `9fa109ee-…png` | 1677 × 938 | Rond central de la barre du bas (anneau aux dragons). |
| `embleme-fin-de-barre.png` | `0f814b34-…png` | 1402 × 1122 | Bout de la barre du haut (dragon). |
| `bouton-jour-suivant.png` | `bc4b0352-…png` | 1254 × 1254 | Bouton Jour suivant. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut y 34–134 (101), bande de gauche x 32–130 (99), barre du milieu x 721–814 (94).
  Sans clous : chaque cellule est un morceau suivi de son reflet. Coin 280 × 280 depuis l'angle extérieur (32, 34), bras
  coupés en x 228 et y 226 ; cellule du haut x 260–409 (+ reflet), de gauche y 260–409 (+ reflet), de la barre du
  milieu y 300–449 (+ reflet) ; jonction en T : x 671–864, y 84–179, bords fondus.
- **Rond central** recadré sur son dessin : trou centré en (50 % ; 49,85 %), 25,33 % de sa largeur.
