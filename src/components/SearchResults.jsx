import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/simple-gallery.css";
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';
import { useCart, getProductQuantity } from "./CartContext.jsx";

export default function SearchResults() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const query = params.get("q") || "";
  const category = params.get("category") || '';
  const subcategory = params.get("subcategory") || '';
  // URL compatibility params (may be set by navbar Browse-by-Machine)
  const urlManufacturer = params.get('manufacturer') || '';
  const urlMachineType = params.get('machine_type') || '';
  const urlModel = params.get('model') || '';

  const [products, setProducts] = useState([]);
  const [compatOptions, setCompatOptions] = useState({ manufacturers: [], machine_types: [], models: [] });
  const [compatibleSkus, setCompatibleSkus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & pagination state (match SimpleGallery behavior)
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState(query);
  const [manufacturer, setManufacturer] = useState('');
  const [machineType, setMachineType] = useState('');
  const [model, setModel] = useState('');
  const [sort, setSort] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [perPage, setPerPage] = useState(24);
  const [page, setPage] = useState(1);
  const { dispatch, cart } = useCart();

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) setProducts(data);
        else if (data && Array.isArray(data.products)) setProducts(data.products);
        else setProducts([]);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/get-compatibility-options');
        if (!res.ok) return;
        const json = await res.json();
        if (json) setCompatOptions({ manufacturers: json.manufacturers || [], machine_types: json.machine_types || [], models: json.models || [] });
      } catch (e) {}
    })();
    return () => controller.abort();
  }, []);

  // Keep filters in sync with URL params (so navbar Browse-by-Machine works)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const m = p.get('manufacturer') || '';
    const mt = p.get('machine_type') || '';
    const md = p.get('model') || '';
    setManufacturer(m);
    setMachineType(mt);
    setModel(md);
    // reset pagination when filters change via URL
    setPage(1);
    // update search text if q param present
    const q = p.get('q') || '';
    setSearchText(q);
  }, [location.search]);

  // When manufacturer/machineType/model change, prefer server-provided list of matching SKUs
  useEffect(() => {
    const controller = new AbortController();
    const manuf = manufacturer || '';
    const mtype = machineType || '';
    const mdl = model || '';

    // If no filters selected, clear SKU-based filter so we fall back to product fields
    if (!manuf && !mtype && !mdl) {
      setCompatibleSkus(null);
      return () => controller.abort();
    }

    (async () => {
      try {
        const params = new URLSearchParams();
        if (manuf) params.append('manufacturer', manuf);
        if (mtype) params.append('machine_type', mtype);
        if (mdl) params.append('model', mdl);
        const url = '/.netlify/functions/get-compatible-skus?' + params.toString();
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          setCompatibleSkus(null);
          return;
        }
        const json = await res.json();
        if (json && Array.isArray(json.skus)) {
          setCompatibleSkus(json.skus.map(s => String(s || '').trim().toLowerCase()));
        } else setCompatibleSkus([]);
      } catch (e) {
        if (e.name !== 'AbortError') setCompatibleSkus(null);
      }
    })();

    return () => controller.abort();
  }, [manufacturer, machineType, model]);

  const getImageUrl = (img) => resolveImageUrl(img);

  const uniqueOptions = (key) => {
    const seen = new Map();
    for (const p of products) {
      if (!p) continue;
      let v = p[key];
      if (v == null) continue;
      if (typeof v === 'string') v = v.trim();
      else v = String(v).trim();
      if (!v) continue;
      const norm = v.toLowerCase();
      if (!seen.has(norm)) seen.set(norm, v);
    }
    return Array.from(seen.values()).sort((a,b) => a.localeCompare(b));
  };

  // Robust image picker: prefer `image`, then first item of `images`, `gallery`, `photos`, or nested objects with src/url
  const pickImage = (prod) => {
    if (!prod) return null;
    if (typeof prod.image === 'string' && prod.image.trim()) return prod.image.trim();
    if (Array.isArray(prod.images) && prod.images.length && typeof prod.images[0] === 'string') return prod.images[0];
    if (Array.isArray(prod.gallery) && prod.gallery.length && typeof prod.gallery[0] === 'string') return prod.gallery[0];
    if (Array.isArray(prod.photos) && prod.photos.length && typeof prod.photos[0] === 'string') return prod.photos[0];
    const arrCandidates = ['images', 'gallery', 'photos'];
    for (const key of arrCandidates) {
      if (Array.isArray(prod[key]) && prod[key].length) {
        const first = prod[key][0];
        if (first && typeof first === 'object') {
          if (first.src) return first.src;
          if (first.url) return first.url;
        }
      }
    }
    return null;
  };

  // use shared getImageUrl helper via getImageUrl()

  // Build filtered list (no category/subcategory filtering per request)
  const filteredAll = products
  // Filter by category/subcategory when provided in URL
  .filter(p => !category || (p.category && String(p.category) === String(category)))
  .filter(p => !subcategory || (p.subcategory && String(p.subcategory) === String(subcategory)))
    .filter(p => p.website_visible === true)
    .filter(p => {
      // If server returned a SKU list (array), use it as the authoritative filter
      if (Array.isArray(compatibleSkus)) {
        if (compatibleSkus.length === 0) return false;
  const key = (p.sku || p.part_number || p.id);
  if (key == null) return false;
  return compatibleSkus.includes(String(key).trim().toLowerCase());
      }
      // Fallback: filter by product fields when SKU list not available
      if (manufacturer && p.manufacturer !== manufacturer) return false;
      if (machineType && p.machine_type !== machineType) return false;
      if (model && p.model !== model) return false;
      return true;
    })
    .filter(p => !inStockOnly || (Number(p.inventory ?? p.quantity ?? 0) > 0))
    .filter(p => {
      if (searchText && searchText.trim()) {
  const q = searchText.toLowerCase();
  return (p.name && p.name.toLowerCase().includes(q)) ||
         (p.part_number && String(p.part_number).toLowerCase().includes(q)) ||
         (p.sku && String(p.sku).toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sort === 'price-desc') return (b.price || 0) - (a.price || 0);
      return 0;
    });

  const total = filteredAll.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pageItems = filteredAll.slice(start, end);

  return (
    <div className="simple-gallery-root">
      <Navbar />
      <div className="simple-gallery-header">
        <h2 className="simple-gallery-title">Search Results</h2>
        <div className="simple-gallery-perpage">
          <label className="filter-label" htmlFor="perPageSelect">Show:</label>
          <select id="perPageSelect" className="filter-select" value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}>
            {[24,48,72,96].map(n => <option key={n} value={n}>{n} per page</option>)}
          </select>
        </div>
        <button
          className="simple-gallery-filter-toggle"
          aria-label={filterOpen ? 'Hide Filters' : 'Show Filters'}
          aria-pressed={filterOpen}
          aria-controls="gallery-filter-pane"
          onClick={() => setFilterOpen(v => !v)}
        >
          Filter
        </button>
      </div>

      <hr className="simple-gallery-divider" />

      <div className="simple-gallery-layout">
        <aside id="gallery-filter-pane" className={`simple-gallery-filter-pane${!filterOpen ? ' simple-gallery-filter-pane--closed' : ''}`} aria-hidden={!filterOpen}>
          <div className="simple-gallery-filter-header" onClick={() => setFilterOpen(v => !v)}>
            Filters {filterOpen ? '▼' : '▶'}
          </div>
          <div className="simple-gallery-filter-content">
            <input type="text" className="search-input" placeholder="Search..." value={searchText} onChange={e => setSearchText(e.target.value)} />

            <div className="filter-section">
              <label className="filter-label">Manufacturer</label>
              <select value={manufacturer} onChange={e => setManufacturer(e.target.value)} className="filter-select">
                <option value="">All Manufacturers</option>
                {(compatOptions.manufacturers && compatOptions.manufacturers.length > 0 ? compatOptions.manufacturers : uniqueOptions('manufacturer')).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label">Machine Type</label>
              <select value={machineType} onChange={e => setMachineType(e.target.value)} className="filter-select">
                <option value="">All Machine Types</option>
                {(compatOptions.machine_types && compatOptions.machine_types.length > 0 ? compatOptions.machine_types : uniqueOptions('machine_type')).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label">Model</label>
              <select value={model} onChange={e => setModel(e.target.value)} className="filter-select">
                <option value="">All Models</option>
                {(compatOptions.models && compatOptions.models.length > 0 ? compatOptions.models : uniqueOptions('model')).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label">Sort by</label>
              <select value={sort} onChange={e => setSort(e.target.value)} className="filter-select">
                <option value="">None</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label"><input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} /> In-stock only</label>
            </div>
          </div>
        </aside>

        <div className="simple-gallery-grid" style={{ marginLeft: 0 }}>
          {loading ? <div>Loading...</div> : error ? <div>Error: {error}</div> : (
            pageItems.length === 0 ? <div>No results found.</div> : pageItems.map(product => (
                <Link key={product.id} to={`/product/${product.id}`} className="simple-gallery-card" style={{ textDecoration: 'none' }}>
                  <div className="simple-gallery-image-wrapper">
                    <img
                      src={getImageUrl(pickImage(product) || product.image)}
                      alt={product.name}
                      loading="lazy"
                      onError={e => { console.log('Image error:', pickImage(product) || product.image, getImageUrl(pickImage(product) || product.image)); e.currentTarget.src = '/logo.png'; }}
                    />
                  </div>
                  {product.sku && (
                    <div className="simple-gallery-sku">{product.sku}</div>
                  )}
                  <h3 className="simple-gallery-card-title" title={product.name}>{product.name}</h3>
                  <div className="simple-gallery-part-number">{product.part_number}</div>
                  <div className="simple-gallery-card-price">{(() => {
                    const price = Number(product.price);
                    if (!isNaN(price)) return <span className="price-current">${price.toFixed(2)}</span>;
                    return <span className="price-current">Price N/A</span>;
                  })()}</div>
                  <div className="simple-gallery-card-actions" role="group" aria-label="Product Actions">
                    {(() => {
                      const qty = getProductQuantity(cart, product.id);
                      const availableStock = Number(product.inventory ?? product.quantity ?? 0);
                      if (qty > 0) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f6f6f6', borderRadius: 8, padding: '0.2rem 0.5rem' }}>
                            <button
                              style={{
                                background: '#fff',
                                color: '#333',
                                border: '1px solid #d6d6d6',
                                borderRadius: 6,
                                width: 32,
                                height: 32,
                                fontWeight: 700,
                                fontSize: '1.05rem',
                                cursor: 'pointer',
                              }}
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); dispatch({ type: 'SUBTRACT_FROM_CART', product }); }}
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, color: '#222', fontSize: '1rem' }}>{qty}</span>
                            <button
                              style={{
                                background: '#fff',
                                color: '#333',
                                border: '1px solid #d6d6d6',
                                borderRadius: 6,
                                width: 32,
                                height: 32,
                                fontWeight: 700,
                                fontSize: '1.05rem',
                                cursor: 'pointer',
                              }}
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); dispatch({ type: 'ADD_TO_CART', product }); }}
                              aria-label="Increase quantity"
                              disabled={qty >= availableStock}
                            >
                              +
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button
                          className="simple-gallery-btn primary"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); dispatch({ type: "ADD_TO_CART", product }); }}
                          title="Add to Cart"
                          aria-label={availableStock === 0 ? 'Out of Stock' : 'Add to Cart'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            opacity: availableStock === 0 ? 0.5 : 1,
                            pointerEvents: availableStock === 0 ? 'none' : 'auto',
                            position: 'relative',
                          }}
                          disabled={availableStock === 0}
                        >
                            <span className="add-to-cart-label" style={{ fontWeight: 800, fontSize: '0.98rem' }}>Add to Cart</span>
                        </button>
                      );
                    })()}
                  </div>
                </Link>
              ))
          )}

          {/* Pagination controls */}
          <div className="simple-gallery-pagination">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '2rem auto 0 auto', gap: 12, width: '100%' }}>
              {page > 1 && <button className="simple-gallery-btn secondary" onClick={() => setPage(page - 1)}>&lt; Prev</button>}
              <span style={{ color: '#c3c3c3', fontWeight: 500, fontSize: '1.05rem', margin: '0 1rem' }}>Page {page} of {Math.max(1, Math.ceil(total / perPage))}</span>
              {end < total && <button className="simple-gallery-btn secondary" onClick={() => setPage(page + 1)}>Next &gt;</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
