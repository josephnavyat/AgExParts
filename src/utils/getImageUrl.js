// Unified image URL helper used across client components
export default function getImageUrl(img) {
  const base = (import.meta && import.meta.env && import.meta.env.VITE_IMAGE_BASE_URL) || process.env.VITE_IMAGE_BASE_URL || '';
  if (!img) return '/logo.png';
  const s = String(img).trim();
  // Prefer local logo asset
  if (s.toLowerCase().endsWith('logo.png')) return '/logo.png';
  // Absolute URLs pass through
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  // Normalize key (remove leading slash) and join with base if available
  const key = s.replace(/^\//, '');
  if (base) {
    // Ensure base includes a scheme. Vite inlines env vars at build time —
    // if the value was set without https:// the join can become relative.
    let b = String(base).trim();
    if (!b.match(/^https?:\/\//i)) b = 'https://' + b.replace(/^\/+/, '');
    return `${b.replace(/\/$/, '')}/${encodeURI(key)}`;
  }
  // Fallback to root-relative path
  return s.startsWith('/') ? s : `/${key}`;
}
