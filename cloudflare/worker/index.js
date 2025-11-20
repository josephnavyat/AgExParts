export default {
  async fetch(request, env) {
    try {
      // Always prepare CORS headers to include on every response
      const corsHeaders = new Headers();
      corsHeaders.set('Access-Control-Allow-Origin', '*');
      corsHeaders.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

      // Respond to preflight requests immediately
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const url = new URL(request.url);
      // path after the hostname, strip leading slash
      const key = url.pathname.replace(/^\/+/, '');
      if (!key) return new Response('Missing object key', { status: 400 });

      // Attempt to get the object from the R2 binding (AGEX_IMAGES)
      const obj = await env.AGEX_IMAGES.get(key, { type: 'stream' });
      if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
      // preserve content-type if the object has it
      if (obj.httpMetadata && obj.httpMetadata.contentType) {
        headers.set('Content-Type', obj.httpMetadata.contentType);
      } else if (obj.size && key.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
        // best-effort guess from extension
        const ext = key.split('.').pop().toLowerCase();
        const map = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif'
        };
        if (map[ext]) headers.set('Content-Type', map[ext]);
      }

  // Caching
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  // Merge in CORS headers for successful object responses
  for (const [k, v] of corsHeaders.entries()) headers.set(k, v);

      return new Response(obj.body, { status: 200, headers });
    } catch (err) {
  const errHeaders = new Headers();
  for (const [k, v] of corsHeaders.entries()) errHeaders.set(k, v);
  return new Response('Worker error: ' + (err && err.message), { status: 500, headers: errHeaders });
    }
  }
};
