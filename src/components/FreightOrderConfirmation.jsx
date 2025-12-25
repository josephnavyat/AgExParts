import React from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { useStripe } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';

export default function FreightOrderConfirmation() {
  const { cart, shippingCost } = useCart();
  const stripe = useStripe();
  const navigate = useNavigate();

  const subtotal = cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
  const shipping = shippingCost || 0;
  const total = subtotal + Number(shipping);

  const handleCheckout = async () => {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, shippingCost: shipping }),
    });
    const { url } = await res.json();
    window.location = url;
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ maxWidth: 700, margin: '2rem auto', padding: 24, background: '#fff', borderRadius: 8 }}>
        <h2>Freight Order Confirmation</h2>
        <table style={{ width: '100%', marginBottom: 24 }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, idx) => (
              <tr key={idx}>
                <td>{item.product.name}</td>
                <td>{item.quantity}</td>
                <td>${item.product.price}</td>
                <td>${(item.product.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ textAlign: 'right', marginBottom: 12 }}>
          <div>Subtotal: <strong>${subtotal.toFixed(2)}</strong></div>
          <div>Freight Cost: <strong>${shipping}</strong></div>
          <div style={{ fontSize: 18, marginTop: 8 }}>Total: <strong>${total.toFixed(2)}</strong></div>
        </div>
        <button className="btn primary" style={{ fontWeight: 700, fontSize: '1.1rem', borderRadius: 8, padding: '0.7rem 2rem' }} onClick={handleCheckout}>
          Proceed to Payment
        </button>
      </div>
      <Footer />
    </>
  );
}
