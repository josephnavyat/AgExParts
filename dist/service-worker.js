const CACHE_NAME = 'agex-cache-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

// On activate, claim clients and remove any old caches so stale assets (or
// incorrectly cached HTML) aren't returned for CSS/JS/assets preloads.
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); }));
      await self.clients.claim();
    })()
  );
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

  // Prefer network-first for Netlify Function endpoints to avoid serving stale demo data
  if (url.pathname.startsWith('/.netlify/functions/')) {
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
    caches.match(req).then(async (cached) => {
      // If we have a cached response, ensure it's not HTML (some older SWs
      // accidentally cached index.html under asset URLs). If it is HTML, ignore it.
      if (cached) {
        try {
          const ct = cached.headers.get('content-type') || '';
          if (!ct.includes('text/html')) return cached;
          // else fallthrough to network fetch
        } catch (e) {
          // if header read fails, prefer network
        }
      }

      try {
        const networkResp = await fetch(req);
        // Only cache successful, non-HTML responses
        try {
          const contentType = networkResp.headers.get('content-type') || '';
          if (networkResp && networkResp.ok && !contentType.includes('text/html')) {
            const clone = networkResp.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, clone).catch(()=>{});
          }
        } catch (e) {
          // ignore caching errors
        }
        return networkResp;
      } catch (e) {
        // If network fails, return cached if it's valid (non-HTML) otherwise propagate
        if (cached) return cached;
        return Promise.reject('network-failure');
      }
    })
  );
});
