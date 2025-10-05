import React, { useState } from 'react';
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
  const [submitted, setSubmitted] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    // TODO: send inquiry to backend or email
    setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', padding: '2rem', color: '#222' }}>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Freight Inquiry</h2>
      <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Cart Summary</h3>
      <ul style={{ marginBottom: '2rem', paddingLeft: 0 }}>
        {cart.items.map(({ product, quantity }) => (
          <li key={product.id} style={{ marginBottom: 8, listStyle: 'none', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
            <strong>{product.name}</strong> x {quantity} &mdash; ${Number(product.price).toFixed(2)} each
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" required type="email" style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <input name="address" value={form.address} onChange={handleChange} placeholder="Street Address" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <input name="city" value={form.city} onChange={handleChange} placeholder="City" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <input name="state" value={form.state} onChange={handleChange} placeholder="State" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <input name="zip" value={form.zip} onChange={handleChange} placeholder="ZIP Code" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Additional Notes (optional)" rows={3} style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <button type="submit" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: '1.1rem', borderRadius: 8, padding: '0.7rem 2rem', border: 'none', marginTop: 8 }}>
          Submit Inquiry
        </button>
      </form>
      {submitted && (
        <div style={{ marginTop: '2rem', color: '#28a745', fontWeight: 600, fontSize: '1.1rem' }}>
          Thank you! Your freight inquiry has been submitted.
        </div>
      )}
    </div>
  );
}
