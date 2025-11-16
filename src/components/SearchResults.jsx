import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/simple-gallery.css";

export default function SearchResults() {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setError(error.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, []);

  const filtered = products.filter(product =>
    product.website_visible === true &&
    product.name &&
    product.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="simple-gallery-root">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 32, marginBottom: 16 }}>
        <h2 className="simple-gallery-title" style={{ flex: 1, textAlign: 'center', margin: 0 }}>Search Results</h2>
      </div>
      <hr className="simple-gallery-divider" />
      <div className="simple-gallery-layout" style={{ position: 'relative' }}>
        <div className="simple-gallery-grid">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>Error: {error}</div>
          ) : filtered.length === 0 ? (
            <div>No results found for "{query}".</div>
          ) : (
            filtered.map(product => (
              <div key={product.id} className="simple-gallery-card">
                <picture>
                  <source srcSet={product.image.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    style={{ width: '100%', height: 'auto', objectFit: 'contain', background: '#f8f8f8', borderRadius: 10 }} 
                    loading="lazy"
                    srcSet={product.image + ' 1x, ' + product.image.replace(/\.(jpg|jpeg|png)$/i, '@2x.$1') + ' 2x'}
                  />
                </picture>
                <h3 className="simple-gallery-card-title">{product.name}</h3>
                {/* Category and subcategory display */}
                {product.category && (
                  <div className="search-result-category">
                    <div className="search-result-category-main">{product.category}</div>
                    {product.subcategory && <div className="search-result-subcategory">{product.subcategory}</div>}
                  </div>
                )}

                <div className="simple-gallery-card-price" style={{ margin: '8px 0 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
                  ${Number(product.price).toFixed(2)}
                </div>
                <div className="simple-gallery-card-actions">
                  <Link to={`/product/${product.id}`} className="simple-gallery-btn secondary">View Details</Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
