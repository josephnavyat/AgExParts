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

  // Local inline styles for modern, card-like sections
  const sectionCard = {
    background: '#f7f8fa',
    borderRadius: 10,
    padding: '14px',
    boxShadow: '0 6px 18px rgba(11,22,40,0.03)',
    marginBottom: 12,
  };
  const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '0 0 10px 0'
  };
  const sectionTitle = { margin: 0, fontSize: '1.05rem' };
  const smallMuted = { color: '#6b6b6b', fontSize: '0.95rem', fontStyle: 'italic' };
  const compatTableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' };
  const compatTh = { padding: '10px 8px', textAlign: 'left', background: '#fbfbfb', borderBottom: '1px solid #eee' };
  const compatTd = { padding: '10px 8px', borderBottom: '1px solid #f4f4f4' };

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
        <div className="pd-shell">
          <div className="pd-topbar">
            <Link to="/catalog" className="pd-back">← Back to Catalog</Link>
            <div className="pd-sku">
              SKU: <span>{product.sku || product.part_number || product.id}</span>
            </div>
          </div>

          <div className="pd-grid">
            {/* LEFT: Gallery */}
            <div className="pd-galleryCard">
              <div className="pd-mainImage">
                {images.length > 0 ? (
                  <>
                    <img
                      src={getImageUrl(images[imgIndex])}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                    />

                    {imgIndex > 0 && (
                      <button
                        className="pd-nav pd-navLeft"
                        onClick={() => setImgIndex(imgIndex - 1)}
                        aria-label="Previous image"
                        type="button"
                      >
                        ‹
                      </button>
                    )}
                    {imgIndex < images.length - 1 && (
                      <button
                        className="pd-nav pd-navRight"
                        onClick={() => setImgIndex(imgIndex + 1)}
                        aria-label="Next image"
                        type="button"
                      >
                        ›
                      </button>
                    )}

                    <div className="pd-counter">{imgIndex + 1} / {images.length}</div>
                  </>
                ) : (
                  <div className="pd-emptyImage">No image available</div>
                )}
              </div>

              {images.length > 1 && (
                <div className="pd-thumbs" aria-label="Image thumbnails">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      className={`pd-thumb ${i === imgIndex ? 'is-active' : ''}`}
                      onClick={() => setImgIndex(i)}
                      aria-label={`View image ${i + 1}`}
                      type="button"
                    >
                      <img src={getImageUrl(src)} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Buy box */}
            <aside className="pd-buyCard">
              <h1 className="pd-title">{product.name}</h1>

              <div className="pd-metaRow">
                {Number.isFinite(availableStock) && (
                  <span className={`pd-stock ${availableStock > 0 ? 'in' : 'out'}`}>
                    {availableStock > 0 ? `${availableStock} in stock` : 'Out of stock'}
                  </span>
                )}
                {product.category && <span className="pd-chip">{product.category}</span>}
                {product.manufacturer && <span className="pd-chip">{product.manufacturer}</span>}
              </div>

              <div className="pd-priceRow">
                <div className="pd-price">
                  {product.price ? `$${Number(product.price).toFixed(2)}` : 'Call for pricing'}
                </div>
                {product.msrp ? <div className="pd-msrp">MSRP: ${Number(product.msrp).toFixed(2)}</div> : null}
              </div>

              <div className="pd-actions">
                {getProductQuantity(cart, product.id) > 0 ? (
                  <div className="pd-qtyPill">
                    <button
                      className="pd-qtyBtn"
                      onClick={() => dispatch({ type: 'SUBTRACT_FROM_CART', product })}
                      aria-label="Decrease quantity"
                      type="button"
                    >
                      −
                    </button>

                    <span className="pd-qtyVal">{getProductQuantity(cart, product.id)}</span>

                    <button
                      className="pd-qtyBtn"
                      onClick={() => {
                        const desired = (getProductQuantity(cart, product.id) || 0) + 1;
                        const available = Number(product.inventory ?? product.quantity ?? 0);
                        if (Number.isFinite(available) && available > 0 && desired > available) { showLimit(product.id); return; }
                        dispatch({ type: 'ADD_TO_CART', product });
                      }}
                      aria-label="Increase quantity"
                      disabled={availableStock === 0}
                      type="button"
                    >
                      +
                    </button>

                    <LimitTooltip productId={product.id} />
                  </div>
                ) : (
                  <button
                    className="pd-add"
                    onClick={() => dispatch({ type: 'ADD_TO_CART', product })}
                    disabled={availableStock === 0}
                    type="button"
                  >
                    Add to Cart
                  </button>
                )}
              </div>

            </aside>
          </div>

          {/* Stacked Details Sections */}
          <section className="pd-detailsStack" aria-label="Product details">
            <div style={sectionCard}>
              <div style={sectionHeader}>
                <h3 style={sectionTitle}>Product Details</h3>
              </div>
              {product.description ? (
                <div style={{ color: '#333' }}>
                  <p style={{ margin: 0 }}>{product.description}</p>
                </div>
              ) : (
                <div style={{ color: '#888' }}>No description available.</div>
              )}
            </div>

            <div style={sectionCard}>
              <div style={sectionHeader}>
                <h4 style={sectionTitle}>OEM Replacement</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ color: '#666', fontSize: '0.95rem' }}>OEM Part Number</div>
                  <div style={{ fontWeight: 700 }}>{product.oem_pn || product.oem_part_number || '—'}</div>
                </div>
              </div>
            </div>

            <div style={sectionCard}>
              <div style={sectionHeader}>
                <h4 style={sectionTitle}>Machine Compatibility</h4>
                <small style={smallMuted}>- Confirm make/model before ordering</small>
              </div>
              {compatibility && compatibility.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="compat-table" style={compatTableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...compatTh, width: '33%' }}>Manufacturer</th>
                        <th style={{ ...compatTh, width: '33%' }}>Machine Type</th>
                        <th style={{ ...compatTh, width: '34%' }}>Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compatibility.map((row, i) => (
                        <tr key={i}>
                          <td style={compatTd}>{row.manufacturer || '-'}</td>
                          <td style={compatTd}>{row.machine_type || '-'}</td>
                          <td style={compatTd}>{row.model || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: '#888' }}>No compatibility data found.</div>
              )}
            </div>

            <div style={sectionCard}>
              <div style={sectionHeader}>
                <h4 style={sectionTitle}>Part Attributes</h4>
                <small style={smallMuted}>- Specs and features for this part</small>
              </div>
              {attributes && attributes.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {attributes.map((attr, idx) => (
                      <tr key={`${attr.attribute_name}-${idx}`} style={{ borderBottom: idx < attributes.length - 1 ? '1px solid #f1f1f1' : 'none' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, width: '40%' }}>{attr.attribute_name}</td>
                        <td style={{ padding: '10px 12px' }}>{attr.value_text || attr.value_number || (attr.value_bool === true ? 'Yes' : attr.value_bool === false ? 'No' : '—')}{attr.unit ? ` ${attr.unit}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: '#888' }}>No attributes available.</div>
              )}
            </div>
          </section>
        </div>
      ) : null}
      <Footer />
    </>
  );
}