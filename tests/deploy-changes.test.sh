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
# Ce qui a quitté le site (Idan, 2026-11-15 : « Tu peux virer des dossiers ou des fichiers inutiles ? » — « Go ») : effacé
# s'il était dans le manifeste du dernier envoi ou dans la liste ; jamais media/, api/.cache/, le manifeste, un chemin en
# « .. » ni un fichier encore dans le site ; les dossiers devenus vides, les plus profonds d'abord.
cp "$T/m3" "$T/old"
printf '%s  ./vieux/sous/fichier.webp\n%s  ./vieux/autre.js\n%s  ./media/avatars/a.webp\n' "$(printf %040d 0)" "$(printf %040d 0)" "$(printf %040d 0)" >> "$T/old"
cat > "$T/liste" <<'LISTE'
# commentaire
assets/ancien.webp
./assets/pictos/garde.webp   # encore dans le site
media/pictos/a-moi.png
../hors-du-site.txt
api/.cache/index.json

LISTE
mkdir -p "$T/site/assets/pictos" && echo "x" > "$T/site/assets/pictos/garde.webp"
bash scripts/deploy-changes.sh "$T/site" "$T/m3" "$T/changes" "$T/m4" >/dev/null
bash scripts/deploy-obsolete.sh "$T/old" "$T/m4" "$T/liste" "$T/files" "$T/dirs" >/dev/null
[ "$(tr '\n' ' ' < "$T/files")" = "./assets/ancien.webp ./vieux/autre.js ./vieux/sous/fichier.webp " ] || fail "à effacer : $(tr '\n' ' ' < "$T/files")"
[ "$(tr '\n' ' ' < "$T/dirs")" = "./vieux/sous ./vieux " ] || fail "dossiers vides, les plus profonds d'abord : $(tr '\n' ' ' < "$T/dirs")"
bash scripts/deploy-obsolete.sh "$T/absent" "$T/m4" "$T/absent" "$T/files" "$T/dirs" >/dev/null
[ ! -s "$T/files" ] && [ ! -s "$T/dirs" ] || fail "sans manifeste ni liste : rien à effacer"
# La liste du dépôt : aucun de ses chemins n'est dans le site assemblé, ni dans media/.
bash scripts/deploy-obsolete.sh "$T/absent" "$T/m1" scripts/deploy-obsolete.txt "$T/files" "$T/dirs" >/dev/null
listed=$(sed -e 's/[[:space:]]*#.*$//' -e '/^[[:space:]]*$/d' scripts/deploy-obsolete.txt | wc -l)
[ "$(wc -l < "$T/files")" -eq "$listed" ] || fail "un chemin de scripts/deploy-obsolete.txt est encore dans le site ou dans media/"
grep -q "deploy-obsolete.sh" scripts/deploy-ftp.sh || fail "la mise en ligne efface ce qui a quitté le site"
bash -n scripts/deploy-ftp.sh || fail "deploy-ftp.sh"
grep -q -- "--overwrite" scripts/deploy-ftp.sh || fail "remplacer sans effacer d'abord"
grep -q "bash scripts/deploy-ftp.sh site" .github/workflows/deploy-hostinger.yml || fail "la mise en ligne passe par deploy-ftp.sh"
echo "Mise en ligne : seulement ce qui a changé, manifeste, remplacement sans effacement, effacement de ce qui a quitté le site — OK"
