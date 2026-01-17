import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';

// Card supports an optional image prop to render a semi-transparent background image.
const Card = ({ title, tag, note, to, image }) => {
  const inner = (
    <>
      <div className="card-content">
        <span className="pill">{tag}</span>
        <h3>{title}</h3>
        <p className="muted">{note}</p>
      </div>
      {image && (
        <div className="card-footer">
          <img className="card-image" src={resolveImageUrl(image)} alt={title} loading="lazy" />
        </div>
      )}
    </>
  );
  if (to) return <Link className="card card--with-image" to={to}>{inner}</Link>;
  return <div className="card card--with-image">{inner}</div>;
};

// Small static sample mapping as fallback; we'll try to pull real sample images from products.
const SAMPLE_IMAGES = {
  Tillage: '/tillage.png',
  Harvesting: '/harvesting.png',
  'Hay and Forage': '/hay_and_forage.png',
  Mowing: '/mowing.png'
};

const CardRow = () => {
  const [images, setImages] = React.useState({});
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/get-data');
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        let products = [];
        if (Array.isArray(json)) products = json;
        else if (json && Array.isArray(json.products)) products = json.products;

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

        const cats = ['Tillage','Harvesting','Hay and Forage','Mowing'];
        const map = {};
        for (const c of cats) map[c] = null;
        for (const p of products) {
          if (!p || !p.category) continue;
          const cat = String(p.category).trim();
          if (!cats.includes(cat)) continue;
          if (map[cat]) continue; // already have a sample
          const img = pickImage(p);
          if (img) map[cat] = img;
        }
        if (mounted) setImages(map);
      } catch (err) {
        // ignore, we'll use fallbacks
      }
    })();
    return () => { mounted = false; };
  }, []); 

  return (
    <div className="card-grid">
      <Card tag="Tillage" to="/categories/Tillage" image={images.Tillage || SAMPLE_IMAGES.Tillage} />
      <Card tag="Harvest" to="/categories/Harvesting" image={images.Harvesting || SAMPLE_IMAGES.Harvesting} />
      <Card tag="Hay and Forage" to="/categories/Hay%20and%20Forage" image={images['Hay and Forage'] || SAMPLE_IMAGES['Hay and Forage']} />
      <Card tag="Mowing" to="/categories/Mowing" image={images.Mowing || SAMPLE_IMAGES.Mowing} />
    </div>
  );
};

