#!/usr/bin/env bash
# Ce qu'il faut effacer chez Hostinger à la mise en ligne (Idan, 2026-11-15 : « Tu peux virer des dossiers ou des fichiers
# inutiles ? » — « Go ») : les fichiers que la mise en ligne avait elle-même envoyés (ils sont dans le manifeste du
# dernier envoi) et qui ne sont plus dans le site assemblé, plus ceux de scripts/deploy-obsolete.txt (les restes d'avant
# ce nettoyage, que le manifeste ne connaît plus). Jamais media/ (les dépôts d'Idan), ni api/.cache/, ni le manifeste, ni
# un fichier encore dans le site.
#
# Usage : bash scripts/deploy-obsolete.sh <ancien manifeste (peut manquer)> <nouveau manifeste> <liste (peut manquer)>
#                                          <fichiers à effacer> <dossiers à effacer s'ils sont vides>
# Les chemins sont écrits comme dans le manifeste (« ./chemin »), triés ; les dossiers, les plus profonds d'abord.
set -euo pipefail

OLD="$1"; NEW="$2"; LIST="$3"; FILES="$4"; DIRS="$5"
[ -f "$NEW" ] || { echo "Nouveau manifeste introuvable : « $NEW »" >&2; exit 1; }

{
  [ -s "$OLD" ] && cut -c43- "$OLD"
  # La liste : un chemin du site par ligne (« assets/x.webp » ou « ./assets/x.webp ») ; # et lignes vides ignorés.
  [ -s "$LIST" ] && sed -e 's/[[:space:]]*#.*$//' -e 's/[[:space:]]*$//' -e '/^$/d' -e 's#^\./##' -e 's#^#./#' "$LIST"
  true
} | awk -v NEW="$NEW" '
  BEGIN{ while((getline line < NEW)>0) keep[substr(line,43)]=1 }
  # Un chemin sûr : relatif, sans « .. », hors de media/ (les dépôts d Idan), du cache et du manifeste, plus dans le site.
  $0 !~ /^\.\// || $0 ~ /(^|\/)\.\.(\/|$)/ { next }
  $0 ~ /^\.\/media(\/|$)/ || $0 ~ /^\.\/api\/\.cache(\/|$)/ || $0 == "./.deploy-manifest" { next }
  !($0 in keep) { print }
' | LC_ALL=C sort -u > "$FILES"

# Les dossiers de ces fichiers qui ne contiennent plus rien du site : on tentera de les effacer, sans forcer (un dossier
# où Idan aurait déposé quelque chose n'est pas vide, il reste).
awk -v NEW="$NEW" '
  BEGIN{ while((getline line < NEW)>0){ p=substr(line,43); while(sub(/\/[^\/]*$/,"",p) && p!=".") used[p]=1 } }
  { p=$0; while(sub(/\/[^\/]*$/,"",p) && p!="."){ if(!(p in used)) print gsub(/\//,"/",p) "\t" p } }
' "$FILES" | LC_ALL=C sort -u | sort -t "$(printf '\t')" -k1,1nr -k2,2 | cut -f2 | awk '!seen[$0]++' > "$DIRS"

echo "$(wc -l < "$FILES") fichier(s) et $(wc -l < "$DIRS") dossier(s) à effacer en ligne."
