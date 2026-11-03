// Solo se guardan archivos públicos con nombre versionado. Las páginas y la API van siempre a la red:
// el juego necesita datos actuales y lo que cargó un equipo no debe quedar en un dispositivo compartido.
const CACHE = 'simulando-estaticos-v1';
const PAGINA_SIN_CONEXION = '/offline.html';
const MAX_ARCHIVOS = 150;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([PAGINA_SIN_CONEXION, '/icons/icono-192.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

async function recortar(cache) {
  const claves = await cache.keys();
  await Promise.all(claves.slice(0, Math.max(0, claves.length - MAX_ARCHIVOS)).map((c) => cache.delete(c)));
}

async function primeroCache(evento) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(evento.request);
  if (guardado) return guardado;

  const respuesta = await fetch(evento.request);
  if (respuesta.ok) {
    await cache.put(evento.request, respuesta.clone());
    evento.waitUntil(recortar(cache));
  }
  return respuesta;
}

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    evento.respondWith(fetch(request).catch(() => caches.match(PAGINA_SIN_CONEXION)));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    evento.respondWith(primeroCache(evento));
  }
});
