import React, { useState } from "react";
import QuantityInput from './QuantityInput.jsx';
import LimitTooltip from './LimitTooltip.jsx';
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
  // Minimal stub: checkout handled elsewhere in this page; keep a valid component shape
  return null;
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
  // centralized transient limit messages are provided by CartContext

  // Controlled quantity input component: syncs initialValue with local state,
  // dispatches SET_QUANTITY on blur or Enter, and keeps the input responsive.
  // Replaced by shared QuantityInput component
  const { cart, dispatch, limitMap, showLimit } = useCart();
  // detect portrait orientation on narrow screens to avoid CSS specificity wars
  const [isPortrait, setIsPortrait] = React.useState(() => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:420px) and (orientation: portrait)').matches) || false);
  React.useEffect(() => {
    if (!window || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width:420px) and (orientation: portrait)');
    const onChange = (e) => setIsPortrait(e.matches);
    try { mq.addEventListener('change', onChange); } catch (e) { mq.addListener(onChange); }
    return () => { try { mq.removeEventListener('change', onChange); } catch (e) { mq.removeListener(onChange); } };
  }, []);
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
  const isFreight = shipping?.type === 'freight' || (selectedShipping && selectedShipping.rateId && selectedShipping.cost > 0 && false);
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
            {!isPortrait && (
              <div className="cart-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 800, margin: '0 auto', padding: '0 0.5rem 0.5rem 0.5rem', color: '#666', fontSize: '0.95rem', boxSizing: 'border-box' }}>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 100, textAlign: 'right' }}>Price</div>
                  <div style={{ width: 120, textAlign: 'center' }}>Qty</div>
                  <div style={{ minWidth: 110, textAlign: 'right' }}>Total</div>
                </div>
              </div>
            )}

            <div className="cart-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cart.items.map(({ product, quantity }) => {
                const price = Number(product.price);
                const discountPerc = Number(product.discount_perc) || 0;
                const endDate = product.discount_end_date ? new Date(product.discount_end_date) : null;
                const now = new Date();
                const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
                const unitPrice = (saleActive && !isNaN(price)) ? Number((price * (1 - discountPerc)).toFixed(2)) : price;
                const lineTotal = (!isNaN(unitPrice) ? (unitPrice * quantity) : 0);

                return (
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
                        <div className="cart-item-inner" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div className="cart-item-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span className="cart-product-name" style={{ fontWeight: 700, fontSize: '1.05rem', display: 'block', marginBottom: 6 }}>
                                {product.name.length > 100 ? product.name.slice(0, 100) + '…' : product.name}
                              </span>
                              {product.sku && (
                                <span className="cart-product-sku" style={{ fontSize: '0.95rem', color: '#666', display: 'block', marginBottom: 2 }}>SKU: {product.sku}</span>
                              )}
                              <span className="cart-product-weight" style={{ fontSize: '0.95rem', color: '#388e3c', display: 'block', marginTop: 2 }}>
                                Weight: {product.weight ? product.weight + ' lbs' : 'N/A'}
                              </span>
                            </div>

                            {!isPortrait && (
                              <div className="cart-desktop-controls" style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12, flex: '0 0 auto' }}>
                              <div className="cart-price" style={{ textAlign: 'right', minWidth: 100, fontWeight: 700, fontSize: '1.05rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <div style={{ fontSize: '0.95rem', color: saleActive ? '#d32f2f' : '#222' }}>{isNaN(unitPrice) ? 'N/A' : `$${unitPrice.toFixed(2)}`}</div>
                                  {saleActive && !isNaN(price) && (<div style={{ fontSize: '0.85rem', color: '#888', textDecoration: 'line-through' }}>${price.toFixed(2)}</div>)}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                                <div className="cart-qty-controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                { /* Decrease */ }
                                <button style={{ background: '#fff', color: '#333', border: '1px solid #d6d6d6', borderRadius: 6, width: 32, height: 32, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => { dispatch({ type: 'SUBTRACT_FROM_CART', product }); }} aria-label="Decrease quantity">-</button>
                                <QuantityInput initialValue={quantity} product={product} dispatch={dispatch} />
                                { /* Increase - disable when at inventory */ }
                                {(() => {
                                  const available = Number(product.inventory ?? product.quantity ?? 0);
                                  const existing = cart.items.find(i => i.product.id === product.id);
                                  const current = existing ? existing.quantity : 0;
                                  const isMaxed = Number.isFinite(available) && available > 0 && current >= available;
                                  return (
                                    <button
                                      style={{
                                        background: isMaxed ? '#f7f7f7' : '#fff',
                                        color: isMaxed ? '#999' : '#333',
                                        border: '1px solid #d6d6d6',
                                        borderRadius: 6,
                                        width: 32,
                                        height: 32,
                                        fontWeight: 700,
                                        fontSize: '1.2rem',
                                        cursor: isMaxed ? 'not-allowed' : 'pointer',
                                      }}
                                      onClick={() => {
                                        if (isMaxed) return;
                                        const desired = current + 1;
                                        if (Number.isFinite(available) && available > 0 && desired > available) {
                                          showLimit(product.id);
                                          return;
                                        }
                                        dispatch({ type: 'ADD_TO_CART', product });
                                      }}
                                      aria-label="Increase quantity"
                                      
                                    >+
                                    </button>
                                  );
                                })()}
                                </div>
                                <div style={{ position: 'relative' }}>
                                  {limitMap[product.id] && (
                                    <div
                                      role="status"
                                      aria-live="polite"
                                      style={{
                                        position: 'absolute',
                                        top: -34,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: '#d32f2f',
                                        border: '1px solid #b71c1c',
                                        color: '#ffffff',
                                        WebkitTextFillColor: '#ffffff',
                                        padding: '6px 8px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                                        whiteSpace: 'nowrap',
                                        zIndex: 9999,
                                        pointerEvents: 'none',
                                      }}
                                    >
                                      {limitMap[product.id]}
                                    </div>
                                  )}
                                </div>
                                                    <LimitTooltip productId={product.id} />
                              </div>

                              <div className="cart-line-total" style={{ textAlign: 'right', minWidth: 110, fontWeight: 800, fontSize: '1.05rem' }}>{isNaN(lineTotal) ? 'Total N/A' : `$${lineTotal.toFixed(2)}`}</div>
                              </div>
                            )}
                          </div>

                          <hr className="cart-divider" style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)', margin: 6 }} />

                          {isPortrait && (
                            <div className="cart-mobile-summary" style={{ marginTop: 8, paddingTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="mobile-qty-btn" aria-label="Decrease quantity" onClick={() => { dispatch({ type: 'SUBTRACT_FROM_CART', product }); }} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontWeight: 700 }}>−</button>
                                <QuantityInput initialValue={quantity} product={product} dispatch={dispatch} updateOnBlurOnly={true} />
                                <button className="mobile-qty-btn" aria-label="Increase quantity" onClick={() => {
                                  const available = Number(product.inventory ?? product.quantity ?? 0);
                                  const existing = cart.items.find(i => i.product.id === product.id);
                                  const current = existing ? existing.quantity : 0;
                                  const desired = current + 1;
                                  const isMaxedMobile = Number.isFinite(available) && available > 0 && current >= available;
                                  if (isMaxedMobile) {
                                    return;
                                  }
                                  if (Number.isFinite(available) && available > 0 && desired > available) {
                                    showLimit(product.id);
                                    return;
                                  }
                                  dispatch({ type: 'ADD_TO_CART', product });
                                }} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>+</button>
                                <div style={{ position: 'relative' }}>
                                  {limitMap[product.id] && (
                                    <div
                                      role="status"
                                      aria-live="polite"
                                      style={{
                                        position: 'absolute',
                                        top: -34,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: '#d32f2f',
                                        border: '1px solid #b71c1c',
                                        color: '#ffffff',
                                        WebkitTextFillColor: '#ffffff',
                                        padding: '6px 8px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                                        whiteSpace: 'nowrap',
                                        zIndex: 9999,
                                        pointerEvents: 'none',
                                      }}
                                    >
                                      {limitMap[product.id]}
                                    </div>
                                  )}
                                </div>
                                <div style={{ marginLeft: 12, color: '#666' }}>{`× $${isNaN(unitPrice) ? 'N/A' : unitPrice.toFixed(2)}`}</div>
                              </div>
                              <div className="line-total" style={{ fontWeight: 800 }}>{isNaN(lineTotal) ? 'Total N/A' : `$${lineTotal.toFixed(2)}`}</div>
                            </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              { (shipping?.type === 'freight') ? (
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
