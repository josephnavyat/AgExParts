import React, { useState } from 'react';
import Navbar from './Navbar.jsx';
import { useLocation } from 'react-router-dom';

export default function FreightInquiryPage() {
  const location = useLocation();
  const cart = location.state?.cart || { items: [] };
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: ''
  });
  const NOTES_LIMIT = 255;
  const [submitted, setSubmitted] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.address || !form.city || !form.state || !form.zip) return;
    const res = await fetch('/.netlify/functions/create-freight-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form, cart }),
    });
    const result = await res.json();
    setSubmitted(true);
  };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '2rem auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', padding: '2rem', color: '#222' }}>
        <h2 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Freight Inquiry</h2>
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Cart Summary</h3>
        <div className="cart-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {cart.items.map(({ product, quantity }) => (
            <div key={product.id} className="cart-card" style={{ display: 'flex', alignItems: 'center', background: '#f8f8f8', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 4px #eee', width: '100%' }}>
              {product.image && (
                <img src={product.image.startsWith('http') ? product.image : `https://agexparts.netlify.app${product.image}`} alt={product.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, boxShadow: '0 1px 4px #ccc', marginRight: 16 }} />
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
                <span style={{ fontSize: '0.95rem', color: '#222', display: 'block', marginTop: 2 }}>
                  Qty: {quantity}
                </span>
                <span style={{ fontSize: '0.95rem', color: '#222', display: 'block', marginTop: 2 }}>
                  Price: ${Number(product.price).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" required type="email" style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
          <input name="address" value={form.address} onChange={handleChange} placeholder="Street Address" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
          <input name="city" value={form.city} onChange={handleChange} placeholder="City" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
          <input name="state" value={form.state} onChange={handleChange} placeholder="State" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
          <input name="zip" value={form.zip} onChange={handleChange} placeholder="ZIP Code" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
          <div style={{ position: 'relative' }}>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional Notes (optional)"
              rows={3}
              maxLength={NOTES_LIMIT}
              style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc', width: '100%' }}
            />
            <div style={{ fontSize: '0.9rem', color: '#888', textAlign: 'right', marginTop: 2 }}>
              {NOTES_LIMIT - form.notes.length} characters left
            </div>
          </div>
          <button type="submit"
            style={{
              background: submitted ? '#eee' : '#557a2cff',
              color: submitted ? '#aaa' : '#fff',
              fontWeight: 700,
              fontSize: '1.1rem',
              borderRadius: 8,
              padding: '0.7rem 2rem',
              border: 'none',
              marginTop: 8,
              cursor: submitted ? 'not-allowed' : 'pointer',
              opacity: submitted ? 0.7 : 1
            }}
            disabled={submitted}
          >
            Submit Inquiry
          </button>
        </form>
        {submitted && (
          <div style={{ marginTop: '2rem', color: '#28a745', fontWeight: 600, fontSize: '1.1rem' }}>
            Thank you! Your freight inquiry has been submitted. We will get back to you with a shipping quote within 24-48 hours. Please see your email.
          </div>
        )}
      </div>
    </>
  );
}
