#!/usr/bin/env bash
# Fonds du dortoir (Idan et Jean-Mimi, 2026-10-25) : un fond plein écran par niveau de qualité.
# Masters : assets-src/fonds/Dortoirs/dortoir-<n>.jpg ; versions du jeu : prototype-web/assets/dormitory/,
# même taille, JPEG progressif allégé (comme le fond du camp). Nécessite ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p prototype-web/assets/dormitory
for src in assets-src/fonds/Dortoirs/dortoir-*.jpg; do
  convert "$src" -strip -interlace JPEG -sampling-factor 4:2:0 -quality 80 "prototype-web/assets/dormitory/$(basename "$src")"
done
ls -l prototype-web/assets/dormitory
