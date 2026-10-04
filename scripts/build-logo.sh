#!/usr/bin/env bash
# Logo Blood & Wages : PNG transparent d'Idan (assets-src/logo/logoBW.png), utilisé tel quel
# (pas de détourage, décision d'Idan du 2026-10-04) → version web pour l'interface
# (prototype-web/assets/blood-wages-logo.webp) : marges vides retirées, 1200 px de large.
# Nécessite ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/logo/logoBW.png
OUT=prototype-web/assets/blood-wages-logo.webp
convert "$SRC" -trim +repage -resize 1200x -quality 90 "$OUT"
identify "$OUT"
