const CACHE_NAME = 'fresh-spectra-shell-v3';
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    try {
      const response = await fetch('/precache-manifest.json', { cache: 'no-store' });
      if (response.ok) {
        const manifest = await response.json();
        const assets = new Set();
        Object.values(manifest).forEach((entry) => {
          if (entry.file && /\.(m?js|css|woff2?|svg|png|jpe?g|webp)$/.test(entry.file)) assets.add(entry.file);
          (entry.css || []).forEach((file) => assets.add(file));
          (entry.assets || []).forEach((file) => assets.add(file));
        });
        await Promise.all([...assets].map((file) => {
          const url = file.startsWith('/') ? file : `/${file}`;
          return cache.add(url).catch(() => undefined);
        }));
      }
    } catch {
      // Older deployments without a Vite manifest still cache the app shell and runtime assets.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request));
    }),
  );
});
