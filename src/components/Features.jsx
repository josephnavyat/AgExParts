import React from 'react'

export default function Features() {
  return (
    <section>
      <div className="container feature">
        <div className="panel">
          <h3>Order with confidence</h3>
          <p>We verify fitment before shipping and offer returns on unused parts. Need help? Our team knows ag equipment inside and out.</p>
          <ul>
            <li>VIN/serial fitment checks</li>
            <li>Live support Mon‑Sat</li>
            <li>Bulk & dealer pricing</li>
          </ul>
        </div>
        <div className="panel">
          <h3>Fast, reliable delivery</h3>
          <p>Most in‑stock parts ship the same day from our Midwest warehouse, with free shipping over $199.</p>
          <ul>
            <li>Same‑day shipping before 3pm</li>
            <li>Real‑time tracking updates</li>
            <li>Local pickup available</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
