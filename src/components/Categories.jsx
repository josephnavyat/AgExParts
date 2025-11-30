import React from 'react'
import CategoriesAccordion from './CategoriesAccordion'

export default function Categories() {
  return (
    <section id="catalog">
      <div style={{ maxWidth: 980, margin: '28px auto', padding: '0 20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 16 }}>Browse Categories</h2>
        <CategoriesAccordion />
      </div>

      <div className="badges">
        <div className="badge">
          <h3>Order with confidence</h3>
          <p>We verify fitment before shipping and offer returns on unused parts. Need help? Our team knows ag equipment inside and out.</p>
        </div>
        <div className="badge">
          <h3>Fast, reliable delivery</h3>
          <p>Select parts parts ship the same day and free local pick-up available from our Midwest warehouse.</p>
        </div>
      </div>

    </section>
  )
}
