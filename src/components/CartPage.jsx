import React, { useState } from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import { useStripe } from '@stripe/react-stripe-js';
import ShippingRatesButton from './ShippingRatesButton.jsx';
import { useNavigate } from 'react-router-dom';
import FreightInquiryPage from './FreightInquiryPage';

function StripeCheckoutButton({ cart }) {
  const stripe = useStripe();

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

  const handleCheckout = async () => {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: getStripeCart() }),
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

const getImageUrl = (img) => img && img.startsWith('http') ? img : (img ? `https://agexparts.netlify.app${img}` : '');

function calculateShipping(cartItems) {
  const totalWeight = cartItems.reduce((sum, i) => sum + (i.product.weight || 0), 0);
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

  if (orderTotal > 1000 && cost > 50) cost = 50; // optional cap

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
  const [shipping, setShipping] = useState(null);
  const totalWeight = cart.items.reduce((sum, i) => sum + (i.product.weight || 0), 0);

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
                      {product.description && (
                        <span className="cart-product-desc" style={{ fontSize: '0.95rem', color: '#666', display: 'block', marginBottom: 2 }}>{product.description}</span>
                      )}
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
                      onClick={() => dispatch({ type: 'SUBTRACT_FROM_CART', product })}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, color: '#222', fontSize: '1.1rem' }}>{quantity}</span>
                    <button
                      style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, width: 32, height: 32, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' }}
                      onClick={() => dispatch({ type: 'ADD_TO_CART', product })}
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
            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <button
                className="btn secondary"
                style={{ fontWeight: 600, fontSize: '1rem', borderRadius: 8, padding: '0.5rem 1.5rem', minWidth: 120, marginRight: 8 }}
                onClick={() => setShipping(calculateShipping(cart.items))}
              >
                Calculate Shipping
              </button>
              {shipping && (
                <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#1976d2', marginLeft: 12 }}>
                  Shipping: {shipping.type === 'freight' ? 'Freight' : 'Ground'} - ${shipping.cost}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right', marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="btn primary"
                style={{ fontWeight: 700, fontSize: '1.1rem', borderRadius: 8, padding: '0.7rem 2rem', minWidth: 120 }}
                onClick={() => dispatch({ type: 'CLEAR_CART' })}
              >
                Clear Cart
              </button>
              {totalWeight > 150 ? (
                <button
                  className="btn secondary"
                  style={{ fontWeight: 700, fontSize: '1.1rem', borderRadius: 8, padding: '0.7rem 2rem', minWidth: 180, background: '#1976d2', color: '#fff' }}
                  onClick={() => navigate('/freight-inquiry', { state: { cart } })}
                >
                  Quote for Freight
                </button>
              ) : (
                <StripeCheckoutButton cart={cart.items} />
              )}
            </div>
            <div style={{ margin: '2rem 0 1rem 0', padding: '1.5rem', background: '#f8f8f8', borderRadius: 12, boxSizing: 'border-box', width: '100%' }}>
              <h3 style={{ marginBottom: 12, fontSize: '1.1rem', wordBreak: 'break-word' }}>Shipping Address</h3>
              <form style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }} onSubmit={e => e.preventDefault()}>
                <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4 }}>Name</label>
                  <input required placeholder="Full Name" style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} value={shippingAddress.name} onChange={e => setShippingAddress(a => ({ ...a, name: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4 }}>Street Address</label>
                  <input required placeholder="Street Address" style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} value={shippingAddress.street1} onChange={e => setShippingAddress(a => ({ ...a, street1: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4 }}>City</label>
                  <input required placeholder="City" style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} value={shippingAddress.city} onChange={e => setShippingAddress(a => ({ ...a, city: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4 }}>State</label>
                  <input required placeholder="State" style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} value={shippingAddress.state} onChange={e => setShippingAddress(a => ({ ...a, state: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4 }}>ZIP</label>
                  <input required placeholder="ZIP" style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} value={shippingAddress.zip} onChange={e => setShippingAddress(a => ({ ...a, zip: e.target.value }))} />
                </div>
                <div style={{ flex: '1 1 15%', display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4 }}>Country</label>
                  <input required placeholder="Country" style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }} value={shippingAddress.country} onChange={e => setShippingAddress(a => ({ ...a, country: e.target.value }))} />
                </div>
              </form>
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
