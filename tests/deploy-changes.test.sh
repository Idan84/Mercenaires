#!/usr/bin/env bash
# Mise en ligne, seulement ce qui a changé (Idan, 2026-11-04 : « oui fais le 2 ») : sans manifeste, tout part ; même site,
# rien ; un fichier modifié et un nouveau, ces deux-là seulement ; le manifeste suit le site assemblé.
set -euo pipefail
cd "$(dirname "$0")/.."
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
fail(){ echo "ÉCHEC : $*" >&2; exit 1; }

bash scripts/build-site.sh "$T/site" >/dev/null
total=$(find "$T/site" -type f | wc -l)
bash scripts/deploy-changes.sh "$T/site" "$T/absent" "$T/changes" "$T/m1" >/dev/null
[ "$(find "$T/changes" -type f | wc -l)" -eq "$total" ] || fail "sans manifeste, tout le site doit partir"
[ "$(wc -l < "$T/m1")" -eq "$total" ] || fail "le manifeste compte chaque fichier"
bash scripts/deploy-changes.sh "$T/site" "$T/m1" "$T/changes" "$T/m2" >/dev/null
[ -z "$(find "$T/changes" -type f -print -quit)" ] || fail "même site : rien à envoyer"
cmp -s "$T/m1" "$T/m2" || fail "même site : même manifeste"
echo "// modifié" >> "$T/site/core/campaign.js"
mkdir -p "$T/site/nouveau" && echo "x" > "$T/site/nouveau/fichier.txt"
bash scripts/deploy-changes.sh "$T/site" "$T/m1" "$T/changes" "$T/m3" >/dev/null
[ "$(cd "$T/changes" && find . -type f | LC_ALL=C sort | tr '\n' ' ')" = "./core/campaign.js ./nouveau/fichier.txt " ] || fail "seulement le fichier modifié et le nouveau"
cmp -s "$T/site/core/campaign.js" "$T/changes/core/campaign.js" || fail "le fichier envoyé est celui du site"
grep -q "  ./nouveau/fichier.txt$" "$T/m3" || fail "le nouveau manifeste compte le nouveau fichier"
bash -n scripts/deploy-ftp.sh || fail "deploy-ftp.sh"
grep -q -- "--overwrite" scripts/deploy-ftp.sh || fail "remplacer sans effacer d'abord"
grep -q "bash scripts/deploy-ftp.sh site" .github/workflows/deploy-hostinger.yml || fail "la mise en ligne passe par deploy-ftp.sh"
echo "Mise en ligne : seulement ce qui a changé, manifeste, remplacement sans effacement — OK"
