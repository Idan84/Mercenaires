#!/usr/bin/env bash
# Pictos des peuples, des cultures et des ascendances : masters d'Idan (assets-src/Picto/, 1024×1024 sur fond blanc)
# → versions web détourées (prototype-web/assets/pictos/, WebP 128×128 transparent).
# Le nom de sortie est le « slug » du nom de référence (peoples.json, ancestries.json),
# calculé de la même façon par prototype-web/picto-ui.js. Nécessite ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/Picto
OUT=prototype-web/assets/pictos
mkdir -p "$OUT"

# master → nom de sortie
MAP=(
  "Peuple/Peuple_Orc.jpg:peuple-orc"
  "Peuple/Peuple_Homme_Betes.jpg:peuple-homme-bete"
  "Peuple/Peuple_Reptilien.jpg:peuple-reptilien"
  "Peuple/Peuple_Humain.jpg:peuple-humain"
  "Peuple/Peuple_Halfling.jpg:peuple-halfling"
  "Peuple/Peuple_Elfes.jpg:peuple-elfe"
  "Peuple/Peuple_Gobelin.jpg:peuple-gobelin"
  "Peuple/Peuple_Gnome.jpg:peuple-gnome"
  "Peuple/Peuple_Orgre.jpg:peuple-ogre"
  "Peuple/Peuple_Nain.jpg:peuple-nain"
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

for entry in "${MAP[@]}"; do
  src="$SRC/${entry%%:*}"; out="$OUT/${entry##*:}.webp"
  size=$(identify -format "%w %h" "$src"); w=${size% *}; h=${size#* }
  # Les emblèmes de culture enferment des poches de fond blanc (dans un cœur, un croissant…) que le
  # remplissage depuis les coins n'atteint pas : on retire aussi le blanc pur (6 %), sans toucher aux os
  # ni aux parchemins, qui sont crème.
  pockets=()
  [[ $entry == Culture/* ]] && pockets=(-fuzz 6% -transparent white)
  # Fond blanc retiré depuis les quatre coins, puis recadrage, carré centré, 128 px.
  convert "$src" -alpha set -fuzz 14% -fill none \
    -draw "color 0,0 floodfill" -draw "color $((w-1)),0 floodfill" \
    -draw "color 0,$((h-1)) floodfill" -draw "color $((w-1)),$((h-1)) floodfill" \
    "${pockets[@]}" -trim +repage -resize 128x128 -gravity center -background none -extent 128x128 \
    -quality 90 "$out"
  echo "$out"
done
