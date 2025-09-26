import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import "../styles/simple-gallery.css";

export default function SimpleGallery() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(true);
  
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

  // Filter products based on all criteria
  const filteredProducts = products
    .filter(product => !inStockOnly || product.quantity > 0)
    .filter(product => !manufacturer || product.manufacturer === manufacturer)
    .filter(product => !machineType || product.machine_type === machineType)
    .filter(product => !model || product.model === model)
    .filter(product => {
      if (!searchText.trim()) return true;
      const search = searchText.toLowerCase();
      return Object.values(product).some(val =>
        typeof val === 'string' && val.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sort === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sort === 'price-desc') return (b.price || 0) - (a.price || 0);
      return 0;
    });
  return (
    <div className="simple-gallery-root">
      <Navbar />
      <h2 className="simple-gallery-title">Agex Parts</h2>
      <div className="simple-gallery-layout">
        <aside className="simple-gallery-filter-pane">
          <div className="simple-gallery-filter-header" onClick={() => setFilterOpen((v) => !v)}>
            Filters
            <span>{filterOpen ? '▼' : '▶'}</span>
          </div>
          {filterOpen && (
            <div className="simple-gallery-filter-content">
              <div className="filter-section">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-section">
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={e => setInStockOnly(e.target.checked)}
                  />
                  In Stock Only
                </label>
              </div>

              <div className="filter-section">
                <select 
                  value={manufacturer} 
                  onChange={e => setManufacturer(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Manufacturers</option>
                  {[...new Set(products.map(p => p.manufacturer).filter(Boolean))].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <select 
                  value={machineType} 
                  onChange={e => setMachineType(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Machine Types</option>
                  {[...new Set(products.map(p => p.machine_type).filter(Boolean))].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <select 
                  value={model} 
                  onChange={e => setModel(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Models</option>
                  {[...new Set(products.map(p => p.model).filter(Boolean))].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <select 
                  value={sort} 
                  onChange={e => setSort(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Sort by</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>

              <div className="filter-divider"></div>

              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSearchText('');
                  setInStockOnly(false);
                  setManufacturer('');
                  setMachineType('');
                  setModel('');
                  setSort('');
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </aside>
        <div className="simple-gallery-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="simple-gallery-card">
              <img src={product.image} alt={product.name} />
              <h3 className="simple-gallery-card-title">{product.name}</h3>
              <div
                className="simple-gallery-card-desc"
                title={product.description}
              >
                {product.description}
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
