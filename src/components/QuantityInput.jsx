import React from 'react';

export default function QuantityInput({ initialValue, product, dispatch, immediateDispatch = false, updateOnBlurOnly = false, showLimit }) {
  const [val, setVal] = React.useState(() => String(Number(initialValue || 0)));
  React.useEffect(() => { setVal(String(Number(initialValue || 0))); }, [initialValue]);

  React.useEffect(() => {
    if (immediateDispatch || updateOnBlurOnly) return;
    const desired = Number(val || 0);
    const current = Number(initialValue || 0);
    if (desired === current) return;
    const t = setTimeout(() => {
      const available = Number(product.inventory ?? product.quantity ?? 0);
      if (Number.isFinite(available) && available > 0 && desired > available) {
        if (typeof showLimit === 'function') showLimit(product.id);
        dispatch({ type: 'SET_QUANTITY', product, quantity: available });
        setVal(String(available));
      } else {
        dispatch({ type: 'SET_QUANTITY', product, quantity: desired });
        setVal(String(desired));
      }
    }, 600);
    return () => clearTimeout(t);
  }, [val, initialValue, product, dispatch, immediateDispatch, updateOnBlurOnly, showLimit]);

  return (
    <input
      aria-label={`Quantity for ${product?.name || ''}`}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      value={val}
      className="qty-input"
      onChange={(e) => {
        const cleaned = (e.target.value || '').replace(/\D/g, '');
        setVal(cleaned);
        if (immediateDispatch) {
          const desired = Number(cleaned || 0);
          const available = Number(product.inventory ?? product.quantity ?? 0);
          if (Number.isFinite(available) && available > 0 && desired > available) {
            if (typeof showLimit === 'function') showLimit(product.id);
            dispatch({ type: 'SET_QUANTITY', product, quantity: available });
            setVal(String(available));
          } else {
            dispatch({ type: 'SET_QUANTITY', product, quantity: desired });
          }
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const desired = Number(val || 0);
          const available = Number(product.inventory ?? product.quantity ?? 0);
          if (Number.isFinite(available) && available > 0 && desired > available) {
            if (typeof showLimit === 'function') showLimit(product.id);
            dispatch({ type: 'SET_QUANTITY', product, quantity: available });
            setVal(String(available));
          } else {
            dispatch({ type: 'SET_QUANTITY', product, quantity: desired });
            setVal(String(desired));
          }
        }
      }}
      onBlur={() => {
        const desired = Number(val || 0);
        const available = Number(product.inventory ?? product.quantity ?? 0);
        if (Number.isFinite(available) && available > 0 && desired > available) {
          if (typeof showLimit === 'function') showLimit(product.id);
          dispatch({ type: 'SET_QUANTITY', product, quantity: available });
          setVal(String(available));
        } else {
          dispatch({ type: 'SET_QUANTITY', product, quantity: desired });
          setVal(String(desired));
        }
      }}
      style={{ width: `${Math.max(1, Math.min(((val || '').length || 0), 4))}ch`, textAlign: 'center', fontWeight: 600, color: '#222', fontSize: '1.1rem', padding: '6px 8px', borderRadius: 6, border: '1px solid #d6d6d6', boxSizing: 'content-box' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}
