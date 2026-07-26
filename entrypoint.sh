#!/bin/sh
set -e

echo "=========================================="
echo "      Démarrage de MyWallet App           "
echo "=========================================="

echo "DATABASE_URL : ${DATABASE_URL}"
echo "NEXTAUTH_URL : ${NEXTAUTH_URL:-http://localhost:3000}"
echo "LDAP ENABLED : ${NEXT_PUBLIC_LDAP_ENABLED:-false}"

# Exécution des migrations versionnées Prisma sur PostgreSQL
echo "Exécution des migrations Prisma (PostgreSQL)..."
npx prisma migrate deploy

echo "Lancement du serveur Next.js..."
exec node server.js
