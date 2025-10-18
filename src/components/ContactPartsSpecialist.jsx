import React, { useState } from 'react';

export default function ContactPartsSpecialist() {
  const [form, setForm] = useState({
    subject: '',
    email: '',
    message: '',
    attachment: null
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      setForm({ ...form, attachment: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    // TODO: Implement backend email sending and file upload
    setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', padding: '2rem', color: '#222' }}>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Contact a Parts Specialist</h2>
      <div style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
        <strong>Email:</strong> <a href="mailto:parts@agexus.com">parts@agexus.com</a><br />
        <strong>Phone:</strong> <a href="tel:+18885551234">(888) 555-1234</a>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Your Email" required type="email" style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <textarea name="message" value={form.message} onChange={handleChange} placeholder="Your Request" rows={4} required style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
        <input name="attachment" type="file" onChange={handleChange} style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc' }} />
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
          Submit Request
        </button>
      </form>
      {submitted && (
        <div style={{ marginTop: '2rem', color: '#28a745', fontWeight: 600, fontSize: '1.1rem' }}>
          Thank you! Your request has been submitted. A parts specialist will contact you soon.
        </div>
      )}
    </div>
  );
}
