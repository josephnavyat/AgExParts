
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const Card = ({ title, tag, note }) => (
  <a className="card" href="#">
    <span className="pill">{tag}</span>
    <h3>{title}</h3>
    <p className="muted">{note}</p>
  </a>
)

export default function Hero() {
  useEffect(() => {
    document.body.classList.add('hero-active');
    return () => document.body.classList.remove('hero-active');
  }, []);
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
        <div className="container">
          <div className="card-grid">
            <Card title="Discs & Tines" tag="Tillage" note="Blades, shanks, sweeps" />
            <Card title="Belts & Chains" tag="Drive" note="V‑belts, roller chain" />
            <Card title="Hoses & Fittings" tag="Hydraulics" note="Quick‑connects, cylinders" />
            <Card title="Bearings & Seals" tag="Bearings" note="Pillow blocks, seals" />
          </div>
        </div>
      </div>

    </header>
  )
}
