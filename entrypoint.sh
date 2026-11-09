#!/bin/sh
set -e

echo "=========================================="
echo "      Démarrage de MyWallet App           "
echo "=========================================="

# Support des variables fichiers (Docker secrets, Kubernetes, etc.)
# Pour toute variable VAR_FILE=/chemin/vers/fichier, le contenu du fichier
# est exporté dans VAR (ex : NEXTAUTH_SECRET_FILE=/run/secrets/nextauth_secret).
# Définir à la fois VAR (non vide) et VAR_FILE est une erreur.
for file_var in $(env | sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*_FILE\)=.*/\1/p'); do
  var="${file_var%_FILE}"
  eval "file_path=\${${file_var}}"
  # Une variable vide (ex : NEXTAUTH_SECRET= dans docker-compose) n'est pas un conflit
  eval "var_is_set=\${${var}:+x}"

  [ -n "${file_path}" ] || continue

  if [ -n "${var_is_set}" ]; then
    echo "Erreur : ${var} et ${file_var} sont tous les deux définis, ils sont mutuellement exclusifs." >&2
    exit 1
  fi
  if [ ! -r "${file_path}" ]; then
    echo "Erreur : ${file_var} pointe vers '${file_path}', fichier introuvable ou illisible." >&2
    exit 1
  fi

  # $(cat ...) retire les retours à la ligne finaux du fichier
  value="$(cat "${file_path}")"
  export "${var}=${value}"
  unset "${file_var}"
  echo "${var} chargé depuis ${file_path}"
done
unset file_var var file_path var_is_set value

# Masque le mot de passe de la connection string avant affichage
if [ -n "${DATABASE_URL}" ]; then
  MASKED_DATABASE_URL=$(printf '%s' "${DATABASE_URL}" | sed -E 's#(://[^:/@]*):[^/]*@#\1:****@#')
else
  MASKED_DATABASE_URL="(non défini)"
fi
echo "DATABASE_URL : ${MASKED_DATABASE_URL}"
echo "NEXTAUTH_URL : ${NEXTAUTH_URL:-http://localhost:3000}"
echo "LDAP ENABLED : ${NEXT_PUBLIC_LDAP_ENABLED:-false}"

# Exécution des migrations versionnées Prisma sur PostgreSQL
echo "Exécution des migrations Prisma (PostgreSQL)..."
npx prisma migrate deploy

echo "Lancement du serveur Next.js..."
exec node server.js
