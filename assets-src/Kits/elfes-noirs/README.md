# Kit graphique des Elfes noirs

Le kit fait avec Chatty d'après « Blood & Wages — Kit graphique par culture », déposé par Idan le 2026-11-16 sur
Hostinger (`media/pictos/Culture/ElfeNoir.zip`). Les Elfes noirs refaits en entier, « les punks du médiéval
fantastique » : cuir noir clouté, argent, violet. PNG transparents, renommés ici ; `scripts/build-culture-kit.sh` en
tire les versions du jeu (`prototype-web/assets/fiche/kits/elfes-noirs/`, l'ornement du titre
`prototype-web/assets/fiche/ornements/pointe-epines.svg`) ; `scripts/build-pictos.sh` fait du logo le picto de la
culture (`prototype-web/assets/pictos/culture-elfes-noirs.webp`), à la place de l'ancien master
`assets-src/Picto/Culture/elfes-noirs.jpg`.

| Fichier | Nom d'origine | Taille | Rôle |
|---|---|---|---|
| `cadre.png` | `1c8f7d7e-…png` (Elfes.zip, 2026-11-18) | 1536 × 1024 | Le cadre en une pièce (Idan : « le cadre avait un léger décalage. J'ai fait faire un nouveau cadre en une partie à découper nous-même ») : coin, bordures, barre du milieu et jonctions en T du cadre de la fiche et des sangles des barres. Remplace `coin-sobre.png`, `bordure.png` et `raccord-t.png`, gardés pour mémoire. |
| `logo.png` | `logo.png` | 1086 × 1448 | Logo de la culture : remplace le picto de culture (Idan : « Le logo, c'est bien ce qui remplace le picto actuel »). |
| `texture.png` | `texture.png` | 1254 × 1254 | Cuir violet, répétable : fond du cartouche du nom. |
| `bordure.png` | `brodure.png` | 824 × 268 | Bordure droite à gros clous, même sangle que le coin sobre ; le jeu en répète une cellule d'un clou. |
| `raccord-t.png` | `23eb8d8f-…png` | 1659 × 948 | Raccord en T à petits clous : séparation portrait / texte et sous le nom. |
| `coin-sobre.png` | `corner_base.png` | 1254 × 1254 | Coin sobre (cadre de base). |
| `coin-orne-riche.png` | `Corner_ornemental_1.png.png` | 1254 × 1254 | Ornement de coin riche. |
| `coin-orne-leger.png` | `Corner_ornemental_2.png` | 1254 × 1254 | Ornement de coin léger. |
| `coin-orne-pointes.png` | `corner_ornemental_3.png` | 1287 × 1222 | Ornement de coin courbe à pointes. |
| `ornement-couronne.png` | `Ornement_droit_1.png` | 2060 × 763 | Couronne : « plutôt en bas, mais peut se mettre partout. Il se pose sur une bordure. » |
| `ornement-chaine.png` | `Ornement_droit_2.png` | 2172 × 724 | Chaîne suspendue : « la gravité le pousse à être plutôt en haut, mais il peut se mettre sur un angle. » |
| `ornement-chaine-torsadee.png` | `Ornement_droit_3.png` | 189 × 405 | Chaîne torsadée : « se pose sur une barre, peu importe le sens, et peut vraiment se répéter. » |
| `ornement-titre.png` | `ornement_svg.png` | 2752 × 1536 | Ornement de titre (fouet, chaînes, épines) ; trop fin à 12 px : le jeu n'en garde que la pointe de lance. |
| `embleme-fin-de-barre.png` | `embleme_droit.png` | 1402 × 1122 | Bout de la barre du haut du camp (Idan : « Le bout de la barre c'est emblème_droit »). |
| `rond-central.png` | `rond_central.png` | 2752 × 1536 | Rond central de la barre du bas du camp, autour du bouton Jour suivant. |
| `bouton-jour-suivant.png` | `boutton_play.png` | 669 × 670 | Bouton Jour suivant de la barre du bas du camp. |

## Le cadre en une pièce (`cadre.png`, en pixels)

Bande du haut y 81–160 (80), bande de gauche x 32–113 (82), barre du milieu x 726–809 (84) : épaisseur constante (au
plus 2,5 % d'écart, contre 5 % entre les bras de l'ancien coin sobre). Clous en x = 74,5 (coin), 143,5, 212,5, 288,5,
364,5, 443, 522,5, 603, 685,5, 768 (T)… et en y = 119 (coin), 188, 260,5, 335, 409,5, 483, 558… : pas de 69 près des
coins, 74 à 83 au milieu ; le jeu répète une cellule du milieu, son pas devient régulier. Découpes
(`scripts/build-culture-kit.sh`) : coin 240 × 240 depuis l'angle extérieur (32, 81), bras coupés en x 218 et y 143 ;
cellule du haut x 483–562 (un clou au milieu), de gauche y 446–519, de la barre du milieu y 446–519 ; jonction en T :
x 686–849, y 137–172, bords fondus.

## Mesures de l'ancien kit (originaux, en pixels)

Relevées pour accorder les pièces du cadre (Idan : « avec les coins sobres et les T une bordure cohérente en taille et
en répétition de motif ») ; reprises dans `data/reference/culture-kits.json`.

- **Coin sobre** : angle extérieur de la sangle en (106, 105) ; bras horizontal épais de 238, clous en x = 232, 487, 754,
  1020 (pas 263) ; bras vertical épais de 226, clous en y = 209, 467, 721, 968 (pas 253), soit 5 % plus petit. Les bras
  finissent par un embout arrondi cerclé de noir (x 1141–1147, y 1143–1149) : le jeu les coupe en x = 1135 et y = 1137.
- **Bordure** : sangle épaisse de 238 (liseré de 12 de chaque côté), clous en x = 152, 419, 685 (pas 267) ; cellule
  d'un clou découpée de x = 285 à 552.
- **Raccord en T** : barre épaisse de 93 (y 250–343), clous au pas de 95,7 ; tige centrée en x = 830 (782–877).
- **Rond central** : recadré sur son dessin (x 14 à 2738, y 34 à 1480) ; trou du bouton centré en (50,02 % ; 50,80 %)
  de l'image recadrée, diamètre 23,64 % de sa largeur. **Emblème** : recadré de x 47 à 1356 (toute la hauteur).
