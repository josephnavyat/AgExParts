
import React, { useEffect, useState } from "react";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import "../styles/site.css";


export default function ProductGallery() {
  const [products, setProducts] = useState([]);
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

  // Quick add state: track which product is in quick add mode and its quantity
  const [quickAddMap, setQuickAddMap] = useState({}); // { [productId]: true/false }
  const [qtyMap, setQtyMap] = useState({}); // { [productId]: number }

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
                const inStock = product.quantity > 0;
                const quickAdd = !!quickAddMap[product.id];
                const qty = qtyMap[product.id] ?? (getProductQuantity(cart, product.id) || 1);
                return (
                  <div key={product.id} className="product-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 320 }}>
                    <div className="media">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                      />
                    </div>
                    <div className="body" style={{ flex: 1 }}>
                      <h3 className="title" style={{ margin: 0, fontSize: '1.1rem', color: '#222' }}>{product.name}</h3>
                      {product.manufacturer && <div className="product-manufacturer" style={{ color: '#444', fontSize: '0.95em' }}>{product.manufacturer}</div>}
                      {product.category && <div className="product-category" style={{ color: '#444', fontSize: '0.92em' }}>{product.category}</div>}
                      <div style={{ color: '#333', fontWeight: 600, margin: '8px 0 0 0', fontSize: '1rem' }}>
                        {(!isNaN(Number(product.price)) && product.price !== null && product.price !== undefined) ? `$${Number(product.price).toFixed(2)}` : 'Price N/A'}
                      </div>
                      <div style={{ margin: '12px 0 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span title={inStock ? 'In Stock' : 'Out of Stock'} style={{ fontSize: 18, fontWeight: 600, color: inStock ? '#28a745' : '#d32f2f', letterSpacing: 0.5 }}>
                          {inStock ? '✅ In Stock' : '❌ Out of Stock'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: 18, justifyContent: 'center', width: '100%' }}>
                      <Link
                        to={{ pathname: `/product/${product.id}` }}
                        state={{ product }}
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
                        View Details
                      </Link>
                      {!quickAdd ? (
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
                          onClick={() => setQuickAddMap(q => ({ ...q, [product.id]: true }))}
                          disabled={!inStock}
                        >
                          Quick Add
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eafbe7', borderRadius: 8, padding: '0.5rem 1.2rem', flex: 1, justifyContent: 'center' }}>
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
                            onClick={() => {
                              if (qty > 1) setQtyMap(qm => ({ ...qm, [product.id]: qty - 1 }));
                              dispatch({ type: 'SUBTRACT_FROM_CART', product });
                            }}
                            disabled={qty <= 1}
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, color: '#222', fontSize: '1.1rem' }}>{qty}</span>
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
                            onClick={() => {
                              setQtyMap(qm => ({ ...qm, [product.id]: qty + 1 }));
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
