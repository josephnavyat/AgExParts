export function getImageUrl(img) {
  if (!img) return '/logo.png';
  if (typeof img === 'string') {
    const s = img.trim();
    if (!s) return '/logo.png';
    if (/^https?:\/\//i.test(s)) return s;
    let base = (import.meta && import.meta.env && import.meta.env.VITE_IMAGE_BASE_URL) || 'https://cdn.agexparts.com';
    // Ensure base includes protocol. If user provided 'cdn.agexparts.com' or '//cdn...', prefix https://
    base = String(base).trim();
    if (!/^https?:\/\//i.test(base)) {
      if (base.startsWith('//')) base = 'https:' + base;
      else base = 'https://' + base;
    }
    const name = s.replace(/^\/+/, '');
    return `${String(base).replace(/\/$/, '')}/${encodeURI(name)}`;
  }
  return '/logo.png';
}
