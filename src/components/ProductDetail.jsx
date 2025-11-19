import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import "../styles/site.css";
import getImageUrl from '../utils/getImageUrl.js';
import SmartImage from './SmartImage.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cart, dispatch } = useCart();
  // image helper provided by shared utility
  // Retry logic for image onError (lowercase, origin-prefixed, relative), then fallback
  const handleImgError = (e) => {
    const img = e.currentTarget;
    const attempts = Number(img.dataset.attempts || 0);
    img.dataset.attempts = attempts + 1;
    const src = img.getAttribute('src') || '';
    const path = src.startsWith(window.location.origin) ? src.slice(window.location.origin.length) : src;
    const filename = path.split('/').pop() || '';

    if (attempts === 0) {
      const lower = filename.toLowerCase();
      if (lower !== filename) {
        const candidate = path.replace(new RegExp(filename + '$'), lower);
        // If candidate is an absolute URL, use as-is. If it's root-relative, keep it.
        if (/^https?:\/\//i.test(candidate) || /^\/\//.test(candidate) || candidate.startsWith('/')) {
          img.src = candidate;
        } else {
          img.src = `/${candidate}`;
        }
        return;
      }
    }
    if (attempts === 1) {
      if (path && path.startsWith('/')) {
        img.src = window.location.origin + path;
        return;
      }
    }
    if (attempts === 2) {
      const noSlash = path.startsWith('/') ? path.slice(1) : path;
      img.src = noSlash || '/logo.png';
      return;
    }
    img.src = '/logo.png';
  };
  // Helper for available inventory
  const availableStock = product && Number(product.inventory ?? product.quantity ?? 0);

  // Image carousel logic
  const [imgIndex, setImgIndex] = useState(0);
  const [images, setImages] = useState([]);

  // Product attributes state
  const [attributes, setAttributes] = useState([]);
  const [compatibility, setCompatibility] = useState([]);
  const [compatLinks, setCompatLinks] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = await res.json();
  // Support prior shape (array) and new shape { products, compatibility }
  let products = [];
  if (Array.isArray(data)) products = data;
  else if (data && Array.isArray(data.products)) products = data.products;
  const found = products.find((p) => String(p.id) === String(id));
  setProduct(found);
  // set compatLinks if present in payload
  if (data && Array.isArray(data.compat_links)) {
    setCompatLinks(data.compat_links);
  } else {
    setCompatLinks([]);
  }
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

  // When a product is set, fetch strict compatibility rows for its SKU
  useEffect(() => {
    if (!product || !product.sku) return;
    const controller = new AbortController();
    const sku = product.sku;
    fetch(`/.netlify/functions/get-compatibility-by-sku?sku=${encodeURIComponent(sku)}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : { compatibility: [] })
      .then(data => {
        if (data && Array.isArray(data.compatibility)) setCompatibility(data.compatibility);
        else setCompatibility([]);
      })
      .catch(() => setCompatibility([]));
    return () => controller.abort();
  }, [product]);

  useEffect(() => {
    if (!product) return;
    // Build image list robustly: extract filename (basename) from whatever
    // `product.image` contains (it may be '/DN125005.png', 'DN125005.png', or
    // a full URL). Then generate variant keys like basename_2.png and resolve
    // them via getImageUrl so the helper normalizes to the CDN/origin.
    const base = product.image;
    if (!base) return setImages([]);
    // Extract only the filename portion to avoid dots in hostnames affecting ext detection
    const filename = String(base).split('/').pop();
    const extIdx = filename.lastIndexOf('.');
    const baseName = extIdx !== -1 ? filename.slice(0, extIdx) : filename;
    const ext = extIdx !== -1 ? filename.slice(extIdx) : '';
    const keys = [filename];
    for (let i = 2; i <= 5; i++) keys.push(`${baseName}_${i}${ext}`);

    // Check which images exist by attempting to load them using normalized URLs
    Promise.all(keys.map(key =>
      new Promise(resolve => {
        const imgEl = new window.Image();
        const url = getImageUrl(key);
        imgEl.src = url;
        imgEl.onload = () => resolve(url);
        imgEl.onerror = () => resolve(null);
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
                <SmartImage
                  src={images[imgIndex]}
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
          
          {/* Machine Compatibility Section */}
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
                whiteSpace: 'nowrap'
              }}>Machine Compatibility</h3>
              <div style={{ flex: 1, height: 6, background: '#3b3b3bff', borderRadius: 3 }} />
            </div>
            {/* build a list of compatibility rows that apply to this product's SKU using compatLinks */}
            {(() => {
              if (!product) return null;
              // Prefer direct compatibility rows fetched by SKU endpoint
              if (compatibility && compatibility.length > 0) {
                const matched = compatibility;
                return (
                  <table className="compat-table" style={{ width: '100%', background: 'none' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #ececec' }}>
                        <th style={{ padding: '8px 0', fontWeight: 700, width: '33%' }}>Manufacturer</th>
                        <th style={{ padding: '8px 0', fontWeight: 700, width: '33%' }}>Machine Type</th>
                        <th style={{ padding: '8px 0', fontWeight: 700, width: '34%' }}>Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matched.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < matched.length - 1 ? '1px solid #ececec' : 'none', background: idx % 2 === 1 ? '#fafbfc' : 'none' }}>
                          <td style={{ padding: '8px 0' }}>{row.manufacturer || row.manufactur || '-'}</td>
                          <td style={{ padding: '8px 0' }}>{row.machine_type || row.machine || '-'}</td>
                          <td style={{ padding: '8px 0' }}>{row.model || row.models || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              }

              // Fallback: build map compatId -> set of product_skus from compatLinks
              const compatMap = {};
              for (const link of compatLinks || []) {
                if (!link || !link.machine_compatibility_id) continue;
                const id = String(link.machine_compatibility_id);
                compatMap[id] = compatMap[id] || new Set();
                if (link.product_sku) compatMap[id].add(String(link.product_sku));
              }
              // Find compat rows that reference this product.sku
              const sku = product.sku ? String(product.sku) : null;
              let matched = [];
              if (sku && Object.keys(compatMap).length > 0 && compatibility && compatibility.length > 0) {
                const matchedIds = new Set();
                for (const [id, skuSet] of Object.entries(compatMap)) {
                  if (skuSet.has(sku)) matchedIds.add(id);
                }
                if (matchedIds.size > 0) {
                  matched = compatibility.filter(c => matchedIds.has(String(c.id)));
                }
              }
              // Strict mode: only show rows explicitly linked via compat_links

              return (
                <table className="compat-table" style={{ width: '100%', background: 'none' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #ececec' }}>
                      <th style={{ padding: '8px 0', fontWeight: 700, width: '33%' }}>Manufacturer</th>
                      <th style={{ padding: '8px 0', fontWeight: 700, width: '33%' }}>Machine Type</th>
                      <th style={{ padding: '8px 0', fontWeight: 700, width: '34%' }}>Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched && matched.length > 0 ? matched.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < matched.length - 1 ? '1px solid #ececec' : 'none', background: idx % 2 === 1 ? '#fafbfc' : 'none' }}>
                        <td style={{ padding: '8px 0' }}>{row.manufacturer || row.manufactur || '-'}</td>
                        <td style={{ padding: '8px 0' }}>{row.machine_type || row.machine || '-'}</td>
                        <td style={{ padding: '8px 0' }}>{row.model || row.models || '-'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} style={{ padding: '8px 0', color: '#888' }}>No compatibility information available for this part.</td></tr>
                    )}
                  </tbody>
                </table>
              );
            })()}
          </section>
          {/*
          OEM Parts Section
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
          */}
          {/* Actions */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: 32 }}>
            <Link
              to="/catalog"
              className="btn btn-lg secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                transition: 'background 0.2s',
                textDecoration: 'none',
                border: 'none',
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
                className="btn btn-lg brand"
                style={{
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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