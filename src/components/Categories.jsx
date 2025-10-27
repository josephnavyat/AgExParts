import React from 'react'

const Card = ({ title, tag, note }) => (
  <a className="card" href="#">
    <span className="pill">{tag}</span>
    <h3>{title}</h3>
    <p className="muted">{note}</p>
  </a>
)

export default function Categories() {
  return (
    
    <section id="catalog">
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
