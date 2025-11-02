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
    const siteKey = '0x4AAAAAAB-d-eg5_99Hui2g';
    const getTurnstileToken = async (siteKey) => {
      // Load script if needed
      if (!window.turnstile) {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
          if (existing) {
            existing.addEventListener('load', resolve);
            existing.addEventListener('error', reject);
            return;
          }
          const s = document.createElement('script');
          s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
          s.async = true;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      // Render invisible/compact widget and execute it
      return await new Promise((resolve, reject) => {
        let finished = false;
        const timeout = setTimeout(() => {
          if (!finished) {
            finished = true;
            reject(new Error('Turnstile widget timeout'));
          }
        }, 10000);

        try {
          const wrapper = document.createElement('div');
          wrapper.style.position = 'absolute';
          wrapper.style.left = '-9999px';
          document.body.appendChild(wrapper);
          const widget = document.createElement('div');
          wrapper.appendChild(widget);
          const widgetId = window.turnstile.render(widget, {
            sitekey: siteKey,
            size: 'compact',
            callback: (token) => {
              if (finished) return;
              finished = true;
              clearTimeout(timeout);
              try { document.body.removeChild(wrapper); } catch (e) {}
              resolve(token);
            }
          });
          setTimeout(() => {
            try {
              if (window.turnstile && typeof window.turnstile.reset === 'function') {
                try { window.turnstile.reset(widgetId); } catch (e) {}
              }
              window.turnstile.execute(widgetId);
            } catch (e) {
              if (!finished) {
                finished = true;
                clearTimeout(timeout);
                try { document.body.removeChild(wrapper); } catch (e) {}
                reject(e);
              }
            }
          }, 50);
        } catch (e) {
          reject(e);
        }
      });
    };
    let captchaToken = null;
    try {
      captchaToken = await getTurnstileToken(siteKey);
    } catch (err) {
      console.warn('Turnstile error', err);
    }

    if (!captchaToken) {
      window.alert('Captcha failed — please try again.');
      return;
    }

    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, shippingCost: shipping, captchaToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      window.alert(err.error || 'Checkout failed');
      return;
    }
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
