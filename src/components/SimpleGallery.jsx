import React, { useEffect, useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCart, getProductQuantity } from "./CartContext.jsx";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/simple-gallery.css";

export default function SimpleGallery() {
  const isMobile = window.matchMedia('(max-width: 700px)').matches;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Filter pane is hidden by default on all devices (mobile and desktop)
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Filter states
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [vendor, setVendor] = useState('');
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
        setProducts(data);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setError(error.message);
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
  const getImageUrl = (img) => img && img.startsWith('http') ? img : (img ? img : '/logo.png');
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
              <select value={subCategory} onChange={e => setSubCategory(e.target.value)} className="filter-select">
                <option value="">All Sub-Categories</option>
                {[...new Set(products.map(p => p.subcategory).filter(Boolean))].map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
            <div className="filter-section">
              <label className="filter-label">Vendor</label>
              <select value={vendor} onChange={e => setVendor(e.target.value)} className="filter-select">
                <option value="">All Vendors</option>
                {[...new Set(products.map(p => p.vendor).filter(Boolean))].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="filter-section">
              <label className="filter-label">Machine Type</label>
              <select value={machineType} onChange={e => setMachineType(e.target.value)} className="filter-select">
                <option value="">All Machine Types</option>
                {[...new Set(products.map(p => p.machine_type).filter(Boolean))].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="filter-section">
              <label className="filter-label">Model</label>
              <select value={model} onChange={e => setModel(e.target.value)} className="filter-select">
                <option value="">All Models</option>
                {[...new Set(products.map(p => p.model).filter(Boolean))].map(m => (
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
              .filter(product => !category || product.category === category)
              .filter(product => !subCategory || product.subcategory === subCategory)
              .filter(product => !vendor || product.vendor === vendor)
              .filter(product => !machineType || product.machine_type === machineType)
              .filter(product => !model || product.model === model)
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
                  onError={e => { e.currentTarget.src = '/logo.png'; }}
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
                  return (
                    <button
                      className="simple-gallery-btn primary"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); dispatch({ type: "ADD_TO_CART", product }); }}
                      title="Add to Cart"
                      aria-label={Number(product.inventory ?? product.quantity ?? 0) === 0 ? 'Out of Stock' : 'Add to Cart'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        opacity: Number(product.inventory ?? product.quantity ?? 0) === 0 ? 0.5 : 1,
                        pointerEvents: Number(product.inventory ?? product.quantity ?? 0) === 0 ? 'none' : 'auto',
                        position: 'relative',
                      }}
                      disabled={Number(product.inventory ?? product.quantity ?? 0) === 0}
                    >
                      {/* Cart icon (inline SVG) placed before text */}
                      <svg className="add-to-cart-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1"></circle><circle cx="20" cy="20" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                      <span className="add-to-cart-label" style={{ fontWeight: 800, fontSize: '0.98rem' }}>Add to Cart</span>
                      {qty > 0 && (
                        <span className="qty-bubble">{qty}</span>
                      )}
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
            .filter(product => !vendor || product.vendor === vendor)
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
