import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import getImageUrl from '../utils/getImageUrl.js';
import SmartImage from './SmartImage.jsx';
import { useCart, getProductQuantity } from './CartContext.jsx';
import QuantityInput from './QuantityInput.jsx';
import LimitTooltip from './LimitTooltip.jsx';

export default function ProductDetailNew() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attributes, setAttributes] = useState([]);
  const [compatibility, setCompatibility] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { dispatch, cart, limitMap, showLimit } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/.netlify/functions/get-data');
        const data = await res.json();
        const products = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
        const found = products.find(p => String(p.id) === String(id));
        if (!cancelled) setProduct(found || null);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
  if (!product || !product.sku) return;
    let mounted = true;
    fetch(`/.netlify/functions/get-product-attributes?sku=${encodeURIComponent(product.sku)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (mounted) setAttributes(Array.isArray(data) ? data : []); })
      .catch(() => setAttributes([]));
    fetch(`/.netlify/functions/get-compatibility-by-sku?sku=${encodeURIComponent(product.sku)}`)
      .then(r => r.ok ? r.json() : { compatibility: [] })
      .then(data => { if (mounted) setCompatibility(Array.isArray(data.compatibility) ? data.compatibility : []); })
      .catch(() => setCompatibility([]));
    return () => { mounted = false; };
  }, [product]);

  // Build image variants (quiet HEAD checks). Always include primary URL so
  // the UI shows the main image even if variant probing is blocked.
  useEffect(() => {
    if (!product) {
      setImages([]);
      setSelectedImageIndex(0);
      return;
    }
    const filename = String(product.image || '').split('/').pop() || '';
    const extIdx = filename.lastIndexOf('.');
    const baseName = extIdx !== -1 ? filename.slice(0, extIdx) : filename;
    const ext = extIdx !== -1 ? filename.slice(extIdx) : '';
    const primaryUrl = getImageUrl(filename);

    const candidates = [
      filename,
      `${baseName}.webp`,
      `${baseName}.thumb.webp`,
      `${baseName}_2${ext}`,
      `${baseName}_3${ext}`,
      `${baseName}_4${ext}`,
      `${baseName}_5${ext}`,
    ];

    let cancelled = false;
    (async () => {
      const found = new Set();
      // Always include primary URL first
      found.add(primaryUrl);
      await Promise.all(candidates.map(async (key) => {
        try {
          const url = getImageUrl(key);
          // Skip primary since already added
          if (url === primaryUrl) return;
          const res = await fetch(url, { method: 'HEAD' });
          if (res && res.ok) found.add(url);
        } catch (e) {
          // HEAD may be blocked by CORS on older deployments; skip quietly
        }
      }));
      if (!cancelled) {
        const arr = Array.from(found);
        setImages(arr);
        setSelectedImageIndex(0);
      }
    })();
    return () => { cancelled = true; };
  }, [product]);

  // use centralized limitMap/showLimit from CartContext

  const addToCart = () => {
    if (!product) return;
    const available = Number(product.inventory ?? product.quantity ?? 0);
    const desired = (qtyInCart || 0) + 1;
    if (Number.isFinite(available) && available > 0 && desired > available) {
      showLimit();
      return;
    }
    dispatch({ type: 'ADD_TO_CART', product, quantity: 1 });
  };
  const subtractFromCart = () => { if (!product) return; dispatch({ type: 'SUBTRACT_FROM_CART', product }); };
  const removeFromCart = () => { if (!product) return; dispatch({ type: 'REMOVE_FROM_CART', id: product.id }); };

  const qtyInCart = product ? getProductQuantity(cart, product.id) : 0;
  const availableStock = product ? Number(product.inventory ?? product.quantity ?? 0) : 0;
  const isOutOfStock = availableStock <= 0;
  const isMaxed = product ? (qtyInCart >= availableStock && availableStock > 0) : false;

  // Heuristic: determine unit weight (lbs) from common product fields or attributes
  const getUnitWeight = () => {
    if (!product) return 0;
    const candidates = [
      'weight', 'weight_lbs', 'shipping_weight', 'ship_weight', 'ship_weight_lbs', 'unit_weight'
    ];
    for (const k of candidates) {
      if (product[k] !== undefined && product[k] !== null) {
        const v = Number(product[k]);
        if (!Number.isNaN(v) && v > 0) return v;
      }
    }
    // Check attributes for weight-like entries
    if (Array.isArray(attributes)) {
      for (const a of attributes) {
        try {
          const name = (a.attribute_name || '').toString().toLowerCase();
          if (name.includes('weight')) {
            const val = a.value_number !== undefined && a.value_number !== null ? Number(a.value_number) : (a.value_text ? Number(String(a.value_text).replace(/[^0-9.]/g, '')) : NaN);
            if (!Number.isNaN(val) && val > 0) return val;
          }
        } catch (e) { /* ignore parse errors */ }
      }
    }
    return 0;
  };

  const unitWeight = getUnitWeight();
  const effectiveQty = Math.max(1, qtyInCart || 1);
  const totalWeightLbs = unitWeight * effectiveQty;

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}>Loading product…</div>;
  if (!product) return <div style={{ textAlign: 'center', padding: 24 }}>Product not found.</div>;

  return (
    <div className="product-detail-new" style={{ display: 'flex', maxWidth: 1100, margin: '2rem auto', padding: '1rem', background: '#fff', borderRadius: 8, gap: 32, alignItems: 'center' }}>
      <div className="product-detail-new__media" style={{ flex: '0 0 420px', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
        <div style={{ width: 360, height: 360, borderRadius: 8, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
          <SmartImage src={images[selectedImageIndex] || getImageUrl(product.image || '')} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>


        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {images.map((src, idx) => (
              <button key={src} onClick={() => setSelectedImageIndex(idx)} aria-label={`View image ${idx + 1}`} style={{ border: selectedImageIndex === idx ? '2px solid #111' : '1px solid #eee', padding: 0, background: '#fff', cursor: 'pointer', borderRadius: 6 }}>
                <img src={src} alt={`thumb-${idx + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', display: 'block', borderRadius: 6 }} />
              </button>
            ))}
          </div>
        )}
        {/* Desktop-only: render description, attributes and compatibility under the picture */}
  <div className="pd-side-sections pd-side-sections--desktop" style={{ width: '100%', marginTop: 12 }}>
                {/* divider between OEM and Part Attributes - always show on desktop side */}
        <div style={{ marginBottom: 12 }}>
          <div className="pd-part-divider" aria-hidden="true" style={{ height: 1, background: '#e6e6e6', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 12px 0' }}>
          <h3 style={{ margin: 0 }}>OEM Replacement</h3>
          <div style={{ flex: 1, height: 6, background: '#3b3b3b', borderRadius: 3, boxShadow: '0 4px 16px rgba(122,133,153,0.08)', marginLeft: 12 }} />
        </div>
        <div style={{ color: '#444', fontSize: '1rem' }}>
        {process.env.NODE_ENV !== 'production' && console.log('ProductDetailNew OEM product:', product)}
        {/* Primary OEM value */}
        <div style={{ marginBottom: 6 }}>
            {product.oem_pn ? (
            product.oem_pn
            ) : product.oem_part_number ? (
            product.oem_part_number
            ) : (
            <span style={{ color: '#888' }}>No OEM part number available.</span>
            )}
        </div>
        {/* Optional 'Replaces' row */}
        {product.replaces && (
            <div style={{ color: '#666', fontSize: '0.95rem' }}>
            <strong>Replaces:</strong> {product.replaces}
            </div>
        )}
        </div>
        {/* divider between OEM and Part Attributes - always show on desktop side */}
        <div style={{ marginBottom: 12 }}>
          <div className="pd-part-divider" aria-hidden="true" style={{ height: 1, background: '#e6e6e6', width: '100%' }} />
        </div>
          {/* description intentionally not duplicated here on desktop; rendered in content column */}
          <div className="pd-section" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 12px 0' }}>
              <h3 style={{ margin: 0 }}>Part Attributes</h3>
              <div style={{ flex: 1, height: 6, background: '#3b3b3b', borderRadius: 3, boxShadow: '0 4px 16px rgba(122,133,153,0.08)', marginLeft: 12 }} />
            </div>
            {attributes.length > 0 ? (
              <table className="compat-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {attributes.map((a, idx) => (
                    <tr key={a.attribute_name} style={{ borderBottom: idx < attributes.length - 1 ? '1px solid #f1f1f1' : 'none' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{a.attribute_name}</td>
                      <td style={{ padding: '8px 6px' }}>
                        {a.value_text || (a.value_number !== undefined && a.value_number !== null ? a.value_number : (a.value_bool === true ? 'Yes' : a.value_bool === false ? 'No' : ''))}
                        {a.unit ? ` ${a.unit}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: '#888' }}>No attributes available.</div>
            )}
          </div>

          <div className="pd-section">
            <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 12px 0' }}>
              <h3 style={{ margin: 0 }}>Machine Compatibility</h3>
              <div style={{ flex: 1, height: 6, background: '#3b3b3b', borderRadius: 3, boxShadow: '0 4px 16px rgba(122,133,153,0.08)', marginLeft: 12 }} />
            </div>
            {compatibility.length > 0 ? (
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
            ) : (
              <div style={{ color: '#888' }}>No compatibility data available.</div>
            )}
          </div>
        </div>
      </div>

      <div className="product-detail-new__content" style={{ flex: '1 1 auto', alignSelf: 'flex-start' }}>
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => navigate(-1) || navigate('/catalog')} style={{ background: 'transparent', border: '1px solid #e6e6e6', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>← Back</button>
        </div>
  <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{product.name || 'Product Title'}</h1>
        {product.sku && (
          <div style={{ marginTop: 6, color: '#666', fontWeight: 600 }}>{product.sku}</div>
        )}
        {product.part_number && (
          <div style={{ marginTop: 8, color: '#444', fontWeight: 600 }}>Part #: {product.part_number}</div>
        )}
        {/* decorative bar across the content column (replaces multiple thin dividers) */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 6, background: '#3b3b3b', borderRadius: 3, boxShadow: '0 4px 16px rgba(122,133,153,0.08)' }} />
        </div>
        {/* description placed under part number with extra spacing */}
        <div style={{ marginTop: 12 }}>
          <div className="pd-desc">
            <p className="pd-desc-text">{product.description || 'This is a brief, product description that highlights key features and uses.'}</p>
          </div>
        </div>
  <div className="pd-actions pd-actions--inline" style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>${Number(product.price || 0).toFixed(2)}</div>
          {qtyInCart > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e6e6e6', borderRadius: 6, overflow: 'hidden' }}>
                <button aria-label="Decrease quantity" onClick={subtractFromCart} style={{ padding: '8px 10px', border: 'none', background: '#fff', cursor: 'pointer' }}>−</button>
                <QuantityInput initialValue={qtyInCart} product={product} dispatch={dispatch} updateOnBlurOnly={false} showLimit={showLimit} />
                <button aria-label="Increase quantity" onClick={addToCart} style={{ padding: '8px 10px', border: 'none', background: isMaxed ? '#f7f7f7' : '#fff', cursor: 'pointer' }}>+</button>
              </div>
              <button onClick={removeFromCart} style={{ background: '#fff', border: '1px solid #ddd', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>Remove</button>
              </div>
              <LimitTooltip productId={product.id} style={{ marginLeft: 12 }} />
            </>
          ) : (
            <button
              onClick={addToCart}
              disabled={isOutOfStock}
              style={{
                background: isOutOfStock ? '#f3f3f3' : 'var(--gallery-btn-bg, var(--brand))',
                color: isOutOfStock ? '#999' : 'var(--gallery-btn-text, #fff)',
                border: 'none',
                padding: '12px 20px',
                borderRadius: 6,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer'
              }}
            >
              {isOutOfStock ? 'Out of stock' : 'Add to cart'}
            </button>
          )}
  </div>

        {/* Freight handling: if totalWeightLbs > 100, show a direct 'Proceed to checkout' CTA instead of freight quote */}
        {totalWeightLbs > 100 ? (
          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => {
                // Ensure product is in cart then navigate to checkout
                if (qtyInCart <= 0) dispatch({ type: 'ADD_TO_CART', product, quantity: 1 });
                navigate('/checkout');
              }}
              style={{ background: '#1f8f5a', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: 8, cursor: 'pointer' }}
            >
              Proceed to Checkout (Freight)
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <Link to={`/freight-quote?sku=${encodeURIComponent(product.sku || '')}`} style={{ textDecoration: 'none' }}>
              <button style={{ background: '#fff', color: '#111', border: '1px solid #ddd', padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>Request Freight Quote</button>
            </Link>
          </div>
        )}

        {availableStock <= 20 && availableStock > 0 && (
          <div style={{ marginTop: 8, color: 'orange', fontWeight: 700 }}>Low Stock: {availableStock} Available</div>
        )}

  {/* description displayed under part number (duplicate removed) */}
        <div className="pd-section">
          <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 12px 0' }}>
            <h3 style={{ margin: 0 }}>Part Attributes</h3>
            <div style={{ flex: 1, height: 6, background: '#3b3b3b', borderRadius: 3, boxShadow: '0 4px 16px rgba(122,133,153,0.08)', marginLeft: 12 }} />
          </div>
          {attributes.length > 0 ? (
            <table className="compat-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {attributes.map((a, idx) => (
                  <tr key={a.attribute_name} style={{ borderBottom: idx < attributes.length - 1 ? '1px solid #f1f1f1' : 'none' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 700 }}>{a.attribute_name}</td>
                    <td style={{ padding: '8px 6px' }}>
                      {a.value_text || (a.value_number !== undefined && a.value_number !== null ? a.value_number : (a.value_bool === true ? 'Yes' : a.value_bool === false ? 'No' : ''))}
                      {a.unit ? ` ${a.unit}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: '#888' }}>No attributes available.</div>
          )}
        </div>

        {/* spacing between Part Attributes and Machine Compatibility when both exist */}
        {(attributes && attributes.length > 0 && compatibility && compatibility.length > 0) && (
          <div style={{ marginTop: 12, marginBottom: 12 }} />
        )}
        <div className="pd-section pd-compat-top">
          <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 12px 0' }}>
            <h3 style={{ margin: 0 }}>Machine Compatibility</h3>
            <div style={{ flex: 1, height: 6, background: '#3b3b3b', borderRadius: 3, boxShadow: '0 4px 16px rgba(122,133,153,0.08)', marginLeft: 12 }} />
          </div>
          {compatibility.length > 0 ? (
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
          ) : (
            <div style={{ color: '#888' }}>No compatibility data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
