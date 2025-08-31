
import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    document.addEventListener('scroll', onScroll)
    onScroll()
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav id="nav" className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <div className="brand">
          <img src="/logo.png" alt="AgEx Parts logo" style={{ height: '80px', width: 'auto' }} />
          <h1 className="distressed">For all your field needs.</h1>
        </div>
        <div className="nav-cta" style={{ display: 'flex', gap: '12px' }}>
          <Link to="/" className="btn secondary" style={{ textDecoration: 'none', fontWeight: 600 }}>
            Home
          </Link>
          <a href="#catalog">Shop Parts</a>
        </div>
      </div>
    </nav>
  )
}
