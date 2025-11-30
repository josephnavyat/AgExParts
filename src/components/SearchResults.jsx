import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/simple-gallery.css";

export default function SearchResults() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const subcategory = params.get("subcategory") || "";
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
  // API may return either an array or an object with a `products` array
  if (Array.isArray(data)) setProducts(data);
  else if (data && Array.isArray(data.products)) setProducts(data.products);
  else setProducts([]);
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

  const filtered = products.filter(product => {
    if (product.website_visible !== true) return false;
    if (category) {
      if (!product.category || String(product.category).trim() !== category) return false;
    }
    if (subcategory) {
      if (!product.subcategory || String(product.subcategory).trim() !== subcategory) return false;
    }
    if (query) {
      return product.name && product.name.toLowerCase().includes(query.toLowerCase());
    }
    return true;
  });

  return (
    <div className="simple-gallery-root">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
        <div style={{ flex: 1, textAlign: 'left' }}>
          {category || subcategory ? (
            <div style={{ fontSize: '0.95rem', color: '#d9d9d9' }}>
              <Link to="/categories" style={{ color: '#d9d9d9', textDecoration: 'underline' }}>Categories</Link>
              {category ? (
                <>
                  &nbsp;&gt;&nbsp;
                  <Link to={`/categories/${encodeURIComponent(category)}`} style={{ color: '#d9d9d9', textDecoration: 'underline' }}>{category}</Link>
                </>
              ) : null}
              {subcategory ? (
                <>
                  &nbsp;&gt;&nbsp;
                  {/* Navigate to the category page anchored to the subcategory so user can see/choose other subcategories */}
                  <Link to={`/categories/${encodeURIComponent(category)}#${encodeURIComponent(subcategory)}`} style={{ color: '#d9d9d9', textDecoration: 'underline' }}>{subcategory}</Link>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2 className="simple-gallery-title" style={{ margin: 0 }}>Search Results</h2>
        </div>
        <div style={{ flex: 1 }} />
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
