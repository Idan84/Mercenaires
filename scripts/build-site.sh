#!/usr/bin/env bash
# Assemble le site statique du prototype, tel qu'il est servi en ligne :
#   prototype-web/ → racine, data/reference/ → data/, docs/design/ → docs/, game-core/ → core/, charte/ → charte/
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
# La charte (onglet Charte de la Design Lab) : ses jetons, ses images, ses règles, et ses aperçus pour le site.
mkdir -p "$OUT/charte"
cp charte/tokens.json charte/assets.json charte/README.md "$OUT/charte/"
node scripts/build-charte.js --site "$OUT/charte/site" >/dev/null
# L'inventaire des images, fichier par fichier, pour l'onglet Images de la Design Lab (scripts/build-images-index.js).
node scripts/build-images-index.js "$OUT/data/images-fichiers.json" >/dev/null
# L'atelier des tags de la Design Lab (design/atelier/, Idan, 2026-11-22) : la page, le moteur des tags et des recrues
# tirées par le générateur du jeu ; enregistré sur Hostinger (media/atelier/, design/api/atelier.php).
node scripts/atelier-tags/profils.js >/dev/null
node scripts/atelier-tags/construit.js "$OUT/design/atelier/index.html" --site >/dev/null

VERSION=$(git rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)
find "$OUT" -name "*.html" -print0 | xargs -0 perl -pi -e \
  's{\b(src|href)="([^":?#]+\.(?:js|css))"}{$1="$2?v='"$VERSION"'"}g'

echo "Site assemblé dans $OUT/ : $(find "$OUT" -type f | wc -l) fichiers, version $VERSION."
