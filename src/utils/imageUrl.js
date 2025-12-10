export function getImageUrl(img) {
  if (!img) return '/logo.png';
  if (typeof img === 'string') {
    const s = img.trim();
    if (!s) return '/logo.png';
    // If the value is already an absolute URL, return it — but if it's on our CDN,
    // route it through the image-proxy to avoid CORS problems.
    if (/^https?:\/\//i.test(s)) {
      try {
        const u = new URL(s);
        if (u.hostname && u.hostname.endsWith('cdn.agexparts.com')) {
          return `/.netlify/functions/image-proxy?url=${encodeURIComponent(s)}`;
        }
      } catch (e) {
        // malformed URL — fall back to returning the raw string
        return s;
      }
      return s;
    }

    let base = (import.meta && import.meta.env && import.meta.env.VITE_IMAGE_BASE_URL) || 'https://cdn.agexparts.com';
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
