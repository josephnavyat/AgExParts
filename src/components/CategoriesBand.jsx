import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl.js';

const Card = ({ title, tag, to, image }) => {
  return (
    <Link className="card card--with-image" to={to}>
      <div className="card-content">
        <span className="pill">{tag}</span>
        <h3>{title}</h3>
      </div>
      {image && (
        <div className="card-footer">
          <img className="card-image" src={resolveImageUrl(image)} alt={title} loading="lazy" />
        </div>
      )}
    </Link>
  );
};

const SAMPLE_IMAGES = {
  Tillage: '/tillage.png',
  Harvesting: '/harvesting.png',
  'Hay and Forage': '/hay_and_forage.png',
  Mowing: '/mowing.png'
};

const CardRow = () => (
  <div className="card-grid">
    <Card tag="Tillage" title="Tillage" to="/categories/Tillage" image={SAMPLE_IMAGES.Tillage} />
    <Card tag="Harvest" title="Harvesting" to="/categories/Harvesting" image={SAMPLE_IMAGES.Harvesting} />
    <Card tag="Hay and Forage" title="Hay and Forage" to="/categories/Hay%20and%20Forage" image={SAMPLE_IMAGES['Hay and Forage']} />
    <Card tag="Mowing" title="Mowing" to="/categories/Mowing" image={SAMPLE_IMAGES.Mowing} />
  </div>
);

export default function CategoriesBand() {
  return (
    <section className="categories" aria-label="Categories band">
      <div className="container">
        <CardRow />
      </div>
    </section>
  );
}
