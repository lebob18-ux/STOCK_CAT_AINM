const CACHE_NAME = 'stock-terrain-v1';
const ASSETS_TO_CACHE = [
    '.',
    './index.html',
    './script.js',
    './manifest.json'
];

// 1. Installation : on met en cache les fichiers principaux de l'application
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Mise en cache des fichiers de base de l’application');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. Activation : nettoyage des anciens caches si vous faites des mises à jour
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('Suppression de l’ancien cache :', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Interception des requêtes : Stratégie "Cache d'abord, puis réseau" pour les fichiers locaux, 
// et direct pour le catalogue/GitHub distant
self.addEventListener('fetch', (e) => {
    // Si la requête vient de GitHub (vos miniatures ou mapping), on laisse passer ou on gère classiquement
    if (e.request.url.includes('raw.githubusercontent.com')) {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
        return;
    }

    // Pour le reste de l'application : Cache d'abord, puis mise à jour en arrière-plan via le réseau
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                // On renvoie la version du cache immédiatement pour la vitesse
                // Et on va chercher la version fraiche en arrière-plan
                fetch(e.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(e.request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(e.request);
        })
    );
});
