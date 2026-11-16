#!/usr/bin/env bash
# Kits graphiques par culture (Chatty, Idan) : masters assets-src/Kits/<cle>/ → pièces du jeu
# prototype-web/assets/fiche/kits/<cle>/, posées par prototype-web/hover-card-ui.js d'après data/reference/culture-kits.json
# (mesures et réglages). Pour l'instant les Elfes noirs (Idan, 2026-11-16 : « on refait les elfes noirs totalement »).
# Les découpes suivent les mesures relevées sur les masters (assets-src/Kits/elfes-noirs/README.md).
# Usage : bash scripts/build-culture-kit.sh   (ImageMagick, potrace, python3)
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=elfes-noirs
SRC=assets-src/Kits/$KEY
OUT=prototype-web/assets/fiche/kits/$KEY
ORN=prototype-web/assets/fiche/ornements
mkdir -p "$OUT"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
webp(){ convert "$@"; echo "${@: -1}"; }
# Ce qui dépasse à peine (alpha sous 4 %) ne compte pas dans le cadrage.
trimmed(){ convert "$1" -channel A -black-threshold 4% +channel -trim +repage "$2"; }

# Cadre de base. Le coin sobre, toile entière (le jeu le place par l'angle de sa sangle, en (106, 105) sur 1254).
webp "$SRC/coin-sobre.png" -resize 512x512 -quality 90 "$OUT/coin-sobre.webp"
# Une cellule de bordure d'un clou, de milieu à milieu entre deux clous (x 285 à 552, pas 267), et la même tournée.
webp "$SRC/bordure.png" -crop 267x262+285+0 +repage -resize x128 -quality 92 "$OUT/cellule-gros.webp"
webp "$SRC/bordure.png" -crop 267x262+285+0 +repage -rotate 90 -resize 128x -quality 92 "$OUT/cellule-gros-v.webp"
# La sangle à petits clous, prise dans la barre du raccord en T (x 402 à 497, pas 95), et le T lui-même (tige en x = 830).
webp "$SRC/raccord-t.png" -crop 95x101+402+246 +repage -resize x128 -quality 92 "$OUT/cellule-fine.webp"
webp "$SRC/raccord-t.png" -crop 95x101+402+246 +repage -rotate 90 -resize 128x -quality 92 "$OUT/cellule-fine-v.webp"
webp "$SRC/raccord-t.png" -crop 540x454+560+246 +repage -resize 50% -quality 92 "$OUT/raccord-t.webp"

# Ornements, recadrés sur ce qu'ils montrent.
for piece in coin-orne-riche coin-orne-leger coin-orne-pointes; do
  trimmed "$SRC/$piece.png" "$tmp/$piece.png"; webp "$tmp/$piece.png" -resize 400x400 -quality 90 "$OUT/$piece.webp"
done
trimmed "$SRC/ornement-couronne.png" "$tmp/c.png"; webp "$tmp/c.png" -resize 640x -quality 90 "$OUT/couronne.webp"
trimmed "$SRC/ornement-chaine.png" "$tmp/ch.png"; webp "$tmp/ch.png" -resize 640x -quality 90 "$OUT/chaine.webp"
trimmed "$SRC/ornement-chaine-torsadee.png" "$tmp/t.png"; webp "$tmp/t.png" -resize 120x -quality 90 "$OUT/chaine-torsadee.webp"

# Le cuir violet du cartouche : une tuile de 640 px (répétée à sa taille, « grain 250 % » dans la planche d'Idan).
webp "$SRC/texture.png" -resize 640x640 -quality 85 "$OUT/texture.webp"

# L'ornement du titre : la pointe de lance au bout de l'ornement d'Idan (le reste, fouet et chaînes, est illisible à
# cette taille), seule forme gardée ; dans la boîte commune des ornements du titre (104 × 24, motif côté titre, à droite,
# noir : le CSS s'en sert comme masque).
convert "$SRC/ornement-titre.png" -crop 2659x712+47+400 +repage -crop 420x330+0+200 +repage -alpha extract -threshold 50% \
  -define connected-components:area-threshold=1800 -define connected-components:mean-color=true -connected-components 8 \
  -threshold 50% -trim +repage -negate "$tmp/pointe.pbm"
potrace -s --turdsize 20 --alphamax 1.0 --opttolerance 0.4 -o "$tmp/pointe.svg" "$tmp/pointe.pbm"
python3 - "$tmp/pointe.svg" "$ORN/pointe-epines.svg" <<'PY'
import re, sys
svg = open(sys.argv[1]).read()
vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
grp = re.sub(r'fill="#[0-9a-fA-F]+"', 'fill="#000"', re.search(r"(<g transform=.*</g>)", svg, re.S).group(1))
vw, vh = (float(v) for v in vb.split()[2:])
h = 24; w = vw * h / vh
open(sys.argv[2], "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 24"><svg x="{104 - w:.2f}" y="0" width="{w:.2f}" height="{h}" viewBox="{vb}">{grp}</svg></svg>\n')
print(sys.argv[2], f"motif {w:.2f} × {h} dans 104 × 24")
PY
