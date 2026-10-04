#!/usr/bin/env bash
# Logo Blood & Wages : master d'Idan sur fond blanc (assets-src/logo/blood-wages-master.png)
# → version détourée pour l'interface (prototype-web/assets/blood-wages-logo.webp).
# Le blanc n'est retiré que par grandes zones (fond, creux des lettres) : une ouverture
# morphologique écarte les petits reflets blancs du métal. Nécessite ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/logo/blood-wages-master.png
OUT=prototype-web/assets/blood-wages-logo.webp
TMP=$(mktemp -d)
convert "$SRC" -alpha off -fuzz 7% -fill white -opaque white -fill black +opaque white "$TMP/mask.png"
convert "$TMP/mask.png" -morphology Open Disk:4 -negate -blur 0x0.7 "$TMP/alpha.png"
convert "$SRC" -alpha off "$TMP/alpha.png" -compose CopyOpacity -composite -trim +repage \
  -resize 1200x -quality 88 "$OUT"
rm -rf "$TMP"
identify "$OUT"
