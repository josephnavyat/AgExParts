export function getImageUrl(img) {
  if (!img) return '/logo.png';
  if (typeof img === 'string') {
    const s = img.trim();
    if (!s) return '/logo.png';
    // If the value is already an absolute URL, return it — but if it's on our
    // known image hosts, route it through the image-proxy to avoid CORS problems.
    if (/^https?:\/\//i.test(s)) {
      try {
        const u = new URL(s);
        const host = (u.hostname || '').toLowerCase();
        const envAllowed = (import.meta && import.meta.env && import.meta.env.VITE_IMAGE_PROXY_ALLOWED_HOSTS) ? String(import.meta.env.VITE_IMAGE_PROXY_ALLOWED_HOSTS).split(',').map(x => x.trim()).filter(Boolean) : [];
        const allowed = envAllowed.length ? envAllowed : ['cdn.agexparts.com', 'agexparts.com', 'www.agexparts.com'];
        const ok = allowed.some(h => host === h || host.endsWith('.' + h) || host.endsWith(h));
        if (ok) {
          return `/.netlify/functions/image-proxy?url=${encodeURIComponent(s)}`;
        }
      } catch (e) {
        // malformed URL — fall back to returning the raw string
        return s;
      }
      return s;
    }

    let base = (import.meta && import.meta.env && import.meta.env.VITE_IMAGE_BASE_URL) || '';
    // If the environment variable contains a placeholder or obvious example text,
    // treat it as unset and fall back to the canonical CDN.
    const placeholderRe = /your[-_.]?cdn|image[-_.]?base[-_.]?url|your[-_.]?domain|example\.com|your-cdn-or-image-base-url/i;
    if (!base || placeholderRe.test(String(base))) {
      if (typeof console !== 'undefined' && console.warn) {
        // Friendly dev warning when running locally with a placeholder env var
        console.warn('VITE_IMAGE_BASE_URL is missing or looks like a placeholder — falling back to https://cdn.agexparts.com');
      }
      base = 'https://cdn.agexparts.com';
    }
    // Ensure base includes protocol. If user provided 'cdn.agexparts.com' or '//cdn...', prefix https://
    base = String(base).trim();
    if (!/^https?:\/\//i.test(base)) {
      if (base.startsWith('//')) base = 'https:' + base;
      else base = 'https://' + base;
    }
    const name = s.replace(/^\/+/, '');
    const abs = `${String(base).replace(/\/$/, '')}/${encodeURI(name)}`;
    try {
      const u = new URL(abs);
      if (u.hostname && u.hostname.endsWith('cdn.agexparts.com')) {
        return `/.netlify/functions/image-proxy?url=${encodeURIComponent(abs)}`;
      }
    } catch (e) {
      // ignore and return absolute
    }
    return abs;
  }
  return '/logo.png';
}
