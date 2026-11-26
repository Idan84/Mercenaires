#!/usr/bin/env bash
# Le bouton du lieu de la barre du bas (Idan, 2026-11-26 : « une forme de bouton capitaine version argent. Fond métal ») :
# le bouton capitaine de la charte (assets/creation/bouton.webp : cadre or en octogone, velours rouge) passé en argent, le
# velours remplacé par une plaque de métal brossé, un peu plus sombre sur ses bords. Mêmes dimensions (760 × 257), pour
# ne jamais déformer le bouton. Le nom du lieu et sa flèche sont gravés par le CSS (styles.css, .hud-context-btn).
# Sortie : prototype-web/assets/hud/bouton-lieu.webp. Usage : bash scripts/build-bouton-lieu.sh (ImageMagick).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=prototype-web/assets/creation/bouton.webp
OUT=prototype-web/assets/hud/bouton-lieu.webp
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

# Le cadre seul : le velours retiré depuis le centre (tolérance 20 %, le cadre reste entier).
convert "$SRC" -alpha set -fuzz 20% -fill none -draw "color 380,128 floodfill" "$tmp/cadre.png"
convert "$SRC" -alpha extract "$tmp/a0.png"
convert "$tmp/cadre.png" -alpha extract "$tmp/a1.png"
convert "$tmp/a0.png" "$tmp/a1.png" -compose minus_src -composite -threshold 50% "$tmp/forme.png"
# Le cadre en argent : en gris, plus contrasté, une pointe de chaud (l'étain des pictos de la barre).
convert "$tmp/cadre.png" -alpha off -colorspace gray -level 3%,78% -colorspace sRGB -fill '#c9c3b8' -colorize 10% \
  "$tmp/a1.png" -alpha off -compose copy_opacity -composite "$tmp/cadre-argent.png"
# La plaque : un dégradé d'étain, brossé à l'horizontale, assombri contre le cadre.
convert -size 760x257 gradient:'#d6d1c8'-'#858078' "$tmp/degrade.png"
convert -size 760x257 xc:gray50 -seed 7 +noise Gaussian -motion-blur 0x40+0 -level 35%,65% "$tmp/brosse.png"
convert "$tmp/degrade.png" "$tmp/brosse.png" -compose overlay -composite "$tmp/plaque.png"
convert "$tmp/forme.png" -morphology Erode Disk:2 -blur 0x5 "$tmp/bord.png"
convert "$tmp/plaque.png" "$tmp/bord.png" -compose multiply -composite \
  "$tmp/forme.png" -alpha off -compose copy_opacity -composite "$tmp/plaque-a.png"
convert "$tmp/plaque-a.png" "$tmp/cadre-argent.png" -compose over -composite -define webp:lossless=false -quality 92 "$OUT"
echo "$OUT"
