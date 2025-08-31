
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import "../styles/site.css";

export default function ProductGallery() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:4000/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Navbar />
      <div className="product-gallery" style={{ padding: '2rem' }}>
        <div className="gallery-title-banner">
          <h2 className="distressed gallery-title">Product Catalog</h2>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888' }}>Loading products...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>
        ) : (
          <div
            className="gallery-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
              maxWidth: '1200px',
              margin: '0 auto',
            }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="product-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  background: '#fff',
                  minHeight: '350px',
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: '100%', height: '180px', objectFit: 'cover', background: '#f8f8f8' }}
                />
                <div style={{ flex: 1, padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{product.name}</h3>
                  <p style={{ color: '#666', fontSize: '0.95rem' }}>{product.description}</p>
                  <div style={{ color: '#333', fontWeight: 600, marginTop: 8 }}>
                    {product.price !== undefined && (
                      <>${product.price.toFixed(2)}{' '}</>
                    )}
                    {product.quantity !== undefined && (
                      <span style={{ fontSize: '0.95em', color: '#888' }}>
                        ({product.quantity} in stock)
                      </span>
                    )}
                  </div>
                  {product.category && (
                    <div style={{ fontSize: '0.9em', color: '#888', marginTop: 4 }}>
                      Category: {product.category}
                    </div>
                  )}
                  {product.manufacturer && (
                    <div style={{ fontSize: '0.9em', color: '#888' }}>
                      Manufacturer: {product.manufacturer}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid #eee' }}>
                  <Link
                    to={`/product/${product.id}`}
                    className="btn secondary"
                    style={{
                      flex: 1,
                      padding: '0.75rem 0',
                      border: 'none',
                      background: '#f0f0f0',
                      color: '#333',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderBottomLeftRadius: '12px',
                      transition: 'background 0.2s, box-shadow 0.2s',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#e0e0e0';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.13)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = '#f0f0f0';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
                    }}
                  >
                    View
                  </Link>
                <button
                  style={{
                    flex: 1,
                    padding: '0.75rem 0',
                    border: 'none',
                    background: '#28a745',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderBottomRightRadius: '12px',
                    transition: 'background 0.2s, box-shadow 0.2s',
                    boxShadow: '0 2px 8px rgba(40,167,69,0.18)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#1e7e34';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(40,167,69,0.22)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#28a745';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(40,167,69,0.18)';
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
      <Footer />
    </>
  );
}
