import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';
import { useCart } from './CartContext.jsx';

// Small presentational accordion used only inside the mobile categories panel
function CategoryAccordion({ category, isOpen, onToggle, onNavigate }) {
  const { category: title, subcategories = [] } = category || {};
  // onNavigate is expected to be a function that accepts a URL string and performs navigation + panel close
  return (
    <div className="cat-col-item" style={{ padding: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Make the category title clickable to search by category */}
        <a
          href={`/search-results?category=${encodeURIComponent(title)}`}
          onClick={(e) => { e.preventDefault(); try { onNavigate(`/search-results?category=${encodeURIComponent(title)}`); } catch (err) { try { window.location.href = `/search-results?category=${encodeURIComponent(title)}` } catch (e) {} } }}
          style={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}
        >
          {title}
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* expand/collapse buttons: up (collapse) and down (expand) */}
          <button
            aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            title={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="nav-icon"
            style={{ width: 36, height: 36 }}
          >
            {isOpen ? (
              <svg className="nav-svg" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            ) : (
              <svg className="nav-svg" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            )}
          </button>
        </div>
      </div>
      {isOpen && subcategories && subcategories.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {subcategories.map(s => {
            const url = `/search-results?category=${encodeURIComponent(title)}&subcategory=${encodeURIComponent(s)}`;
            return (
              <a
                key={s}
                href={url}
                className="sub-item"
                onClick={(e) => { e.preventDefault(); try { onNavigate(url); } catch (err) { try { window.location.href = url; } catch (e) {} } }}
              >
                {s}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [machinePanelOpen, setMachinePanelOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [productsIndex, setProductsIndex] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchDebounce = useRef(null);
  const lastYRef = useRef(0);

  const { cart } = useCart();
  const cartCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const secondaryRef = useRef(null);
  const machineWrapRef = useRef(null);
  const machineCloseTimerRef = useRef(null);
  const toggleRef = useRef(null);
  const panelRef = useRef(null);
  const [panelLeft, setPanelLeft] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [catsLoaded, setCatsLoaded] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  // Manufacturer -> machine_type -> model dropdown state
  // inline manufacturer/machine panel open is controlled via DOM class on `.nav-manufacturer-inline`
  const [manufacturers, setManufacturers] = useState([]);
  // machineTypes will hold nested mapping: { manufacturer: { machineType: [models...] } }
  const [machineTypes, setMachineTypes] = useState({});
  const [modelsList, setModelsList] = useState([]);
  const [compatMachineTypes, setCompatMachineTypes] = useState([]);
  const [compatProducts, setCompatProducts] = useState([]);
  const [selManufacturer, setSelManufacturer] = useState('');
  const [selMachineType, setSelMachineType] = useState('');
  const [selModel, setSelModel] = useState('');

  const loadCategories = async () => {
    if (catsLoaded || categoriesLoading) return;
    setCategoriesLoading(true);
    try {
      const res = await fetch('/.netlify/functions/get-data');
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      let products = [];
      if (Array.isArray(json)) products = json;
      else if (json && Array.isArray(json.products)) products = json.products;

      const map = new Map();
      for (const p of products) {
        const cat = (p.category || '').trim();
        const sub = (p.subcategory || '').trim();
        if (!cat) continue;
        if (!map.has(cat)) map.set(cat, new Set());
        if (sub) map.get(cat).add(sub);
      }

      const grouped = Array.from(map.entries()).map(([category, subs]) => ({
        category,
        subcategories: Array.from(subs).sort((a, b) => a.localeCompare(b)),
      })).sort((a, b) => a.category.localeCompare(b.category));

      setCategories(grouped);
  // initialize active category to first if not already set
  setActiveCategory((prev) => prev || (grouped[0] ? grouped[0].category : ''));
      setCatsLoaded(true);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Load manufacturer/machine_type/model lists
  const loadManufacturers = async () => {
      try {
        // first try compatibility options endpoint (flat lists)
        try {
          const res = await fetch('/.netlify/functions/get-compatibility-options');
          if (res && res.ok) {
            const json = await res.json();
            if (json) {
              if (Array.isArray(json.manufacturers)) setManufacturers(json.manufacturers.slice().sort((a,b)=>a.localeCompare(b)));
              if (Array.isArray(json.machine_types)) setCompatMachineTypes(json.machine_types.slice().sort((a,b)=>a.localeCompare(b)));
              if (Array.isArray(json.models)) setModelsList(json.models.slice().sort((a,b)=>a.localeCompare(b)));
            }
          }
        } catch (err) {
          // ignore and fall back to get-data
        }

      // build nested mapping from product data for cascading per-manufacturer machine types and models
      const res2 = await fetch('/.netlify/functions/get-data');
      if (!res2.ok) throw new Error('fetch failed');
      const json2 = await res2.json();
      let products = Array.isArray(json2) ? json2 : (json2 && Array.isArray(json2.products) ? json2.products : []);
  console.info('Navbar: fetched products for manufacturers', { rawType: typeof json2, productsLength: Array.isArray(products) ? products.length : 0, sampleKeys: products && products[0] ? Object.keys(products[0]).slice(0,12) : null });
      // keep a copy of products for fallback option generation (used by navbar cascading)
      setCompatProducts(products);
      // tolerant access helpers - try multiple possible property names
      const read = (obj, ...keys) => {
        for (const k of keys) {
          if (!obj) continue;
          const v = obj[k];
          if (v !== undefined && v !== null) return v;
        }
        return undefined;
      };

      // compute flat machine types and models from product fields as a fallback
      try {
        const flatMachineTypes = Array.from(new Set(products.map(p => String((read(p, 'machine_type', 'machineType', 'machine') || '')).trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
        const flatModels = Array.from(new Set(products.map(p => String((read(p, 'model', 'models') || '')).trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
        if ((!compatMachineTypes || compatMachineTypes.length === 0) && flatMachineTypes.length) setCompatMachineTypes(flatMachineTypes);
        if ((!modelsList || modelsList.length === 0) && flatModels.length) setModelsList(flatModels);
      } catch (e) { /* ignore */ }
      const manuMap = new Map();
      for (const p of products) {
        const manu = String((read(p, 'manufacturer', 'manufacturer_name', 'make') || '')).trim();
        const mtype = String((read(p, 'machine_type', 'machineType', 'machine') || '')).trim();
        const model = String((read(p, 'model', 'models', 'model_number') || '')).trim();
        if (!manu) continue;
        if (!manuMap.has(manu)) manuMap.set(manu, new Map());
        const mtMap = manuMap.get(manu);
        if (mtype) {
          if (!mtMap.has(mtype)) mtMap.set(mtype, new Set());
          if (model) mtMap.get(mtype).add(model);
        }
      }
      const manuArr = Array.from(manuMap.keys()).sort((a,b)=>a.localeCompare(b));
      if (manuArr.length) setManufacturers(manuArr);
      const nested = {};
      for (const [m, mtMap] of manuMap.entries()) {
        nested[m] = {};
        for (const [mt, models] of mtMap.entries()) nested[m][mt] = Array.from(models).sort((a,b)=>a.localeCompare(b));
      }
      setMachineTypes(nested);
      // if modelsList was empty, try to populate from nested map
      if (!modelsList || modelsList.length === 0) {
        const allModels = new Set();
        for (const mt of Object.values(nested)) for (const mdlArr of Object.values(mt)) for (const mo of mdlArr) allModels.add(mo);
        if (allModels.size > 0) setModelsList(Array.from(allModels).sort((a,b)=>a.localeCompare(b)));
      }
      console.info('Navbar: loadManufacturers complete', {
        manufacturersCount: (manufacturers || []).length,
        compatMachineTypesCount: (compatMachineTypes || []).length,
        nestedManufacturerCount: Object.keys(nested || {}).length,
        modelsCount: (modelsList || []).length,
      });
    } catch (err) {
      console.error('Failed to load manufacturers', err);
    }
  };

  // when manufacturer selection changes, set available machine types
  useEffect(() => {
    try {
      if (!selManufacturer) { setModelsList([]); setSelMachineType(''); return; }
      const nested = machineTypes[selManufacturer] || {};
      // reset machine type selection and populate models list for this manufacturer
      setSelMachineType('');
      const allModels = new Set();
      if (Object.keys(nested).length > 0) {
        for (const mtArr of Object.values(nested)) for (const mo of mtArr) allModels.add(mo);
      } else if (compatProducts && compatProducts.length > 0) {
        // tolerant read helper (local copy)
        const read = (obj, ...keys) => {
          for (const k of keys) {
            if (!obj) continue;
            const v = obj[k];
            if (v !== undefined && v !== null) return v;
          }
          return undefined;
        };
        for (const p of compatProducts) {
          const manuVal = String((read(p, 'manufacturer', 'manufacturer_name', 'make') || '')).trim();
          if (manuVal === (selManufacturer || '').trim()) {
            const mo = String((read(p, 'model', 'models', 'model_number') || '')).trim();
            if (mo) allModels.add(mo);
          }
        }
      }
      setModelsList(Array.from(allModels).sort((a,b)=>a.localeCompare(b)));
  console.info('Navbar: selManufacturer changed', { selManufacturer, modelsCount: (Array.from(allModels) || []).length, nestedForManufacturer: Object.keys(nested || {}).length });
    } catch (e) { /* ignore */ }
  }, [selManufacturer, machineTypes]);

  // when machine type changes, populate model list
  useEffect(() => {
    try {
      if (!selMachineType) { setModelsList([]); setSelModel(''); return; }
      let models = [];
      if (selManufacturer) {
        models = (machineTypes[selManufacturer] || {})[selMachineType] || [];
      } else {
        // aggregate models for this machine type across all manufacturers
        const setModels = new Set();
        for (const manu of Object.keys(machineTypes || {})) {
          const arr = (machineTypes[manu] || {})[selMachineType] || [];
          for (const m of arr) setModels.add(m);
        }
        // fallback to product list scanning
        if (setModels.size === 0 && compatProducts && compatProducts.length > 0) {
          for (const p of compatProducts) {
            const mt = (p.machine_type || p.machineType || '').trim();
            if (mt === selMachineType) {
              const mo = (p.model || '').trim(); if (mo) setModels.add(mo);
            }
          }
        }
        models = Array.from(setModels).sort((a,b)=>a.localeCompare(b));
      }
      setModelsList(models);
      setSelModel('');
      console.info('Navbar: selMachineType changed', { selManufacturer, selMachineType, modelsForSelection: models.length });
    } catch (e) { setModelsList([]); }
  }, [selMachineType, selManufacturer, machineTypes]);

  // Ensure the body knows a secondary nav exists so CSS can reserve space
  useEffect(() => {
    try {
      document.body.classList.add('has-secondary-nav');
      return () => document.body.classList.remove('has-secondary-nav');
    } catch (e) {
      // ignore
    }
  }, []);

  // Scroll behavior: add shadow when scrolled and hide navbar when scrolling down
  useEffect(() => {
    const lastYRef = { current: window.scrollY || 0 };
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;
        setScrolled(y > 10);

        // Never hide while any overlay is open
        if (suggestOpen || leftPanelOpen || secondaryOpen || showSearch) {
          setNavHidden(false);
          lastYRef.current = y;
          return;
        }

        const last = lastYRef.current;
        const delta = Math.abs(y - last);
        const goingDown = y > last;

        // Only react after a little movement to avoid jitter
        if (delta > 6) {
          if (goingDown && y > 120) setNavHidden(true);
          if (!goingDown) setNavHidden(false);
        }

        if (y < 10) setNavHidden(false);
        lastYRef.current = y;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [suggestOpen, leftPanelOpen, secondaryOpen, showSearch]);


  
  // Close machine dropdown on outside click / tap
  useEffect(() => {
    if (!machinePanelOpen) return;
    const onDown = (e) => {
      const el = machineWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setMachinePanelOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [machinePanelOpen]);

  // Compute panel left position so it centers under the toggle and stays inside viewport
  useEffect(() => {
    if (!machinePanelOpen) {
      // reset panelLeft when closed so CSS can fallback
      setPanelLeft(null);
      return;
    }

    const compute = () => {
      try {
        const wrap = machineWrapRef.current;
        const panel = panelRef.current;
        if (!wrap || !panel) return;
        // find the trigger element (the link) inside wrap
        const trigger = wrap.querySelector('.nav-manufacturers-toggle');
        const triggerRect = trigger ? trigger.getBoundingClientRect() : wrap.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const viewportW = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

        // desired left so the panel center aligns with trigger center
        const desiredLeft = Math.round((triggerRect.left + triggerRect.width / 2) - (panelRect.width / 2));

        // clamp so panel stays within viewport with small margin
        const margin = 12;
        const minLeft = margin;
        const maxLeft = Math.max(margin, viewportW - panelRect.width - margin);
        const clamped = Math.min(Math.max(desiredLeft, minLeft), maxLeft);

        // compute left relative to the wrap element's left (since panel is absolute inside wrap)
        const wrapRect = wrap.getBoundingClientRect();
        const leftRelative = Math.round(clamped - wrapRect.left);
        setPanelLeft(leftRelative);
      } catch (e) {
        // ignore
      }
    };

    // compute initially and on a small timeout to allow layout to settle
    compute();
    const t = setTimeout(compute, 60);

    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute);
    };
  }, [machinePanelOpen]);
// Close secondary nav on route change
  useEffect(() => {
    setSecondaryOpen(false);
  }, [location.pathname]);

  // Close on Escape and restore focus to toggle
  useEffect(() => {
    if (!secondaryOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSecondaryOpen(false);
        try { toggleRef.current?.focus(); } catch (err) {}
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [secondaryOpen]);

  // Left-panel Escape handling: close and restore focus to the main toggle
  useEffect(() => {
    if (!leftPanelOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setLeftPanelOpen(false);
        try { toggleRef.current?.focus(); } catch (err) {}
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [leftPanelOpen]);

  return (
    <>
      <nav id="nav" className={`nav ${scrolled ? 'scrolled' : ''}${showSearch ? ' nav--search-open' : ''}${navHidden ? ' nav--hidden' : ''}`}> 
        <div className="container nav-inner" style={{ alignItems: 'center' }}>
          <div className="brand">
            <img src="/logo.png" alt="AgEx Parts logo" style={{ height: '60px', width: 'auto' }} />
            <h1 className="distressed" style={{ color: 'dark grey' }}>For your ideal PART</h1>
          </div>
          <div className="nav-cta" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="nav-icon" aria-label="Home" title="Home">
              {/* Modern Home icon */}
              <svg className="nav-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </Link>
            <Link to="/profile" className="nav-icon" aria-label="Profile" title="Profile">
              {/* User/Profile icon */}
              <svg className="nav-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
            </Link>
            <button
              className="nav-icon"
              onClick={() => setShowSearch((s) => !s)}
              title="Search"
              aria-label="Search"
            >
              {/* Modern Search icon */}
              <svg className="nav-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <Link to="/cart" className="nav-icon" aria-label="Cart" title="Cart" style={{ position: 'relative' }}>
              <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.5" /><circle cx="19" cy="21" r="1.5" /><path d="M1 1h2l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" /></svg>
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: '#19a974',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  minWidth: 18,
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.13)',
                }}>{cartCount}</span>
              )}
            </Link>
            {/* Mobile left-panel toggle placed to the right of the cart button */}
            <button
              className="nav-left-toggle"
              aria-label="Browse categories"
              title="Browse categories"
              onClick={async () => {
                setLeftPanelOpen((s) => !s);
                try { if (!catsLoaded) await loadCategories(); } catch (e) {}
                setSecondaryOpen(false);
              }}
              ref={toggleRef}
            >
              <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
          </div>
        </div>
  {showSearch && (
          <div
            className="search-bar-collapsible"
            style={{
              width: '100%',
              background: 'rgba(30,30,30,0.55)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem 0',
              position: 'static',
              zIndex: 39,
            }}
          >
            <form
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 400 }}
              onSubmit={e => {
                e.preventDefault();
                if (searchValue.trim()) {
                  window.location.href = `/search-results?q=${encodeURIComponent(searchValue.trim())}`;
                }
              }}
            >
              <input
                id="nav-search-input"
                type="text"
                placeholder="Search for parts..."
                value={searchValue}
                onChange={e => {
                  const v = e.target.value;
                  setSearchValue(v);
                  // debounce suggestions
                  clearTimeout(searchDebounce.current);
                  if (!v || v.trim().length < 2) {
                    setSuggestions([]); setSuggestOpen(false); return;
                  }
                  searchDebounce.current = setTimeout(() => {
                    const q = v.trim().toLowerCase();
                    if (!productsIndex) return;
                    const results = productsIndex.filter(p => {
                      const name = (p.name || '').toLowerCase();
                      const sku = (p.sku || '').toLowerCase();
                      return name.includes(q) || sku.includes(q);
                    }).slice(0,6);
                    setSuggestions(results);
                    setSuggestOpen(results.length > 0);
                  }, 180);
                }}
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '1.1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  width: '100%',
                  minWidth: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                  flex: 1
                }}
                onFocus={async () => {
                  if (!productsIndex) {
                    try {
                      const res = await fetch('/.netlify/functions/get-data');
                      const json = await res.json();
                      let products = Array.isArray(json) ? json : (json && Array.isArray(json.products) ? json.products : []);
                      // keep only id, name, image, and sku/part_number for better matching
                      products = products.map(p => ({ id: p.id, name: p.name, image: p.image, sku: p.sku || p.part_number || '' }));
                      setProductsIndex(products);
                    } catch (e) {
                      // ignore
                    }
                  }
                }}
                onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              />
              {suggestOpen && suggestions && suggestions.length > 0 && (
                <div className="nav-search-suggestions" role="listbox">
                  {suggestions.map(s => (
                    <button key={s.id} className="nav-suggestion-item" onMouseDown={(e) => { e.preventDefault(); const q = s.sku && String(s.sku).trim() ? s.sku : s.name; window.location.href = `/search-results?q=${encodeURIComponent(q)}`; }}>
                      {s.image ? <img src={resolveImageUrl(s.image)} alt="" className="nav-suggestion-thumb"/> : <span className="nav-suggestion-thumb empty"/>}
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className="nav-suggestion-text">{s.name}</span>
                        {s.sku && <small style={{ color: '#666', marginTop: 4 }}>{s.sku}</small>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="submit"
                style={{
                  background: '#19a974',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Enter
              </button>
            </form>
          </div>
        )}
  {/* Secondary nav row: browse links and mobile toggle */}
        <div className={`nav-secondary ${secondaryOpen ? 'open' : ''}`} ref={secondaryRef}>
          <div className="container">
            <nav id="secondary-links" aria-label="Browse links">
              {/* Browse by Category shows an expanded panel on hover or click */}
              <div className="nav-categories-wrapper">
                <Link
                  to="/categories"
                  className="nav-secondary-link nav-categories-toggle"
                  onClick={(e) => {
                    e.preventDefault();
                    try {
                      try { setSecondaryOpen(false); } catch (err) {}
                      try { setCategoriesOpen(false); } catch (err) {}
                      navigate('/categories');
                      requestAnimationFrame(() => setTimeout(() => {
                        try {
                          const heading = document.querySelector('.main-content > h2');
                          if (heading && heading.scrollIntoView) {
                            console.info('Navbar: scrolling to category heading via scrollIntoView');
                            heading.scrollIntoView({ block: 'start' });
                            return;
                          }
                          const navEl = document.querySelector('.nav');
                          const navHeight = navEl ? Math.ceil(navEl.getBoundingClientRect().height) : 140;
                          console.info('Navbar: falling back to scrollBy', navHeight);
                          window.scrollBy(0, -navHeight + 6);
                        } catch (e) {}
                      }, 400));
                    } catch (err) { window.location.href = '/categories'; }
                  }}
                >
                  Browse by Category
                </Link>
              </div>

              {/* Browse by Machine (integrated manufacturer / machine type / model) */}
              <div
                className="nav-manufacturers-wrapper"
                ref={machineWrapRef}
                style={{ position: 'relative' }}
                onMouseEnter={() => {
                  if (machineCloseTimerRef.current) clearTimeout(machineCloseTimerRef.current);
                  setMachinePanelOpen(true);
                }}
                onMouseLeave={() => {
                  if (machineCloseTimerRef.current) clearTimeout(machineCloseTimerRef.current);
                  machineCloseTimerRef.current = setTimeout(() => setMachinePanelOpen(false), 140);
                }}
              >
                <a
                  href="/machines"
                  className="nav-secondary-link nav-manufacturers-toggle"
                  onClick={async (e) => {
                    e.preventDefault();
                    // Click opens the dropdown; it will close on mouse-leave or outside click.
                    const willOpen = !machinePanelOpen;
                    setSecondaryOpen(true);
                    if (manufacturers.length === 0 || Object.keys(machineTypes || {}).length === 0) await loadManufacturers();
                    setCategoriesOpen(false);
                    setMachinePanelOpen(willOpen);
                  }}
                >
                  Browse by Machine
                </a>
                <div
                  ref={panelRef}
                  className={`nav-manufacturer-inline${machinePanelOpen ? ' open' : ''}`}
                  style={{
                    position: 'absolute',
                    left: panelLeft != null ? panelLeft : 0,
                    top: '100%',
                    zIndex: 45,
                    minWidth: 360,
                    display: machinePanelOpen ? 'block' : 'none',
                    transform: 'none'
                  }}
                >
                  <div className="simple-gallery-filter-header" style={{ padding: '10px 12px 6px' }}>Browse Machines</div>
                  <div className="nav-manufacturer-row" style={{ padding: '12px' }}>
                    <select className="filter-select" value={selManufacturer} onChange={(e) => { const v = e.target.value; setSelManufacturer(v); setSelMachineType(''); setSelModel(''); }}>
                      <option value="">All Manufacturers</option>
                      {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="filter-select" value={selMachineType} onChange={(e) => { const v = e.target.value; setSelMachineType(v); }}>
                      <option value="">All Machine Types</option>
                      {(() => {
                        // If nothing selected, prefer flat compatibility list or aggregated nested
                        if (!selManufacturer) {
                          if (compatMachineTypes && compatMachineTypes.length) return compatMachineTypes;
                          return Object.keys(machineTypes || {}).flatMap(m=>Object.keys(machineTypes[m]||{})).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a.localeCompare(b));
                        }
                        // Try nested map first
                        const nested = machineTypes[selManufacturer] || {};
                        const nestedKeys = Object.keys(nested || {}).sort((a,b)=>a.localeCompare(b));
                        if (nestedKeys.length) return nestedKeys;
                        // Fallback: scan compatProducts for this manufacturer and collect machine_type values
                        if (compatProducts && compatProducts.length) {
                          const set = new Set();
                          for (const p of compatProducts) {
                            try {
                              if (((p.manufacturer || '').trim()) === (selManufacturer || '').trim()) {
                                const mt = (p.machine_type || p.machineType || '').toString().trim();
                                if (mt) set.add(mt);
                              }
                            } catch (e) { /* ignore malformed product rows */ }
                          }
                          return Array.from(set).sort((a,b)=>a.localeCompare(b));
                        }
                        return [];
                      })().map(mt => <option key={mt} value={mt}>{mt}</option>)}
                    </select>
                    <select className="filter-select" value={selModel} onChange={(e) => setSelModel(e.target.value)}>
                      <option value="">All Models</option>
                      {(modelsList || []).map(mo => <option key={mo} value={mo}>{mo}</option>)}
                      {/* If modelsList empty and a manufacturer is selected, attempt to populate from compatProducts */}
                      {(!(modelsList && modelsList.length) && selManufacturer && compatProducts && compatProducts.length) && (() => {
                        const s = new Set();
                        for (const p of compatProducts) {
                          try {
                            if (((p.manufacturer || '').trim()) === (selManufacturer || '').trim()) {
                              const mo = (p.model || '').toString().trim(); if (mo) s.add(mo);
                            }
                          } catch (e) {}
                        }
                        return Array.from(s).sort((a,b)=>a.localeCompare(b)).map(mo => <option key={`fb-${mo}`} value={mo}>{mo}</option>);
                      })()}
                    </select>
                    <a className="nav-secondary-link nav-manufacturer-search" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8 }} onClick={() => {
                      const params = new URLSearchParams(); if (selManufacturer) params.set('manufacturer', selManufacturer); if (selMachineType) params.set('machine_type', selMachineType); if (selModel) params.set('model', selModel); const url = `/search-results?${params.toString()}`; navigate(url);
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-4.35-4.35"/><path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/></svg>
                      <span>Search</span>
                    </a>
                  </div>
                </div>
              </div>
              <Link to="/about" className="nav-secondary-link">About Us</Link>
            </nav>
          </div>
        </div>
  </nav>

      {/* Left-side sliding panel and backdrop for mobile categories - rendered outside the nav
          so fixed positioning and z-index don't get affected by nav stacking contexts */}
  <div className={`nav-categories-panel right${leftPanelOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Categories panel">
        <div className="categories-panel-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button className="nav-icon" onClick={() => setLeftPanelOpen(false)} aria-label="Close categories" title="Close">
              <svg className="nav-svg" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {categories && categories.length ? (
              categories.map(cat => (
                <CategoryAccordion
                  key={cat.category}
                  category={cat}
                  isOpen={activeCategory === cat.category}
                  onToggle={() => {
                    // toggle active category when user taps the chevron
                    setActiveCategory(prev => (prev === cat.category ? '' : cat.category));
                  }}
                  onNavigate={(url) => {
                    try {
                      navigate(url);
                    } catch (e) {
                      try { window.location.href = url; } catch (err) {}
                    }
                    try { setLeftPanelOpen(false); } catch (err) {}
                  }}
                />
              ))
            ) : (
              <div style={{ padding: 8, color: '#666' }}>{categoriesLoading ? 'Loading...' : 'No categories'}</div>
            )}
          </div>
        </div>
      </div>
  <div className={`right-panel-backdrop${leftPanelOpen ? ' open' : ''}`} onClick={() => setLeftPanelOpen(false)} aria-hidden={!leftPanelOpen}></div>
    </>
  );
}