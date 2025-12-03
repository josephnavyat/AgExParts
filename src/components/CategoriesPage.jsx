import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// CategoriesPage: lists unique categories (from products) with a sample image.
export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data');
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        let products = [];
        if (Array.isArray(json)) products = json;
        else if (json && Array.isArray(json.products)) products = json.products;

        const map = new Map();
        const pickImage = (prod) => {
          if (!prod) return null;
          if (typeof prod.image === 'string' && prod.image.trim()) return prod.image.trim();
          if (Array.isArray(prod.images) && prod.images.length && typeof prod.images[0] === 'string') return prod.images[0];
          if (Array.isArray(prod.gallery) && prod.gallery.length && typeof prod.gallery[0] === 'string') return prod.gallery[0];
          if (Array.isArray(prod.photos) && prod.photos.length && typeof prod.photos[0] === 'string') return prod.photos[0];
          const arrCandidates = ['images', 'gallery', 'photos'];
          for (const key of arrCandidates) {
            if (Array.isArray(prod[key]) && prod[key].length) {
              const first = prod[key][0];
              if (first && typeof first === 'object') {
                if (first.src) return first.src;
                if (first.url) return first.url;
              }
            }
          }
          return null;
        };

        for (const p of products) {
          const cat = (p.category || '').trim();
          if (!cat) continue;
          if (!map.has(cat)) map.set(cat, { sample: p, count: 0, img: pickImage(p) });
          const entry = map.get(cat);
          entry.count = (entry.count || 0) + 1;
          if (!entry.img) entry.img = pickImage(p);
          if (!entry.sample || !pickImage(entry.sample)) entry.sample = p;
        }

        const list = Array.from(map.entries()).map(([category, data]) => ({ category, sample: data.sample, sampleImage: data.img }));
        if (mounted) setGroups(list);
      } catch (err) {
        console.error('CategoriesPage fetch failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // reuse the same image normalization as CategoryPage
  const getImageUrl = (img) => {
    if (!img) return '/logo.png';
    if (typeof img === 'string') {
      const s = img.trim();
      if (!s) return '/logo.png';
      if (/^https?:\/\//i.test(s)) return s;
      const base = (import.meta && import.meta.env && import.meta.env.VITE_IMAGE_BASE_URL) || 'https://cdn.agexparts.com';
      const name = s.replace(/^\/+/, '');
      const abs = `${String(base).replace(/\/$/, '')}/${encodeURI(name)}`;
      try {
        const u = new URL(abs);
        if (u.hostname && u.hostname.endsWith('cdn.agexparts.com')) {
          return `/.netlify/functions/image-proxy?url=${encodeURIComponent(abs)}`;
        }
      } catch (e) {}
      return abs;
    }
    return '/logo.png';
  };

  return (
    <section style={{ padding: '28px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <h2 className="category-page__title" style={{ marginBottom: 12 }}>Categories</h2>
      {loading && <div className="muted">Loading…</div>}
      {!loading && groups.length === 0 && (
        <div className="muted">No categories found.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginTop: 12 }}>
        {groups.map(g => (
          <Link
            key={g.category}
            id={g.category ? String(g.category).replace(/\s+/g, '-') : undefined}
            to={`/categories/${encodeURIComponent(g.category)}`}
            className="card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ height: 140, background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {((g.sampleImage) || (g.sample && g.sample.image)) ? (
                <img
                  src={getImageUrl(g.sampleImage || (g.sample && g.sample.image))}
                  alt={g.category}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo.png'; }}
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#777' }}>No image</div>
              )}
            </div>
            <div style={{ padding: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{g.category}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
