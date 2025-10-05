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
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: getStripeCart(), shippingCost: shipping.cost }),
    });
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

const getImageUrl = (img) => img && img.startsWith('http') ? img : (img ? `https://agexparts.netlify.app${img}` : '');

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
  const [shipping, setShipping] = useState(() => calculateShipping(cart.items));
  React.useEffect(() => {
    setShipping(calculateShipping(cart.items));
  }, [cart.items]);
  const totalWeight = cart.items.reduce((sum, i) => sum + ((i.product.weight || 0) * i.quantity), 0);

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', padding: '2rem', background: 'var(--bg)', boxSizing: 'border-box' }}>
        <h2
          className="distressed gallery-title"
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            marginTop: '4.5rem',
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
                      <img src={getImageUrl(product.image)} alt={product.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, boxShadow: '0 1px 4px #ccc' }} />
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
            <div style={{ textAlign: 'right', marginTop: '2rem', fontWeight: 700, fontSize: '1.2rem', wordBreak: 'break-word' }}>
              Total: ${total.toFixed(2)}
            </div>
            <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 500, fontSize: '1.05rem', color: '#555' }}>
              Total Weight: {totalWeight.toFixed(2)} lbs
            </div>
            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              {shipping && (
                <span style={{ fontWeight: 500, fontSize: '1.05rem', color: '#555', marginLeft: 12 }}>
                  Shipping: {shipping.type === 'freight' ? 'Freight' : 'Ground'}: {totalWeight > 100 ? 'Need to Quote' : `$${shipping.cost}`}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right', marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}>
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
              <>
                <button
                  className="btn freight"
                  style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    borderRadius: 8,
                    padding: '0.7rem 2rem',
                    minWidth: 180,
                    background: totalWeight > 100 ? '#557a2cff' : '#eee',
                    color: totalWeight > 100 ? '#fff' : '#aaa',
                    border: 'none',
                    boxShadow: totalWeight > 100 ? '0 2px 8px rgba(139,195,74,0.10)' : 'none',
                    cursor: totalWeight > 100 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    if (totalWeight > 100) navigate('/freight-inquiry', { state: { cart } });
                  }}
                  disabled={totalWeight <= 100}
                >
                  Get Freight Quote
                </button>
                <StripeCheckoutButton cart={cart.items} disabled={totalWeight > 100} />
              </>
            </div>
            <ShippingRatesButton
              cart={{ ...cart, shippingAddress }}
              fromAddress={{
                name: 'AgEx Parts',
                street1: '123 Main St',
                city: 'Fargo',
                state: 'ND',
                zip: '58102',
                country: 'US',
                phone: '555-555-5555',
                email: 'info@agexparts.com'
              }}
            />
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
