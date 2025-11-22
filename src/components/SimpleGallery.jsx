import React, { useEffect, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCart, getProductQuantity } from "./CartContext.jsx";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/simple-gallery.css";
import getImageUrl from '../utils/getImageUrl.js';
import SmartImage from './SmartImage.jsx';

export default function SimpleGallery() {
  const isMobile = window.matchMedia('(max-width: 700px)').matches;
  const [products, setProducts] = useState([]);
  const [compatibility, setCompatibility] = useState([]);
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
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {

          const res = await fetch('/.netlify/functions/get-data', { signal: controller.signal });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        // Support prior shape (array) and new shape { products, compatibility }
        if (Array.isArray(data)) {
          setProducts(data);
          setCompatibility([]);
        } else if (data && Array.isArray(data.products)) {
          setProducts(data.products);
          setCompatibility(Array.isArray(data.compatibility) ? data.compatibility : []);
          // set compatibility links if provided
          if (Array.isArray(data.compat_links)) {
            setCompatLinks(data.compat_links);
          } else {
            setCompatLinks([]);
          }
        } else {
          setProducts([]);
          setCompatibility([]);
          setCompatLinks([]);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setError(error.message + (error.response ? ' ' + JSON.stringify(error.response) : ''));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, []);

  // Pagination state
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const { dispatch, cart } = useCart();
  const [compatLinks, setCompatLinks] = useState([]);
  
  // Robust image error handler with retries for common issues (case, origin, relative)
  const handleImgError = (e) => {
    const img = e.currentTarget;
    const attempts = Number(img.dataset.attempts || 0);
    img.dataset.attempts = attempts + 1;
    const src = img.getAttribute('src') || '';
    // Normalize to path relative to origin
    const path = src.startsWith(window.location.origin) ? src.slice(window.location.origin.length) : src;
    const filename = path.split('/').pop() || '';

    if (attempts === 0) {
      // Try lowercase filename (case-sensitive servers)
      const lower = filename.toLowerCase();
      if (lower !== filename) {
        const candidate = path.replace(new RegExp(filename + '$'), lower);
        if (/^https?:\/\//i.test(candidate) || /^\/\//.test(candidate) || candidate.startsWith('/')) {
          img.src = candidate;
        } else {
          img.src = `/${candidate}`;
        }
        return;
      }
    }
    if (attempts === 1) {
      // Try absolute origin-prefixed URL
      if (path && path.startsWith('/')) {
        img.src = window.location.origin + path;
        return;
      }
    }
    if (attempts === 2) {
      // Try without leading slash (relative)
      const noSlash = path.startsWith('/') ? path.slice(1) : path;
      img.src = noSlash || '/logo.png';
      return;
    }
    // Final fallback
    img.src = '/logo.png';
  };
  return (
  <div className="simple-gallery-root" role="main">
      <div className="simple-gallery-header">
  <h2 className="simple-gallery-title distressed">Agex Parts</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          // On mobile we rely on CSS (transform + fixed full-height + overflow-y) so avoid inline positioning
          style={isMobile ? {} : {
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
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0 0.5rem 0' }}>
              <button
                title="Clear filters"
                aria-label="Clear filters"
                onClick={() => {
                  setManufacturer('');
                  setMachineType('');
                  setModel('');
                  setCategory('');
                  setSubCategory('');
                  setSearchText('');
                  setInStockOnly(false);
                  setSort('');
                  setPage(1);
                  setFilterOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#444',
                  cursor: 'pointer',
                  padding: '0.35rem 0.6rem',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1" ry="1"></rect><path d="M6 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"></path><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                <span style={{ fontSize: '0.95rem' }}>Clear filters</span>
              </button>
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              list="product-names-list"
            />
            <datalist id="product-names-list">
              {/* Exclude demo-category products from suggestions (e.g., "Demo Part A") */}
              {[...new Set(products
                .filter(p => {
                  const name = String(p.name || '').toLowerCase();
                  const cat = String(p.category || '').toLowerCase();
                  // exclude demo-category or names that look like demo/sample data
                  return cat !== 'demo' && !name.includes('demo') && !name.includes('sample');
                })
                .map(p => p.name)
                .filter(Boolean)
              )].map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <div className="filter-section">
              <label className="filter-label">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="filter-select">
                <option value="">All Categories</option>
                {[...new Set(products.map(p => p.category).filter(Boolean))].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filter-section">
              <label className="filter-label">Sub-Category</label>
              {(() => {
                // Only show subcategories relevant to the selected category when available
                const subOptions = category ? [...new Set(products.filter(p => p.category === category).map(p => p.subcategory).filter(Boolean))] : [];
                return (
                  <>
                    <select
                      value={subCategory}
                      onChange={e => setSubCategory(e.target.value)}
                      className="filter-select"
                      disabled={!category}
                      title={!category ? 'Select a category first' : (subOptions.length === 0 ? 'No sub-categories available' : 'Filter by sub-category')}
                    >
                      <option value="">All Sub-Categories</option>
                      {subOptions.map(sc => (
                        <option key={sc} value={sc}>{sc}</option>
                      ))}
                    </select>
                    {!category && <div className="filter-hint">Select a category to enable sub-categories</div>}
                  </>
                );
              })()}
            </div>
            <div className="filter-section">
              <label className="filter-label">Manufacturer</label>
              {(() => {
                const options = [...new Set((compatibility.length ? compatibility.map(c => c.manufacturer) : products.map(p => p.manufacturer)).filter(Boolean))];
                return (
                  <>
                    <select value={manufacturer} onChange={e => { setManufacturer(e.target.value); setMachineType(''); setModel(''); }} className="filter-select">
                      <option value="">All Manufacturers</option>
                      {options.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {options.length === 0 && <div className="filter-hint">No manufacturers available</div>}
                  </>
                );
              })()}
            </div>
            <div className="filter-section">
              <label className="filter-label">Machine Type</label>
              {(() => {
                const options = [...new Set((
                  (compatibility.length ? compatibility
                    .filter(c => !manufacturer || c.manufacturer === manufacturer)
                    .map(c => c.machine_type)
                    : products.map(p => p.machine_type))
                ).filter(Boolean))];
                return (
                  <>
                    <select
                      value={machineType}
                      onChange={e => { setMachineType(e.target.value); setModel(''); }}
                      className="filter-select"
                      disabled={!manufacturer}
                      title={!manufacturer ? 'Select a manufacturer to see machine types' : (options.length === 0 ? 'No machine types available' : 'Filter by machine type')}
                    >
                      <option value="">All Machine Types</option>
                      {options.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </>
                );
              })()}
            </div>
            <div className="filter-section">
              <label className="filter-label">Model</label>
              {(() => {
                const options = [...new Set((
                  (compatibility.length ? compatibility
                    .filter(c => (!manufacturer || c.manufacturer === manufacturer) && (!machineType || c.machine_type === machineType))
                    .map(c => c.model)
                    : products.map(p => p.model))
                ).filter(Boolean))];
                return (
                  <>
                    <select
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      className="filter-select"
                      disabled={!machineType}
                      title={!machineType ? 'Select a machine type to see models' : (options.length === 0 ? 'No models available' : 'Filter by model')}
                    >
                      <option value="">All Models</option>
                      {options.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </>
                );
              })()}
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
          {error ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'red' }} role="alert">Failed to load products: {error}</div>
          ) : (() => {
            // If compatibility links are provided, use them to filter products by
            // selected manufacturer/machineType/model. The links map product SKU -> compat id.
            // when compat-based filtering is available, prefer it and skip product-level
            // manufacturer/machine_type/model field checks because many products
            // don't have those fields populated; the compat_links map to SKUs.
            // only apply compat->SKU filtering when user has selected at least
            // one compat-related filter (manufacturer/machineType/model)
            const hasCompatFilterSelected = Boolean(manufacturer || machineType || model);
            const useCompatFiltering = compatibility.length && compatLinks.length && hasCompatFilterSelected;

            const filtered = (() => {
              if (useCompatFiltering) {
                // build a map of compat id -> set of SKUs
                const map = {};
                compatLinks.forEach(l => {
                  if (!l.machine_compatibility_id || !l.product_sku) return;
                  map[l.machine_compatibility_id] = map[l.machine_compatibility_id] || new Set();
                  map[l.machine_compatibility_id].add(l.product_sku);
                });

                // find compat rows matching selected filters
                const matchingCompatIds = compatibility
                  .filter(c => !manufacturer || c.manufacturer === manufacturer)
                  .filter(c => !machineType || c.machine_type === machineType)
                  .filter(c => !model || c.model === model)
                  .map(c => c.id);

                // collect SKUs for those compat ids
                const matchingSkus = new Set();
                matchingCompatIds.forEach(id => {
                  (map[id] || []).forEach(sku => matchingSkus.add(sku));
                });

                // Strict behavior: if there are no matching SKUs for the selected
                // compat filters, return an empty array (no items matched).
                if (matchingSkus.size === 0) return [];
                return products.filter(p => matchingSkus.has(p.sku));
              }
              return products;
            })()
              .filter(product => product.website_visible === true)
              .filter(product => !category || product.category === category)
              .filter(product => !subCategory || product.subcategory === subCategory)
              .filter(product => useCompatFiltering ? true : (!manufacturer || product.manufacturer === manufacturer))
              .filter(product => useCompatFiltering ? true : (!machineType || product.machine_type === machineType))
              .filter(product => useCompatFiltering ? true : (!model || product.model === model))
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
            // If the user selected any compat-related filter and there are
            // zero products after strict compat filtering, render a friendly
            // message instead of the grid.
            if (hasCompatFilterSelected && filtered.length === 0) {
              return (
                <div key="no-results" style={{ padding: 48, textAlign: 'center', color: '#666' }} role="status">
                  No items matched filters.
                </div>
              );
            }

            return filtered.slice(start, end).map((product) => (
            <Link key={product.id} to={`/product/${product.id}`} className="simple-gallery-card" style={{ textDecoration: 'none' }}>
              <div className="simple-gallery-image-wrapper">
                <SmartImage
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
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
                  const outOfStock = availableStock === 0;
                  const isMaxed = qty >= availableStock && availableStock > 0;

                  if (outOfStock) {
                    return (
                      <button
                        className="simple-gallery-btn"
                        title="Out of Stock"
                        aria-label="Out of Stock"
                        disabled
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: '#d33',
                          color: '#fff',
                          border: 'none',
                          padding: '0.5rem 0.9rem',
                          borderRadius: 6,
                          cursor: 'not-allowed',
                          opacity: 0.9,
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>Out of Stock</span>
                      </button>
                    );
                  }

                  // If item already in cart, show - qty + controls inline
                  if (qty > 0) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          aria-label="Decrease quantity"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); dispatch({ type: 'SUBTRACT_FROM_CART', product }); }}
                          style={{
                            background: '#fff',
                            border: '1px solid #e6e6e6',
                            borderRadius: 6,
                            width: 32,
                            height: 32,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          −
                        </button>
                        <div style={{ minWidth: 36, textAlign: 'center', fontWeight: 700 }}>{qty}</div>
                        <button
                          aria-label="Increase quantity"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); dispatch({ type: 'ADD_TO_CART', product }); }}
                          disabled={isMaxed}
                          style={{
                            background: isMaxed ? '#f7f7f7' : '#fff',
                            border: '1px solid #e6e6e6',
                            borderRadius: 6,
                            width: 32,
                            height: 32,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isMaxed ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          +
                        </button>
                      </div>
                    );
                  }

                  // Default: show Add to Cart button
                  return (
                    <button
                      className="simple-gallery-btn primary"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); dispatch({ type: "ADD_TO_CART", product }); }}
                      title="Add to Cart"
                      aria-label="Add to Cart"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        position: 'relative',
                      }}
                    >
                      <span className="add-to-cart-label" style={{ fontWeight: 800, fontSize: '0.98rem' }}>Add to Cart</span>
                    </button>
                  );
                })()}
              </div>
            </Link>
            ));
          })()}
        {/* Pagination controls */}
  <div className="simple-gallery-pagination">
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '2rem auto 0 auto', gap: 12, width: '100%' }}>
          {page > 1 && (
            <button className="simple-gallery-btn secondary" onClick={() => setPage(page - 1)}>&lt; Prev</button>
          )}
          <span style={{ color: '#c3c3c3', fontWeight: 500, fontSize: '1.05rem', margin: '0 1rem' }}>
            Page {page}
          </span>
          {products.filter(product => !category || product.category === category)
            .filter(product => !subCategory || product.subcategory === subCategory)
            .filter(product => !manufacturer || product.manufacturer === manufacturer)
            .filter(product => !machineType || product.machine_type === machineType)
            .filter(product => !model || product.model === model)
            .filter(product => !inStockOnly || product.quantity > 0)
            .filter(product => {
              if (!searchText.trim()) return true;
              const lower = searchText.toLowerCase();
              return Object.values(product).some(val =>
                typeof val === 'string' && val.toLowerCase().includes(lower)
              );
            }).length > page * perPage && (
            <button className="simple-gallery-btn secondary" onClick={() => setPage(page + 1)}>Next &gt;</button>
          )}
    </div>
  </div>
      </div>
    </div>
    </div>);}
