import React, { useEffect, useState, useRef } from 'react';

function Chevron({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }} aria-hidden>
      <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CategoriesAccordion() {
  const [groups, setGroups] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const mounted = useRef(true);

  const CACHE_KEY = 'agx_categories_v1';
  const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

  useEffect(() => {
    const ac = new AbortController();

    const readCache = () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.timestamp || !parsed.groups) return null;
        if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
        return parsed.groups;
      } catch (e) {
        try { localStorage.removeItem(CACHE_KEY); } catch (er) {}
        return null;
      }
    };

    const writeCache = (groups) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), groups }));
      } catch (e) {
        // ignore quota errors
      }
    };

    const useCached = readCache();
    if (useCached) {
      setGroups(useCached);
      // Still refresh in background without blocking UI
      (async () => {
        try {
          const res = await fetch('/.netlify/functions/get-data', { signal: ac.signal });
          if (!res.ok) return;
          const json = await res.json();
          let products = Array.isArray(json) ? json : (json && Array.isArray(json.products) ? json.products : []);
          const map = new Map();
          for (const p of products) {
            const cat = (p.category || '').trim();
            const sub = (p.subcategory || '').trim();
            if (!cat) continue;
            if (!map.has(cat)) map.set(cat, new Set());
            if (sub) map.get(cat).add(sub);
          }
          const grouped = Array.from(map.entries()).map(([category, subs]) => ({
            category,
            subcategories: Array.from(subs).sort((a, b) => a.localeCompare(b)),
          })).sort((a, b) => a.category.localeCompare(b.category));
          if (mounted.current) {
            setGroups(grouped);
            writeCache(grouped);
          }
        } catch (e) {
          // ignore background failures
        }
      })();
      return () => { mounted.current = false; ac.abort(); };
    }

    // No valid cache — fetch and cache
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data', { signal: ac.signal });
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        let products = Array.isArray(json) ? json : (json && Array.isArray(json.products) ? json.products : []);

        const map = new Map();
        for (const p of products) {
          const cat = (p.category || '').trim();
          const sub = (p.subcategory || '').trim();
          if (!cat) continue;
          if (!map.has(cat)) map.set(cat, new Set());
          if (sub) map.get(cat).add(sub);
        }

        const grouped = Array.from(map.entries()).map(([category, subs]) => ({
          category,
          subcategories: Array.from(subs).sort((a, b) => a.localeCompare(b)),
        })).sort((a, b) => a.category.localeCompare(b.category));

        if (mounted.current) {
          setGroups(grouped);
          writeCache(grouped);
        }
      } catch (err) {
        if (err && err.name !== 'AbortError') console.error('Categories load failed', err);
      }
    })();

    return () => { mounted.current = false; ac.abort(); };
  }, []);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="categories-accordion" role="tree">
      {groups.length === 0 && <div className="muted" style={{ padding: 20 }}>Loading categories…</div>}
      {groups.map((g, i) => (
        <div key={g.category} className="cat-item">
          <button
            className="cat-toggle"
            aria-expanded={openIndex === i}
            aria-controls={`cat-${i}`}
            onClick={() => toggle(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); } }}
          >
            <span className="cat-title">{g.category}</span>
            <span className="cat-count">{g.subcategories.length}</span>
            <Chevron open={openIndex === i} />
          </button>

          <div id={`cat-${i}`} className={`sub-list ${openIndex === i ? 'open' : ''}`} role="group" aria-hidden={openIndex !== i}>
            {g.subcategories.length === 0 && <div className="sub-item muted">(no subcategories)</div>}
            {g.subcategories.map(sub => (
              <a
                key={sub}
                className="sub-item"
                href={`/search-results?category=${encodeURIComponent(g.category)}&subcategory=${encodeURIComponent(sub)}`}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }}
              >
                {sub}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
