#!/usr/bin/env bash
# Assemble le site statique du prototype, tel qu'il est servi en ligne :
#   prototype-web/ → racine, data/reference/ → data/, docs/design/ → docs/, game-core/ → core/
# Les fichiers sont copiés tels quels : aucun traitement d'image ni de son.
# Seule retouche : dans les pages HTML, les scripts et feuilles de style locaux reçoivent un numéro de
# version (« ui.js?v=<commit> »), pour que le cache de Hostinger et des navigateurs (7 jours) prenne
# la nouvelle version à chaque mise en ligne.
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

VERSION=$(git rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)
find "$OUT" -name "*.html" -print0 | xargs -0 perl -pi -e \
  's{\b(src|href)="([^":?#]+\.(?:js|css))"}{$1="$2?v='"$VERSION"'"}g'

echo "Site assemblé dans $OUT/ : $(find "$OUT" -type f | wc -l) fichiers, version $VERSION."
