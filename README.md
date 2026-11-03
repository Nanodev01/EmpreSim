# Simulando Emprendedores

Simulador de gestión empresarial para el aula. Cada equipo carga sus decisiones por turno, sin ver las de los demás, y compite en un mercado durante siete períodos. No requiere cuentas: cada partida queda asociada al navegador que la creó.

## Desarrollo

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Verificaciones: `npm test`, `npx tsc --noEmit` y `npm run lint`.

## Puesta en producción

Hace falta un servidor con Docker, los puertos 80 y 443 abiertos y un dominio que apunte a él.

```bash
cp .env.example .env   # definir DOMAIN y, si se quiere, una clave de IA
docker compose up -d --build
```

Caddy obtiene y renueva el certificado HTTPS. Las migraciones se aplican solas al iniciar.

## Backups

El servicio `backup` guarda una copia comprimida cada 6 horas y conserva 14 días (`BACKUP_INTERVALO_SEGUNDOS`, `BACKUP_RETENCION_DIAS`). Las copias quedan en el volumen `simulando_backups`, en el mismo servidor: conviene copiarlas también a otro lugar.

Para restaurar una copia:

```bash
docker compose stop web
docker compose run --rm --entrypoint sh backup -c \
  "gunzip -c /backups/ARCHIVO.db.gz > /data/simulador.db && rm -f /data/simulador.db-wal /data/simulador.db-shm && chown 1000:1000 /data/simulador.db"
docker compose start web
```

## Documentación

- [Registro de commits e historias de usuario](docs/HISTORIAS_DE_USUARIO.md)
