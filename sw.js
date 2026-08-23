self.addEventListener('install', (e) => {
  console.log('Service Worker installé');
});

self.addEventListener('fetch', (e) => {
  // Laisse l'application chercher normalement les fichiers sur le web/GitHub
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
