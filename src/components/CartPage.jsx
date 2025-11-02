import React, { useState } from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import { useStripe } from '@stripe/react-stripe-js';
import ShippingRatesButton from './ShippingRatesButton.jsx';
import { useNavigate } from 'react-router-dom';
import FreightInquiryPage from './FreightInquiryPage';

function StripeCheckoutButton({ cart, disabled }) {
  const stripe = useStripe();
  const navigate = useNavigate();
  // Helper to load Turnstile and get a token. Falls back to rendering an invisible widget if execute not available.
  const getTurnstileToken = async (siteKey) => {
    // If execute is available, try it first
  // We must render a widget and call execute(widgetId). Calling execute(siteKey, ...) is invalid.

    // Load script if not present and wait for ready
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

  // After load, proceed to render a fresh invisible widget and execute it.

    // Render an invisible widget and execute it, with timeout.
    return await new Promise((resolve, reject) => {
      let finished = false;
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          reject(new Error('Turnstile widget timeout'));
        }
      }, 10000); // 10s

      try {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        document.body.appendChild(wrapper);
        const widget = document.createElement('div');
        wrapper.appendChild(widget);
        // Render with valid size; 'invisible' is not a supported value per Turnstile API.
        const widgetId = window.turnstile.render(widget, {
          sitekey: siteKey,
          size: 'compact',
          callback: (t) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            try { document.body.removeChild(wrapper); } catch (e) {}
            resolve(t);
          }
        });
        // execute the rendered widget id
        setTimeout(() => {
          try {
            // Some older versions may require reset before execute if already running
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
  // Map cart items to use discounted price if sale is active
  const getStripeCart = () => {
    return cart.map(({ product, quantity }) => {
      const price = Number(product.price);
      const discountPerc = Number(product.discount_perc) || 0;
      const endDate = product.discount_end_date ? new Date(product.discount_end_date) : null;
      const now = new Date();
      const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
      const finalPrice = saleActive && !isNaN(price) ? Number((price * (1 - discountPerc)).toFixed(2)) : price;
      return {
        product: { ...product, price: finalPrice },
        quantity
      };
    });
  };

  const totalWeight = cart.reduce((sum, i) => sum + ((i.product.weight || 0) * i.quantity), 0);
  const shipping = calculateShipping(cart);
  const handleCheckout = async () => {
    if (totalWeight > 100) {
      if (window.confirm('Heavy Items. Freight quote will be needed. Proceeding to page.')) {
        navigate('/freight-inquiry', { state: { cart } });
      }
      return;
    }
    if (disabled) return;
    // Obtain Turnstile token
    const siteKey = '0x4AAAAAAB-d-eg5_99Hui2g';
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
      body: JSON.stringify({ cart: getStripeCart(), shippingCost: shipping.cost, captchaToken }),
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
    <button
      className="btn primary"
      style={{ fontWeight: 700, fontSize: '1.1rem', borderRadius: 8, padding: '0.7rem 2rem', marginLeft: '1rem', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
      onClick={handleCheckout}
      disabled={disabled}
    >
      Checkout
    </button>
  );
}

const getImageUrl = (img) => img && img.startsWith('http') ? img : (img ? img : '/logo.png');

function calculateShipping(cartItems) {
  const totalWeight = cartItems.reduce((sum, i) => sum + ((i.product.weight || 0) * i.quantity), 0);
  const maxLength = Math.max(...cartItems.map(i => Math.max(i.product.length_mm || 0, i.product.width_mm || 0, i.product.height_mm || 0)));
  const orderTotal = cartItems.reduce((sum, i) => sum + (Number(i.product.price) * i.quantity), 0);

  let cost = 0;

  if (totalWeight <= 2) cost = 10;
  else if (totalWeight <= 10) cost = 20;
  else if (totalWeight <= 25) cost = 35;
  else if (totalWeight <= 50) cost = 60;
  else cost = 150; // freight

  if (maxLength > 48) return { type: 'freight', cost: 150 };
  if (maxLength > 36) cost += 25;
  else if (maxLength > 24) cost += 10;

  if (orderTotal > 2000) cost = 0; // optional cap

  return { type: 'ground', cost };
}

export default function CartPage() {
  const { cart, dispatch } = useCart();
  const navigate = useNavigate();
  // Calculate total using discounted price if sale is active
  const total = cart.items.reduce((sum, i) => {
    const price = Number(i.product.price);
    const discountPerc = Number(i.product.discount_perc) || 0;
    const endDate = i.product.discount_end_date ? new Date(i.product.discount_end_date) : null;
    const now = new Date();
    const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
    const finalPrice = saleActive && !isNaN(price) ? price * (1 - discountPerc) : price;
    return sum + finalPrice * i.quantity;
  }, 0);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    street1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  // Check for low stock and insufficient stock
  const insufficientStock = cart.items.some(i => i.quantity > Number(i.product.inventory ?? 0));
  const lowStockItems = cart.items.filter(i => Number(i.product.inventory ?? 0) > 0 && i.quantity >= Number(i.product.inventory ?? 0));
  const [shipping, setShipping] = useState(() => calculateShipping(cart.items));
  React.useEffect(() => {
    setShipping(calculateShipping(cart.items));
  }, [cart.items]);
  const totalWeight = cart.items.reduce((sum, i) => sum + ((i.product.weight || 0) * i.quantity), 0);

  // Cost breakdown calculations (used in the UI)
  const subtotal = total; // products subtotal (discounts already applied)
  const shippingCost = (shipping && shipping.type !== 'freight') ? Number(shipping.cost || 0) : 0;
  const isFreight = shipping?.type === 'freight' || totalWeight > 100;
  const tax = 0; // placeholder for tax calculation if needed
  const grandTotal = subtotal + (isFreight ? 0 : shippingCost) + tax;

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', padding: '2rem', background: 'var(--bg)', boxSizing: 'border-box' }}>
        <h2
          className="distressed gallery-title"
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            marginTop: '7rem', // Increased to ensure visibility below navbar
            color: '#222',
            textShadow: '0 1px 4px #fff, 0 0px 1px #bbb',
            fontSize: '2rem',
            wordBreak: 'break-word',
          }}
        >
          Shopping Cart
        </h2>
        {cart.items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', fontSize: '1.2rem', fontWeight: 500 }}>Your cart is empty.</div>
        ) : (
          <div className="cart-page-content" style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', padding: '2rem', color: '#222', boxSizing: 'border-box', width: '100%' }}>
            <div className="cart-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cart.items.map(({ product, quantity }) => (
                <div key={product.id} className="cart-card" style={{ display: 'flex', flexDirection: 'column', background: '#f8f8f8', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 4px #eee', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {product.image && (
                      <>
                        <img 
                          src={getImageUrl(product.image)} 
                          alt={product.name} 
                          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, boxShadow: '0 1px 4px #ccc' }} 
                          loading="lazy"
                          onError={e => { console.log('Image error:', product.image, getImageUrl(product.image)); e.currentTarget.src = '/logo.png'; }}
                        />
                      </>
                    )}
                    <div style={{ flex: 1 }}>
                      <span className="cart-product-name" style={{ fontWeight: 700, fontSize: '1.05rem', display: 'block', marginBottom: 2 }}>
                        {product.name.length > 100 ? product.name.slice(0, 100) + '…' : product.name}
                      </span>
                      {product.sku && (
                        <span className="cart-product-sku" style={{ fontSize: '0.95rem', color: '#666', display: 'block', marginBottom: 2 }}>SKU: {product.sku}</span>
                      )}
                      <span className="cart-product-weight" style={{ fontSize: '0.95rem', color: '#388e3c', display: 'block', marginTop: 2 }}>
                        Weight: {product.weight ? product.weight + ' lbs' : 'N/A'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 90, fontWeight: 700, fontSize: '1.05rem' }}>
                      {(() => {
                        const price = Number(product.price);
                        const discountPerc = Number(product.discount_perc) || 0;
                        const endDate = product.discount_end_date ? new Date(product.discount_end_date) : null;
                        const now = new Date();
                        const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
                        if (saleActive && !isNaN(price)) {
                          const salePrice = (price * (1 - discountPerc)).toFixed(2);
                          return (
                            <>
                              <span style={{ textDecoration: 'line-through', color: '#888', marginRight: 8 }}>
                                ${price.toFixed(2)}
                              </span>
                              <span style={{ color: '#d32f2f', fontWeight: 700 }}>
                                ${salePrice}
                              </span>
                            </>
                          );
                        } else if (!isNaN(price)) {
                          return `$${price.toFixed(2)}`;
                        } else {
                          return 'Price N/A';
                        }
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, marginTop: 8 }}>
                    <button
                      style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, width: 32, height: 32, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }}
                      onClick={() => { dispatch({ type: 'SUBTRACT_FROM_CART', product }); }}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, color: '#222', fontSize: '1.1rem' }}>{quantity}</span>
                    <button
                      style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, width: 32, height: 32, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }}
                      onClick={() => { dispatch({ type: 'ADD_TO_CART', product }); }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Cost breakdown */}
            <div className="cart-summary" style={{ textAlign: 'right', marginTop: '2rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', wordBreak: 'break-word' }}>Subtotal: ${subtotal.toFixed(2)}</div>
              <div style={{ fontWeight: 500, fontSize: '1.05rem', color: '#555', marginTop: '0.5rem' }}>Total Weight: {totalWeight.toFixed(2)} lbs</div>
              <div style={{ fontWeight: 500, fontSize: '1.05rem', color: '#555', marginTop: '0.5rem' }}>Shipping: {isFreight ? 'Need to Quote (Freight)' : `$${shippingCost.toFixed(2)}`}</div>
              <div style={{ fontWeight: 500, fontSize: '1.05rem', color: '#555', marginTop: '0.5rem' }}>Tax: ${tax.toFixed(2)}</div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#222', marginTop: '0.75rem' }}>Total: ${grandTotal.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="btn danger"
                style={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  borderRadius: 8,
                  padding: '0.7rem 2rem',
                  minWidth: 120,
                  background: '#d32f2f',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(211,47,47,0.10)',
                }}
                onClick={() => { dispatch({ type: 'CLEAR_CART' }); }}
              >
                Clear Cart
              </button>
              { (shipping?.type === 'freight' || totalWeight > 100) ? (
                <button
                  className="btn freight"
                  style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    borderRadius: 8,
                    padding: '0.7rem 2rem',
                    minWidth: 180,
                    background: '#557a2cff',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(139,195,74,0.10)',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/freight-inquiry', { state: { cart } })}
                >
                  Get Freight Quote
                </button>
              ) : (
                <StripeCheckoutButton cart={cart.items} disabled={false} />
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
