import React from 'react';
import Layout from './Layout.jsx';

export default function DealerProgram() {
  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '1rem' }}>
      <h1>Dealer Program</h1>
      <p>Welcome to the AgEx Parts Dealer Program. Use this page to describe dealer benefits, pricing tiers, application process, and contact information.</p>

      <h2>Benefits</h2>
      <ul>
        <li>Volume discounts</li>
        <li>Priority order processing</li>
        <li>Dedicated account manager</li>
      </ul>

      <h2>How to Apply</h2>
      <p>Please email dealer@agexparts.com with your business information, resale certificate, and a brief description of expected order volume.</p>

      <h2>Terms</h2>
      <p>AgEx Parts reserves the right to approve dealer applications at our discretion. Pricing tiers are subject to change with notice.</p>
    </div>
  );
}
