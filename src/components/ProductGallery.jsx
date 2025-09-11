
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
            style={{
              margin: '0 auto',
            }}
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
              .map((product) => {
                const [quickAdd, setQuickAdd] = React.useState(false);
                const [qty, setQty] = React.useState(getProductQuantity(cart, product.id) || 1);
                const inStock = product.quantity > 0;
                return (
                  <div key={product.id} className="product-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 320 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span title={inStock ? 'In Stock' : 'Out of Stock'} style={{ fontSize: 22 }}>
                        {inStock ? '✅' : '❌'}
                      </span>
                      <h3 className="title" style={{ margin: 0, fontSize: '1.1rem', color: '#222' }}>{product.name}</h3>
                    </div>
                    <div className="media">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                      />
                    </div>
                    <div className="body" style={{ flex: 1 }}>
                      {product.manufacturer && <div className="product-manufacturer" style={{ color: '#444', fontSize: '0.95em' }}>{product.manufacturer}</div>}
                      {product.category && <div className="product-category" style={{ color: '#444', fontSize: '0.92em' }}>{product.category}</div>}
                      <div style={{ color: '#333', fontWeight: 600, margin: '8px 0 0 0', fontSize: '1rem' }}>
                        {(!isNaN(Number(product.price)) && product.price !== null && product.price !== undefined) ? `$${Number(product.price).toFixed(2)}` : 'Price N/A'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Link
                        to={{ pathname: `/product/${product.id}` }}
                        state={{ product }}
                        className="btn secondary"
                        style={{ flex: 1, textAlign: 'center', fontWeight: 600, borderRadius: 8, padding: '0.6rem 0', background: '#f0f0f0', color: '#333', border: 'none', cursor: 'pointer', textDecoration: 'none' }}
                      >
                        View Details
                      </Link>
                      {!quickAdd ? (
                        <button
                          className="btn primary"
                          style={{ flex: 1, textAlign: 'center', fontWeight: 600, borderRadius: 8, padding: '0.6rem 0', background: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}
                          onClick={() => setQuickAdd(true)}
                          disabled={!inStock}
                        >
                          Quick Add
                        </button>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <button
                            style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, width: 28, height: 28, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }}
                            onClick={() => {
                              if (qty > 1) setQty(qty - 1);
                              dispatch({ type: 'SUBTRACT_FROM_CART', product });
                            }}
                            disabled={qty <= 1}
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={product.quantity || 99}
                            value={qty}
                            onChange={e => {
                              let val = Math.max(1, Math.min(Number(e.target.value), product.quantity || 99));
                              setQty(val);
                              dispatch({ type: 'SET_QUANTITY', product, quantity: val });
                            }}
                            style={{ width: 38, textAlign: 'center', fontWeight: 600, border: '1px solid #ccc', borderRadius: 4, fontSize: '1rem', margin: '0 2px' }}
                          />
                          <button
                            style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, width: 28, height: 28, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }}
                            onClick={() => {
                              setQty(qty + 1);
                              dispatch({ type: 'ADD_TO_CART', product });
                            }}
                            disabled={qty >= (product.quantity || 99)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
