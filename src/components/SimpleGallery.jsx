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

  // (removed duplicate declaration)
  return (
    <div className="simple-gallery-root">
      <Navbar />
      <h2 className="simple-gallery-title">Agex Parts</h2>
      <div className="simple-gallery-layout">
        {/* Expand/collapse button, fixed to left edge */}
        <button
          className="simple-gallery-filter-toggle"
          aria-label={filterOpen ? 'Hide Filters' : 'Show Filters'}
          onClick={() => setFilterOpen((v) => !v)}
          style={{
            position: 'absolute',
            left: filterOpen ? 270 : 0,
            top: 120,
            zIndex: 10,
            background: '#3a3939',
            color: '#f3f3f3',
            border: 'none',
            borderRadius: '0 8px 8px 0',
            padding: '0.7rem 0.9rem',
            fontWeight: 700,
            fontSize: '1.1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
            cursor: 'pointer',
            transition: 'left 0.3s',
          }}
        >
          {filterOpen ? '←' : '→'}
        </button>
        {/* Slide-in filter pane */}
        <aside
          className={`simple-gallery-filter-pane${filterOpen ? '' : ' simple-gallery-filter-pane--closed'}`}
          style={{
            position: 'absolute',
            left: filterOpen ? 0 : -340,
            top: 100,
            transition: 'left 0.3s',
            zIndex: 9,
            minWidth: 260,
            maxWidth: 340,
            height: 'fit-content',
          }}
        >
          <div className="simple-gallery-filter-header" onClick={() => setFilterOpen((v) => !v)}>
            Filters
            <span>{filterOpen ? '▼' : '▶'}</span>
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
          {products.map((product) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
