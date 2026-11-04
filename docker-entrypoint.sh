#!/bin/sh
set -e

# Arranca como root solo para corregir el dueño del volumen (por ejemplo, uno creado por una
# versión anterior que corría como root) y enseguida continúa sin privilegios.
if [ "$(id -u)" = "0" ]; then
  if [ -n "$(find /app/data ! -user node -print -quit)" ]; then
    echo "[entrypoint] Ajustando el dueño de /app/data..."
    chown -R node:node /app/data
  fi
  export HOME=/home/node
  exec setpriv --reuid=node --regid=node --init-groups "$0" "$@"
fi

echo "[entrypoint] Aplicando migraciones de la base de datos..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Iniciando servidor Next.js en el puerto ${PORT:-5111}..."
exec "$@"
