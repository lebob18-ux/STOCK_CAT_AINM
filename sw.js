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

// 3. Interception des requêtes : Cache d'abord pour GitHub (miniatures & mapping) avec sauvegarde automatique
self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('raw.githubusercontent.com')) {
        e.respondWith(
            caches.match(e.request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Si l'image ou le mapping est déjà en cache, on le sert immédiatement
                    // et on tente de le rafraîchir en arrière-plan si le réseau est disponible
                    fetch(e.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(e.request, networkResponse);
                            });
                        }
                    }).catch(() => {});
                    return cachedResponse;
                }

                // Si pas encore en cache, on va le chercher sur GitHub et on le stocke pour la prochaine fois
                return fetch(e.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        let responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(e.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // Repli si hors ligne et que l'élément n'a jamais été chargé
                    return new Response("Hors ligne - Ressource non disponible", { status: 404, statusText: "Offline" });
                });
            })
        );
        return;
    }

    // Pour le reste de l'application (fichiers locaux) : Cache d'abord, puis mise à jour en arrière-plan
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
            return fetch(e.request);
        })
    );
});
