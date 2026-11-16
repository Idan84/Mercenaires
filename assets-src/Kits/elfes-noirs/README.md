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
| `embleme-fin-de-barre.png` | `embleme_droit.png` | 1402 × 1122 | Bout de la barre (Idan : « Le bout de la barre c'est emblème_droit »). Pas encore utilisé : barres du camp, étape suivante. |
| `rond-central.png` | `rond_central.png` | 2752 × 1536 | Couronne du bouton du jour suivant (barre du bas). Pas encore utilisé. |
| `bouton-jour-suivant.png` | `boutton_play.png` | 669 × 670 | Bouton du jour suivant (barre du bas). Pas encore utilisé. |

## Mesures (originaux, en pixels)

Relevées pour accorder les pièces du cadre (Idan : « avec les coins sobres et les T une bordure cohérente en taille et
en répétition de motif ») ; reprises dans `data/reference/culture-kits.json`.

- **Coin sobre** : angle extérieur de la sangle en (106, 105) ; bras horizontal épais de 238, clous en x = 232, 487, 754,
  1020 (pas 263) ; bras vertical épais de 226, clous en y = 209, 467, 721, 968 (pas 253), soit 5 % plus petit. Les bras
  finissent par un embout arrondi cerclé de noir (x 1141–1147, y 1143–1149) : le jeu les coupe en x = 1135 et y = 1137.
- **Bordure** : sangle épaisse de 238 (liseré de 12 de chaque côté), clous en x = 152, 419, 685 (pas 267) ; cellule
  d'un clou découpée de x = 285 à 552.
- **Raccord en T** : barre épaisse de 93 (y 250–343), clous au pas de 95,7 ; tige centrée en x = 830 (782–877).
