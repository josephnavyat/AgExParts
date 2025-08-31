
import React, { useEffect, useState } from "react";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import "../styles/site.css";

export default function ProductGallery() {
  const [products, setProducts] = useState([]);
  // If any product is out of stock, show a banner
  const anyOutOfStock = products.some(p => p.quantity === 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cart, dispatch } = useCart();
  const [showBanner, setShowBanner] = useState(false);
  // Filter state
  const [manufacturer, setManufacturer] = useState('');
  const [machineType, setMachineType] = useState('');
  const [model, setModel] = useState('');

  // Helper to show banner for 3 seconds
  const handleAddToCart = (product) => {
    dispatch({ type: 'ADD_TO_CART', product });
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 3000);
  };

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
      {showBanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 1000,
          background: 'rgba(40,167,69,0.82)',
          color: '#fff',
          fontWeight: 600,
          fontSize: '1rem',
          textAlign: 'center',
          padding: '0.45rem 0',
          boxShadow: '0 2px 8px rgba(40,167,69,0.13)',
          letterSpacing: 0.5,
          backdropFilter: 'blur(2px)',
        }}>
          Item added to cart
        </div>
      )}
      <div className="product-gallery" style={{ padding: '2rem' }}>
        <div className="gallery-title-banner">
          <h2 className="distressed gallery-title">Product Catalog</h2>
          {anyOutOfStock && (
            <div style={{
              background: '#fff3f3',
              color: '#d32f2f',
              fontWeight: 600,
              fontSize: '1.1rem',
              border: '1px solid #d32f2f',
              borderRadius: 8,
              padding: '0.7rem 1.5rem',
              margin: '1rem auto 0 auto',
              maxWidth: 400,
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(211,47,47,0.07)'
            }}>
              Some items are <b>Out of Stock</b>
            </div>
          )}
        </div>
        {/* Filter boxes */}
        <div style={{ display: 'flex', gap: 24, margin: '1.5rem 0 2.5rem 0', justifyContent: 'center', flexWrap: 'wrap' }}>
          <select value={manufacturer} onChange={e => setManufacturer(e.target.value)}
            style={{
              padding: '1.1rem 2.2rem',
              borderRadius: 12,
              border: '2px solid #28a745',
              minWidth: 200,
              fontSize: '1.25rem',
              height: '3.2rem',
              fontWeight: 400,
              fontFamily: 'Arial, sans-serif',
              background: '#f8fff6',
              color: '#222',
              boxShadow: '0 2px 8px rgba(40,167,69,0.07)',
            }}>
            <option value="">All Manufacturers</option>
            {[...new Set(products.map(p => p.manufacturer).filter(Boolean))].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select value={machineType} onChange={e => setMachineType(e.target.value)}
            style={{
              padding: '1.1rem 2.2rem',
              borderRadius: 12,
              border: '2px solid #28a745',
              minWidth: 200,
              fontSize: '1.25rem',
              height: '3.2rem',
              fontWeight: 400,
              fontFamily: 'Arial, sans-serif',
              background: '#f8fff6',
              color: '#222',
              boxShadow: '0 2px 8px rgba(40,167,69,0.07)',
            }}>
            <option value="">All Machine Types</option>
            {[...new Set(products.map(p => p.machine_type).filter(Boolean))].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select value={model} onChange={e => setModel(e.target.value)}
            style={{
              padding: '1.1rem 2.2rem',
              borderRadius: 12,
              border: '2px solid #28a745',
              minWidth: 200,
              fontSize: '1.25rem',
              height: '3.2rem',
              fontWeight: 400,
              fontFamily: 'Arial, sans-serif',
              background: '#f8fff6',
              color: '#222',
              boxShadow: '0 2px 8px rgba(40,167,69,0.07)',
            }}>
            <option value="">All Models</option>
            {[...new Set(products.map(p => p.model).filter(Boolean))].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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
            {products
              .filter(product => !manufacturer || product.manufacturer === manufacturer)
              .filter(product => !machineType || product.machine_type === machineType)
              .filter(product => !model || product.model === model)
              .map((product) => (
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
                      <span style={{
                        fontSize: '0.95em',
                        color: product.quantity > 0 ? '#28a745' : '#d32f2f',
                        fontWeight: 600,
                        marginLeft: 8
                      }}>
                        {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
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
                {getProductQuantity(cart, product.id) > 0 ? (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#eafbe7',
                    borderBottomRightRadius: '12px',
                    borderLeft: '1px solid #e0e0e0',
                    padding: '0.5rem 0',
                    gap: 8,
                  }}>
                    <button
                      style={{
                        background: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        width: 28,
                        height: 28,
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        marginRight: 4,
                      }}
                      onClick={() => dispatch({ type: 'SUBTRACT_FROM_CART', product })}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600, color: '#222' }}>{getProductQuantity(cart, product.id)}</span>
                    <button
                      style={{
                        background: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        width: 28,
                        height: 28,
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        marginLeft: 4,
                      }}
                      onClick={() => dispatch({ type: 'ADD_TO_CART', product })}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                ) : (
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
                    onClick={() => handleAddToCart(product)}
                  >
                    Add to Cart
                  </button>
                )}
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
