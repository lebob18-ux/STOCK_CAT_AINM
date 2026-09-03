const CACHE_NAME = 'pelican-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/pelican.js',
  '/json_mode.js',
  '/mapping.json',
  '/stock.csv'
];

// Installation du Service Worker et mise en cache des fichiers statiques de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de récupération : Network First avec repli sur Cache pour le dynamisme, 
// Cache First pour les assets statiques
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclusion des requêtes vers Supabase (URLs signées / API) du cache du SW
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Pour les fichiers de données (mapping.json, stock.csv), privilégier le réseau (Network First)
  if (url.pathname.endsWith('mapping.json') || url.pathname.endsWith('stock.csv')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            let responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Pour le reste des ressources : Cache First avec mise à jour réseau en arrière-plan
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          let responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // En cas d'échec réseau total, on retourne le cache s'il existe
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
