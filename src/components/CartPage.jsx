import React, { useState } from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import { useStripe } from '@stripe/react-stripe-js';
import ShippingRatesButton from './ShippingRatesButton.jsx';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';
import { useNavigate } from 'react-router-dom';
import FreightInquiryPage from './FreightInquiryPage';

function StripeCheckoutButton({ cart, disabled }) {
  const stripe = useStripe();
  const navigate = useNavigate();
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
    // Client-side validation: ensure all items have valid positive prices before calling server
    const stripeCart = getStripeCart();
    const invalid = stripeCart.find(({ product }) => typeof product.price !== 'number' || !isFinite(product.price) || product.price <= 0);
    if (invalid) {
      console.error('Checkout blocked: invalid product price in cart', invalid.product);
      window.alert('Cannot checkout: one or more items have invalid or missing prices. Please remove them from your cart.');
      return;
    }
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: stripeCart, shippingCost: shipping.cost, customer_email: '' }),
      });
      if (!res.ok) {
        // Try to read response body (JSON or text) to show a helpful message
        let payloadText = '';
        try {
          const txt = await res.text();
          // Try parse JSON first
          try {
            const j = JSON.parse(txt);
            payloadText = j && j.error ? j.error : JSON.stringify(j);
          } catch (e) {
            payloadText = txt;
          }
        } catch (e) {
          payloadText = `Status ${res.status}`;
        }
        console.error('Checkout failed response:', res.status, payloadText);
        window.alert(`Checkout failed: ${payloadText}`);
        return;
      }
      const dataText = await res.text().catch(() => null);
      let data = null;
      try { data = dataText ? JSON.parse(dataText) : null; } catch (e) { data = null; }
      if (!data || !data.url) {
        console.error('Checkout invalid payload:', dataText);
        window.alert('Checkout failed: invalid response from server.');
        return;
      }
      // navigate to Stripe checkout
      window.location = data.url;
    } catch (err) {
      console.error('Checkout error', err);
      window.alert('Checkout failed — network error. Please try again later.');
    }
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

// Normalize image URLs: prefer absolute URLs; if given a filename, prefix with VITE_IMAGE_BASE_URL or CDN.
const getImageUrl = (img) => resolveImageUrl(img);

