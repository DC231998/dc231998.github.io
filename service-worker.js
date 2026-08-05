// Service worker de "Mis Finanzas Personales".
// Estrategia: cache-first para el shell de la app (funciona sin internet tras la primera carga),
// y cache-first-con-actualización-en-segundo-plano para recursos externos (fuentes, Chart.js),
// para que dejen de ser un punto de falla si el usuario no tiene conexión.

const CACHE_NAME = 'mis-finanzas-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // Solo cacheamos respuestas válidas (evita guardar errores/opaque de forma permanente
          // sin control, aunque las respuestas 'opaque' de CDNs cross-origin sí se guardan porque
          // no podemos inspeccionar su status).
          if (res && (res.ok || res.type === 'opaque')) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // sin red: si hay copia en caché, se usa; si no, la promesa falla

      // Cache-first: responde de inmediato con lo guardado si existe, y de paso refresca en segundo plano.
      return cached || network;
    })
  );
});
