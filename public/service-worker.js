self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore cross-origin requests (let the browser/network handle them)
  if (url.origin !== self.location.origin) return;

  // Don't handle navigations (these should return index.html from the server)
  if (req.mode === 'navigate') return;

  // Only handle GET requests here
  if (req.method !== 'GET') return;

  // For images, prefer network first to avoid serving stale/broken cached images
  if (req.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
    event.respondWith(
      fetch(req).then(networkResp => {
        try {
          const contentType = networkResp.headers.get('content-type') || '';
          if (networkResp && networkResp.ok && !contentType.includes('text/html')) {
            const clone = networkResp.clone();
            caches.open('v1').then(cache => cache.put(req, clone));
          }
        } catch (e) {}
        return networkResp;
      }).catch(() => caches.match(req).then(cached => cached || Promise.reject('network-failure')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkResp => {
        // Only cache successful, non-HTML responses
        try {
          const contentType = networkResp.headers.get('content-type') || '';
          if (networkResp && networkResp.ok && !contentType.includes('text/html')) {
            const clone = networkResp.clone();
            caches.open('v1').then(cache => cache.put(req, clone));
          }
        } catch (e) {
          // ignore any caching errors
        }
        return networkResp;
      }).catch(() => {
        // If network fails, let the browser try to handle it (or return cached if available)
        return cached || Promise.reject('network-failure');
      });
    })
  );
});
