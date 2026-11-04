#!/usr/bin/env bash
# Ce qu'il faut envoyer sur Hostinger : seulement les fichiers nouveaux ou modifiés depuis le dernier envoi réussi
# (Idan, 2026-11-04 : « oui fais le 2 »). Chaque envoi réussi laisse chez Hostinger un manifeste (.deploy-manifest) :
# l'empreinte SHA-1 de chaque fichier du site. On le compare à celui du site assemblé ; sans manifeste (le premier
# envoi), tout part. Rien n'est jamais effacé chez Hostinger.
#
# Usage : bash scripts/deploy-changes.sh <site> <ancien manifeste (peut manquer)> <dossier des changements> <nouveau manifeste>
# Écrit dans <dossier des changements> les fichiers à envoyer (mêmes chemins que dans <site>), et le manifeste du site
# assemblé dans <nouveau manifeste>. Affiche le nombre de fichiers à envoyer.
set -euo pipefail

SITE="$1"; OLD="$2"; OUT="$3"; NEW="$4"
case "$OUT" in
  ""|"/"|"."|".."|"~") echo "Dossier des changements refusé : « $OUT »" >&2; exit 1 ;;
esac
[ -d "$SITE" ] || { echo "Site introuvable : « $SITE »" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT"
# Le manifeste : « <empreinte>  ./<chemin> », trié par chemin.
(cd "$SITE" && find . -type f ! -name .deploy-manifest -print0 | LC_ALL=C sort -z | xargs -0 sha1sum) > "$NEW"

# Les chemins nouveaux ou dont l'empreinte a changé (empreinte : 40 caractères, puis deux espaces, puis le chemin).
if [ -s "$OLD" ]; then
  changed=$(awk 'NR==FNR{old[substr($0,43)]=substr($0,1,40); next} old[substr($0,43)]!=substr($0,1,40){print substr($0,43)}' "$OLD" "$NEW")
else
  changed=$(cut -c43- "$NEW")
fi

count=0
while IFS= read -r path; do
  [ -n "$path" ] || continue
  mkdir -p "$OUT/$(dirname "$path")"
  cp -p "$SITE/$path" "$OUT/$path"
  count=$((count+1))
done <<< "$changed"

echo "$count fichier(s) à envoyer sur $(wc -l < "$NEW")."
