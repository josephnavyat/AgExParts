import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';
import { useCart } from './CartContext.jsx';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [productsIndex, setProductsIndex] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchDebounce = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    document.addEventListener('scroll', onScroll);
    onScroll();
    return () => document.removeEventListener('scroll', onScroll);
  }, []);

  // Keep body class in sync with collapsed state so CSS can adjust layout
  useEffect(() => {
    try {
      if (scrolled) document.body.classList.add('nav-collapsed');
      else document.body.classList.remove('nav-collapsed');
    } catch (e) {}
  }, [scrolled]);

  const { cart } = useCart();
  const cartCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const secondaryRef = useRef(null);
  const toggleRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [catsLoaded, setCatsLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');

  const loadCategories = async () => {
    if (catsLoaded || categoriesLoading) return;
    setCategoriesLoading(true);
    try {
      const res = await fetch('/.netlify/functions/get-data');
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      let products = [];
      if (Array.isArray(json)) products = json;
      else if (json && Array.isArray(json.products)) products = json.products;

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

      setCategories(grouped);
  // initialize active category to first if not already set
  setActiveCategory((prev) => prev || (grouped[0] ? grouped[0].category : ''));
      setCatsLoaded(true);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Ensure the body knows a secondary nav exists so CSS can reserve space
  useEffect(() => {
    try {
      document.body.classList.add('has-secondary-nav');
      return () => document.body.classList.remove('has-secondary-nav');
    } catch (e) {
      // ignore
    }
  }, []);

  // Close secondary nav on route change
  useEffect(() => {
    setSecondaryOpen(false);
  }, [location.pathname]);

  // Close on Escape and restore focus to toggle
  useEffect(() => {
    if (!secondaryOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSecondaryOpen(false);
        try { toggleRef.current?.focus(); } catch (err) {}
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [secondaryOpen]);

  return (
    <>
      <nav id="nav" className={`nav ${scrolled ? 'scrolled' : ''}${showSearch ? ' nav--search-open' : ''}`}> 
        <div className="container nav-inner" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="brand">
            <img src="/logo.png" alt="AgEx Parts logo" style={{ height: '80px', width: 'auto' }} />
            <h1 className="distressed" style={{ color: 'white' }}>For your ideal PART</h1>
          </div>
          <div className="nav-cta" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="nav-icon" aria-label="Home" title="Home">
              {/* Modern Home icon */}
              <svg className="nav-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </Link>
            <Link to="/profile" className="nav-icon" aria-label="Profile" title="Profile">
              {/* User/Profile icon */}
              <svg className="nav-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
            </Link>
            <button
              className="nav-icon"
              onClick={() => setShowSearch((s) => !s)}
              title="Search"
              aria-label="Search"
            >
              {/* Modern Search icon */}
              <svg className="nav-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <Link to="/cart" className="nav-icon" aria-label="Cart" title="Cart" style={{ position: 'relative' }}>
              <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.5" /><circle cx="19" cy="21" r="1.5" /><path d="M1 1h2l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" /></svg>
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: '#19a974',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  minWidth: 18,
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.13)',
                }}>{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
        {showSearch && (
          <div
            className="search-bar-collapsible"
            style={{
              width: '100%',
              background: 'rgba(30,30,30,0.55)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 0',
              position: 'static',
              zIndex: 39,
            }}
          >
            <form
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 400 }}
              onSubmit={e => {
                e.preventDefault();
                if (searchValue.trim()) {
                  window.location.href = `/search-results?q=${encodeURIComponent(searchValue.trim())}`;
                }
              }}
            >
              <input
                id="nav-search-input"
                type="text"
                placeholder="Search for parts..."
                value={searchValue}
                onChange={e => {
                  const v = e.target.value;
                  setSearchValue(v);
                  // debounce suggestions
                  clearTimeout(searchDebounce.current);
                  if (!v || v.trim().length < 2) {
                    setSuggestions([]); setSuggestOpen(false); return;
                  }
                  searchDebounce.current = setTimeout(() => {
                    const q = v.trim().toLowerCase();
                    if (!productsIndex) return;
                    const results = productsIndex.filter(p => {
                      const name = (p.name || '').toLowerCase();
                      const sku = (p.sku || '').toLowerCase();
                      return name.includes(q) || sku.includes(q);
                    }).slice(0,6);
                    setSuggestions(results);
                    setSuggestOpen(results.length > 0);
                  }, 180);
                }}
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '1.1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  width: '100%',
                  minWidth: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                  flex: 1
                }}
                onFocus={async () => {
                  if (!productsIndex) {
                    try {
                      const res = await fetch('/.netlify/functions/get-data');
                      const json = await res.json();
                      let products = Array.isArray(json) ? json : (json && Array.isArray(json.products) ? json.products : []);
                      // keep only id, name, image, and sku/part_number for better matching
                      products = products.map(p => ({ id: p.id, name: p.name, image: p.image, sku: p.sku || p.part_number || '' }));
                      setProductsIndex(products);
                    } catch (e) {
                      // ignore
                    }
                  }
                }}
                onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              />
              {suggestOpen && suggestions && suggestions.length > 0 && (
                <div className="nav-search-suggestions" role="listbox">
                  {suggestions.map(s => (
                    <button key={s.id} className="nav-suggestion-item" onMouseDown={(e) => { e.preventDefault(); const q = s.sku && String(s.sku).trim() ? s.sku : s.name; window.location.href = `/search-results?q=${encodeURIComponent(q)}`; }}>
                      {s.image ? <img src={resolveImageUrl(s.image)} alt="" className="nav-suggestion-thumb"/> : <span className="nav-suggestion-thumb empty"/>}
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className="nav-suggestion-text">{s.name}</span>
                        {s.sku && <small style={{ color: '#666', marginTop: 4 }}>{s.sku}</small>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="submit"
                style={{
                  background: '#19a974',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Enter
              </button>
            </form>
          </div>
        )}
        {/* Secondary nav row: browse links and mobile toggle */}
        <div className={`nav-secondary ${secondaryOpen ? 'open' : ''}`} ref={secondaryRef}>
          <div className="container">
            <nav id="secondary-links" aria-label="Browse links">
              {/* Browse by Category shows an expanded panel on hover or click */}
              <div className="nav-categories-wrapper">
                <Link
                  to="/categories"
                  className="nav-secondary-link nav-categories-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    try {
                      // ensure any open secondary panels are closed so height/animation won't interfere
                      try { setSecondaryOpen(false); } catch (err) {}
                      try { setCategoriesOpen(false); } catch (err) {}
                      // navigate and then perform a delayed scrollIntoView (longer delay to handle animations)
                      navigate('/categories');
                      requestAnimationFrame(() => setTimeout(() => {
                        try {
                          const heading = document.querySelector('.main-content > h2');
                          if (heading && heading.scrollIntoView) {
                            console.info('Navbar: scrolling to category heading via scrollIntoView');
                            heading.scrollIntoView({ block: 'start' });
                            return;
                          }
                          const navEl = document.querySelector('.nav');
                          const navHeight = navEl ? Math.ceil(navEl.getBoundingClientRect().height) : 140;
                          console.info('Navbar: falling back to scrollBy', navHeight);
                          window.scrollBy(0, -navHeight + 6);
                        } catch (e) {}
                      }, 400));
                    } catch (err) { window.location.href = '/categories'; }
                  }}
                >
                  Browse by Category
                </Link>
              </div>

              <Link to="/machines" className="nav-secondary-link">Browse by Machine</Link>
              <Link to="/about" className="nav-secondary-link">About Us</Link>
            </nav>
          </div>
        </div>
      </nav>
    </>
  );
}
