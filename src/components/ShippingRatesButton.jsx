import React, { useState } from "react";

export default function ShippingRatesButton({ cart, fromAddress }) {
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState(null);
  const [error, setError] = useState(null);

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
      const parcel = {
        length: first?.length || 10,
        width: first?.width || 8,
        height: first?.height || 4,
        distance_unit: "in",
        weight: getTotalWeightOz(),
        mass_unit: "oz"
      };
      const to_address = cart.shippingAddress || {
        name: "Customer",
        street1: "",
        city: "",
        state: "",
        zip: "",
        country: "US"
      };
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
      if (data.rates) setRates(data.rates);
      else setError(data.error || "No rates found");
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
      {rates && (
        <div style={{ marginTop: 12 }}>
          <b>Shipping Rates:</b>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {rates.map((rate) => (
              <li key={rate.object_id} style={{ margin: "6px 0" }}>
                {rate.provider} {rate.servicelevel?.name || rate.servicelevel?.token}: ${rate.amount} ({rate.estimated_days || "?"} days)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
