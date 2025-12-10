import React from 'react'

export default function Footer() {
  return (
    <footer id="contact">
      <div className="container footer-grid">
        <div>
          <div className="brand" style={{ marginBottom: 12 }}>
            <img src="/logo.png" alt="AgEx Parts logo small" />
            <h1>AgEx Parts</h1>
          </div>
          <p>Reliable ag parts, fair prices, fast shipping.</p>
        </div>
        <div>
          <h4>Contact</h4>
          <p>Email: support@agexparts.com</p>
          <p>Phone: </p>
        </div>
        <div>
          <h4>Company</h4>
          <p><a href="#">About</a></p>
          <p><a href="#">Returns &amp; Warranty</a></p>
          <p><a href="#">Dealer Program</a></p>
        </div>
      </div>
    </footer>
  )
}
