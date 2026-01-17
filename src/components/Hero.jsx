import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';

// Card supports an optional image prop to render a semi-transparent background image.
const Card = ({ title, tag, note, to, image }) => {
  const inner = (
    <>
      <div className="card-content">
        <span className="pill">{tag}</span>
        <h3>{title}</h3>
        <p className="muted">{note}</p>
      </div>
      {image && (
        <div className="card-footer">
          <img className="card-image" src={resolveImageUrl(image)} alt={title} loading="lazy" />
        </div>
      )}
    </>
  );
  if (to) return <Link className="card card--with-image" to={to}>{inner}</Link>;
  return <div className="card card--with-image">{inner}</div>;
};

// Small static sample mapping as fallback; we'll try to pull real sample images from products.
const SAMPLE_IMAGES = {
  Tillage: '/tillage.png',
  Harvesting: '/harvesting.png',
  'Hay and Forage': '/hay_and_forage.png',
  Mowing: '/mowing.png'
};

const CardRow = () => {
  const [images, setImages] = React.useState({});
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data');
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        let products = [];
        if (Array.isArray(json)) products = json;
        else if (json && Array.isArray(json.products)) products = json.products;

        const pickImage = (prod) => {
          if (!prod) return null;
          if (typeof prod.image === 'string' && prod.image.trim()) return prod.image.trim();
          if (Array.isArray(prod.images) && prod.images.length && typeof prod.images[0] === 'string') return prod.images[0];
          if (Array.isArray(prod.gallery) && prod.gallery.length && typeof prod.gallery[0] === 'string') return prod.gallery[0];
          if (Array.isArray(prod.photos) && prod.photos.length && typeof prod.photos[0] === 'string') return prod.photos[0];
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

        const cats = ['Tillage','Harvesting','Hay and Forage','Mowing'];
        const map = {};
        for (const c of cats) map[c] = null;
        for (const p of products) {
          if (!p || !p.category) continue;
          const cat = String(p.category).trim();
          if (!cats.includes(cat)) continue;
          if (map[cat]) continue; // already have a sample
          const img = pickImage(p);
          if (img) map[cat] = img;
        }
        if (mounted) setImages(map);
      } catch (err) {
        // ignore, we'll use fallbacks
      }
    })();
    return () => { mounted = false; };
  }, []); 

  return (
    <div className="card-grid">
      <Card tag="Tillage" to="/categories/Tillage" image={images.Tillage || SAMPLE_IMAGES.Tillage} />
      <Card tag="Harvest" to="/categories/Harvesting" image={images.Harvesting || SAMPLE_IMAGES.Harvesting} />
      <Card tag="Hay and Forage" to="/categories/Hay%20and%20Forage" image={images['Hay and Forage'] || SAMPLE_IMAGES['Hay and Forage']} />
      <Card tag="Mowing" to="/categories/Mowing" image={images.Mowing || SAMPLE_IMAGES.Mowing} />
    </div>
  );
};

export default function Hero() {
  return (
    <>
      <header className="hero" role="banner" style={{ '--hero': 'url(/hero-16x9.png)' }}>
        <div className="hero-content container">
          <span className="kicker">Trusted farm parts</span>
          <h2>Keeping your equipment in the field</h2>
          <p>OEM & aftermarket parts, fast shipping, and expert support. From tillage to hydraulics — we’ve got the parts that keep you running.</p>
          <div className="cta-row">
            <Link className="btn primary" to="/catalog">Browse Catalog</Link>
            <Link className="btn secondary" to="/contact-parts-specialist">Talk to Parts Expert</Link>
          </div>
          <div className="hero-search-overlay">
            <div className="overlay-inner">
              <label className="hs-row"><select name="manufacturer"><option>Select Make</option></select></label>
              <label className="hs-row"><select name="machinetype"><option>Select Machine Type</option></select></label>
              <label className="hs-row"><select name="model"><option>Select Model</option></select></label>
              <div className="hs-action"><button className="btn apply">Search</button></div>
            </div>
          </div>
        </div>
      </header>
      <section className="hero-categories">
        <div className="container">
          <CardRow />
        </div>
      </section>
    </>
  );
}