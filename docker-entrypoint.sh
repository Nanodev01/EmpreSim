#!/bin/sh
set -e

# Asegurar que el directorio de datos existe
mkdir -p /app/data

# Si no existe la base de datos en el volumen persistente, copiar la inicial si está disponible
if [ ! -f /app/data/dev.db ] && [ -f /app/prisma/dev.db ]; then
  echo "[entrypoint] Copiando base de datos inicial a /app/data/dev.db..."
  cp /app/prisma/dev.db /app/data/dev.db
fi

# Sincronizar el esquema de Prisma con SQLite
echo "[entrypoint] Verificando esquema de la base de datos..."
npx prisma db push --skip-generate

echo "[entrypoint] Iniciando servidor Next.js en el puerto ${PORT:-5111}..."
exec "$@"
