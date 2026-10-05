#!/usr/bin/env bash
# Nom sous lequel se connecter en FTP chiffré quand le certificat du serveur ne porte pas l'adresse
# configurée. Cas de Hostinger : on configure ftp.<domaine> ou l'IP, le certificat est au nom du serveur.
#
# Lit le certificat, affiche ses noms, et renvoie le premier nom précis (pas « *.… ») qui désigne la
# même machine que l'adresse configurée ; à défaut, l'adresse configurée elle-même. La connexion qui
# suit vérifie toujours le certificat, avec ce nom.
#
# Usage : bash scripts/ftp-tls-host.sh <adresse> [port]
set -uo pipefail

host="$1"
port="${2:-21}"

cert=$(openssl s_client -connect "$host:$port" -starttls ftp -servername "$host" </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -ext subjectAltName -enddate 2>/dev/null)
echo "Certificat du serveur FTP :" >&2
echo "${cert:-(illisible)}" | sed 's/^/  /' >&2

ips() { getent ahosts "$1" 2>/dev/null | awk '{print $1}' | sort -u; }
wanted=$(ips "$host")
names=$({
  echo "$cert" | grep -oE 'DNS:[^, ]+' | sed 's/^DNS://'
  echo "$cert" | sed -n 's/^subject=.*CN *= *\([^,/]*\).*/\1/p'
} | awk 'NF && !seen[$0]++')

for name in $names; do
  case "$name" in \*.*) continue ;; esac
  if [ "$name" = "$host" ]; then echo "$name"; exit 0; fi
  if [ -n "$wanted" ] && [ -n "$(comm -12 <(echo "$wanted") <(ips "$name"))" ]; then
    echo "Connexion sous le nom du certificat : $name" >&2
    echo "$name"
    exit 0
  fi
done
echo "$host"
