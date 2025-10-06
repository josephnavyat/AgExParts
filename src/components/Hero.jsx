
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <header className="hero" role="banner" style={{ '--hero': 'url(/hero-16x9.png)' }}>
      <div className="hero-content container">
        <span className="kicker">Trusted farm parts</span>
        <h2>Keeping your equipment in the field</h2>
        <p>OEM & aftermarket parts, fast shipping, and expert support. From tillage to hydraulics — we’ve got the parts that keep you running.</p>
        <div className="cta-row">
          <Link className="btn primary" to="/catalog">Browse Catalog</Link>
          <Link className="btn secondary" to="/contact-parts-specialist">Talk to Parts Expert</Link>
        </div>
        <div className="badges" style={{ marginTop: 24 }}>
          <div className="badge">Same‑day shipping</div>
          <div className="badge">Dealer & bulk pricing</div>
          <div className="badge">Fitment assistance</div>
        </div>
      </div>
    </header>
  )
}
