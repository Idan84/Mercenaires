# Kit « Cadre_dialogue » (Chatty, Idan, 2026-11-25)

Le cadre de la boîte de dialogue et ses pièces : `planche1.png` à `planche4.png` (PNG détourés, 1448 × 1086) et
`exemple-proposition-1.png` (l'assemblage proposé par Chatty, pour référence).

`node scripts/cut-sprite-sheet.js assets-src/Kits/cadre-dialogue/planche<N>.png prototype-web/assets/kit/cadre-dialogue planche<N>`
découpe chaque planche en une image WebP par pièce (`planche<N>-<n°>.webp`, numérotées de haut en bas puis de gauche à
droite) et écrit `planche<N>.json` (place et taille de chaque pièce sur la planche). Rien n'est jeté : tout est gardé pour
plus tard (Idan).

| Planche | Contenu |
|---|---|
| 1 | Le cadre : quatre coins (01, 03, 14, 15), barres haut (02), bas (16), gauche (07), droite (08) ; un passe-partout en parchemin (04 à 13) ; petits ornements (17 à 21, dont le losange 19) |
| 2 | Lauriers (01, 03), médaillon des discussions (02), croix (06), cartouches et plaques (04, 05, 07 à 10), équerres ornées (11, 12), filets (13 à 15) |
| 3 | Un second cadre, plus fin : coins (01, 03, 13, 14), barres (02, 04, 05, 15) ; plaques (06, 09), ronds (07, 08), petites équerres (10 à 12) |
| 4 | Barres de défilement et leurs bouts (01, 02, 05, 06, 12), languettes avec flèche (03, 04), flèches (07, 08), filets et losange (09 à 11, 13) |

`cadre-idan.webp` : le cadre complet refait par Idan (2026-11-25), d'après la planche 1 : coins identiques, barres, filet
au losange en haut, gros losange en bas. C'est lui qui sert : `node scripts/build-dialog-frame-idan.js` le découpe en deux
moitiés (`prototype-web/assets/creation/cadre-dialogue-gauche.webp` et `-droite.webp`, 5 colonnes × 3 rangées, cuir uni
répétable, volute du coin haut droit effacée pour la croix).

Utilisé aujourd'hui : le cadre d'Idan, et de la planche 2 les lauriers (01 et 03) autour de l'emblème.
