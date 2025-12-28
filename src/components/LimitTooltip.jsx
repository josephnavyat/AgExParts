import React from 'react';
import { useCart } from './CartContext.jsx';

// Small presentational tooltip that shows the transient limit message for a product
export default function LimitTooltip({ productId, style = {}, className = '' }) {
  const { limitMap } = useCart();
  const msg = limitMap && productId ? limitMap[productId] : undefined;
  if (!msg) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`limit-tooltip ${className}`}
      style={{
        marginTop: 6,
        color: '#d32f2f',
        fontWeight: 800,
        fontSize: '0.95rem',
        ...style,
      }}
    >
      {msg}
    </div>
  );
}
