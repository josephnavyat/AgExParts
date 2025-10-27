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
      <div className="container">
        <h2 style={{ margin: 0, marginBottom: 18, fontSize: 28, color: 'white' }}>Popular Categories</h2>
        <div className="card-grid">
          <Card title="Discs & Tines" tag="Tillage" note="Blades, shanks, sweeps" />
          <Card title="Belts & Chains" tag="Drive" note="V‑belts, roller chain" />
          <Card title="Hoses & Fittings" tag="Hydraulics" note="Quick‑connects, cylinders" />
          <Card title="Bearings & Seals" tag="Bearings" note="Pillow blocks, seals" />
          <Card title="Lighting & Harness" tag="Electrical" note="LEDs, connectors" />
          <Card title="Oil & Air" tag="Filters" note="OEM & aftermarket" />
        </div>
      </div>
    </section>
  )
}