function calculateShipping(cartItems) {
  const totalWeight = cartItems.reduce((sum, i) => sum + ((i.product.weight || 0) * i.quantity), 0);
  // Products may store dimensions in mm (length_mm/width_mm/height_mm) or in inches (length/width/height).
  // Normalize to inches for threshold comparisons. Prefer explicit mm fields when present.
  const toInches = (mm) => (typeof mm === 'number' ? mm / 25.4 : 0);
  const getMaxDimInInches = (p) => {
    // Prefer *_mm fields if they exist and are > 0
    const mmFields = [p.length_mm, p.width_mm, p.height_mm].filter(v => typeof v === 'number' && v > 0);
    if (mmFields.length) return Math.max(...mmFields.map(toInches));
    // Fallback to inch fields
    const inFields = [p.length, p.width, p.height].filter(v => typeof v === 'number' && v > 0);
    if (inFields.length) return Math.max(...inFields);
    return 0;
  };
  const maxLength = Math.max(...cartItems.map(i => getMaxDimInInches(i.product)));
  const orderTotal = cartItems.reduce((sum, i) => sum + (Number(i.product.price) * i.quantity), 0);

  let cost = 0;

  if (totalWeight <= 2) cost = 10;
  else if (totalWeight <= 10) cost = 20;
  else if (totalWeight <= 25) cost = 35;
  else if (totalWeight <= 50) cost = 60;
  else cost = 150; // freight

  // maxLength is in inches now
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
  // Respect selected shipping in cart if present
  const selectedShipping = cart.shipping || null; // { cost, label }
  const shippingCost = selectedShipping ? Number(selectedShipping.cost || 0) : (shipping && shipping.type !== 'freight' ? Number(shipping.cost || 0) : 0);
  const isFreight = shipping?.type === 'freight' || totalWeight > 100 || (selectedShipping && selectedShipping.rateId && selectedShipping.cost > 0 && false);
  const tax = 0; // placeholder for tax calculation if needed
  const grandTotal = subtotal + tax + (selectedShipping ? Number(selectedShipping.cost || 0) : 0);

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
            {/* Header row for columns: Item (left) and Price | Qty | Total (right) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 800, margin: '0 auto', padding: '0 0.5rem 0.5rem 0.5rem', color: '#666', fontSize: '0.95rem', boxSizing: 'border-box' }}>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 100, textAlign: 'right' }}>Price</div>
                <div style={{ width: 120, textAlign: 'center' }}>Qty</div>
                <div style={{ minWidth: 110, textAlign: 'right' }}>Total</div>
              </div>
            </div>

            <div className="cart-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cart.items.map(({ product, quantity }) => (
                <div key={product.id} className="cart-card" style={{ display: 'flex', flexDirection: 'column', background: '#f8f8f8', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 4px #eee', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    {product.image && (
                      <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, boxShadow: '0 1px 4px #ccc' }}
                        loading="lazy"
                        onError={e => { console.log('Image error:', product.image, getImageUrl(product.image)); e.currentTarget.src = '/logo.png'; }}
                      />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
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

                        {/* Right side: unit price | qty controls | line total */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12 }}>
                          <div style={{ textAlign: 'right', minWidth: 100, fontWeight: 700, fontSize: '1.05rem' }}>
                            {(() => {
                              const price = Number(product.price);
                              const discountPerc = Number(product.discount_perc) || 0;
                              const endDate = product.discount_end_date ? new Date(product.discount_end_date) : null;
                              const now = new Date();
                              const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
                              const unitPrice = (saleActive && !isNaN(price)) ? Number((price * (1 - discountPerc)).toFixed(2)) : price;
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <div style={{ fontSize: '0.95rem', color: saleActive ? '#d32f2f' : '#222' }}>
                                    {isNaN(unitPrice) ? 'N/A' : `$${unitPrice.toFixed(2)}`}
                                  </div>
                                  {saleActive && !isNaN(price) && (
                                    <div style={{ fontSize: '0.85rem', color: '#888', textDecoration: 'line-through' }}>${price.toFixed(2)}</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              style={{ background: '#fff', color: '#333', border: '1px solid #d6d6d6', borderRadius: 6, width: 32, height: 32, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }}
                              onClick={() => { dispatch({ type: 'SUBTRACT_FROM_CART', product }); }}
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, color: '#222', fontSize: '1.1rem' }}>{quantity}</span>
                            <button
                              style={{ background: '#fff', color: '#333', border: '1px solid #d6d6d6', borderRadius: 6, width: 32, height: 32, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }}
                              onClick={() => { dispatch({ type: 'ADD_TO_CART', product }); }}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <div style={{ textAlign: 'right', minWidth: 110, fontWeight: 800, fontSize: '1.05rem' }}>
                            {(() => {
                              const price = Number(product.price);
                              const discountPerc = Number(product.discount_perc) || 0;
                              const endDate = product.discount_end_date ? new Date(product.discount_end_date) : null;
                              const now = new Date();
                              const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
                              const unitPrice = (saleActive && !isNaN(price)) ? Number((price * (1 - discountPerc)).toFixed(2)) : price;
                              const lineTotal = (!isNaN(unitPrice) ? (unitPrice * quantity) : 0);
                              return isNaN(lineTotal) ? 'Total N/A' : `$${lineTotal.toFixed(2)}`;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Qty controls moved into the header-aligned row; removed redundant controls here */}
                </div>
              ))}
            </div>
            {/* Cost breakdown */}
            <div className="cart-summary" style={{ textAlign: 'right', marginTop: '2rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', wordBreak: 'break-word' }}>Subtotal: ${subtotal.toFixed(2)}</div>
              <div style={{ fontWeight: 500, fontSize: '1.05rem', color: '#555', marginTop: '0.5rem' }}>Total Weight: {totalWeight.toFixed(2)} lbs</div>
              <div style={{ fontWeight: 500, fontSize: '1.05rem', color: '#555', marginTop: '0.5rem' }}>
                Shipping: {isFreight ? 'Need to Quote (Freight)' : (selectedShipping ? `${selectedShipping.label} — $${shippingCost.toFixed(2)}` : 'TBD')}
              </div>
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
                <button
                  className="btn primary"
                  style={{ fontWeight: 700, fontSize: '1.1rem', borderRadius: 8, padding: '0.7rem 2rem', marginLeft: '1rem' }}
                  onClick={() => navigate('/checkout')}
                >
                  Checkout
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
