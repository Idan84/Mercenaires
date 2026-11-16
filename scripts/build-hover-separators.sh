#!/usr/bin/env bash
# Les séparateurs de la fiche au survol, tirés des planches d'ornements d'Idan (Ornements.zip, sur le serveur :
# media/Ornements.zip), noir sur blanc : la couronne et ses rinceaux (Idan, 2026-11-16 : « Dans la couleur de la culture,
# on pose ça pour séparer avant les tags »), la planche entière. On la seuille, on la recadre sur le dessin, potrace en
# fait un tracé ; le SVG est noir, le CSS s'en sert comme masque et le colore (styles.css, .hc-sep).
# Usage : bash scripts/build-hover-separators.sh <dossier des planches dézippées>   (ImageMagick, potrace, python3)
set -euo pipefail
SRC=${1:?dossier des planches dézippées (Ornements.zip)}
cd "$(dirname "$0")/.."
OUT=prototype-web/assets/fiche/separateurs
mkdir -p "$OUT"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
plate=$(ls "$SRC"/Vector_silhouette_ornament_divid*.jpg | head -1)
convert "$plate" -colorspace gray -threshold 50% -trim +repage "$tmp/couronne.pbm"
potrace -s --turdsize 3 --alphamax 1 --opttolerance 0.4 -o "$tmp/couronne.svg" "$tmp/couronne.pbm"
python3 - "$tmp/couronne.svg" "$OUT/couronne.svg" <<'PY'
import re, sys
svg = open(sys.argv[1]).read()
vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
grp = re.sub(r'fill="#[0-9a-fA-F]+"', 'fill="#000"', re.search(r"(<g transform=.*</g>)", svg, re.S).group(1))
open(sys.argv[2], "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><!-- Blood & Wages : séparateur de la fiche au survol, la couronne et ses rinceaux (planche d\'Idan) -->{grp}</svg>\n')
w, h = (float(v) for v in vb.split()[2:])
print(sys.argv[2], f"{w:.0f} × {h:.0f} (rapport {w / h:.3f})")
PY
