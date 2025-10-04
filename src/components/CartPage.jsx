import React, { useState } from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import { useCart } from "./CartContext.jsx";
import { getProductQuantity } from "./CartContext.jsx";
import { useStripe } from '@stripe/react-stripe-js';
import ShippingRatesButton from './ShippingRatesButton.jsx';

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
      const finalPrice = saleActive && !isNaN(price) ? price * (1 - discountPerc) : price;
      return {
        ...product,
        price: finalPrice,
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

export default function CartPage() {
  const { cart, dispatch } = useCart();
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

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', padding: '2rem', background: 'var(--bg)' }}>
        <h2
          className="distressed gallery-title"
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            marginTop: '4.5rem',
            color: '#222',
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
                    <td style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                      {product.image && (
                        <img src={getImageUrl(product.image)} alt={product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, boxShadow: '0 1px 4px #ccc' }} />
                      )}
                      <span>{product.name}</span>
                    </td>
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
                    <td style={{ textAlign: 'right' }}>
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
                    </td>
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
            <div style={{ margin: '2rem 0 1rem 0', padding: '1.5rem', background: '#f8f8f8', borderRadius: 12 }}>
              <h3 style={{ marginBottom: 12 }}>Shipping Address</h3>
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
