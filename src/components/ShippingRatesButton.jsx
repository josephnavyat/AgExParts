import React, { useState } from "react";

import { useCart } from './CartContext.jsx';

export default function ShippingRatesButton({ cart, fromAddress, toAddress, onRates, onResponse, onSelect, compact, showResults, inlineResults = true }) {
  const { dispatch } = useCart();
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState(null);
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
      // Debug log
      console.log('Shipping to:', to_address);
      console.log('Parcel:', parcel);
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
      if (data.rates) {
        const ratesArr = Array.isArray(data.rates) ? data.rates.slice() : [];
        // pick cheapest by numeric amount
        ratesArr.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        const cheapest = ratesArr[0];
  // use the sorted array for UI and callbacks so cheapest is first
  setRates(ratesArr);
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
  if (typeof onResponse === 'function') onResponse({ rates: ratesArr, selected: cheapest });
  if (typeof onRates === 'function') onRates(ratesArr);
      } else setError(data.error || "No rates found");
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
        onClick={handleGetRates}
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
    </div>
  );
}
