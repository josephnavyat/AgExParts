import React, { useEffect, useState } from "react";
import { useCart } from "./CartContext.jsx";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/simple-gallery.css";

export default function SimpleGallery() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Filter pane is hidden by default
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
  const { dispatch } = useCart();
  return (
    <div className="simple-gallery-root">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 32, marginBottom: 16 }}>
        <h2 className="simple-gallery-title" style={{ flex: 1, textAlign: 'center', margin: 0 }}>Agex Parts</h2>
        <div style={{ minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <label className="filter-label" htmlFor="perPageSelect" style={{ marginRight: 6, marginTop: 0 }}>Show:</label>
          <select
            id="perPageSelect"
            className="filter-select"
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            style={{ minWidth: 90 }}
          >
            {[24, 48, 72, 96].map(n => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>
      </div>
      <hr className="simple-gallery-divider" />
      <div className="simple-gallery-layout" style={{ position: 'relative' }}>
        {/* Expand/collapse button only on mobile, handled by CSS */}
        <button
          className="simple-gallery-filter-toggle"
          aria-label={filterOpen ? 'Hide Filters' : 'Show Filters'}
          onClick={() => setFilterOpen((v) => !v)}
        >
          {filterOpen ? '←' : '→'}
        </button>
        {/* Slide-in filter pane */}
        <aside
          className={`simple-gallery-filter-pane${filterOpen ? '' : ' simple-gallery-filter-pane--closed'}`}
          style={{
            position: 'static',
            minWidth: 260,
            maxWidth: 340,
            height: 'fit-content',
            alignSelf: 'flex-start',
            marginTop: 0,
          }}
        >
          <div className="simple-gallery-filter-header" onClick={() => setFilterOpen((v) => !v)}>
            Filters {filterOpen ? '▼' : '▶'}
          </div>
          {filterOpen && (
            <div className="simple-gallery-filter-content">
              <div className="filter-section filter-checkbox">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={inStockOnly}
                  onChange={e => setInStockOnly(e.target.checked)}
                />
                <span className="checkbox-text">In Stock</span>
              </div>
              <div className="filter-section">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
              </div>
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
                <label className="filter-label">Manufacturer</label>
                <select value={manufacturer} onChange={e => setManufacturer(e.target.value)} className="filter-select">
                  <option value="">All Manufacturers</option>
                  {[...new Set(products.map(p => p.manufacturer).filter(Boolean))].map(m => (
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
          )}
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
              })
              .sort((a, b) => {
                if (sort === 'price-asc') return (a.price || 0) - (b.price || 0);
                if (sort === 'price-desc') return (b.price || 0) - (a.price || 0);
                return 0;
              });
            const start = (page - 1) * perPage;
            const end = start + perPage;
            return filtered.slice(start, end).map((product) => (
            <div key={product.id} className="simple-gallery-card">
              <img src={product.image} alt={product.name} />
              <h3 className="simple-gallery-card-title">{product.name}</h3>
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
                        <span style={{ textDecoration: 'line-through', color: '#fff', marginRight: 8, background: '#888', borderRadius: 4, padding: '2px 8px' }}>
                          ${price.toFixed(2)}
                        </span>
                        <span style={{ color: '#d32f2f', fontWeight: 700, background: '#fff', borderRadius: 4, padding: '2px 8px' }}>
                          ${salePrice}
                        </span>
                      </>
                    );
                  } else if (!isNaN(price)) {
                    return <span style={{ color: '#fff', background: '#444a58', borderRadius: 4, padding: '2px 8px' }}>${price.toFixed(2)}</span>;
                  } else {
                    return <span style={{ color: '#fff', background: '#444a58', borderRadius: 4, padding: '2px 8px' }}>Price N/A</span>;
                  }
                })()}
              </div>
              <div className="simple-gallery-card-actions">
                <Link
                  to={`/product/${product.id}`}
                  className="simple-gallery-btn secondary"
                >
                  View Details
                </Link>
                <button
                  className="simple-gallery-btn primary"
                  onClick={() => dispatch({ type: "ADD_TO_CART", product })}
                  title="Add to Cart"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {/* Shopping cart icon SVG only */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-shopping-cart"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"></path></svg>
                </button>
              </div>
            </div>
            ));
          })()}
        {/* Pagination controls */}
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
  );
}
