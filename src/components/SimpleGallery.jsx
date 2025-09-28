import React, { useEffect, useState } from "react";
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
  return (
    <div className="simple-gallery-root">
      <Navbar />
      <h2 className="simple-gallery-title">Agex Parts</h2>
      <div className="simple-gallery-layout" style={{ position: 'relative' }}>
        {/* Per page dropdown */}
        <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="filter-label" htmlFor="perPageSelect" style={{ marginRight: 6, marginTop: 0 }}>Show:</label>
          <select
            id="perPageSelect"
            className="filter-select"
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            style={{ minWidth: 90 }}
          >
            {[48, 96, 144, 192, 240].map(n => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>
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
            marginLeft: filterOpen ? 320 : 0,
            transition: 'margin-left 0.3s',
          }}
        >
          {(() => {
            const filtered = products
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
              <div className="simple-gallery-card-actions">
                <Link
                  to={`/product/${product.id}`}
                  className="simple-gallery-btn secondary"
                >
                  View Details
                </Link>
                <button
                  className="simple-gallery-btn primary"
                  onClick={() => alert(`Added ${product.name} to cart!`)}
                >
                  Add to Cart
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
