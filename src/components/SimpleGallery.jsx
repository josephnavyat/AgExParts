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
        if( HOST_ENVIRONMENT !== 'development' ) {
          const res = await fetch('/.netlify/functions/get-data', { signal: controller.signal });
        }
        else {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, { signal: controller.signal });
        }
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
          className="simple-gallery-filter-pane"
          style={{
            position: 'absolute',
            left: filterOpen ? 0 : -320,
            top: 100,
            transition: 'left 0.3s',
            zIndex: 9,
            minWidth: 260,
            maxWidth: 320,
            height: 'fit-content',
          }}
        >
          <div className="simple-gallery-filter-header" onClick={() => setFilterOpen((v) => !v)}>
            Filters
            <span>{filterOpen ? '▼' : '▶'}</span>
          </div>
          {filterOpen && (
            <div className="simple-gallery-filter-content">
              {/* Example filter content, replace with real filters as needed */}
              <div>
                <label>
                  <input type="checkbox" /> In Stock
                </label>
              </div>
              <div>
                <label>
                  <input type="checkbox" /> On Sale
                </label>
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
