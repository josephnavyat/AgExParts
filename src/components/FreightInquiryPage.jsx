import React, { useState } from 'react';
import Navbar from './Navbar.jsx';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';
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

  const getImageUrl = (img) => resolveImageUrl(img);

  return (
    <>
      <Navbar />
      <div className="freight-container">
        <h2 className="freight-title">Freight Inquiry</h2>
        <h3 className="freight-subtitle">Cart Summary</h3>
        <div className="cart-cards">
          {cart.items.map(({ product, quantity }) => (
            <div key={product.id} className="cart-card">
              {product.image && (
                <img
                  src={getImageUrl(product.image)}
                  alt={product.name}
                  className="cart-card-thumb"
                  loading="lazy"
                  onError={e => { e.currentTarget.src = '/logo.png'; }}
                />
              )}
              <div className="cart-card-body">
                <span className="cart-product-name">
                  {product.name.length > 100 ? product.name.slice(0, 100) + '…' : product.name}
                </span>
                {product.sku && (
                  <span className="cart-product-sku">SKU: {product.sku}</span>
                )}
                <span className="cart-product-weight">
                  Weight: {product.weight ? product.weight + ' lbs' : 'N/A'}
                </span>
                <span className="cart-product-qty">Qty: {quantity}</span>
                <span className="cart-product-price">Price: ${Number(product.price).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="freight-form">
          <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required />
          <input className="form-input" name="email" value={form.email} onChange={handleChange} placeholder="Email" required type="email" />
          <input className="form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" required />
          <input className="form-input" name="address" value={form.address} onChange={handleChange} placeholder="Street Address" required />
          <input className="form-input" name="city" value={form.city} onChange={handleChange} placeholder="City" required />
          <input className="form-input" name="state" value={form.state} onChange={handleChange} placeholder="State" required />
          <input className="form-input" name="zip" value={form.zip} onChange={handleChange} placeholder="ZIP Code" required />
          <div className="relative">
            <textarea
              className="form-textarea"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional Notes (optional)"
              rows={3}
              maxLength={NOTES_LIMIT}
            />
            <div className="notes-count">{NOTES_LIMIT - form.notes.length} characters left</div>
          </div>
          <button type="submit" className={submitted ? 'submit-btn disabled' : 'submit-btn'} disabled={submitted}>
            Submit Inquiry
          </button>
        </form>
        {submitted && (
          <div className="freight-submitted">
            Thank you! Your freight inquiry has been submitted. We will get back to you with a shipping quote within 24-48 hours. Please see your email.
          </div>
        )}
      </div>
    </>
  );
}
