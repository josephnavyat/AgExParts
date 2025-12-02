export function getImageUrl(img) {
  if (!img) return '/logo.png';
  if (typeof img === 'string') {
    const s = img.trim();
    if (!s) return '/logo.png';
    if (/^https?:\/\//i.test(s)) return s;
    const base = (import.meta && import.meta.env && import.meta.env.VITE_IMAGE_BASE_URL) || 'https://cdn.agexparts.com';
    const name = s.replace(/^\/+/, '');
    return `${String(base).replace(/\/$/, '')}/${encodeURI(name)}`;
  }
  return '/logo.png';
}
