const CACHE_NAME = 'sijani-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/style.css',
  '/css/style-dashboard.css',
  '/js/script.js',
  '/js/script-dashboard.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
];

// Saat install: cache semua file
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(ASSETS);
      })
  );
  self.skipWaiting(); // agar langsung aktif
});

// Saat activate: hapus cache lama
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activated');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  return self.clients.claim(); // kendalikan semua tab
});

// Saat fetch: ambil dari cache jika offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // fallback bisa ditambahkan di sini (optional)
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});
