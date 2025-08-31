import React from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";

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
                    <td style={{ textAlign: 'center' }}>{quantity}</td>
                    <td style={{ textAlign: 'right' }}>${(product.price * quantity).toFixed(2)}</td>
                    <td>
                      <button
                        className="btn secondary"
                        style={{ fontSize: '0.95rem', padding: '0.3rem 0.8rem', borderRadius: 6, marginLeft: 8 }}
                        onClick={() => dispatch({ type: 'REMOVE_FROM_CART', id: product.id })}
                      >
                        Remove
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
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
