#!/usr/bin/env bash
# Envoie le site assemblé sur Hostinger, seulement ce qui a changé depuis le dernier envoi réussi (Idan, 2026-11-04 :
# « oui fais le 2 ») :
#   1. lit le manifeste du dernier envoi (.deploy-manifest, dans le dossier distant) ; absent : tout le site part ;
#   2. choisit les fichiers nouveaux ou modifiés (scripts/deploy-changes.sh) ;
#   3. les envoie, en remplaçant chaque fichier sans l'effacer d'abord (--overwrite : un envoi raté laisse l'ancien en
#      place), puis envoie le nouveau manifeste, seulement si tout est passé.
# Rien n'est jamais effacé chez Hostinger : ce qu'Idan y dépose directement (médias) n'est jamais touché.
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

bash "$(dirname "$0")/deploy-changes.sh" "$SITE" "$WORK/remote-manifest" "$WORK/changes" "$WORK/manifest"
if [ -z "$(find "$WORK/changes" -type f -print -quit)" ]; then
  echo "Rien de nouveau à envoyer."
  exit 0
fi

lftp -c "$SETTINGS $LFTP_OPEN;
  mirror --reverse --no-perms --overwrite --parallel=4 --verbose \"$WORK/changes/\" \"$DIR\";
  put \"$WORK/manifest\" -o \"$DIR/.deploy-manifest\""
echo "Envoi terminé ; manifeste mis à jour."
