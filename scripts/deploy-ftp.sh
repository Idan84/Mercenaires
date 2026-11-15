#!/usr/bin/env bash
# Envoie le site assemblé sur Hostinger, seulement ce qui a changé depuis le dernier envoi réussi (Idan, 2026-11-04 :
# « oui fais le 2 ») :
#   1. lit le manifeste du dernier envoi (.deploy-manifest, dans le dossier distant) ; absent : tout le site part ;
#   2. choisit les fichiers nouveaux ou modifiés (scripts/deploy-changes.sh) ;
#   3. les envoie, en remplaçant chaque fichier sans l'effacer d'abord (--overwrite : un envoi raté laisse l'ancien en
#      place) ;
#   4. efface ce qui ne sert plus (Idan, 2026-11-15 : « Tu peux virer des dossiers ou des fichiers inutiles ? » — « Go ») :
#      les fichiers qu'elle avait elle-même envoyés et qui ont quitté le site, et ceux de scripts/deploy-obsolete.txt
#      (scripts/deploy-obsolete.sh), puis leurs dossiers s'ils sont vides ; un échec est signalé sans arrêter l'envoi ;
#   5. envoie le nouveau manifeste, seulement si l'envoi est passé.
# Ce qu'Idan dépose directement chez Hostinger (media/) n'est jamais touché.
#
# Usage : LFTP_OPEN='open …' bash scripts/deploy-ftp.sh <site> <dossier distant>
#   LFTP_OPEN : la commande lftp « open » complète (le mot de passe reste dans LFTP_PASSWORD, avec --env-password).
#   DEPLOY_FULL=1 : tout renvoyer, sans lire le manifeste (si un fichier a disparu chez Hostinger).
set -euo pipefail

SITE="$(cd "$1" && pwd)"; DIR="$2"
: "${LFTP_OPEN:?LFTP_OPEN manquant}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# FTP chiffré ; un gros fichier a le temps de passer avant qu'on réessaie ; au premier échec, on s'arrête.
SETTINGS="set ftp:ssl-force true; set ftp:ssl-protect-data true; set net:max-retries 3; set net:timeout 120; set cmd:fail-exit yes;"

if [ "${DEPLOY_FULL:-}" = "1" ]; then
  echo "Envoi complet demandé : tout le site part."
elif lftp -c "$SETTINGS $LFTP_OPEN; get \"$DIR/.deploy-manifest\" -o \"$WORK/remote-manifest\"" 2>/dev/null; then
  echo "Manifeste du dernier envoi : $(wc -l < "$WORK/remote-manifest") fichiers."
else
  echo "Pas de manifeste en ligne : tout le site part."
fi

# Envoi complet : tout part, mais le manifeste en ligne dit encore ce qui avait été envoyé (pour l'effacement).
if [ "${DEPLOY_FULL:-}" = "1" ]; then
  lftp -c "$SETTINGS $LFTP_OPEN; get \"$DIR/.deploy-manifest\" -o \"$WORK/previous-manifest\"" 2>/dev/null || true
  bash "$(dirname "$0")/deploy-changes.sh" "$SITE" "$WORK/absent" "$WORK/changes" "$WORK/manifest"
else
  bash "$(dirname "$0")/deploy-changes.sh" "$SITE" "$WORK/remote-manifest" "$WORK/changes" "$WORK/manifest"
  [ -f "$WORK/remote-manifest" ] && cp "$WORK/remote-manifest" "$WORK/previous-manifest"
fi
bash "$(dirname "$0")/deploy-obsolete.sh" "$WORK/previous-manifest" "$WORK/manifest" "$(dirname "$0")/deploy-obsolete.txt" \
  "$WORK/obsolete-files" "$WORK/obsolete-dirs"
if [ -z "$(find "$WORK/changes" -type f -print -quit)" ] && [ ! -s "$WORK/obsolete-files" ]; then
  echo "Rien de nouveau à envoyer ni à effacer."
  exit 0
fi

if [ -n "$(find "$WORK/changes" -type f -print -quit)" ]; then
  lftp -c "$SETTINGS $LFTP_OPEN; mirror --reverse --no-perms --overwrite --parallel=4 --verbose \"$WORK/changes/\" \"$DIR\""
fi

# L'effacement : fichier par fichier, sans arrêter l'envoi au premier échec (un fichier déjà absent, par exemple).
if [ -s "$WORK/obsolete-files" ]; then
  q(){ printf '"%s"' "$(printf '%s' "$1" | sed 's/["\\]/\\&/g')"; }
  {
    echo "set ftp:ssl-force true; set ftp:ssl-protect-data true; set net:max-retries 3; set net:timeout 120; set cmd:fail-exit no;"
    echo "$LFTP_OPEN"
    while IFS= read -r f; do echo "rm $(q "$DIR/${f#./}")"; done < "$WORK/obsolete-files"
    while IFS= read -r d; do echo "rmdir $(q "$DIR/${d#./}")"; done < "$WORK/obsolete-dirs"
  } > "$WORK/obsolete.lftp"
  if lftp -f "$WORK/obsolete.lftp"; then echo "Effacé : $(wc -l < "$WORK/obsolete-files") fichier(s) qui ne servaient plus."
  else echo "::warning::Effacement incomplet chez Hostinger (voir ci-dessus)."; fi
  sed 's/^/  effacé : /' "$WORK/obsolete-files"
fi

lftp -c "$SETTINGS $LFTP_OPEN; put \"$WORK/manifest\" -o \"$DIR/.deploy-manifest\""
echo "Envoi terminé ; manifeste mis à jour."
