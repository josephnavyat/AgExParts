import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useCart } from './CartContext.jsx';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [productNames, setProductNames] = useState([]);

  useEffect(() => {
    // Fetch product names for search autofill
    fetch('/.netlify/functions/get-data')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProductNames([...new Set(data.map(p => p.name).filter(Boolean))]);
        }
      })
      .catch(() => setProductNames([]));
  }, []);

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
            <h1 className="distressed">For your ideal PART</h1>
          </div>
          <div className="nav-cta" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn secondary distressed" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Modern Home icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span style={{ display: 'none' }}>Home</span>
            </Link>
            <Link to="/profile" className="btn secondary distressed" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }} title="User Profile / Login">
              {/* User/Profile icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
              <span style={{ display: 'none' }}>Profile</span>
            </Link>
            <button
              className="btn secondary distressed"
              style={{ textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowSearch((s) => !s)}
              title="Search"
            >
              {/* Modern Search icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span style={{ display: 'none' }}>Search</span>
            </button>
            <Link to="/cart" style={{ marginLeft: 0, position: 'relative', display: 'flex', alignItems: 'center', height: 40 }}>
              <span style={{ display: 'flex', alignItems: 'center', marginRight: 2, lineHeight: 1 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                  <circle cx="9" cy="21" r="1.5" fill="#fff" stroke="#111" />
                  <circle cx="19" cy="21" r="1.5" fill="#fff" stroke="#111" />
                  <path d="M1 1h2l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="#111" />
                </svg>
              </span>
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  background: '#19a974',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  minWidth: 16,
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
                onChange={e => setSearchValue(e.target.value)}
                list="navbar-product-names-list"
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
              <datalist id="navbar-product-names-list">
                {productNames.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
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
