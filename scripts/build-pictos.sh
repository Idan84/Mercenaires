#!/usr/bin/env bash
# Pictos des peuples, des cultures et des ascendances : masters d'Idan (assets-src/Picto/, 1024×1024 ; cultures et
# ascendances sur fond blanc, peuples déjà détourés) → versions web (prototype-web/assets/pictos/, WebP 128×128 transparent).
# Le nom de sortie est le « slug » du nom de référence (peoples.json, ancestries.json),
# calculé de la même façon par prototype-web/picto-ui.js. Nécessite ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/Picto
OUT=prototype-web/assets/pictos
mkdir -p "$OUT"

# master → nom de sortie
MAP=(
  "Ascendance/Asc_Divin.jpg:ascendance-sang-divin"
  "Ascendance/Asc_Dragon.jpg:ascendance-sang-de-dragon"
  "Ascendance/Asc_Djiin.jpg:ascendance-sang-de-djinn"
  "Ascendance/Asc_Elf.jpg:ascendance-sang-d-elfe"
  "Ascendance/Asc_Sirene.jpg:ascendance-sang-de-sirene"
  "Ascendance/Asc_Troll.jpg:ascendance-sang-de-troll"
  "Ascendance/Asc_Fee.jpg:ascendance-sang-feerique"
  "Ascendance/Asc_Demon.jpg:ascendance-sang-de-demon"
  "Ascendance/Asc_Humain.jpg:ascendance-sang-d-humain"
  "Ascendance/Asc_Orc.jpg:ascendance-sang-d-orc"
  "Ascendance/Asc_Dryade.jpg:ascendance-sang-de-dryade"
)

# Cultures (Idan, 2026-10-22) : un master par culture, déjà nommé d'après le slug de cultures.json
# (assets-src/Picto/Culture/README.md donne le fichier déposé sur Hostinger d'origine).
for src in "$SRC"/Culture/*.jpg; do
  MAP+=("Culture/$(basename "$src"):culture-$(basename "$src" .jpg)")
done

# Détourage (Idan, 2026-10-23 : « encore quelques petits problèmes de détourage ») :
# 1. le fond est la zone reliée aux quatre coins, jusqu'à 30 % du blanc : il englobe les ombres grises
#    et le liseré clair des bords, sans franchir le contour sombre de l'emblème ;
# 2. dans ce fond seulement, le blanc devient transparent (« color to alpha ») au lieu d'être coupé net :
#    une ombre grise devient un voile sombre translucide, un bord adouci perd son blanc, le verre reste
#    translucide ; l'intérieur de l'emblème (os, parchemins crème) est intact ;
# 3. le cadrage suit la partie nettement opaque (alpha ≥ 35 %), pour qu'une ombre ne rapetisse pas le picto.
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cut_picto(){
  local src=$1 out=$2 pockets=$3 size w h box
  size=$(identify -format "%w %h" "$src"); w=${size% *}; h=${size#* }
  convert "$src" -alpha set -fuzz 30% -fill none \
    -draw "color 0,0 floodfill" -draw "color $((w-1)),0 floodfill" \
    -draw "color 0,$((h-1)) floodfill" -draw "color $((w-1)),$((h-1)) floodfill" \
    -alpha extract -negate "$tmp/region.png"
  # Les emblèmes de culture enferment des poches de fond blanc (dans un cœur, un croissant…) que le
  # remplissage depuis les coins n'atteint pas : le blanc pur (6 %) compte aussi comme fond.
  if [[ $pockets == 1 ]]; then
    convert "$src" -fuzz 6% -fill black +opaque white -fill white -opaque white "$tmp/pockets.png"
    convert "$tmp/region.png" "$tmp/pockets.png" -compose lighten -composite "$tmp/region.png"
  fi
  # Color to alpha : a = 1 − min(R,G,B) ; couleur d'origine C' = 1 − (1 − C) / a.
  convert "$src" -alpha off -negate "$tmp/inv.png"
  convert "$tmp/inv.png" -separate -evaluate-sequence max "$tmp/a.png"
  convert "$tmp/inv.png" "$tmp/a.png" -compose divide_src -composite -negate "$tmp/c2a.png"
  convert "$src" -alpha off "$tmp/c2a.png" "$tmp/region.png" -composite "$tmp/color.png"
  # Opacité : a dans le fond (le bruit du JPEG sous 6 % disparaît), pleine ailleurs.
  convert "$tmp/region.png" -negate \( "$tmp/a.png" -level 6%,100% \) -compose lighten -composite "$tmp/alpha.png"
  box=$(convert "$tmp/alpha.png" -threshold 35% -format %@ info:)
  convert "$tmp/color.png" "$tmp/alpha.png" -alpha off -compose copy_opacity -composite -compose over \
    -crop "$box" +repage -resize 128x128 -gravity center -background none -extent 128x128 \
    -quality 90 "$out"
}

for entry in "${MAP[@]}"; do
  src="$SRC/${entry%%:*}"; out="$OUT/${entry##*:}.webp"
  pockets=0; [[ $entry == Culture/* ]] && pockets=1
  cut_picto "$src" "$out" "$pockets"
  echo "$out"
done

# Peuples (Idan, 2026-11-15) : masters déjà détourés, décontaminés et à la bonne proportion (PNG transparents 1024 × 1024,
# assets-src/Picto/Peuple/README.md). « Ce qui compte ici, c'est la taille extérieure du png, pas l'intérieur » : on garde
# toute la toile, sans recadrer, et on réduit.
for src in "$SRC"/Peuple/peuple-*.png; do
  out="$OUT/$(basename "$src" .png).webp"
  convert "$src" -resize 128x128 -quality 90 "$out"
  echo "$out"
done

# Écoles de magie (Idan, 2026-11-15) : masters déjà détourés (PNG transparents, assets-src/Picto/Magie/README.md),
# nommés d'après le slug de l'école : on recadre sur la partie nettement opaque et on réduit, comme les autres.
for src in "$SRC"/Magie/ecole-*.png; do
  out="$OUT/$(basename "$src" .png).webp"
  box=$(convert "$src" -alpha extract -threshold 35% -format %@ info:)
  convert "$src" -crop "$box" +repage -resize 128x128 -gravity center -background none -extent 128x128 -quality 90 "$out"
  echo "$out"
done
