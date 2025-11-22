import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import getImageUrl from '../utils/getImageUrl.js';
import SmartImage from './SmartImage.jsx';
import { useCart, getProductQuantity } from './CartContext.jsx';

export default function ProductDetailNew() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attributes, setAttributes] = useState([]);
  const [compatibility, setCompatibility] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { dispatch, cart } = useCart();

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

  const addToCart = () => { if (!product) return; dispatch({ type: 'ADD_TO_CART', product, quantity: 1 }); };
  const subtractFromCart = () => { if (!product) return; dispatch({ type: 'SUBTRACT_FROM_CART', product }); };
  const removeFromCart = () => { if (!product) return; dispatch({ type: 'REMOVE_FROM_CART', id: product.id }); };

  const qtyInCart = product ? getProductQuantity(cart, product.id) : 0;
  const availableStock = product ? Number(product.inventory ?? product.quantity ?? 0) : 0;
  const isOutOfStock = availableStock <= 0;
  const isMaxed = product ? (qtyInCart >= availableStock && availableStock > 0) : false;

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}>Loading product…</div>;
  if (!product) return <div style={{ textAlign: 'center', padding: 24 }}>Product not found.</div>;

  return (
  <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '1rem', display: 'flex', gap: 32, alignItems: 'flex-start', background: '#fff', borderRadius: 8 }}>
      <div style={{ flex: '0 0 420px', display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: 12 }}>
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
      </div>

      <div style={{ flex: '1 1 auto' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>{product.name || 'Product Title'}</h1>
        <p style={{ color: '#666', marginTop: 8 }}>{product.description || 'This is a brief, product description that highlights key features and uses.'}</p>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>${Number(product.price || 0).toFixed(2)}</div>
          {qtyInCart > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e6e6e6', borderRadius: 6, overflow: 'hidden' }}>
                <button aria-label="Decrease quantity" onClick={subtractFromCart} style={{ padding: '8px 10px', border: 'none', background: '#fff', cursor: 'pointer' }}>−</button>
                <div style={{ padding: '8px 12px', minWidth: 44, textAlign: 'center', fontWeight: 600 }}>{qtyInCart}</div>
                <button aria-label="Increase quantity" onClick={addToCart} disabled={isMaxed} style={{ padding: '8px 10px', border: 'none', background: isMaxed ? '#f7f7f7' : '#fff', cursor: isMaxed ? 'not-allowed' : 'pointer' }}>+</button>
              </div>
              <button onClick={removeFromCart} style={{ background: '#fff', border: '1px solid #ddd', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>Remove</button>
            </div>
          ) : (
            <button onClick={addToCart} disabled={isOutOfStock} style={{ background: isOutOfStock ? '#f3f3f3' : '#111', color: isOutOfStock ? '#999' : '#fff', border: 'none', padding: '12px 20px', borderRadius: 6, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}>{isOutOfStock ? 'Out of stock' : 'Add to cart'}</button>
          )}
        </div>

        {availableStock <= 20 && availableStock > 0 && (
          <div style={{ marginTop: 8, color: 'orange', fontWeight: 700 }}>Low Stock: {availableStock} Available</div>
        )}

        <div style={{ marginTop: 28 }}>
          <h3 style={{ marginBottom: 8 }}>Part Attributes</h3>
          {attributes.length > 0 ? (
            <ul>
              {attributes.map(a => (
                <li key={a.attribute_name}><strong>{a.attribute_name}:</strong> {a.value_text || a.value_number || (a.value_bool ? 'Yes' : 'No')}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#888' }}>No attributes available.</div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Machine Compatibility</h3>
          {compatibility.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
