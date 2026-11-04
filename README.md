# Simulando Emprendedores

Simulador de gestión empresarial para el aula. Los equipos compiten en un mercado durante siete períodos, sin ver los valores que cargan los demás. No requiere cuentas.

Se puede jugar de dos formas:

- **Cada equipo en su dispositivo:** quien crea la partida comparte un código o link y cada equipo se une con el nombre que elija. Su navegador queda asociado al equipo; si cambia de dispositivo, el coordinador puede liberarlo para retomarlo.
- **Una sola computadora:** los equipos cargan por turnos en la misma pantalla. Ideal para practicar antes de un certamen.

Quien crea la partida la coordina desde ese navegador. Si lo pierde (otro dispositivo, cookies borradas), la recupera en `/recuperar` con el código de coordinador que se muestra en la partida; el código cambia con cada uso.

Se puede instalar como app (PWA) desde el navegador cuando se sirve por HTTPS. El service worker guarda solo archivos públicos versionados: las páginas y la API siempre van a la red, y sin conexión se muestra un aviso. El inicio ofrece un botón para instalarla y, en iPhone y iPad, las instrucciones para agregarla a inicio.

## Desarrollo

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Verificaciones: `npm test`, `npx tsc --noEmit` y `npm run lint`.

## Puesta en producción

Las migraciones se aplican solas al iniciar. `docker-compose.yml` levanta la aplicación y los backups sin publicar puertos; hay dos formas de exponerla.

**Con Coolify**

1. Crear el recurso desde el repositorio, con Build Pack *Docker Compose* y el archivo `docker-compose.yml`.
2. Asignar el dominio al servicio `web`, indicando el puerto: `https://tu-dominio.com:5111`.
3. Cargar las claves de IA en las variables de entorno, si se van a usar.

Coolify gestiona el HTTPS con su propio proxy, así que Caddy no se usa.

**En un servidor propio, con Caddy**

Hace falta Docker, los puertos 80 y 443 abiertos y un dominio que apunte al servidor.

```bash
cp .env.example .env   # definir DOMAIN y, si se quiere, una clave de IA
docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
```

Caddy obtiene y renueva el certificado HTTPS.

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
