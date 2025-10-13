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
  // Helper for available inventory
  const availableStock = product && Number(product.inventory ?? 0);

  // Image carousel logic
  const [imgIndex, setImgIndex] = useState(0);
  const [images, setImages] = useState([]);

  // Product attributes state
  const [attributes, setAttributes] = useState([]);

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
  }, [id]);

  useEffect(() => {
    if (!product) return;
    // Build image list: main image, then _2, _3, _4, _5
    const base = product.image;
    if (!base) return setImages([]);
    const extIdx = base.lastIndexOf('.');
    const baseName = extIdx !== -1 ? base.slice(0, extIdx) : base;
    const ext = extIdx !== -1 ? base.slice(extIdx) : '';
    const imgList = [base];
    for (let i = 2; i <= 5; i++) {
      imgList.push(`${baseName}_${i}${ext}`);
    }
    // Check which images exist by attempting to load them
    Promise.all(imgList.map(src =>
      new Promise(resolve => {
        const img = new window.Image();
        img.src = src;
        img.onload = () => resolve(src);
        img.onerror = () => resolve(null);
      })
    )).then(arr => setImages(arr.filter(Boolean)));
    setImgIndex(0);
  }, [product]);

  useEffect(() => {
    if (!product || !product.sku) return;
    fetch(`/.netlify/functions/get-product-attributes?sku=${encodeURIComponent(product.sku)}`)
      .then(res => res.json())
      .then(data => setAttributes(data))
      .catch(() => setAttributes([]));
  }, [product]);

  return (
    <>
      <Navbar />
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888' }}>Loading product...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>
      ) : product ? (
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
            {/* Image carousel */}
            {images.length > 0 && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={images[imgIndex]}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: 'none', borderRadius: 0 }}
                />
                {imgIndex > 0 && (
                  <button
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer', fontSize: 22, fontWeight: 700 }}
                    onClick={() => setImgIndex(imgIndex - 1)}
                    aria-label="Previous image"
                  >&lt;</button>
                )}
                {imgIndex < images.length - 1 && (
                  <button
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', cursor: 'pointer', fontSize: 22, fontWeight: 700 }}
                    onClick={() => setImgIndex(imgIndex + 1)}
                    aria-label="Next image"
                  >&gt;</button>
                )}
                <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.85)', borderRadius: 8, padding: '2px 12px', fontSize: 14, color: '#444', fontWeight: 600 }}>
                  {imgIndex + 1} / {images.length}
                </div>
              </div>
            )}
          </div>
          <h2 className="distressed" style={{ fontSize: '2.2rem', marginBottom: 8, color: '#444a58' }}>{product.name}</h2>
          <div style={{ color: '#888', fontSize: '1.1rem', marginBottom: 16 }}>{product.part_number}</div>
          <div style={{ color: '#444a58', fontWeight: 600, fontSize: '1.3rem', marginBottom: 12 }}>
            {(() => {
              const price = Number(product.price);
              const discountPerc = Number(product.discount_perc) || 0;
              const endDate = product.discount_end_date ? new Date(product.discount_end_date) : null;
              const now = new Date();
              const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
              if (saleActive && !isNaN(price)) {
                const salePrice = (price * (1 - discountPerc)).toFixed(2);
                return (
                  <>
                    <span style={{ textDecoration: 'line-through', color: '#888', marginRight: 10 }}>
                      ${price.toFixed(2)}
                    </span>
                    <span style={{ color: '#d32f2f', fontWeight: 700, fontSize: '1.3rem' }}>
                      ${salePrice}
                    </span>
                  </>
                );
              } else if (!isNaN(price)) {
                return `$${price.toFixed(2)}`;
              } else {
                return 'Price N/A';
              }
            })()}
            {availableStock < 20 && availableStock > 0 ? (
              <span style={{ fontSize: '1rem', color: '#d32f2f', fontWeight: 600, marginLeft: 12 }}>
                Low Stock: {availableStock} Available
              </span>
            ) : (
              <span style={{ fontSize: '1rem', color: availableStock > 0 ? '#28a745' : '#d32f2f', fontWeight: 600, marginLeft: 12 }}>
                {availableStock > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            )}
          </div>
          {/* Description Section */}
          <div style={{
            color: '#444a58',
            fontSize: '1.13rem',
            marginBottom: 24,
            width: '100%',
            background: 'linear-gradient(90deg, #f8fafc 60%, #f1f5f9 100%)',
            borderRadius: 12,
            padding: '1.2rem 1.5rem',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
          }}>{product.description}</div>
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
            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 14px 0' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#3b3b3bff',
                letterSpacing: '0.01em',
                textAlign: 'left',
                textTransform: 'none',
                margin: 0,
                paddingRight: 16,
                whiteSpace: 'nowrap',
                textShadow: '0 2px 8px 0 rgba(122,133,153,0.18)'
              }}>Part Attributes</h3>
              <div style={{
                flex: 1,
                height: 6,
                background: '#3b3b3bff',
                borderRadius: 3,
                boxShadow: '0 4px 16px 0 rgba(122,133,153,0.18)'
              }} />
            </div>
            <table style={{ width: '100%', background: 'none', fontSize: '1rem', borderCollapse: 'collapse', color: '#444a58' }}>
              <tbody>
                {attributes.length > 0 ? attributes.map((attr, idx) => (
                  <tr key={attr.attribute_name} style={{ borderBottom: idx < attributes.length - 1 ? '1px solid #ececec' : 'none', background: idx % 2 === 1 ? '#fafbfc' : 'none' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600, width: '40%' }}>{attr.attribute_name}</td>
                    <td style={{ padding: '8px 0' }}>{attr.value_text || attr.value_number || (attr.value_bool === true ? 'Yes' : attr.value_bool === false ? 'No' : '')}{attr.unit ? ` ${attr.unit}` : ''}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={2} style={{ padding: '8px 0', color: '#888' }}>No attributes available.</td></tr>
                )}
              </tbody>
            </table>
          </section>
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
            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 14px 0' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#3b3b3bff',
                letterSpacing: '0.01em',
                textAlign: 'left',
                textTransform: 'none',
                margin: 0,
                paddingRight: 16,
                whiteSpace: 'nowrap',
                textShadow: '0 2px 8px 0 rgba(68,74,88,0.18)'
              }}>OEM Parts</h3>
              <div style={{
                flex: 1,
                height: 6,
                background: '#3b3b3bff',
                borderRadius: 3,
                boxShadow: '0 4px 16px 0 rgba(68,74,88,0.18)'
              }} />
            </div>
            <table style={{ width: '100%', background: 'none', fontSize: '1rem', borderCollapse: 'collapse', color: '#444a58' }}>
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
                  disabled={getProductQuantity(cart, product.id) >= availableStock}
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
                disabled={availableStock <= 0}
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      ) : null}
      <Footer />
    </>
  );
}