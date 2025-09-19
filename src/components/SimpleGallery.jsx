import React from "react";
import { Link } from "react-router-dom";
import "../styles/site.css";

import { useEffect, useState } from "react";

export default function SimpleGallery() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ textAlign: "center", marginBottom: "2rem", color: "#222", fontWeight: 700 }}>
        Simple Product Gallery
      </h2>
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888' }}>Loading products...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>
      ) : (
        <div className="gallery-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", maxWidth: "1200px", margin: "0 auto" }}>
          {products.map((product) => (
            <div
              key={product.id}
              className="product-card"
              style={{
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                maxWidth: "280px",
                minWidth: 0,
                margin: "0 auto",
              }}
            >
              <img
                src={product.image}
                alt={product.name}
                style={{ width: "100%", height: "140px", objectFit: "cover", background: "#f8f8f8", borderRadius: "8px" }}
              />
              <h3 style={{ color: "#222", fontWeight: 700, fontSize: "1.1rem", margin: "16px 0 8px 0", textAlign: "center" }}>{product.name}</h3>
              <div style={{ flex: 1, color: "#555", fontSize: "0.97rem", marginBottom: "16px", textAlign: "center" }}>{product.description}</div>
              <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center", marginTop: "8px" }}>
                <Link
                  to={`/product/${product.id}`}
                  className="btn secondary"
                  style={{ padding: "0.7rem 1.2rem", fontWeight: 600, borderRadius: "8px", background: "#f0f0f0", color: "#222", border: "none", textDecoration: "none" }}
                >
                  View Details
                </Link>
                <button
                  className="btn primary"
                  style={{ padding: "0.7rem 1.2rem", fontWeight: 600, borderRadius: "8px", background: "#19a974", color: "#fff", border: "none" }}
                  onClick={() => alert(`Added ${product.name} to cart!`)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
