import React, { useState } from "react";

export default function ShippingRatesButton({ cart, fromAddress, toAddress, onRates, compact, disabled = false, showResults = true, onResponse }) {
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState(null);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

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
    setRawResponse(null);
    try {
      const first = cart.items[0]?.product;
      const mmToIn = mm => mm ? (mm / 25.4) : undefined;
      const parcel = {
        length: mmToIn(first?.length_mm) || 10,
        width: mmToIn(first?.width_mm) || 8,
        height: mmToIn(first?.height_mm) || 4,
        distance_unit: "in",
        weight: getTotalWeightOz(),
        mass_unit: "oz"
      };
  const to_address = toAddress || cart.shippingAddress || {
        name: "Customer",
        street1: "1438 8th St",
        city: "Santa Monica",
        state: "CA",
        zip: "90405",
        country: "US"
      };

      console.debug('Shipping to:', to_address);
      console.debug('Parcel:', parcel);

      const res = await fetch("/.netlify/functions/get-shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_address, from_address: fromAddress, parcel })
      });

      const data = await res.json();
      console.debug('get-shipping-rates response:', data);
      setRawResponse(data);
      if (typeof onResponse === 'function') {
        try { onResponse(data); } catch (e) { console.warn('onResponse callback error', e); }
      }

      if (data && data.rates && data.rates.length > 0) {
        setRates(data.rates);
        if (typeof onRates === 'function') {
          try { onRates(data.rates); } catch (e) { console.warn('onRates callback error', e); }
        }
      } else {
        const msg = data && data.error ? data.error : 'No rates found';
        const details = data && data.details ? `\nDetails: ${JSON.stringify(data.details)}` : '';
        setError(`${msg}${details}`);
      }
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "1.5rem 0" }}>
      <button
        className="btn secondary"
        style={{ fontWeight: 600, fontSize: compact ? '0.9rem' : '1rem', borderRadius: 8, padding: compact ? '0.45rem 0.9rem' : '0.7rem 2rem' }}
        onClick={handleGetRates}
        disabled={loading || disabled}
      >
  {loading ? (compact ? "Getting..." : "Getting Shipping Rates...") : (compact ? "Calculate Shipping" : "Calculate Shipping")}
      </button>
  {/* no helper shown under the buttons when disabled per UI request */}
      {error && <div style={{ color: "#d32f2f", marginTop: 8 }}>{error}</div>}
      {showResults && rates && rates.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <b>Shipping Rates:</b>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {rates.map((rate) => (
              <li key={rate.object_id || rate.raw?.id || Math.random()} style={{ margin: "6px 0" }}>
                {rate.provider} {rate.servicelevel?.name || rate.servicelevel?.token}: ${rate.amount} ({rate.estimated_days || "?"} days)
              </li>
            ))}
          </ul>
        </div>
      )}
      {showResults && rawResponse && !rates && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer' }}>Debug: raw response</summary>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(rawResponse, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
