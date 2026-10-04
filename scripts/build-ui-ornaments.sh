#!/usr/bin/env bash
# Ornements du menu : image d'Idan (assets-src/ui/menu-ornements.jpg, fond blanc) → coin haut-gauche,
# coin bas-droit et ligne dorée détourés (prototype-web/assets/ui/). Même détourage que le logo :
# seules les grandes zones blanches deviennent transparentes. Nécessite ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/ui/menu-ornements.jpg
OUT=prototype-web/assets/ui
mkdir -p "$OUT"
TMP=$(mktemp -d)
# La ligne traverse la zone des coins : on l'efface pour les découper.
convert "$SRC" -fill white -draw "rectangle 250,368 1125,398" "$TMP/corners.jpg"
cut(){ # nom, image, zone, taille de sortie, rayon d'ouverture
  convert "$2" -crop "$3" +repage -fuzz 12% -trim +repage "$TMP/$1.png"
  convert "$TMP/$1.png" -alpha off -fuzz 8% -fill white -opaque white -fill black +opaque white \
    -morphology Open Disk:${5:-2} -negate -blur 0x0.6 "$TMP/$1-alpha.png"
  convert "$TMP/$1.png" -alpha off "$TMP/$1-alpha.png" -compose CopyOpacity -composite -trim +repage \
    -resize "$4" -quality 90 "$OUT/$1.webp"
  identify "$OUT/$1.webp"
}
cut menu-corner-tl "$TMP/corners.jpg" 600x500+0+150 192x192 3
cut menu-corner-br "$TMP/corners.jpg" 476x450+900+120 192x192 3
cut menu-line "$SRC" 880x30+245+368 640x 1
rm -rf "$TMP"
