import React, { useState } from "react";

import { useCart } from './CartContext.jsx';

export default function ShippingRatesButton({ cart, fromAddress, toAddress, onRates, onResponse, onSelect, compact, showResults, inlineResults = true, onCalculateClick }) {
  const { dispatch } = useCart();
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState(null);
  const [estesQuote, setEstesQuote] = useState(null);
  const [error, setError] = useState(null);
  const [selectedRateId, setSelectedRateId] = useState(null);

  // Helper to sum total weight in ounces (Shippo expects oz)
  const getTotalWeightOz = () => {
    let total = 0;
    for (const item of cart.items) {
      // Assume product.weight is in pounds, convert to ounces
      const weight = item.product.weight || 1; // fallback to 1 lb if missing
      total += weight * 16 * item.quantity;
    }
    return total;
  };

  const handleGetRates = async () => {
    setLoading(true);
    setError(null);
    setRates(null);
    try {
      // Example: use first cart item for dimensions, sum weight
      const first = cart.items[0]?.product;
      // Convert mm to inches for Shippo (1 inch = 25.4 mm)
      const mmToIn = mm => mm ? (mm / 25.4) : undefined;
      const parcel = {
        length: mmToIn(first?.length_mm) || 10,
        width: mmToIn(first?.width_mm) || 8,
        height: mmToIn(first?.height_mm) || 4,
        distance_unit: "in",
        weight: getTotalWeightOz(),
        mass_unit: "oz"
      };
  // prefer explicit toAddress prop (passed from Checkout), otherwise use cart.shippingAddress or fallback
      const to_address = toAddress || cart.shippingAddress || {
        name: "Customer",
        street1: "1438 8th St",
        city: "Santa Monica",
        state: "CA",
        zip: "90405",
        country: "US"
      };
      // basic address validation: require street, city, state (2 letters), and zip
      const hasAddress = to_address && to_address.street1 && to_address.city && to_address.state && to_address.zip && (/^[A-Za-z]{2}$/.test(String(to_address.state)) && (/^[0-9]{5}(-[0-9]{4})?$/.test(String(to_address.zip))));
      if (!hasAddress) {
        setError('Please enter a complete shipping address before calculating rates');
        setLoading(false);
        return;
      }
  // Debug log
  console.debug('Shipping to:', to_address);
  console.debug('Parcel:', parcel);
  // If client-side detects a heavy/oversize parcel and server may filter placeholder, prepare a local placeholder fallback.
  const clientTotalLbs = (() => {
    try {
      let raw = Number(parcel.weight) || 0; // parcel.weight is in oz per client
      const mu = (parcel.mass_unit || '').toString().toLowerCase();
      if (mu === 'oz' || mu === 'ounces') raw = raw / 16; // oz -> lbs
      else if (mu === 'kg' || mu === 'kilograms') raw = raw * 2.2046226218; // kg -> lbs
      else if (mu === 'g' || mu === 'grams') raw = raw / 453.59237; // g -> lbs
      return raw;
    } catch (e) { return 0; }
  })();
  const clientOversize = (() => {
    try {
      const L = Number(parcel.length || 0); const W = Number(parcel.width || 0); const H = Number(parcel.height || 0);
      const girth = 2 * (W + H);
      return (L + girth) > 165;
    } catch (e) { return false; }
  })();
      const res = await fetch("/.netlify/functions/get-shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_address,
          from_address: fromAddress,
          parcel
        })
      });
      const data = await res.json();
      // capture any Estes quote payload included by the server
      if (data.estes_quote) {
        setEstesQuote(data.estes_quote);
      } else setEstesQuote(null);

      if (data.rates) {
        const ratesArr = Array.isArray(data.rates) ? data.rates.slice() : [];
        // Do not show the default freight placeholder (e.g. object_id: 'freight-placeholder-250')
        // until a real Estes quote is present. This avoids showing a $250 placeholder
        // shipping cost before the Estes handler returns a valid quote (requested by UX).
        const hasEstes = Boolean(data.estes_quote);
        const filteredRates = ratesArr.filter(r => {
          try {
            const id = (r && r.object_id) || (r && r.raw && r.raw.id) || '';
            // treat known placeholder pattern as transient
            if (!hasEstes && id && String(id).startsWith('freight-placeholder')) return false;
          } catch (e) {}
          return true;
        });
  // pick cheapest by numeric amount
  ratesArr.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
  // Use filteredRates only (always exclude freight-placeholder unless Estes provides a real quote)
  const displayedRates = (filteredRates && filteredRates.length > 0) ? filteredRates : [];
  const cheapest = displayedRates[0];
  // use the displayed array for UI and callbacks so cheapest is first
  setRates(displayedRates);
  if (cheapest) {
          // auto-select cheapest
          setSelectedRateId(cheapest.object_id);
          try {
            dispatch({ type: 'SET_SHIPPING_COST', shipping: { cost: Number(cheapest.amount), label: `${cheapest.provider} ${cheapest.servicelevel?.name || cheapest.servicelevel?.token || ''}`, rateId: cheapest.object_id }, cost: Number(cheapest.amount), rate: cheapest });
          } catch (e) {
            console.error('Failed to dispatch shipping selection', e);
          }
          // notify parent that a rate was selected (auto-select cheapest)
          if (typeof onSelect === 'function') {
            try { onSelect(cheapest); } catch (e) { console.warn('onSelect handler failed', e); }
          }
        }
        if (typeof onResponse === 'function') onResponse({ rates: displayedRates, selected: cheapest });
        if (typeof onRates === 'function') onRates(displayedRates);
        // If there are no non-placeholder rates and we filtered out the placeholder, surface an error so the user knows quoting failed.
        if ((!filteredRates || filteredRates.length === 0) && ratesArr.length > 0 && !hasEstes) {
          setError('Unable to obtain carrier rates for this shipment');
        }
      } else setError(data.error || "No rates found");
      // If server returned only an Estes quote (no normal rates), try to extract list
      if (!data.rates && data.estes_quote) {
        // attempt to find arrays inside the estes payload
        const maybeArrays = Object.values(data.estes_quote).filter(v => Array.isArray(v) && v.length > 0);
        if (maybeArrays.length > 0) {
          // pick the first array and try to map to rate-like objects
          const arr = maybeArrays[0];
          const mapped = arr.map((it, idx) => {
            // attempt common fields
            const amount = Number(it.amount || it.price || it.rate || (it.total && it.total.amount) || 0);
            return {
              amount: amount ? String(amount) : '0.00',
              object_id: it.id || it.quoteId || `estes-${idx}`,
              provider: 'Estes',
              servicelevel: { name: it.service || it.serviceLevel || it.name || 'Estes Freight', token: it.service || null },
              estimated_days: it.transit_days || it.delivery_days || null,
              currency: it.currency || 'USD',
              raw: it
            };
          });
          setRates(mapped);
          if (typeof onRates === 'function') onRates(mapped);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "1.5rem 0" }}>
      <button
        className="btn secondary"
        style={{ fontWeight: 600, fontSize: "1rem", borderRadius: 8, padding: "0.7rem 2rem" }}
        onClick={() => { try { if (typeof onCalculateClick === 'function') onCalculateClick(); } catch (e) {} ; handleGetRates(); }}
        disabled={loading}
      >
        {loading ? "Getting Shipping Rates..." : "Calculate Shipping"}
      </button>
      {error && <div style={{ color: "#d32f2f", marginTop: 8 }}>{error}</div>}
      {inlineResults && rates && rates.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <b>Shipping Rates:</b>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {(() => {
              const sorted = Array.isArray(rates) ? rates.slice().sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0)) : [];
              return sorted.map((rate) => (
                <li key={rate.object_id} style={{ margin: "6px 0", display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="radio" name="shippingRate" value={rate.object_id} checked={selectedRateId === rate.object_id} onChange={() => {
                    setSelectedRateId(rate.object_id);
                    try {
                      dispatch({ type: 'SET_SHIPPING_COST', shipping: { cost: Number(rate.amount), label: `${rate.provider} ${rate.servicelevel?.name || rate.servicelevel?.token || ''}`, rateId: rate.object_id }, cost: Number(rate.amount), rate });
                    } catch (e) { console.error(e); }
                    // notify parent of manual selection
                    if (typeof onSelect === 'function') {
                      try { onSelect(rate); } catch (e) { console.warn('onSelect handler failed', e); }
                    }
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{rate.provider} {rate.servicelevel?.name || rate.servicelevel?.token}</div>
                    <div style={{ color: '#555' }}>{rate.estimated_days || '?'} days</div>
                  </div>
                  <div style={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}>${rate.amount}</div>
                </li>
              ));
            })()}
          </ul>
        </div>
      )}
      {/* Estes freight options (if provided by server) */}
      {inlineResults && estesQuote && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #eee' }}>
          <b>Estes Freight Options:</b>
          {/* Try to extract a quoted array from the Estes payload */}
          {(() => {
            const maybeArrays = Object.values(estesQuote).filter(v => Array.isArray(v) && v.length > 0);
            if (maybeArrays.length === 0) {
              // fallback: show pretty JSON
              return <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#333' }}>{JSON.stringify(estesQuote, null, 2)}</pre>;
            }
            const arr = maybeArrays[0];
            const items = arr.map((it, idx) => {
              const amount = Number(it.amount || it.price || it.rate || (it.total && it.total.amount) || 0);
              return {
                amount: amount ? String(amount) : '0.00',
                object_id: it.id || it.quoteId || `estes-${idx}`,
                provider: 'Estes',
                servicelevel: { name: it.service || it.serviceLevel || it.name || 'Estes Freight' },
                estimated_days: it.transit_days || it.delivery_days || null,
                raw: it
              };
            });
            return (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {items.map(rate => (
                  <li key={rate.object_id} style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" name="shippingRate" value={rate.object_id} checked={selectedRateId === rate.object_id} onChange={() => {
                      setSelectedRateId(rate.object_id);
                      try {
                        dispatch({ type: 'SET_SHIPPING_COST', shipping: { cost: Number(rate.amount), label: `Estes ${rate.servicelevel.name}`, rateId: rate.object_id }, cost: Number(rate.amount), rate });
                      } catch (e) { console.error(e); }
                      if (typeof onSelect === 'function') { try { onSelect(rate); } catch (e) { console.warn('onSelect handler failed', e); } }
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{rate.provider} {rate.servicelevel?.name}</div>
                      <div style={{ color: '#555' }}>{rate.estimated_days || '?'} days</div>
                    </div>
                    <div style={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}>${rate.amount}</div>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}
    </div>
  );
}
