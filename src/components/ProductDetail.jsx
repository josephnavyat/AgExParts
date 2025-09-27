import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import "../styles/site.css";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { cart, dispatch } = useCart();

  useEffect(() => {
    const controller = new AbortController();
  
    const fetchProducts = async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        const found = data.find((p) => String(p.id) === String(id));
        setProduct(found);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch products:', error);
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchProducts();
  
    return () => controller.abort();
  }, []);
  /*
  useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/api/products`)
      .then((res) => {
        console.log('Fetch response:', res);
        if (!res.ok) throw new Error("Failed to fetch product");
        return res.json();
      })
      .then((data) => {
        console.log('Fetched data:', data);
        const found = data.find((p) => String(p.id) === String(id));
        console.log('Found product:', found);
        if (!found) throw new Error("Product not found");
        setProduct(found);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [id]);*/

  return (
    <>
      <Navbar />
      <div className="product-detail-page" style={{ minHeight: '80vh', padding: '2rem', background: 'var(--bg)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888' }}>Loading product...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>
        ) : (
          <div className="product-detail-card" style={{
            maxWidth: 700,
            margin: '2rem auto',
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Main Product Info */}
            <div style={{
              width: '100%',
              maxWidth: 420,
              aspectRatio: '4/3',
              background: '#f8f8f8',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
            }}>
              <img
                src={product.image}
                alt={product.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  background: 'none',
                  borderRadius: 0
                }}
              />
            </div>
            <h2 className="distressed" style={{ fontSize: '2.2rem', marginBottom: 8, color: '#23272f' }}>{product.name}</h2>
            <div style={{ color: '#888', fontSize: '1.1rem', marginBottom: 16 }}>{product.part_number}</div>
            <div style={{ color: '#333', fontWeight: 600, fontSize: '1.3rem', marginBottom: 12 }}>
              {(!isNaN(Number(product.price)) && product.price !== null && product.price !== undefined) ? `$${Number(product.price).toFixed(2)}` : 'Price N/A'}
              <span style={{
                fontSize: '1rem',
                color: product.quantity > 0 ? '#28a745' : '#d32f2f',
                fontWeight: 600,
                marginLeft: 12
              }}>
                {product.quantity && product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            {/* Description Section */}
            <div style={{
              color: '#222',
              fontSize: '1.13rem',
              marginBottom: 24,
              width: '100%',
              background: 'linear-gradient(90deg, #f8fafc 60%, #f1f5f9 100%)',
              borderRadius: 12,
              padding: '1.2rem 1.5rem',
              boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
            }}>{product.description}</div>
            <hr style={{ width: '100%', border: 0, borderTop: '1.5px solid #e0e0e0', margin: '18px 0 18px 0' }} />
            {/* Product Specifications Section */}
            <section style={{
              width: '100%',
              margin: '0 0 18px 0',
              background: 'none',
              borderRadius: 0,
              boxShadow: 'none',
              padding: 0,
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#23272f',
                  letterSpacing: '0.01em',
                  textAlign: 'left',
                  textTransform: 'none',
                  margin: 0,
                  paddingRight: 16,
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 4px rgba(0,0,0,0.07)'
                }}>Product Specifications</h3>
                <div style={{
                  flex: 1,
                  height: 6,
                  background: '#e0e0e0',
                  borderRadius: 3,
                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)'
                }} />
              </div>
              <table style={{ width: '100%', background: 'none', fontSize: '1rem', borderCollapse: 'collapse', color: '#222' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #ececec' }}><td style={{ padding: '8px 0', fontWeight: 600, width: '40%' }}>Size</td><td style={{ padding: '8px 0' }}>{product.size || '20"'}</td></tr>
                  <tr style={{ borderBottom: '1px solid #ececec', background: '#fafbfc' }}><td style={{ padding: '8px 0', fontWeight: 600 }}>Thickness</td><td style={{ padding: '8px 0' }}>{product.thickness || '6.5mm (.256)'}</td></tr>
                  <tr style={{ borderBottom: '1px solid #ececec' }}><td style={{ padding: '8px 0', fontWeight: 600 }}>Bolt Pattern</td><td style={{ padding: '8px 0' }}>{product.bolt_pattern || '4-bolt'}</td></tr>
                  <tr style={{ borderBottom: '1px solid #ececec', background: '#fafbfc' }}><td style={{ padding: '8px 0', fontWeight: 600 }}>Category</td><td style={{ padding: '8px 0' }}>{product.category}</td></tr>
                  <tr><td style={{ padding: '8px 0', fontWeight: 600 }}>Manufacturer</td><td style={{ padding: '8px 0' }}>{product.manufacturer}</td></tr>
                </tbody>
              </table>
            </section>
            <hr style={{ width: '100%', border: 0, borderTop: '1.5px solid #e0e0e0', margin: '18px 0 18px 0' }} />
            {/* OEM Parts Section */}
            <section style={{
              width: '100%',
              margin: '0 0 18px 0',
              background: 'none',
              borderRadius: 0,
              boxShadow: 'none',
              padding: 0,
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{
                  fontSize: '1.13rem',
                  fontWeight: 700,
                  color: '#23272f',
                  letterSpacing: '0.01em',
                  textAlign: 'left',
                  textTransform: 'none',
                  margin: 0,
                  paddingRight: 16,
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 4px rgba(0,0,0,0.07)'
                }}>OEM Parts</h3>
                <div style={{
                  flex: 1,
                  height: 6,
                  background: '#e0e0e0',
                  borderRadius: 3,
                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)'
                }} />
              </div>
              <table style={{ width: '100%', background: 'none', fontSize: '1rem', borderCollapse: 'collapse', color: '#222' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #ececec' }}><td style={{ padding: '8px 0', fontWeight: 600, width: '40%' }}>OEM Part Number</td><td style={{ padding: '8px 0' }}>{product.oem_part_number || 'SH143557'}</td></tr>
                  <tr style={{ background: '#fafbfc' }}><td style={{ padding: '8px 0', fontWeight: 600 }}>Replaces</td><td style={{ padding: '8px 0' }}>{product.replaces || 'Degelman No 143557'}</td></tr>
                </tbody>
              </table>
            </section>
            <div style={{ color: '#888', fontSize: '1rem', marginBottom: 8, width: '100%' }}>
              Category: {product.category} | Manufacturer: {product.manufacturer}
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: 32 }}>
              <Link
                to="/catalog"
                className="btn secondary"
                style={{
                  padding: '0.9rem 2.2rem',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  borderRadius: '10px',
                  background: '#f0f0f0',
                  color: '#222',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                  transition: 'background 0.2s',
                  border: 'none',
                  textAlign: 'center',
                  display: 'inline-block',
                  cursor: 'pointer',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#e0e0e0')}
                onMouseOut={e => (e.currentTarget.style.background = '#f0f0f0')}
              >
                Back to Catalog
              </Link>
              {getProductQuantity(cart, product.id) > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eafbe7', borderRadius: 8, padding: '0.5rem 1.2rem' }}>
                  <button
                    style={{
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      width: 32,
                      height: 32,
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => dispatch({ type: 'SUBTRACT_FROM_CART', product })}
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, color: '#222', fontSize: '1.1rem' }}>{getProductQuantity(cart, product.id)}</span>
                  <button
                    style={{
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      width: 32,
                      height: 32,
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => dispatch({ type: 'ADD_TO_CART', product })}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  className="btn primary"
                  style={{
                    padding: '0.9rem 2.2rem',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    borderRadius: '10px',
                    background: '#19a974',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(25,169,116,0.13)',
                    border: 'none',
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                    display: 'inline-block',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#12895c')}
                  onMouseOut={e => (e.currentTarget.style.background = '#19a974')}
                  onClick={() => dispatch({ type: 'ADD_TO_CART', product })}
                >
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
