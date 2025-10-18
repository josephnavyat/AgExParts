import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function OrderSuccess() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  // Get session_id (order_no) from query string
  const params = new URLSearchParams(location.search);
  const order_no = params.get("session_id");

  useEffect(() => {
    if (!order_no) return;
    fetch(`/.netlify/functions/get-order?order_no=${order_no}`)
      .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
      .then(data => {
        setOrder(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [order_no]);

  return (
    <>
      <Navbar />
      <div style={{ minHeight: "80vh", padding: "2rem", background: "var(--bg)" }}>
        <h2 className="distressed gallery-title" style={{ textAlign: "center", marginBottom: "2rem", marginTop: "4.5rem", color: "#222" }}>
          Order Success
        </h2>
        {loading ? (
          <div style={{ textAlign: "center", color: "#888" }}>Loading order...</div>
        ) : error ? (
          <div style={{ textAlign: "center", color: "red" }}>Error: {String(error)}</div>
        ) : order ? (
          <div style={{ maxWidth: 700, margin: "0 auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.10)", padding: "2rem", color: "#222" }}>
            <h3>Order #{order.order_ref}</h3>
            <div><b>Name:</b> {order.customer_name}</div>
            <div><b>Email:</b> {order.customer_email}</div>
            <div><b>Shipping:</b> {order.ship_address1}, {order.ship_city}, {order.ship_state} {order.ship_postal_code}, {order.ship_country}</div>
            <div><b>Total:</b> ${order.grand_total}</div>
            <h4 style={{ marginTop: "2rem" }}>Items</h4>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem", minWidth: 120 }}>Product</th>
                  <th style={{ textAlign: "center", padding: "0.5rem", minWidth: 70 }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "0.5rem", minWidth: 100 }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "0.5rem", minWidth: 120 }}>{item.name || item.part_id}</td>
                    <td style={{ textAlign: "center", minWidth: 70 }}>{item.qty}</td>
                    <td style={{ textAlign: "right", minWidth: 100 }}>${item.unit_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#888" }}>No order found.</div>
        )}
      </div>
      <Footer />
    </>
  );
}
