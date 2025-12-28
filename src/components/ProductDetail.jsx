import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import LimitTooltip from './LimitTooltip.jsx';
import "../styles/site.css";
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cart, dispatch, limitMap, showLimit } = useCart();
  const getImageUrl = (img) => resolveImageUrl(img);
  // Helper for available inventory
  const availableStock = product && Number(product.inventory ?? product.quantity ?? 0);

  // Image carousel logic
  const [imgIndex, setImgIndex] = useState(0);
  const [images, setImages] = useState([]);

  // Product attributes state
  const [attributes, setAttributes] = useState([]);
  const [compatibility, setCompatibility] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        // Normalize different possible response shapes into an array we can search
        let productsArray = [];
        if (Array.isArray(data)) productsArray = data;
        else if (data && Array.isArray(data.products)) productsArray = data.products;
        else if (data && Array.isArray(data.items)) productsArray = data.items;
        else if (data && typeof data === 'object') {
          const firstArray = Object.values(data).find(v => Array.isArray(v));
          productsArray = firstArray || [];
        }

        const found = productsArray.find((p) => String(p.id) === String(id) || String(p._id) === String(id) || String(p.sku || p.part_number || '') === String(id));
        if (found) {
          setProduct(found);
          setError(null);
        } else {
          setProduct(null);
          setError('Product not found');
          console.warn('ProductDetail: product not found for id', id, 'response shape:', Array.isArray(data) ? 'array' : typeof data);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch products:', error);
          setError('Failed to load product');
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
    // Resolve image URLs (use CDN or env-configured base) before preloading
    const urlList = imgList.map(s => getImageUrl(s));
    // Check which images exist by attempting to load them
    Promise.all(urlList.map(src =>
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
      .then(res => res.ok ? res.json() : [])
      .then(data => setAttributes(Array.isArray(data) ? data : []))
      .catch(() => setAttributes([]));

    // Fetch compatibility list (returns { compatibility: [...] })
    fetch(`/.netlify/functions/get-compatibility-by-sku?sku=${encodeURIComponent(product.sku)}`)
      .then(res => res.ok ? res.json() : { compatibility: [] })
      .then(data => setCompatibility(Array.isArray(data.compatibility) ? data.compatibility : []))
      .catch(() => setCompatibility([]));
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
          maxWidth: '1100px',
          width: '100%',
          margin: '1.5rem auto',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Main Product Info */}
          <div style={{
            width: '100%',
            maxWidth: 260, // reduced to ~half
            aspectRatio: '4/3',
            background: '#f8f8f8',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            maxHeight: 210, // reduced to ~half
          }}>
            {/* Image carousel */}
            {images.length > 0 && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={getImageUrl(images[imgIndex])}
                  alt={product.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto',
                    background: 'none',
                    borderRadius: 0
                  }}
                  loading="lazy"
                  onError={e => { e.currentTarget.src = '/logo.png'; }}
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
          {product.sku && (
            <div style={{ textAlign: 'center', color: '#444a58', fontWeight: 500, fontSize: '0.95rem', margin: '6px 0 4px 0' }}>
              {product.sku}
            </div>
          )}
          <h2 className="distressed" style={{ fontSize: '1.5rem', marginBottom: 6, color: '#333' }}>{product.name}</h2>
          <div style={{ color: '#888', fontSize: '0.98rem', marginBottom: 12 }}>{product.part_number}</div>
          <div style={{ color: '#444a58', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>
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
              <span style={{ fontSize: '1rem', color: 'orange', fontWeight: 600, marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Low Stock: {availableStock} Available
              </span>
            ) : (
              <span style={{ fontSize: '1rem', color: availableStock > 0 ? '#28a745' : '#d32f2f', fontWeight: 600, marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {availableStock > 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#28a745" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10" stroke="#28a745" strokeWidth="2" fill="#fff"/>
                    <path d="M8 12l2 2 4-4" stroke="#28a745" strokeWidth="2" fill="none"/>
                  </svg>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#d32f2f" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
                      <circle cx="12" cy="12" r="10" stroke="#d32f2f" strokeWidth="2" fill="#fff"/>
                      <line x1="8" y1="8" x2="16" y2="16" stroke="#d32f2f" strokeWidth="2"/>
                      <line x1="16" y1="8" x2="8" y2="16" stroke="#d32f2f" strokeWidth="2"/>
                    </svg>
                    <span style={{ color: '#d32f2f', marginLeft: 6 }}>Out of Stock</span>
                  </>
                )}
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

          <div style={{ color: '#888', fontSize: '1rem', marginBottom: 8, width: '100%' }}>
            Category: {product.category} | Manufacturer: {product.manufacturer}
          </div>

          {/* Machine Compatibility Section */}
          {(compatibility && compatibility.length > 0) || (product.compatibility && product.compatibility.length > 0) || (product.compat_links && product.compat_links.length > 0) ? (
            <section style={{ width: '100%', marginTop: 12, background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>Machine Compatibility</h3>
              <div style={{ color: '#444' }}>
                {compatibility && compatibility.length > 0 ? (
                  <table className="compat-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '8px 6px', width: '33%' }}>Manufacturer</th>
                        <th style={{ padding: '8px 6px', width: '33%' }}>Machine Type</th>
                        <th style={{ padding: '8px 6px', width: '34%' }}>Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compatibility.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f1f1' }}>
                          <td style={{ padding: '8px 6px' }}>{row.manufacturer || '-'}</td>
                          <td style={{ padding: '8px 6px' }}>{row.machine_type || '-'}</td>
                          <td style={{ padding: '8px 6px' }}>{row.model || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : Array.isArray(product.compatibility) && product.compatibility.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {product.compatibility.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                ) : Array.isArray(product.compat_links) && product.compat_links.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {product.compat_links.map((c, i) => <li key={i}><a href={c} target="_blank" rel="noreferrer">{c}</a></li>)}
                  </ul>
                ) : (
                  <div style={{ color: '#888' }}>No compatibility data available.</div>
                )}
              </div>
            </section>
          ) : null}

          {/* OEM Replacements Section */}
          {(product.oem_replacement || product.oem_replacements || product.oem) && (
            <section style={{ width: '100%', marginTop: 12, background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>OEM Replacements</h3>
              <div style={{ color: '#444' }}>
                {Array.isArray(product.oem_replacements) && product.oem_replacements.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {product.oem_replacements.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                ) : product.oem_replacement ? (
                  <div>{product.oem_replacement}</div>
                ) : product.oem ? (
                  <div>{product.oem}</div>
                ) : (
                  <div style={{ color: '#888' }}>No OEM replacement data.</div>
                )}
              </div>
            </section>
          )}

          {/* Actions (moved below price) */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: 18 }}>
            <Link
              to="/catalog"
              className="btn secondary"
              style={{
                padding: '0.7rem 1.6rem',
                fontWeight: 700,
                fontSize: '1rem',
                borderRadius: '8px',
                background: '#f0f0f0',
                color: '#222',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
                transition: 'background 0.15s',
                border: 'none',
                textAlign: 'center',
                display: 'inline-block',
                cursor: 'pointer',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#eaeaea')}
              onMouseOut={e => (e.currentTarget.style.background = '#f0f0f0')}
            >
              Back to Catalog
            </Link>
            {getProductQuantity(cart, product.id) > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eafbe7', borderRadius: 8, padding: '0.45rem 0.9rem' }}>
                <button
                  style={{
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    width: 30,
                    height: 30,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => dispatch({ type: 'SUBTRACT_FROM_CART', product })}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, color: '#222', fontSize: '1.05rem' }}>{getProductQuantity(cart, product.id)}</span>
                <button
                  style={{
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    width: 30,
                    height: 30,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const desired = (getProductQuantity(cart, product.id) || 0) + 1;
                    const available = Number(product.inventory ?? product.quantity ?? 0);
                    if (Number.isFinite(available) && available > 0 && desired > available) { showLimit(product.id); return; }
                    dispatch({ type: 'ADD_TO_CART', product });
                  }}
                  aria-label="Increase quantity"
                  
                >
                  +
                </button>
                <LimitTooltip productId={product.id} style={{ marginLeft: 12 }} />
              </div>
            ) : (
              <button
                className="btn primary"
                style={{
                  padding: '0.7rem 1.6rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  borderRadius: '8px',
                  background: '#19a974',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(25,169,116,0.10)',
                  border: 'none',
                  letterSpacing: '0.02em',
                  textAlign: 'center',
                  display: 'inline-block',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
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
      ) : null}
      <Footer />
    </>
  );
}