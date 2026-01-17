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
  // Treat small screens (<= 900px) as the 'mobile' layout so the mobile qty
  // controls render under each item (after the divider). This matches user
  // expectation for phones and small tablets.
  const [isPortrait, setIsPortrait] = React.useState(() => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:900px)').matches) || false);
  React.useEffect(() => {
    if (!window || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width:900px)');
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
      <div className="page-wrapper" style={{ minHeight: '80vh' }}>
        <h2 className="distressed gallery-title cart-page-title">Shopping Cart</h2>
        {cart.items.length === 0 ? (
          <div className="cart-empty">Your cart is empty.</div>
        ) : (
          <div className="cart-page-content">

            <div className="cart-cards">
              {cart.items.map(({ product, quantity }) => {
                const price = Number(product.price);
                const discountPerc = Number(product.discount_perc) || 0;
                const endDate = product.discount_end_date ? new Date(product.discount_end_date) : null;
                const now = new Date();
                const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
                const unitPrice = (saleActive && !isNaN(price)) ? Number((price * (1 - discountPerc)).toFixed(2)) : price;
                const lineTotal = (!isNaN(unitPrice) ? (unitPrice * quantity) : 0);

                return (
                  <div key={product.id} className="cart-card">
                    <div className="cart-card-row">
                      {product.image && (
                        <img src={getImageUrl(product.image)} alt={product.name} className="cart-card-thumb" loading="lazy" onError={e => { console.log('Image error:', product.image, getImageUrl(product.image)); e.currentTarget.src = '/logo.png'; }} />
                      )}

                      <div className="cart-card-body">
                        <div className="cart-item-inner">
                          <div className="cart-item-header">
                            <div className="cart-item-main">
                              <span className="cart-product-name">{product.name.length > 100 ? product.name.slice(0, 100) + '…' : product.name}</span>
                              {product.sku && (
                                <span className="cart-product-sku" style={{ fontSize: '0.95rem', color: '#666', display: 'block', marginBottom: 2 }}>SKU: {product.sku}</span>
                              )}
                              <span className="cart-product-weight" style={{ fontSize: '0.95rem', color: '#388e3c', display: 'block', marginTop: 2 }}>
                                Weight: {product.weight ? product.weight + ' lbs' : 'N/A'}
                              </span>
                            </div>

                            {!isPortrait && (
                              <div className="cart-desktop-controls">
                                <div className="cart-price">
                                  <div className="cart-price-inner">
                                    <div className={saleActive ? 'cart-price-current sale' : 'cart-price-current'}>{isNaN(unitPrice) ? 'N/A' : `$${unitPrice.toFixed(2)}`}</div>
                                    {saleActive && !isNaN(price) && (<div className="cart-price-original">${price.toFixed(2)}</div>)}
                                  </div>
                                </div>
                                <div className="cart-qty-block">
                                  <div className="cart-qty-controls">
                                    <button className="qty-btn" onClick={() => { dispatch({ type: 'SUBTRACT_FROM_CART', product }); }} aria-label="Decrease quantity">-</button>
                                    <QuantityInput initialValue={quantity} product={product} dispatch={dispatch} />
                                    {(() => {
                                      const available = Number(product.inventory ?? product.quantity ?? 0);
                                      const existing = cart.items.find(i => i.product.id === product.id);
                                      const current = existing ? existing.quantity : 0;
                                      const isMaxed = Number.isFinite(available) && available > 0 && current >= available;
                                      return (
                                        <button className="qty-btn" onClick={() => {
                                          if (isMaxed) return;
                                          const desired = current + 1;
                                          if (Number.isFinite(available) && available > 0 && desired > available) { showLimit(product.id); return; }
                                          dispatch({ type: 'ADD_TO_CART', product });
                                        }} aria-label="Increase quantity">+</button>
                                      );
                                    })()}
                                  </div>
                                  <div className="limit-wrapper">{limitMap[product.id] && <div className="limit-message" role="status" aria-live="polite">{limitMap[product.id]}</div>}</div>
                                  <LimitTooltip productId={product.id} />
                                </div>
                                <div className="cart-line-total">{isNaN(lineTotal) ? 'Total N/A' : `$${lineTotal.toFixed(2)}`}</div>
                              </div>
                            )}
                          </div>

                          <hr className="cart-divider" />

                          {isPortrait && (
                            <div className="cart-mobile-summary">
                              <div className="cart-mobile-inner">
                                <div className="cart-mobile-qty">
                                  <button className="mobile-qty-btn" aria-label="Decrease quantity" onClick={() => { dispatch({ type: 'SUBTRACT_FROM_CART', product }); }}>−</button>
                                  <QuantityInput initialValue={quantity} product={product} dispatch={dispatch} updateOnBlurOnly={true} />
                                  <button className="mobile-qty-btn" aria-label="Increase quantity" onClick={() => {
                                    const available = Number(product.inventory ?? product.quantity ?? 0);
                                    const existing = cart.items.find(i => i.product.id === product.id);
                                    const current = existing ? existing.quantity : 0;
                                    const desired = current + 1;
                                    const isMaxedMobile = Number.isFinite(available) && available > 0 && current >= available;
                                    if (isMaxedMobile) return;
                                    if (Number.isFinite(available) && available > 0 && desired > available) { showLimit(product.id); return; }
                                    dispatch({ type: 'ADD_TO_CART', product });
                                  }}>+</button>
                                  {limitMap[product.id] && <div className="limit-message">{limitMap[product.id]}</div>}
                                  <div className="cart-mobile-price">{`× $${isNaN(unitPrice) ? 'N/A' : unitPrice.toFixed(2)}`}</div>
                                </div>
                                <div className="line-total">{isNaN(lineTotal) ? 'Total N/A' : `$${lineTotal.toFixed(2)}`}</div>
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
            <aside className="cart-summary">
              <div className="summary-title">Order Summary</div>
              <div className="summary-line summary-subtotal">Subtotal: ${subtotal.toFixed(2)}</div>
              <div className="summary-line summary-weight">Total Weight: {totalWeight.toFixed(2)} lbs</div>
              <div className="summary-line summary-shipping">Shipping: {isFreight ? 'Need to Quote (Freight)' : (selectedShipping ? `${selectedShipping.label} — $${shippingCost.toFixed(2)}` : 'TBD')}</div>
              <div className="summary-line summary-tax">Tax: To be Calculated</div>
              <div className="summary-line summary-total">Total: ${grandTotal.toFixed(2)}</div>
              <div className="cart-actions-row" align="center">
                <button className="btn cart-clear-btn" onClick={() => { dispatch({ type: 'CLEAR_CART' }); }}>Clear Cart</button>
                { (shipping?.type === 'freight') ? (
                  <button className="btn cart-freight-btn" onClick={() => navigate('/freight-inquiry', { state: { cart } })}>Get Freight Quote</button>
                ) : (
                  <button className="btn cart-checkout-btn" onClick={() => navigate('/checkout')}>Checkout</button>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
