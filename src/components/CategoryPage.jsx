import React, { useEffect, useState } from 'react';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';
import { useLocation } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';

export default function CategoryPage() {
  const { category } = useParams();
  const { hash } = useLocation();
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

        // collect subcategories and sample image for the provided category
        const map = new Map();
        const pickImage = (prod) => {
          // prefer explicit `image` string, then first item in `images` array, then `gallery` or `photos` arrays
          if (!prod) return null;
          if (typeof prod.image === 'string' && prod.image.trim()) return prod.image.trim();
          if (Array.isArray(prod.images) && prod.images.length && typeof prod.images[0] === 'string') return prod.images[0];
          if (Array.isArray(prod.gallery) && prod.gallery.length && typeof prod.gallery[0] === 'string') return prod.gallery[0];
          if (Array.isArray(prod.photos) && prod.photos.length && typeof prod.photos[0] === 'string') return prod.photos[0];
          // some backends store nested objects with `src` or `url` fields
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
          const sub = (p.subcategory || '').trim();
          if (!cat || cat !== category) continue;
          if (!map.has(sub)) map.set(sub, { sample: p, count: 0, img: pickImage(p) });
          const entry = map.get(sub);
          entry.count = (entry.count || 0) + 1;
          // if we don't have an image yet, try to set one from this product
          if (!entry.img) entry.img = pickImage(p);
          // prefer a sample that has an image
          if (!entry.sample || !pickImage(entry.sample)) entry.sample = p;
        }

        const list = Array.from(map.entries()).map(([sub, data]) => ({ subcategory: sub, sample: data.sample, sampleImage: data.img }));
        if (mounted) setGroups(list);
      } catch (err) {
        console.error('CategoryPage fetch failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [category]);

  // scroll to anchor if present (e.g., /categories/foo#bar)
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const el = document.getElementById(id) || document.getElementById(id.replace(/\s+/g, '-'));
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [hash, groups]);

  // Use shared helper so behavior is consistent across components
  const getImageUrl = (img) => resolveImageUrl(img);

  return (
    <section style={{ padding: '28px 20px', maxWidth: 1200, margin: '0 auto' }}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <Link to="/categories" style={{ fontSize: '0.95rem', color: '#19a974', textDecoration: 'none' }}>← Back to Categories</Link>
    <h2 className="category-page__title" style={{ margin: 0 }}>Subcategories for "{category}"</h2>
  </div>
      {loading && <div className="muted">Loading…</div>}
      {!loading && groups.length === 0 && (
        <div className="muted">No subcategories found for this category.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginTop: 12 }}>
        {groups.map(g => (
          <Link
            key={g.subcategory}
            id={g.subcategory ? String(g.subcategory).replace(/\s+/g, '-') : undefined}
            to={`/search-results?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(g.subcategory)}`}
            className="card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ height: 140, background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {((g.sampleImage) || (g.sample && g.sample.image)) ? (
                <img
                  src={getImageUrl(g.sampleImage || (g.sample && g.sample.image))}
                  alt={g.subcategory}
                  data-orig={JSON.stringify(g.sampleImage || (g.sample && g.sample.image))}
                  loading="lazy"
                  onError={(e) => {
                    try {
                      const orig = g.sampleImage || (g.sample && g.sample.image);
                      console.error('CategoryPage image load error - orig:', orig, 'resolved:', e.currentTarget.src);
                    } catch (err) {}
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/logo.png';
                  }}
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#777' }}>No image</div>
              )}
            </div>
            <div style={{ padding: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{g.subcategory}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
