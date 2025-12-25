export function getImageUrl(img) {
  if (!img) return '/logo.png';
  // Accept arrays or objects as well (many product records use arrays or
  // objects like { src } or { url }). Normalize to a string when possible.
  if (Array.isArray(img)) {
    // pick the first string-like entry or first object's src/url
    for (const item of img) {
      if (!item) continue;
      if (typeof item === 'string') { img = item; break; }
      if (typeof item === 'object') {
        if (item.src) { img = item.src; break; }
        if (item.url) { img = item.url; break; }
      }
    }
  }
  if (img && typeof img === 'object') {
    if (img.src) img = img.src;
    else if (img.url) img = img.url;
    else img = String(img);
  }
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

// Build a URL for files stored in Cloudflare R2 (TemplateDocs bucket).
// If VITE_R2_BASE_URL is set (e.g. https://<account>.r2.cloudflarestorage.com/bucketname), use it.
// Otherwise fall back to the same VITE_IMAGE_BASE_URL behavior but point to the TemplateDocs path.
export function getR2Url(filename) {
  if (!filename) return '';
  let base = (import.meta && import.meta.env && import.meta.env.VITE_R2_BASE_URL) || (import.meta && import.meta.env && import.meta.env.VITE_IMAGE_BASE_URL) || '';
  const placeholderRe = /your[-_.]?cdn|image[-_.]?base[-_.]?url|your[-_.]?domain|example\.com|your-cdn-or-image-base-url/i;
  if (!base || placeholderRe.test(String(base))) {
    base = 'https://cdn.agexparts.com/TemplateDocs';
  }
  base = String(base).trim();
  if (!/^https?:\/\//i.test(base)) {
    if (base.startsWith('//')) base = 'https:' + base;
    else base = 'https://' + base;
  }
  // If the provided base already includes the bucket path, don't duplicate
  const name = filename.replace(/^\/+/, '');
  // Ensure we don't double up TemplateDocs
  let abs = base.replace(/\/$/, '') + '/' + encodeURI(name);
  // If base doesn't contain TemplateDocs, add it
  if (!/TemplateDocs/i.test(base)) {
    abs = base.replace(/\/$/, '') + '/TemplateDocs/' + encodeURI(name);
  }
  return abs;
}
