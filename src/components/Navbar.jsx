
import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useCart } from './CartContext.jsx';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");

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
      <nav id="nav" className={`nav ${scrolled ? 'scrolled' : ''}`}> 
        <div className="container nav-inner">
          <div className="brand">
            <img src="/logo.png" alt="AgEx Parts logo" style={{ height: '80px', width: 'auto' }} />
            <h1 className="distressed">For your ideal PART</h1>
          </div>
          <div className="nav-cta" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/" className="btn secondary distressed" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem' }}>
              Home
            </Link>
            <Link to="/simple-gallery" className="btn secondary distressed" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem' }}>
              Products
            </Link>
            <button
              className="btn secondary distressed"
              style={{ textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem' }}
              onClick={() => setShowSearch((s) => !s)}
            >
              Search
            </button>
            <Link to="/cart" style={{ marginLeft: 10, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', marginRight: 2, lineHeight: 1 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                  <circle cx="9" cy="21" r="1.5" fill="#fff" stroke="#111" />
                  <circle cx="19" cy="21" r="1.5" fill="#fff" stroke="#111" />
                  <path d="M1 1h2l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="#111" />
                </svg>
              </span>
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  background: '#19a974',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  minWidth: 22,
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.13)',
                }}>{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
      </nav>
      <div
        className="search-bar-collapsible"
        style={{
          position: 'relative',
          zIndex: 39,
        }}
      >
        <div
          style={{
            maxHeight: showSearch ? '120px' : '0',
            overflow: 'hidden',
            background: 'rgba(30,30,30,0.55)',
            boxShadow: showSearch ? '0 2px 12px rgba(0,0,0,0.10)' : 'none',
            transition: 'max-height 0.3s cubic-bezier(.4,0,.2,1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '96px',
            position: 'absolute',
            left: 0,
            width: '100%',
            backdropFilter: 'blur(6px) saturate(120%)',
          }}
        >
          <input
            type="text"
            placeholder="Search for parts..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            style={{
              margin: '2rem 0',
              padding: '0.75rem 1.5rem',
              fontSize: '1.1rem',
              borderRadius: '8px',
              border: '1px solid #ccc',
              width: 'min(400px, 80vw)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            }}
          />
        </div>
      </div>
    </>
  );
}
