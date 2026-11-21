# Kit graphique des Nains des montagnes

Le kit d'Idan reçu le 2026-11-19 (`nains.zip`, dossier des Nains des montagnes) : acier poli et mithril, obsidienne,
cristal de glace, cuir bleu nuit, bélier. PNG transparents, renommés ici ; `scripts/build-culture-kit.sh` en tire les
versions du jeu (`prototype-web/assets/fiche/kits/nains-des-montagnes/`) ; `scripts/build-pictos.sh` fait du logo le
picto de la culture (`prototype-web/assets/pictos/culture-nains-des-montagnes.webp`), à la place de l'ancien master
`assets-src/Picto/Culture/nains-des-montagnes.jpg` (le même emblème, sur fond blanc).
Réglages : `data/reference/culture-kits.json`, repris des Elfes sylvains comme point de départ, à régler par Idan dans le
Design Lab (onglet Cultures).

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Mountain_dwarf_heraldic_logo_b1ce086a.png` | 1024 × 1024 | Logo de la culture : le picto de culture. |
| `cadre.png` | `5985c065-…png` | 1536 × 1024 | Le cadre en une pièce (acier, filet de glace, coins en onglet) : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `texture.png` | `3f180d0d-…png` | 1254 × 1254 | Le cuir bleu nuit : fond du cartouche du nom et des barres. |
| `coin-orne-riche.png` | `35b72536-…png` | 1254 × 1254 | Ornement de coin riche (marteau, chope, épis). |
| `coin-orne-leger.png` | `Ornement d’angle nain en acier sculpté-4.png` | 1254 × 1254 | Ornement de coin léger (équerre d'acier sculpté). |
| `coin-orne-courbe.png` | `Épaulière naine d’angle en mithril-5.png` | 1254 × 1254 | Ornement de coin courbe (épaulière de mithril). |
| `ornement-belier.png` | `Bélier mithril des sommets-7.png` | 2172 × 724 | Ornement posé : bélier couché sur son socle. |
| `ornement-cor.png` | `Ornement suspendu au cor d’obsidienne-6.png` | 2172 × 724 | Ornement suspendu : cor d'obsidienne. |
| `ornement-hache.png` | `Hache de guerre naine en obsidienne-8.png` | 724 × 2172 | Ornement allongé : hache de guerre. |
| `ornement-titre.png` | `Carved_mountain_dwarf_heraldic_o…_60537d02.png` | 1376 × 768 | Ornement du titre : entrelacs et montagnes (silhouette : le CSS s'en sert comme masque). |
| `rond-central.png` | `Cadre nain héraldique pour bouton rond-2.png` | 1683 × 935 | Rond central de la barre du bas (boucliers et haches), autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `Médaillon nain de la forteresse d’obsidienne-3.png` | 1374 × 1145 | Bout de la barre du haut (forteresse). |
| `bouton-jour-suivant.png` | `Bouton lecture nain en cristal de glace-1.png` | 1254 × 1254 | Bouton Jour suivant. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** : bande du haut y 33–115 (83), bande de gauche x 35–115 (81), barre du milieu x 729–807 (79) ;
  le filet de glace au milieu de chaque bande (y 73–75 en haut, x 767–769 dans la barre). Sans clous : chaque cellule
  est un morceau suivi de son reflet. Coin 280 × 280 depuis l'angle extérieur (35, 33), bras coupés en x 244 et y 225
  (après l'onglet) ; cellule du haut x 279–398 (+ reflet), de gauche y 258–377 (+ reflet), de la barre du milieu
  y 300–419 (+ reflet) ; jonction en T : x 684–852, y 67–155 (depuis le filet de glace de la bande), bords fondus.
- **Rond central** recadré sur son dessin : trou centré en (49,88 % ; 52,14 %), 29,82 % de sa largeur (plus grand que
  chez les Elfes : le bouton passe à 113 px pour le remplir, au lieu de 98).
