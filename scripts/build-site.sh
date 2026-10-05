#!/usr/bin/env bash
# Assemble le site statique du prototype, tel qu'il est servi en ligne :
#   prototype-web/ → racine, data/reference/ → data/, docs/design/ → docs/, game-core/ → core/
# Les fichiers sont copiés tels quels : aucun traitement d'image ni de son.
#
# Usage : bash scripts/build-site.sh [dossier]   (par défaut : site/)
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-site}"
case "$OUT" in
  ""|"/"|"."|".."|"~") echo "Dossier de sortie refusé : « $OUT »" >&2; exit 1 ;;
esac

rm -rf "$OUT"
mkdir -p "$OUT/data" "$OUT/docs" "$OUT/core"
cp -R prototype-web/. "$OUT/"
cp -R data/reference/. "$OUT/data/"
cp -R docs/design/. "$OUT/docs/"
cp -R game-core/. "$OUT/core/"

echo "Site assemblé dans $OUT/ : $(find "$OUT" -type f | wc -l) fichiers."
