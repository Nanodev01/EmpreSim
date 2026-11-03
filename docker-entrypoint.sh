#!/bin/sh
set -e

echo "[entrypoint] Aplicando migraciones de la base de datos..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Iniciando servidor Next.js en el puerto ${PORT:-5111}..."
exec "$@"
