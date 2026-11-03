#!/bin/sh
# Copia consistente de SQLite cada cierto intervalo, con compresión y retención por antigüedad.
set -u

apk add --no-cache sqlite >/dev/null

ORIGEN=/data/simulador.db

while true; do
  if [ -f "$ORIGEN" ]; then
    ARCHIVO="/backups/simulador-$(date -u +%Y%m%dT%H%M%SZ).db"
    if sqlite3 "$ORIGEN" ".backup '$ARCHIVO'" && [ "$(sqlite3 "$ARCHIVO" 'PRAGMA integrity_check;')" = "ok" ]; then
      gzip "$ARCHIVO"
      echo "[backup] Copia creada: $ARCHIVO.gz"
      find /backups -name 'simulador-*.db.gz' -mtime "+${BACKUP_RETENCION_DIAS}" -delete
    else
      echo "[backup] ERROR: la copia falló o está dañada" >&2
      rm -f "$ARCHIVO"
    fi
  fi
  sleep "$BACKUP_INTERVALO_SEGUNDOS"
done
