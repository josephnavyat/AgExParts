
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
  const [sort, setSort] = useState('');

  // Helper to show banner for 3 seconds
  const handleAddToCart = (product) => {
    dispatch({ type: 'ADD_TO_CART', product });
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 3000);
  };

useEffect(() => {
  const controller = new AbortController();

  const fetchProducts = async () => {
    try {
      const res = await fetch('/.netlify/functions/get-data', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setProducts(data);
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
  //this is for fetching products from the locally.
  useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/api/products`)
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
  }, []);*/
  

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
        <div style={{ height: 72 }} />
        <div className="gallery-title-banner" style={{ textAlign: 'center', marginBottom: '1.2rem', marginTop: '0.5rem' }}>
          <h2 className="distressed gallery-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Product Catalog</h2>
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
  <div style={{ display: 'flex', gap: 16, margin: '1.2rem 0 2rem 0', justifyContent: 'center', flexWrap: 'wrap' }}>
          <select value={manufacturer} onChange={e => setManufacturer(e.target.value)}
            style={{
              padding: '1.5rem 1.2rem',
              borderRadius: 10,
              border: '2px solid #28a745',
              minWidth: 140,
              fontSize: '1rem',
              height: '4.2rem',
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
              padding: '1.5rem 1.2rem',
              borderRadius: 10,
              border: '2px solid #28a745',
              minWidth: 140,
              fontSize: '1rem',
              height: '4.2rem',
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
              padding: '1.5rem 1.2rem',
              borderRadius: 10,
              border: '2px solid #28a745',
              minWidth: 140,
              fontSize: '1rem',
              height: '4.2rem',
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
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{
              padding: '1.5rem 1.2rem',
              borderRadius: 10,
              border: '2px solid #28a745',
              minWidth: 140,
              fontSize: '1rem',
              height: '4.2rem',
              fontWeight: 400,
              fontFamily: 'Arial, sans-serif',
              background: '#f8fff6',
              color: '#222',
              boxShadow: '0 2px 8px rgba(40,167,69,0.07)',
            }}>
            <option value="">Sort by</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888' }}>Loading products...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>
        ) : (
          <div
            className="gallery-grid"
          >
            {products
              .filter(product => !manufacturer || product.manufacturer === manufacturer)
              .filter(product => !machineType || product.machine_type === machineType)
              .filter(product => !model || product.model === model)
              .sort((a, b) => {
                if (sort === 'price-asc') return (a.price || 0) - (b.price || 0);
                if (sort === 'price-desc') return (b.price || 0) - (a.price || 0);
                return 0;
              })
              .map((product) => (
              <div
                key={product.id}
                className="product-card"
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  background: '#fff',
                  minHeight: '260px',
                  fontSize: '0.97rem',
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: '100%', height: '120px', objectFit: 'cover', background: '#f8f8f8' }}
                />
                <div style={{ padding: '0.6rem' }}>
                  <h3 style={{ margin: '0 0 0.3rem 0', color: '#333',fontSize: '1rem' }}>{product.name}</h3>
                  <div style={{ color: '#333', fontWeight: 600, marginTop: 6, fontSize: '0.95rem' }}>
                    {(!isNaN(Number(product.price)) && product.price !== null && product.price !== undefined) ? `$${Number(product.price).toFixed(2)}` : 'Price N/A'}
                    {product.quantity !== undefined && (
                      <span style={{
                        fontSize: '0.9em',
                        color: product.quantity > 0 ? '#28a745' : '#d32f2f',
                        fontWeight: 600,
                        marginLeft: 6
                      }}>
                        {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    )}
                  </div>
                  {product.category && (
                    <div style={{ fontSize: '0.85em', color: '#888', marginTop: 2 }}>
                      Category: {product.category}
                    </div>
                  )}
                  {product.manufacturer && (
                    <div style={{ fontSize: '0.85em', color: '#888' }}>
                      Manufacturer: {product.manufacturer}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid #eee', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Link
                    to={`/product/${product.id}`}
                    className="btn secondary"
                    style={{
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