export default function Hero() {
  const [manufacturers, setManufacturers] = useState([]);
  const [compatMachineTypes, setCompatMachineTypes] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [machineTypes, setMachineTypes] = useState({}); // nested mapping manufacturer -> machine_type -> [models]
  const [compatProducts, setCompatProducts] = useState([]);

  const [selManufacturer, setSelManufacturer] = useState('');
  const [selMachineType, setSelMachineType] = useState('');
  const [selModel, setSelModel] = useState('');

  const mountedRef = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        // try the flat compatibility options endpoint first
        try {
          const res = await fetch('/.netlify/functions/get-compatibility-options');
          if (res && res.ok) {
            const json = await res.json();
            if (json) {
              if (Array.isArray(json.manufacturers) && mountedRef.current) setManufacturers(json.manufacturers.slice().sort((a,b)=>a.localeCompare(b)));
              if (Array.isArray(json.machine_types) && mountedRef.current) setCompatMachineTypes(json.machine_types.slice().sort((a,b)=>a.localeCompare(b)));
              if (Array.isArray(json.models) && mountedRef.current) setModelsList(json.models.slice().sort((a,b)=>a.localeCompare(b)));
            }
          }
        } catch (e) {
          // ignore and fall back to get-data
        }

        // fetch product data to build nested mapping and fallback lists
        const res2 = await fetch('/.netlify/functions/get-data');
        if (!res2.ok) throw new Error('fetch failed');
        const json2 = await res2.json();
        const products = Array.isArray(json2) ? json2 : (json2 && Array.isArray(json2.products) ? json2.products : []);
        if (!mountedRef.current) return;
        setCompatProducts(products);

        const read = (obj, ...keys) => {
          for (const k of keys) {
            if (!obj) continue;
            const v = obj[k];
            if (v !== undefined && v !== null) return v;
          }
          return undefined;
        };

        // flat fallbacks
        try {
          const flatMachineTypes = Array.from(new Set(products.map(p => String((read(p, 'machine_type', 'machineType', 'machine') || '')).trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
          const flatModels = Array.from(new Set(products.map(p => String((read(p, 'model', 'models') || '')).trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
          if ((!compatMachineTypes || compatMachineTypes.length === 0) && flatMachineTypes.length && mountedRef.current) setCompatMachineTypes(flatMachineTypes);
          if ((!modelsList || modelsList.length === 0) && flatModels.length && mountedRef.current) setModelsList(flatModels);
        } catch (e) { /* ignore */ }

        // nested mapping
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
  if (manuArr.length && mountedRef.current) setManufacturers(manuArr);
        const nested = {};
        for (const [m, mtMap] of manuMap.entries()) {
          nested[m] = {};
          for (const [mt, models] of mtMap.entries()) nested[m][mt] = Array.from(models).sort((a,b)=>a.localeCompare(b));
        }
  if (mountedRef.current) setMachineTypes(nested);
  if (mountedRef.current) console.info('Hero: compatibility nested mapping loaded', { manufacturers: manuArr.length, nestedKeys: Object.keys(nested).length });
        // if modelsList was empty, populate from nested
        if ((!modelsList || modelsList.length === 0) && mountedRef.current) {
          const allModels = new Set();
          for (const mt of Object.values(nested)) for (const mdlArr of Object.values(mt)) for (const mo of mdlArr) allModels.add(mo);
          if (allModels.size > 0) setModelsList(Array.from(allModels).sort((a,b)=>a.localeCompare(b)));
        }
      } catch (err) {
        // ignore errors silently here
        console.error('Hero: failed to load compatibility options', err && err.message);
      }
    })();
    return () => { mountedRef.current = false; };
  }, []);

  // when manufacturer selection changes, update available machine types and models
  useEffect(() => {
    if (!selManufacturer) { setCompatMachineTypes([]); setModelsList([]); setSelMachineType(''); return; }
    let cancelled = false;

    const loadForManufacturer = async () => {
      // try server-side manufacturer-specific endpoint first
      try {
        const res = await fetch('/.netlify/functions/get-compatibility-by-manufacturer?manufacturer=' + encodeURIComponent(selManufacturer));
        if (res && res.ok) {
          const json = await res.json();
          console.info('Hero: get-compatibility-by-manufacturer response', { manufacturer: selManufacturer, json });
          if (json && Array.isArray(json.machine_types) && !cancelled) {
            setCompatMachineTypes(json.machine_types);
          }
          if (json && json.models_by_machine_type && !cancelled) {
            setMachineTypes(prev => ({ ...prev, [selManufacturer]: json.models_by_machine_type }));
            if (selMachineType && json.models_by_machine_type[selMachineType]) setModelsList(json.models_by_machine_type[selMachineType]);
            return;
          }
        }
      } catch (e) {
        // server call failed, fall back to client-side mapping
      }

      // fallback: use client-side nested mapping
      if (cancelled) return;
      const foundKey = Object.keys(machineTypes || {}).find(k => String(k).toLowerCase().trim() === String(selManufacturer || '').toLowerCase().trim());
      const nested = foundKey ? machineTypes[foundKey] : {};
      const types = Object.keys(nested).sort((a,b)=>a.localeCompare(b));
      console.info('Hero: selManufacturer effect fallback', { selManufacturer, nestedExists: Object.keys(machineTypes || {}).includes(selManufacturer), nestedKeys: Object.keys(nested).length, compatProducts: compatProducts ? compatProducts.length : 0 });
      if (types.length && !cancelled) setCompatMachineTypes(types);

      const allModels = new Set();
      if (Object.keys(nested).length > 0) {
        for (const mtArr of Object.values(nested)) for (const mo of mtArr) allModels.add(mo);
      } else if (compatProducts && compatProducts.length > 0) {
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
      if (!cancelled) setModelsList(Array.from(allModels).sort((a,b)=>a.localeCompare(b)));
    };

    loadForManufacturer();
    return () => { cancelled = true; };
  }, [selManufacturer, machineTypes, selMachineType]);

  // when machine type changes, populate model list
  useEffect(() => {
    try {
      if (!selMachineType) { setModelsList([]); setSelModel(''); return; }
      let models = [];
      if (selManufacturer) {
        const foundManKey = Object.keys(machineTypes || {}).find(k => String(k).toLowerCase().trim() === String(selManufacturer || '').toLowerCase().trim());
        const mtObj = foundManKey ? (machineTypes[foundManKey] || {}) : {};
        // tolerant machine type key lookup
        const foundMtKey = Object.keys(mtObj || {}).find(k => String(k).toLowerCase().trim() === String(selMachineType || '').toLowerCase().trim());
        models = foundMtKey ? (mtObj[foundMtKey] || []) : (mtObj[selMachineType] || []);
      } else {
        const setModels = new Set();
        for (const manu of Object.keys(machineTypes || {})) {
          const arr = (machineTypes[manu] || {})[selMachineType] || [];
          for (const m of arr) setModels.add(m);
        }
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
      // Preserve current model selection if it still exists in the new models list.
      setSelModel(prev => {
        try {
          if (prev && models && models.includes(prev)) return prev;
        } catch (e) { /* ignore */ }
        return '';
      });
    } catch (e) { setModelsList([]); }
  }, [selMachineType, selManufacturer, machineTypes]);

  // debug: log when models list changes
  useEffect(() => {
    console.info('Hero: modelsList updated', { length: modelsList ? modelsList.length : 0, sample: modelsList && modelsList.slice ? modelsList.slice(0,10) : modelsList });
  }, [modelsList]);

  // debug: log when selected model changes
  useEffect(() => {
    console.info('Hero: selModel changed', selModel);
  }, [selModel]);

  const onSearch = () => {
    const params = new URLSearchParams();
    if (selManufacturer) params.set('manufacturer', selManufacturer);
    if (selMachineType) params.set('machine_type', selMachineType);
    if (selModel) params.set('model', selModel);
    const q = params.toString();
    navigate(`/search-results${q ? '?' + q : ''}`);
  };

  return (
    <>
      <header className="hero" role="banner" style={{ '--hero': 'url(/hero-16x9.png)' }}>
        <div className="hero-content container">
          <span className="kicker">Trusted farm parts</span>
          <h2>Keeping your equipment in the field</h2>
          <p>OEM & aftermarket parts, fast shipping, and expert support. From tillage to hydraulics    weve got the parts that keep you running.</p>
          <div className="cta-row">
            <Link className="btn primary" to="/catalog">Browse Catalog</Link>
            <Link className="btn secondary" to="/categories" style={{ marginLeft: 8 }}>Browse by Category</Link>
            <Link className="btn secondary" to="/contact-parts-specialist">Talk to Parts Expert</Link>
          </div>
          <div className="hero-search-overlay">
            <div className="overlay-inner">
              <div style={{ marginBottom: 8, color: 'rgba(205, 205, 205, 0.9)', fontSize: '1rem', fontWeight: 700 }}>Search Parts by Machine</div>
              <label className="hs-row">
                <select name="manufacturer" value={selManufacturer} onChange={(e)=>{
                  const v = String(e.target.value || '').trim();
                  console.info('Hero: manufacturer selected', v);
                  setSelManufacturer(v);
                }}>
                  <option value="">Select Make</option>
                  {manufacturers && manufacturers.map(m => <option key={String(m)} value={String(m)}>{m}</option>)}
                </select>
              </label>
              <label className="hs-row">
                <select name="machinetype" value={selMachineType} onChange={(e)=>{
                  const v = String(e.target.value || '').trim();
                  console.info('Hero: machine type selected', v);
                  setSelMachineType(v);
                }} disabled={!selManufacturer} className={(!selManufacturer ? 'is-disabled' : '')} aria-disabled={!selManufacturer}>
                  <option value="">Select Machine Type</option>
                  {compatMachineTypes && compatMachineTypes.map(mt => <option key={String(mt)} value={String(mt)}>{mt}</option>)}
                </select>
              </label>
              <label className="hs-row">
                <select name="model" value={selModel} onChange={(e)=>{
                  const v = String(e.target.value || '').trim();
                  console.info('Hero: model selected', v, 'modelsList length', modelsList ? modelsList.length : 0);
                  setSelModel(v);
                }} disabled={!selMachineType} className={(!selMachineType ? 'is-disabled' : '')} aria-disabled={!selMachineType}>
                  <option value="">Select Model</option>
                  {modelsList && modelsList.map(mo => <option key={String(mo)} value={String(mo)}>{mo}</option>)}
                </select>
              </label>
              <div className="hs-action">
                <button
                  type="button"
                  onClick={onSearch}
                  className="btn apply"
                  disabled={!selManufacturer}
                  aria-disabled={!selManufacturer}
                  title={!selManufacturer ? 'Select Make to enable search' : 'Search'}
                  style={{ opacity: selManufacturer ? 1 : 0.5, cursor: selManufacturer ? 'pointer' : 'not-allowed' }}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </header>
      <section className="hero-categories">
        <div className="container">
          <CardRow />
        </div>
      </section>
    </>
  );
}