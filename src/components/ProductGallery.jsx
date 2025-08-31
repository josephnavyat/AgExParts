import React from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import "../styles/site.css";


const products = [
  { id: 1, name: "Product 1", image: "/logo.png", description: "Description for product 1" },
  { id: 2, name: "Product 2", image: "/hero-16x9.png", description: "Description for product 2" },
  { id: 3, name: "Product 3", image: "/logo.png", description: "Description for product 3" },
  { id: 4, name: "Product 4", image: "/hero-16x9.png", description: "Description for product 4" },
  { id: 5, name: "Product 5", image: "/logo.png", description: "Description for product 5" },
  { id: 6, name: "Product 6", image: "/hero-16x9.png", description: "Description for product 6" },
];

export default function ProductGallery() {
  return (
    <>
      <Navbar />
      <div className="product-gallery" style={{ padding: '2rem' }}>
      <div className="gallery-title-banner">
        <h2 className="distressed gallery-title">Product Catalog</h2>
      </div>
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
              </div>
              <div style={{ display: 'flex', borderTop: '1px solid #eee' }}>
                <button
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
                </button>
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
      </div>
      <Footer />
    </>
  );
}
