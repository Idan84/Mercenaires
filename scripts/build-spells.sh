#!/usr/bin/env bash
# Icônes des sorts (Idan, 2026-10-25) : par école, un cadre commun et un parchemin par sort, superposés dans le jeu.
# Masters : assets-src/Sorts/<École>/<code du sort>.jpg (parchemins 1024 × 1024) et cadre.jpg (centre blanc).
# Versions du jeu : prototype-web/assets/spells/<école en minuscules>/<code>.webp et cadre.webp, 256 × 256.
# Le cadre est détouré ici, avec l'accord d'Idan : seul son centre blanc devient transparent (remplissage depuis le
# centre, tolérance 25 %) ; la fine marge sombre autour du cadre reste, car la pierre du cadre est trop proche du noir
# pour être séparée du fond. Nécessite ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
for dir in assets-src/Sorts/*/; do
  school=$(basename "$dir" | iconv -f utf-8 -t ascii//TRANSLIT | tr '[:upper:]' '[:lower:]')
  out="prototype-web/assets/spells/$school"
  mkdir -p "$out"
  for src in "$dir"*.jpg; do
    name=$(basename "$src" .jpg)
    if [ "$name" = cadre ]; then
      center=$(identify -format "%[fx:floor(w/2)],%[fx:floor(h/2)]" "$src")
      convert "$src" -alpha set -fuzz 25% -fill none -draw "color $center floodfill" \
        -resize 256x256 -strip -define webp:alpha-quality=100 -quality 88 "$out/cadre.webp"
    else
      convert "$src" -resize 256x256 -strip -quality 82 "$out/$name.webp"
      convert "$src" -resize 1024x1024 -strip -quality 88 "$out/$name-large.webp"
    fi
  done
  ls -l "$out"
done
