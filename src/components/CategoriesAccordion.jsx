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

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data', { signal: ac.signal });
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        let products = [];
        if (Array.isArray(json)) products = json;
        else if (json && Array.isArray(json.products)) products = json.products;

        // Build map category -> set(subcategories)
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

        if (mounted.current) setGroups(grouped);
      } catch (err) {
        // Ignore AbortError (normal when unmounting) and only log other errors
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
