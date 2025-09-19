import React from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";

import { useStripe } from '@stripe/react-stripe-js';
function StripeCheckoutButton({ cart }) {
  const stripe = useStripe();

  const handleCheckout = async () => {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart }),
    });
    const { url } = await res.json();
    window.location = url;
  };

  return (
    <button
      className="btn primary"
      style={{ fontWeight: 700, fontSize: '1.1rem', borderRadius: 8, padding: '0.7rem 2rem', marginLeft: '1rem' }}
      onClick={handleCheckout}
    >
      Checkout with Stripe
    </button>
  );
}

export default function CartPage() {
  const { cart, dispatch } = useCart();
  const total = cart.items.reduce((sum, i) => sum + (i.product.price || 0) * i.quantity, 0);

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', padding: '2rem', background: 'var(--bg)' }}>
        <h2
          className="distressed gallery-title"
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            marginTop: '4.5rem', // push header down below navbar
            color: '#222', // much darker for readability
            textShadow: '0 1px 4px #fff, 0 0px 1px #bbb',
          }}
        >
          Shopping Cart
        </h2>
        {cart.items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', fontSize: '1.2rem', fontWeight: 500 }}>Your cart is empty.</div>
        ) : (
          <div style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', padding: '2rem', color: '#222' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Product</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map(({ product, quantity }) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.5rem' }}>{product.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <button
                          style={{
                            background: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            width: 28,
                            height: 28,
                            fontWeight: 700,
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => dispatch({ type: 'SUBTRACT_FROM_CART', product })}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600, color: '#222' }}>{quantity}</span>
                        <button
                          style={{
                            background: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            width: 28,
                            height: 28,
                            fontWeight: 700,
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => dispatch({ type: 'ADD_TO_CART', product })}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>${(product.price * quantity).toFixed(2)}</td>
                    <td>
                      <button
                        className="btn secondary"
                        style={{
                          fontSize: '1.2rem',
                          padding: '0.3rem 0.8rem',
                          borderRadius: 6,
                          marginLeft: 8,
                          background: 'none',
                          color: '#d32f2f',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Remove from cart"
                        onClick={() => dispatch({ type: 'REMOVE_FROM_CART', id: product.id })}
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#d32f2f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="5" x2="15" y2="15" />
                          <line x1="15" y1="5" x2="5" y2="15" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: '1.5rem', fontWeight: 700, fontSize: '1.2rem' }}>
              Total: ${total.toFixed(2)}
            </div>
            <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
              <button
                className="btn primary"
                style={{ fontWeight: 700, fontSize: '1.1rem', borderRadius: 8, padding: '0.7rem 2rem' }}
                onClick={() => dispatch({ type: 'CLEAR_CART' })}
              >
                Clear Cart
              </button>
              <StripeCheckoutButton cart={cart.items} />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
