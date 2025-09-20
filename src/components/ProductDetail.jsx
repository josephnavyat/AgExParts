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
              <img src={product.image} alt={product.name} style={{ width: 320, height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 24, background: '#f8f8f8' }} />
              <h2 className="distressed" style={{ fontSize: '2.2rem', marginBottom: 8, color: '#222' }}>{product.name}</h2>
              <div style={{ color: '#333', fontSize: '1.1rem', marginBottom: 16 }}>{product.part_number}</div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#333', fontWeight: 600, fontSize: '1.3rem', marginRight: 18 }}>
                  {(!isNaN(Number(product.price)) && product.price !== null && product.price !== undefined) ? `$${Number(product.price).toFixed(2)}` : 'Price N/A'}
                </span>
                <span style={{
                  fontSize: '1.1rem',
                  color: product.quantity > 0 ? '#28a745' : '#d32f2f',
                  fontWeight: 700,
                  background: product.quantity > 0 ? '#eafbe7' : '#ffeaea',
                  borderRadius: 8,
                  padding: '0.4rem 1.2rem',
                  marginLeft: 8
                }}>
                  {product.quantity && product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              <div style={{ color: '#222', fontSize: '1.1rem', marginBottom: 18 }}>{product.description}</div>
              {/* Specs Table */}
              <table style={{ width: '100%', marginBottom: 18, background: '#f8f8f8', borderRadius: 8, fontSize: '1rem', borderCollapse: 'collapse', color: '#222' }}>
                <tbody>
                  <tr><td style={{ padding: '8px', fontWeight: 600 }}>Size</td><td style={{ padding: '8px' }}>{product.size || '20"'}</td></tr>
                  <tr><td style={{ padding: '8px', fontWeight: 600 }}>Thickness</td><td style={{ padding: '8px' }}>{product.thickness || '6.5mm (.256)'}</td></tr>
                  <tr><td style={{ padding: '8px', fontWeight: 600 }}>Bolt Pattern</td><td style={{ padding: '8px' }}>{product.bolt_pattern || '4-bolt'}</td></tr>
                  <tr><td style={{ padding: '8px', fontWeight: 600 }}>Category</td><td style={{ padding: '8px' }}>{product.category}</td></tr>
                  <tr><td style={{ padding: '8px', fontWeight: 600 }}>Manufacturer</td><td style={{ padding: '8px' }}>{product.manufacturer}</td></tr>
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: 32 }}>
              <Link
                to="/catalog"
                className="btn primary"
                style={{
                  padding: '0.9rem 2.2rem',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  borderRadius: '10px',
                  background: '#19a974',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(25,169,116,0.13)',
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                  transition: 'background 0.2s',
                  border: 'none',
                  textAlign: 'center',
                  display: 'inline-block',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#12895c')}
                onMouseOut={e => (e.currentTarget.style.background = '#19a974')}
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
                  className="btn secondary"
                  style={{
                    padding: '0.9rem 2.2rem',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    borderRadius: '10px',
                    background: '#f0f0f0',
                    color: '#222',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    border: 'none',
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                    display: 'inline-block',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#e0e0e0')}
                  onMouseOut={e => (e.currentTarget.style.background = '#f0f0f0')}
                  onClick={() => dispatch({ type: 'ADD_TO_CART', product })}
                >
                  Add to Cart
                </button>
              )}
            </div>
              {/* Support/Contact Section */}
              <div style={{ marginTop: 32, marginBottom: 16, textAlign: 'center', color: '#555', fontSize: '1rem', background: '#f6f6f6', borderRadius: 8, padding: '1.2rem' }}>
                <span>Need help or having trouble ordering? Call <a href="tel:1-800-627-6137" style={{ color: '#19a974', fontWeight: 600 }}>1-800-627-6137</a> or <Link to="/contact">contact us</Link>.</span>
              </div>
              {/* Suggested Products Section */}
              <div style={{ marginTop: 24, width: '100%' }}>
                <h4 className="title" style={{ fontSize: '1.2rem', marginBottom: 12 }}>Suggested Products</h4>
                <div className="related-products" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* Placeholder for related products. You can map real data here. */}
                  <Link to="/product/101" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '1rem 1.5rem', minWidth: 180, cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                      <span style={{ fontWeight: 600 }}>Blade for Kinze Mach Till</span><br />
                      <span style={{ color: '#888' }}>$79.95</span>
                    </div>
                  </Link>
                  <Link to="/product/102" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '1rem 1.5rem', minWidth: 180, cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                      <span style={{ fontWeight: 600 }}>Degelman Pro-Till Bearing</span><br />
                      <span style={{ color: '#888' }}>$42.50</span>
                    </div>
                  </Link>
                </div>
              </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
