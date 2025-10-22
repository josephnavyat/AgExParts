self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Don't handle cross-origin requests (prevents serving local cached HTML for remote module imports)
  if (new URL(event.request.url).origin !== self.location.origin) {
    return; // let the browser handle it
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
