#!/usr/bin/env bash
# Nom sous lequel se connecter en FTP chiffré quand le certificat du serveur ne porte pas l'adresse
# configurée. Cas de Hostinger : on configure ftp.<domaine> ou l'IP, le certificat est générique
# (« *.hstgr.io »).
#
# Lit le certificat et affiche ses noms, puis écrit sur la sortie « <nom> [<ip>] » :
# - un nom précis du certificat qui désigne la même machine : « <nom> » ;
# - sinon, pour un certificat générique « *.domaine » : « deploy.domaine <ip> ». L'appelant associe
#   ce nom à l'IP de l'adresse configurée (/etc/hosts) : la connexion vérifie alors le certificat,
#   chaîne et nom, sans rien désactiver ;
# - à défaut, l'adresse configurée elle-même.
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

# 1. Un nom précis du certificat qui désigne la même machine.
for name in $names; do
  case "$name" in \*.*) continue ;; esac
  if [ "$name" = "$host" ]; then echo "$name"; exit 0; fi
  if [ -n "$wanted" ] && [ -n "$(comm -12 <(echo "$wanted") <(ips "$name"))" ]; then
    echo "Connexion sous le nom du certificat : $name" >&2
    echo "$name"
    exit 0
  fi
done

# 2. Un certificat générique : un nom de son domaine, associé à l'IP de l'adresse configurée.
ip=$(getent ahostsv4 "$host" 2>/dev/null | awk 'NR==1{print $1}')
for name in $names; do
  case "$name" in
    \*.*)
      if [ -n "$ip" ]; then
        echo "Certificat générique : connexion sous deploy.${name#\*.}" >&2
        echo "deploy.${name#\*.} $ip"
        exit 0
      fi
      ;;
  esac
done

echo "$host"
