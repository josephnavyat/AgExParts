import { Link } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import { useCart } from './CartContext.jsx';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setSuggestions(data || []);
      } catch (e) {
        /* ignore */
      }
    };
    fetchProducts();
    return () => { mounted = false; };
  }, []);

  const searchInputRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    document.addEventListener('scroll', onScroll);
    onScroll();
    return () => document.removeEventListener('scroll', onScroll);
  }, []);

  const { cart } = useCart();
  const cartCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

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
              onClick={() => {
                setShowSearch((s) => !s);
                // focus input after it's rendered
                setTimeout(() => searchInputRef.current && searchInputRef.current.focus(), 60);
              }}
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
                type="text"
                placeholder="Search for parts..."
                value={searchValue}
                onChange={e => { setSearchValue(e.target.value); setSuggestOpen(true); setHighlightIndex(-1); }}
                onFocus={() => setSuggestOpen(true)}
                ref={searchInputRef}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { setHighlightIndex(i => Math.min(i + 1, Math.max(0, filtered.length - 1))); e.preventDefault(); }
                  if (e.key === 'ArrowUp') { setHighlightIndex(i => Math.max(-1, i - 1)); e.preventDefault(); }
                  if (e.key === 'Enter' && highlightIndex >= 0) {
                    const pick = filtered[highlightIndex];
                    if (pick) window.location.href = `/product/${pick.id}`;
                  }
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
              />
              {/* suggestion dropdown */}
        {suggestOpen && (
                (() => {
          const q = searchValue.trim().toLowerCase();
          const filtered = suggestions.filter(p => p.website_visible && p.name && (q === '' || p.name.toLowerCase().includes(q) || (p.part_number || '').toLowerCase().includes(q))).slice(0, 8);
                  return (
                    <div className="nav-search-suggestions" role="listbox">
                      {filtered.length === 0 ? (
                        <div className="nav-search-suggestion empty">No matches</div>
                      ) : filtered.map((p, idx) => (
                        <a
                          key={p.id}
                          href={`/product/${p.id}`}
                          className={`nav-search-suggestion${idx === highlightIndex ? ' active' : ''}`}
                          onMouseDown={(ev) => { ev.preventDefault(); /* keep focus behavior */ }}
                        >
                          <div className="nav-search-suggestion-title">{p.name}</div>
                          {p.category && (
                            <div className="nav-search-suggestion-meta">
                              <div className="nav-search-suggestion-category">{p.category}</div>
                              {p.subcategory && <div className="nav-search-suggestion-subcategory">{p.subcategory}</div>}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  );
                })()
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
      </nav>
    </>
  );
}
