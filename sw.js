const CACHE_NAME = 'stock-terrain-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './pelican.js',
    './json_mode.js',
    './mapping.json',
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

// 2. Activation : nettoyage des anciens caches
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
// 3. Interception des requêtes : Gestion robuste pour GitHub et fichiers locaux
self.addEventListener('fetch', (e) => {
    let url = new URL(e.request.url);

    if (url.hostname.includes('raw.githubusercontent.com') || url.hostname.includes('github.io')) {
        e.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                // On cherche d'abord par la requête exacte
                let cachedResponse = await cache.match(e.request);
                if (cachedResponse) {
                    // Rafraîchissement en arrière-plan si en ligne
                    fetch(e.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(e.request, networkResponse);
                        }
                    }).catch(() => {});
                    return cachedResponse;
                }

                // Si pas trouvé par la requête exacte, on tente de chercher par URL brute (pour contrer les variations de mode)
                let allKeys = await cache.keys();
                let matchingKey = allKeys.find(key => key.url === e.request.url);
                if (matchingKey) {
                    let matchedByUrl = await cache.match(matchingKey);
                    if (matchedByUrl) return matchedByUrl;
                }

                // Si vraiment absent du cache, on tente le réseau
                try {
                    let networkResponse = await fetch(e.request);
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        cache.put(e.request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (err) {
                    return new Response("Hors ligne - Image non disponible", { status: 404, statusText: "Offline" });
                }
            })
        );
        return;
    }

    // Pour le reste de l'application (fichiers locaux)
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                fetch(e.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(e.request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(e.request).catch(() => {
                // Repli global si page/ressource locale introuvable hors-ligne
                return caches.match('./index.html');
            });
        })
    );
});
