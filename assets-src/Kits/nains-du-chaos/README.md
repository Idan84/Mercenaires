# Kit graphique des Nains du chaos

Le kit d'Idan reçu le 2026-11-19 (`nains.zip`, dossier des Nains du chaos) : acier noir, cuivre et laiton, runes et
cristaux rouges, fourneau. PNG transparents, renommés ici ; `scripts/build-culture-kit.sh` en tire les versions du jeu
(`prototype-web/assets/fiche/kits/nains-du-chaos/`) ; `scripts/build-pictos.sh` fait du logo le picto de la culture
(`prototype-web/assets/pictos/culture-nains-du-chaos.webp`), à la place de l'ancien master
`assets-src/Picto/Culture/nains-du-chaos.jpg` (le même emblème, sur fond blanc).
Réglages : `data/reference/culture-kits.json`, repris des Elfes sylvains comme point de départ, à régler par Idan dans le
Design Lab (onglet Cultures).

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `logo.png` | `Chaos_Dwarf_demonic_skull.png` | 1024 × 1024 | Logo de la culture : le picto de culture. |
| `cadre.png` | `1fe3abb3-…-98a1fdee7a2b copie.png` | 1376 × 768 | Le cadre en une pièce (acier noir, runes rouges, équerres aux coins ; plus petit que les autres cadres) : coin, bordures, barre du milieu, jonctions en T ; les sangles des barres. |
| `texture.png` | `b4ebccfe-…png` | 1254 × 1254 | Le cuir rouge sombre : fond du cartouche du nom et des barres. |
| `coin-orne-riche.png` | `5a02f91c-…png` | 1254 × 1254 | Ornement de coin riche (machinerie au cristal rouge). |
| `coin-orne-leger.png` | `Équerre en acier noir et rune rouge-4.png` | 1254 × 1254 | Ornement de coin léger (équerre à la rune). |
| `coin-orne-courbe.png` | `Équerre mécanique en acier, cuivre et laiton-5.png` | 1254 × 1254 | Ornement de coin courbe (équerre mécanique, tuyau de cuivre). |
| `ornement-accelerateur.png` | `Accélérateur arcanique à cristal rouge-7.png` | 2172 × 724 | Ornement posé : accélérateur arcanique. |
| `ornement-ampoule.png` | `Ampoule alchimique suspendue en cuivre-6.png` | 2172 × 724 | Ornement suspendu : ampoule alchimique. |
| `ornement-sonde.png` | `Sonde alchimique naine à énergie rouge-8.png` | 724 × 2172 | Ornement allongé : sonde alchimique. |
| `ornement-titre.png` | `Dwarven_hammer_mug_and_chains_f00d60dd.png` | 1376 × 768 | Ornement du titre : chaîne, marteau et fumée (silhouette : le CSS s'en sert comme masque). |
| `rond-central.png` | `Cadre nain arcanique en acier et cuivre-2.png` | 1681 × 935 | Rond central de la barre du bas (bobines et manomètre), autour du bouton Jour suivant. |
| `embleme-fin-de-barre.png` | `Médaillon du fourneau nain cornu-3.png` | 1374 × 1145 | Bout de la barre du haut (fourneau cornu). |
| `bouton-jour-suivant.png` | `Bouton Play nain d’acier et de cristal-1.png` | 1254 × 1254 | Bouton Jour suivant. |

## Mesures (originaux, en pixels)

- **Cadre en une pièce** (1376 × 768, plus petit que les autres : à la même épaisseur dans la fiche, le dessin est un
  peu plus agrandi) : bande du haut y 28–114 (87), bande de gauche x 47–139 (93), barre du milieu x 629–748 (120 : les
  bords des deux panneaux et la bande entre eux, x 670–705). Les équerres des coins dépassent de la bande (jusqu'à x 39,
  y 23) : le coin est posé par l'angle extérieur de la bande (47, 28), ce qui coupe 8 px et 5 px de leur rebord.
  Les runes vont par groupes (en haut x 165–360, à gauche y 145–320) : chaque cellule prend un groupe de runes et
  l'acier qui le suit, puis son reflet (pas de joint). Coin 110 × 110 depuis (47, 28), l'équerre seule (les runes
  commencent juste après), bras coupés en x 103 et y 102 ; cellule du haut x 150–549 (+ reflet), de gauche y 130–434
  (+ reflet), de la barre du milieu y 585–674, sans runes (+ reflet) ; jonction en T : x 584–793, y 74–154 (depuis le
  haut des bords des panneaux, sous les runes), bords fondus.
- **Rond central** recadré sur son dessin : trou centré en (49,88 % ; 48,65 %), 32,73 % de sa largeur (le bouton passe
  à 124 px pour le remplir, au lieu de 98).
