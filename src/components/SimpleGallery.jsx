import React, { useEffect, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCart, getProductQuantity } from "./CartContext.jsx";
import QuantityInput from './QuantityInput.jsx';
import LimitTooltip from './LimitTooltip.jsx';
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/simple-gallery.css";
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';

export default function SimpleGallery() {
  const isMobile = window.matchMedia('(max-width: 700px)').matches;
  const [products, setProducts] = useState([]);
  const [compatOptions, setCompatOptions] = useState({ manufacturers: [], machine_types: [], models: [] });
  const [machineTypesMap, setMachineTypesMap] = useState({}); // nested mapping { manufacturer: { machineType: [models...] } }
  const [machineTypesList, setMachineTypesList] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [compatibleSkus, setCompatibleSkus] = useState(null); // null = no server filter applied
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Filter pane is hidden by default on all devices (mobile and desktop)
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Filter states
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [machineType, setMachineType] = useState('');
  const [model, setModel] = useState('');
  const [sort, setSort] = useState('');
  

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {

          const res = await fetch('/.netlify/functions/get-data', { signal: controller.signal });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        // Normalize API shapes: some endpoints return an array, others return { products: [...] }
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.products)) list = data.products;
        else if (data && Array.isArray(data.items)) list = data.items;
        else if (data && typeof data === 'object') {
          // attempt to find an array property
          const maybe = Object.values(data).find(v => Array.isArray(v));
          if (Array.isArray(maybe)) list = maybe;
        }
        setProducts(list);
        // build nested mapping from product rows (fallback when compatibility endpoint is sparse)
        try {
          const read = (obj, ...keys) => {
            for (const k of keys) {
              if (!obj) continue;
              const v = obj[k];
              if (v !== undefined && v !== null) return v;
            }
            return undefined;
          };
          const manuMap = new Map();
          for (const p of list) {
            const manu = String((read(p, 'manufacturer', 'manufacturer_name', 'make') || '')).trim();
            const mtype = String((read(p, 'machine_type', 'machineType', 'machine') || '')).trim();
            const mdl = String((read(p, 'model', 'models', 'model_number') || '')).trim();
            if (!manu) continue;
            if (!manuMap.has(manu)) manuMap.set(manu, new Map());
            const mtMap = manuMap.get(manu);
            if (mtype) {
              if (!mtMap.has(mtype)) mtMap.set(mtype, new Set());
              if (mdl) mtMap.get(mtype).add(mdl);
            }
          }
          const nested = {};
          for (const [m, mtMap] of manuMap.entries()) {
            nested[m] = {};
            for (const [mt, models] of mtMap.entries()) nested[m][mt] = Array.from(models).sort((a,b)=>a.localeCompare(b));
          }
          setMachineTypesMap(nested);
          // populate flat lists as fallback
          const flatMTypes = Array.from(new Set(list.map(p => String((read(p, 'machine_type', 'machineType', 'machine') || '')).trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
          const flatModels = Array.from(new Set(list.map(p => String((read(p, 'model', 'models', 'model_number') || '')).trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
          setMachineTypesList(flatMTypes);
          setModelsList(flatModels);
        } catch (e) { /* ignore mapping errors */ }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setError(error.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    // fetch compatibility options (non-blocking)
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/get-compatibility-options');
        if (!res.ok) return;
        const json = await res.json();
        if (json) setCompatOptions({ manufacturers: json.manufacturers || [], machine_types: json.machine_types || [], models: json.models || [] });
      } catch (e) {
        // ignore
      }
    })();
    return () => controller.abort();
  }, []);

  // When manufacturer changes, populate machine types and models for that manufacturer
  useEffect(() => {
    try {
      if (!manufacturer) {
        // reset to global lists
        setMachineTypesList(compatOptions.machine_types && compatOptions.machine_types.length ? compatOptions.machine_types : machineTypesList);
        setModelsList(compatOptions.models && compatOptions.models.length ? compatOptions.models : modelsList);
        setMachineType(''); setModel('');
        return;
      }
      const nested = machineTypesMap[manufacturer] || {};
      const mts = Object.keys(nested).sort((a,b)=>a.localeCompare(b));
      if (mts.length) setMachineTypesList(mts);
      // aggregate all models under this manufacturer
      const allModels = new Set();
      for (const arr of Object.values(nested)) for (const m of arr) allModels.add(m);
      if (allModels.size) setModelsList(Array.from(allModels).sort((a,b)=>a.localeCompare(b)));
      else setModelsList([]);
      setMachineType(''); setModel('');
    } catch (e) {}
  }, [manufacturer, machineTypesMap, compatOptions]);

  // When machineType changes, refine models list
  useEffect(() => {
    try {
      if (!machineType) { setModel(''); return; }
      if (manufacturer) {
        const modelsFor = (machineTypesMap[manufacturer] || {})[machineType] || [];
        setModelsList(modelsFor);
      } else {
        // aggregate across manufacturers
        const setModels = new Set();
        for (const manu of Object.keys(machineTypesMap || {})) {
          const arr = (machineTypesMap[manu] || {})[machineType] || [];
          for (const m of arr) setModels.add(m);
        }
        setModelsList(Array.from(setModels).sort((a,b)=>a.localeCompare(b)));
      }
      setModel('');
    } catch (e) { setModelsList([]); }
  }, [machineType, manufacturer, machineTypesMap]);

  // Fetch compatible SKUs when compatibility filters change
  useEffect(() => {
    // If no filters selected, clear server-side SKU filter (client will use product fields)
    if (!manufacturer && !machineType && !model) {
      setCompatibleSkus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (manufacturer) params.set('manufacturer', manufacturer);
        if (machineType) params.set('machine_type', machineType);
        if (model) params.set('model', model);
        const res = await fetch('/.netlify/functions/get-compatible-skus?' + params.toString());
        if (!res.ok) { setCompatibleSkus(null); return; }
        const json = await res.json();
        // If server indicates no DB connection (skus === null), fall back to product-field filtering
        if (!cancelled) {
          if (json && json.skus === null) {
            setCompatibleSkus(null);
          } else {
            const skus = Array.isArray(json.skus) ? json.skus.map(s => String(s || '').trim().toLowerCase()) : [];
            setCompatibleSkus(skus);
          }
        }
      } catch (e) {
        setCompatibleSkus(null);
      }
    })();
    return () => { cancelled = true; };
  }, [manufacturer, machineType, model]);

  // Pagination state
  const [perPage, setPerPage] = useState(24);
  const [page, setPage] = useState(1);
  const { dispatch, cart, limitMap, showLimit } = useCart();
  const getImageUrl = (img) => resolveImageUrl(img);
  // Helper to produce normalized, deduplicated option lists from product fields
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
  return (
  <div className="simple-gallery-root" role="main">
      <Navbar />
      <div className="simple-gallery-header">
  <h2 className="simple-gallery-title distressed">Agex Parts</h2>
        <div className="simple-gallery-perpage">
          <label className="filter-label" htmlFor="perPageSelect">Show:</label>
          <select
            id="perPageSelect"
            className="filter-select"
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[24, 48, 72, 96].map(n => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>
        {/* Filter icon for both mobile and desktop, fixed to left and moves down as you scroll */}
        <button
          className="simple-gallery-filter-toggle"
          aria-label={filterOpen ? 'Hide Filters' : 'Show Filters'}
          aria-pressed={filterOpen}
          aria-controls="gallery-filter-pane"
          onClick={() => setFilterOpen((v) => !v)}
          style={{
            position: 'fixed',
            left: 0,
            top: 100,
            zIndex: 100,
            background: '#3a3939',
            color: '#f3f3f3',
            border: 'none',
            borderRadius: '0 8px 8px 0',
            padding: '0.7rem 0.9rem',
            fontWeight: 700,
            fontSize: '1.1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
            cursor: 'pointer',
            transition: 'top 0.3s',
            display: 'block',
          }}
          id="filter-toggle-btn"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>Filter</span>
          </span>
        </button>
      </div>
      <hr className="simple-gallery-divider" />
      <div className="simple-gallery-layout" style={{ position: 'relative' }}>
        {/* Expand/collapse button only on mobile, handled by CSS */}
    {/* Removed old toggle button, now handled above with icon */}
        {/* Slide-in filter pane */}
        <aside
          id="gallery-filter-pane"
          className={`simple-gallery-filter-pane${!filterOpen ? ' simple-gallery-filter-pane--closed' : ''}`}
          aria-label="Product Filters"
          aria-hidden={!filterOpen}
          tabIndex={filterOpen ? 0 : -1}
          style={{
            position: 'fixed',
            left: filterOpen ? 0 : -340,
            top: 156,
            zIndex: 99,
            minWidth: 260,
            maxWidth: 340,
            height: 'fit-content',
            marginTop: 0,
            transition: 'top 0.3s, left 0.3s',
          }}
        >
          <div className="simple-gallery-filter-header" style={{ cursor: 'pointer' }} onClick={() => setFilterOpen((v) => !v)}>
            Filters {filterOpen ? '▼' : '▶'}
          </div>
          <div className="simple-gallery-filter-content">
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              list="product-names-list"
            />
            <datalist id="product-names-list">
              {[...new Set(products.map(p => p.name).filter(Boolean))].map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {/* Category and Sub-Category filters removed per request */}
            <div className="filter-section">
              <label className="filter-label">Manufacturer</label>
                <select value={manufacturer} onChange={e => setManufacturer(e.target.value)} className="filter-select">
                  <option value="">All Manufacturers</option>
                  {(compatOptions.manufacturers && compatOptions.manufacturers.length > 0 ? compatOptions.manufacturers : [...new Set(products.map(p => p.manufacturer).filter(Boolean))]).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </div>
            <div className="filter-section">
              <label className="filter-label">Machine Type</label>
              <select value={machineType} onChange={e => setMachineType(e.target.value)} className="filter-select">
                <option value="">All Machine Types</option>
                {(compatOptions.machine_types && compatOptions.machine_types.length > 0 ? compatOptions.machine_types : uniqueOptions('machine_type')).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="filter-section">
              <label className="filter-label">Model</label>
              <select value={model} onChange={e => setModel(e.target.value)} className="filter-select">
                <option value="">All Models</option>
                {(compatOptions.models && compatOptions.models.length > 0 ? compatOptions.models : uniqueOptions('model')).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
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
          </div>
        </aside>
      {/* Main grid, with left margin for filter pane if open */}
      <div
        className="simple-gallery-grid"
        style={{
          marginLeft: '',
          transition: 'none',
        }}
      >
          {(() => {
              const filtered = products
              .filter(product => product.website_visible === true)
              // If server returned compatible SKUs, filter by those SKUs (only show linked products)
              .filter(product => {
                if (Array.isArray(compatibleSkus)) {
                  // if compatibleSkus is empty array, no products match
                  if (!compatibleSkus.length) return false;
                  const key = product.sku || product.part_number || product.id;
                  if (key == null) return false;
                  return compatibleSkus.includes(String(key).trim().toLowerCase());
                }
                // fallback to original product-field filtering when no server filter
                if (!manufacturer || product.manufacturer === manufacturer) return true;
                return false;
              })
              .filter(product => {
                if (Array.isArray(compatibleSkus)) return true; // already filtered by SKU
                return !machineType || product.machine_type === machineType;
              })
              .filter(product => {
                if (Array.isArray(compatibleSkus)) return true;
                return !model || product.model === model;
              })
              .filter(product => !inStockOnly || product.quantity > 0)
              .filter(product => {
                if (!searchText.trim()) return true;
                const lower = searchText.toLowerCase();
                return Object.values(product).some(val =>
                  typeof val === 'string' && val.toLowerCase().includes(lower)
                );
              })
              .sort((a, b) => {
                if (sort === 'price-asc') return (a.price || 0) - (b.price || 0);
                if (sort === 'price-desc') return (b.price || 0) - (a.price || 0);
                return 0;
              });
            const start = (page - 1) * perPage;
            const end = start + perPage;
            return filtered.slice(start, end).map((product) => (
            <Link key={product.id} to={`/product/${product.id}`} className="simple-gallery-card" style={{ textDecoration: 'none' }}>
              <div className="simple-gallery-image-wrapper">
                <img 
                  src={getImageUrl(product.image)} 
                  alt={product.name} 
                  loading="lazy"
                  onError={e => { console.log('Image error:', product.image, getImageUrl(product.image)); e.currentTarget.src = '/logo.png'; }}
                />
              </div>
              {product.sku && (
                <div className="simple-gallery-sku">{product.sku}</div>
              )}
              <h3 className="simple-gallery-card-title" title={product.name}>{product.name}</h3>
              <div className="simple-gallery-part-number">{product.part_number}</div>
              <div className="simple-gallery-card-price" style={{ margin: '8px 0 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
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
                        <span className="price-original">${price.toFixed(2)}</span>
                        <span className="price-current">${salePrice}</span>
                      </>
                    );
                  } else if (!isNaN(price)) {
                    return <span className="price-current">${price.toFixed(2)}</span>;
                  } else {
                    return <span className="price-current">Price N/A</span>;
                  }
                })()}
              </div>
                  <div className="simple-gallery-card-actions" role="group" aria-label="Product Actions">
                    {(() => {
                      const qty = getProductQuantity(cart, product.id);
                      const availableStock = Number(product.inventory ?? product.quantity ?? 0);
                      if (qty > 0) {
                        return (
                          <>
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
                              <QuantityInput initialValue={qty} product={product} dispatch={dispatch} updateOnBlurOnly={true} showLimit={(id) => { /* gallery uses no tooltip */ }} />
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
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); const desired = (qty || 0) + 1; const available = Number(product.inventory ?? product.quantity ?? 0); if (Number.isFinite(available) && available > 0 && desired > available) { showLimit(product.id); return; } dispatch({ type: 'ADD_TO_CART', product }); }}
                                aria-label="Increase quantity"
                                disabled={qty >= availableStock}
                              >
                                +
                              </button>
                            </div>
                            <LimitTooltip productId={product.id} />
                          </>
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
            ));
          })()}
        {/* Pagination controls - compact */}
  <div className="simple-gallery-pagination">
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '1.2rem auto 0 auto', gap: 8, width: '100%' }}>
      {(() => {
        const totalMatching = products
          .filter(product => product.website_visible === true)
          .filter(product => !manufacturer || product.manufacturer === manufacturer)
          .filter(product => !machineType || product.machine_type === machineType)
          .filter(product => !model || product.model === model)
          .filter(product => !inStockOnly || product.quantity > 0)
          .filter(product => {
            if (!searchText.trim()) return true;
            const lower = searchText.toLowerCase();
            return Object.values(product).some(val => typeof val === 'string' && val.toLowerCase().includes(lower));
          }).length;
        const totalPages = Math.max(1, Math.ceil(totalMatching / perPage));
        const hasPrev = page > 1;
        const hasNext = page < totalPages;
        const btnStyle = { border: '1px solid #e6e6e6', background: '#fff', padding: '4px 6px', borderRadius: 4, cursor: 'pointer', minWidth: 26, height: 26, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
        return (
          <>
            <button aria-label="Previous page" onClick={() => hasPrev && setPage(page - 1)} disabled={!hasPrev} style={{ ...btnStyle, opacity: hasPrev ? 1 : 0.35 }}>&lt;</button>
            <div style={{ padding: '0 6px', color: '#555', fontWeight: 600, minWidth: 48, textAlign: 'center' }}>{page} / {totalPages}</div>
            <button aria-label="Next page" onClick={() => hasNext && setPage(page + 1)} disabled={!hasNext} style={{ ...btnStyle, opacity: hasNext ? 1 : 0.35 }}>&gt;</button>
          </>
        );
      })()}
    </div>
  </div>
      </div>
    </div>
    </div>);}
