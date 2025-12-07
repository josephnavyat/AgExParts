import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from './CartContext.jsx';
import ShippingRatesButton from './ShippingRatesButton.jsx';
import taxRateForState from '../utils/taxRates.js';

function Section({ title, open, onToggle, children, disabled }) {
  return (
    <section style={{ borderRadius: 12, border: '1px solid #e6e6e6', marginBottom: 12, overflow: 'hidden', background: '#f0f0f0' }}>
      <button
        onClick={() => !disabled && onToggle(!open)}
        style={{ width: '100%', textAlign: 'left', padding: '14px 16px', background: '#333', color: '#fafafa', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '1.05rem' }}
        aria-expanded={open}
        aria-disabled={disabled}
      >
        <strong style={{ fontSize: '1.05rem' }}>{title}</strong>
        <span style={{ float: 'right' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div style={{ padding: 24 }}>{children}</div>}
    </section>
  );
}

export default function CheckoutPage() {
  const { cart, dispatch } = useCart();
  const navigate = useNavigate();
  const [openShipping, setOpenShipping] = useState(true);
  const [openBilling, setOpenBilling] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);

  const [shipping, setShipping] = useState({ name: '', street1: '', city: '', state: '', zip: '', country: 'US', phone: '' });
  const [shippingErrors, setShippingErrors] = useState([]);
  const [billing, setBilling] = useState({ name: '', street1: '', city: '', state: '', zip: '', country: 'US', phone: '' });
  // include email for checkout
  const [billingEmail, setBillingEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [copyToBilling, setCopyToBilling] = useState(false);
  const [shippingCalculated, setShippingCalculated] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  const [lastRates, setLastRates] = useState(null);
  const [lastRawResponse, setLastRawResponse] = useState(null);

  const [billingValid, setBillingValid] = useState(false);

  const getAddressErrors = (addr) => {
    const errs = [];
    if (!addr) return ['Address missing'];
    if (!addr.name || String(addr.name).trim().length < 2) errs.push('Name is required');
    if (!addr.street1 || String(addr.street1).trim().length < 4) errs.push('Street address is required');
    if (!addr.city || String(addr.city).trim().length < 2) errs.push('City is required');
    if (!addr.state || !/^[A-Za-z]{2}$/.test(String(addr.state).trim())) errs.push('State must be 2-letter code');
    if (!addr.zip || !/^[0-9]{5}(-[0-9]{4})?$/.test(String(addr.zip).trim())) errs.push('ZIP must be 5 digits (or 5+4)');
    return errs;
  };

  const validateAddress = (addr) => {
    return getAddressErrors(addr).length === 0;
  };

  const handleShippingChange = (k, v) => {
    const next = { ...shipping, [k]: v };
    setShipping(next);
  if (copyToBilling) setBilling(next);
  setShippingErrors(getAddressErrors(next));
  };

  const handleBillingChange = (k, v) => {
  const next = { ...billing, [k]: v };
  setBilling(next);
  setBillingValid(validateAddress(next));
  };

  // Called by ShippingRatesButton via prop when rates returned
  const onRatesFound = (rates) => {
    if (rates && rates.length > 0) {
      setSelectedRate(rates[0]);
      setShippingCalculated(true);
      setLastRates(rates);
  // store shipping cost in cart context (amount expected as number)
  try { dispatch({ type: 'SET_SHIPPING_COST', cost: Number(rates[0].amount), rate: rates[0] }); } catch (e) {}
    }
  };

  const onRatesResponse = (data) => {
    setLastRawResponse(data);
    // If there are rates in the response use them
    if (data && data.rates && data.rates.length > 0) {
      onRatesFound(data.rates);
    }
  };

  // Keep selectedRate in sync with cart.shipping if the cart has a selection
  useEffect(() => {
    if (!selectedRate && cart && cart.shipping) {
      // try to match with lastRates first
      const rateId = cart.shipping.rateId || cart.shipping.rate_id || cart.shipping.rateId;
      if (lastRates && Array.isArray(lastRates)) {
        const match = lastRates.find(r => (r.object_id === rateId) || (r.raw && r.raw.id === rateId));
        if (match) {
          setSelectedRate(match);
          setShippingCalculated(true);
          return;
        }
      }
      // Fallback: create a minimal selectedRate object from cart.shipping
      setSelectedRate({ object_id: rateId || (cart.shipping && cart.shipping.rateId) || null, amount: cart.shipping.cost, provider: cart.shipping.label });
      setShippingCalculated(true);
    }
  }, [cart.shipping, lastRates]);

  // When lastRates arrive, auto-select the cheapest (first after sorting) if nothing selected
  useEffect(() => {
    if (lastRates && Array.isArray(lastRates) && lastRates.length > 0) {
      // ensure sorted ascending
      const sorted = lastRates.slice().sort((a,b) => Number(a.amount||0) - Number(b.amount||0));
      const cheapest = sorted[0];
      if (!selectedRate || selectedRate.object_id !== cheapest.object_id) {
        setSelectedRate(cheapest);
        setShippingCalculated(true);
        try { dispatch({ type: 'SET_SHIPPING_COST', cost: Number(cheapest.amount), shipping: { cost: Number(cheapest.amount), label: `${cheapest.provider} ${cheapest.servicelevel?.name || cheapest.servicelevel?.token || ''}`, rateId: cheapest.object_id } }); } catch (e) {}
      }
    }
  }, [lastRates]);

  // NOTE: do not auto-accept cart.shipping here; require an explicit selection in the checkout flow.

  const openNextIfReady = () => {
    if (!openShipping && !openBilling && !openPayment) return;
    // Ensure shipping completed before billing can open
    if (openShipping && shippingCalculated && validateAddress(shipping)) {
      setOpenShipping(false);
      setOpenBilling(true);
    }
  };

  const handleContinueFromShipping = () => {
    const addrErrs = getAddressErrors(shipping);
    const errs = [];
    if (addrErrs.length) errs.push(...addrErrs);
    if (!selectedRate) errs.push('Please select a shipping rate');
    if (errs.length) {
      alert('Cannot continue:\n' + errs.map(e => `- ${e}`).join('\n'));
      return;
    }
    setOpenShipping(false);
    setOpenBilling(true);
  };

  const handleCopyCheckbox = (v) => {
    setCopyToBilling(v);
    if (v) {
  setBilling(shipping);
  setBillingValid(validateAddress(shipping));
  // if shipping has email (copied), also copy
  if (shipping.email) setBillingEmail(shipping.email);
    }
  };

  const handleContinueFromBilling = () => {
    if (!validateAddress(billing)) return alert('Please complete billing address');
    setOpenBilling(false);
    setOpenPayment(true);
  };

  // Robust Turnstile token helper: ensures script is loaded and renders a transient widget that is executed.
  const getTurnstileToken = async (siteKey) => {
    if (!siteKey) return null;
    if (!window.turnstile) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
        if (existing) { existing.addEventListener('load', resolve); existing.addEventListener('error', reject); return; }
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    return await new Promise((resolve, reject) => {
      let finished = false;
      const timeout = setTimeout(() => { if (!finished) { finished = true; reject(new Error('Turnstile timeout')); } }, 10000);
      try {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute'; wrapper.style.left = '-9999px';
        document.body.appendChild(wrapper);
        const node = document.createElement('div');
        wrapper.appendChild(node);
        const widgetId = window.turnstile.render(node, {
          sitekey: siteKey,
          callback: (token) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            try { document.body.removeChild(wrapper); } catch (e) {}
            resolve(token);
          }
        });
        setTimeout(() => {
          try { if (window.turnstile && typeof window.turnstile.execute === 'function') window.turnstile.execute(widgetId); }
          catch (e) { if (!finished) { finished = true; clearTimeout(timeout); try { document.body.removeChild(wrapper); } catch (er) {} reject(e); } }
        }, 50);
      } catch (e) { reject(e); }
    });
  };

  return (
    <div style={{ padding: 24, maxWidth: 840, margin: '0 auto' }}>
      <h2>Checkout</h2>
      <Section title="Shipping Information" open={openShipping} onToggle={setOpenShipping}>
        <div className="form-row">
          <input className="form-input" placeholder="Full name" value={shipping.name} onChange={e => handleShippingChange('name', e.target.value)} />
          <input className="form-input" placeholder="Street address" value={shipping.street1} onChange={e => handleShippingChange('street1', e.target.value)} />
          <input className="form-input" placeholder="City" value={shipping.city} onChange={e => handleShippingChange('city', e.target.value)} />
          <div className="form-row--inline" style={{ margin: '0 8px' }}>
            <select className="form-input form-col-state" value={shipping.state} onChange={e => handleShippingChange('state', e.target.value)}>
              <option value="">State</option>
              <option value="AL">AL</option>
              <option value="AK">AK</option>
              <option value="AZ">AZ</option>
              <option value="AR">AR</option>
              <option value="CA">CA</option>
              <option value="CO">CO</option>
              <option value="CT">CT</option>
              <option value="DE">DE</option>
              <option value="FL">FL</option>
              <option value="GA">GA</option>
              <option value="HI">HI</option>
              <option value="ID">ID</option>
              <option value="IL">IL</option>
              <option value="IN">IN</option>
              <option value="IA">IA</option>
              <option value="KS">KS</option>
              <option value="KY">KY</option>
              <option value="LA">LA</option>
              <option value="ME">ME</option>
              <option value="MD">MD</option>
              <option value="MA">MA</option>
              <option value="MI">MI</option>
              <option value="MN">MN</option>
              <option value="MS">MS</option>
              <option value="MO">MO</option>
              <option value="MT">MT</option>
              <option value="NE">NE</option>
              <option value="NV">NV</option>
              <option value="NH">NH</option>
              <option value="NJ">NJ</option>
              <option value="NM">NM</option>
              <option value="NY">NY</option>
              <option value="NC">NC</option>
              <option value="ND">ND</option>
              <option value="OH">OH</option>
              <option value="OK">OK</option>
              <option value="OR">OR</option>
              <option value="PA">PA</option>
              <option value="RI">RI</option>
              <option value="SC">SC</option>
              <option value="SD">SD</option>
              <option value="TN">TN</option>
              <option value="TX">TX</option>
              <option value="UT">UT</option>
              <option value="VT">VT</option>
              <option value="VA">VA</option>
              <option value="WA">WA</option>
              <option value="WV">WV</option>
              <option value="WI">WI</option>
              <option value="WY">WY</option>
              <option value="DC">DC</option>
            </select>
            <input className="form-input form-col-zip" placeholder="ZIP" value={shipping.zip} onChange={e => handleShippingChange('zip', e.target.value)} />
          </div>
          <input className="form-input" placeholder="Phone (optional but recommended)" value={shipping.phone} onChange={e => handleShippingChange('phone', e.target.value)} />
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
            {/* Use env-configured store origin when available, otherwise fallback to a reasonable default. */}
            {
              (() => {
                const fromAddress = {
                  name: import.meta.env.VITE_STORE_NAME || 'Store',
                  street1: import.meta.env.VITE_STORE_STREET || '123 Main St',
                  city: import.meta.env.VITE_STORE_CITY || 'Santa Monica',
                  state: import.meta.env.VITE_STORE_STATE || 'CA',
                  zip: import.meta.env.VITE_STORE_ZIP || '90405',
                  country: 'US',
                  phone: import.meta.env.VITE_STORE_PHONE || '3105551212'
                };
                return <ShippingRatesButton compact inlineResults={false} disabled={shippingErrors.length>0} cart={cart} toAddress={shipping} fromAddress={fromAddress} onRates={onRatesFound} onResponse={onRatesResponse} onSelect={(r) => { setSelectedRate(r); setShippingCalculated(true); setLastRates(prev => prev || [r]); }} showResults={true} />;
              })()
            }
            <div>
              <button onClick={handleContinueFromShipping} className="btn primary" disabled={!validateAddress(shipping)} style={{ padding: '0.45rem 1rem', fontSize: '0.95rem' }}>Continue to Billing</button>
            </div>
          </div>
          {shippingErrors && shippingErrors.length > 0 && (
            <div style={{ color: '#b00020', marginTop: 10, marginLeft: 8 }}>
              {shippingErrors.map((e, i) => (
                <div key={i} style={{ fontSize: '0.95rem' }}>• {e}</div>
              ))}
            </div>
          )}
          {/* Render rates/debug below the inputs so buttons don't shift */}
          {lastRawResponse && !lastRates && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer' }}>Debug: raw response</summary>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(lastRawResponse, null, 2)}</pre>
            </details>
          )}
          {/* Render the returned rates here so the Calculate button and Continue button sit on the same line. */}
          {lastRates && Array.isArray(lastRates) && (
            <div style={{ marginTop: 12 }}>
              <b>Shipping Rates (select)</b>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {lastRates.slice().sort((a,b) => Number(a.amount||0) - Number(b.amount||0)).map((rate, idx, arr) => (
                  <li key={rate.object_id} style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" name="checkoutShippingRate" value={rate.object_id} checked={(selectedRate && (selectedRate.object_id === rate.object_id || selectedRate.raw?.id === rate.object_id)) || (!selectedRate && arr[0] && arr[0].object_id === rate.object_id)} onChange={() => {
                      setSelectedRate(rate);
                      setShippingCalculated(true);
                      try { dispatch({ type: 'SET_SHIPPING_COST', cost: Number(rate.amount), shipping: { cost: Number(rate.amount), label: `${rate.provider} ${rate.servicelevel?.name || rate.servicelevel?.token || ''}`, rateId: rate.object_id } }); } catch (e) {}
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{rate.provider} {rate.servicelevel?.name || rate.servicelevel?.token}</div>
                      <div style={{ color: '#555' }}>{rate.estimated_days || '?'} days</div>
                    </div>
                    <div style={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}>${rate.amount}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <Section title="Billing Details" open={openBilling} onToggle={setOpenBilling} disabled={!validateAddress(shipping) || !shippingCalculated}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={copyToBilling} onChange={e => handleCopyCheckbox(e.target.checked)} /> Use shipping details as billing
          </label>
          {!copyToBilling && (
            <>
              <input className="form-input" placeholder="Full name" value={billing.name} onChange={e => handleBillingChange('name', e.target.value)} />
              <input className="form-input" placeholder="Street address" value={billing.street1} onChange={e => handleBillingChange('street1', e.target.value)} />
              <input className="form-input" placeholder="City" value={billing.city} onChange={e => handleBillingChange('city', e.target.value)} />
              <input className="form-input" placeholder="State" value={billing.state} onChange={e => handleBillingChange('state', e.target.value)} />
              <input className="form-input" placeholder="ZIP" value={billing.zip} onChange={e => handleBillingChange('zip', e.target.value)} />
              <input className="form-input" placeholder="Phone" value={billing.phone} onChange={e => handleBillingChange('phone', e.target.value)} />
              <input className="form-input" placeholder="Email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} />
            </>
          )}
          <div style={{ marginTop: 8 }}>
            <button onClick={handleContinueFromBilling} className="btn primary">Continue to Payment</button>
          </div>
        </div>
      </Section>

      <Section title="Payment" open={openPayment} onToggle={setOpenPayment} disabled={!billingValid && !copyToBilling}>
        <div style={{ display: 'grid', gap: 12 }}>
          {/* Order summary */}
          {(() => {
                const subtotal = cart.items.reduce((s, i) => {
              const price = Number(i.product.price);
              const discountPerc = Number(i.product.discount_perc) || 0;
              const endDate = i.product.discount_end_date ? new Date(i.product.discount_end_date) : null;
              const now = new Date();
              const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
              const finalPrice = saleActive && !isNaN(price) ? price * (1 - discountPerc) : price;
              return s + finalPrice * i.quantity;
            }, 0);
            // Prefer state-specific tax rate based on shipping address; fall back to env VITE_TAX_RATE or 7%.
            const shippingCost = cart.shipping ? Number(cart.shipping.cost || 0) : 0;
            const taxRate = Number(taxRateForState(shipping?.state));
            const tax = +(subtotal * taxRate).toFixed(2);
            const total = +(subtotal + tax + shippingCost).toFixed(2);
            return (
              <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tax ({(taxRate*100).toFixed(2)}%)</span><strong>${tax.toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Shipping</span><strong>${shippingCost.toFixed(2)}</strong></div>
                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}><span>Total</span><strong>${total.toFixed(2)}</strong></div>
              </div>
            );
          })()}

          <div>
            <div style={{ marginBottom: 8, color: '#333' }}>Select a secure payment method below — you will be redirected to the provider to enter payment details.</div>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="form-input" style={{ width: 240 }}>
              <option value="stripe">Credit / Debit Card (Stripe)</option>
              <option value="ach">Bank Transfer (ACH)</option>
            </select>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn brand" onClick={async () => {
              if (!paymentMethod) return alert('Please select a payment method');
              // Collect Turnstile token
              let captchaToken = null;
              try {
                if (window.turnstile && typeof window.turnstile.execute === 'function') {
                  // render and execute a transient widget
                  captchaToken = await new Promise((res, rej) => {
                    const wrapper = document.createElement('div');
                    wrapper.style.position = 'absolute'; wrapper.style.left = '-9999px';
                    document.body.appendChild(wrapper);
                    const node = document.createElement('div');
                    wrapper.appendChild(node);
                    const widgetId = window.turnstile.render(node, { sitekey: import.meta.env.VITE_TURNSTILE_SITEKEY || '', callback: (t) => { try { document.body.removeChild(wrapper); } catch (e) {} res(t); } });
                    setTimeout(() => { try { window.turnstile.execute(widgetId); } catch (e) { try { document.body.removeChild(wrapper); } catch (e2) {} rej(e); } }, 50);
                  });
                }
              } catch (err) {
                console.warn('Turnstile error', err);
              }

              // compute totals for confirmation
              const subtotal = cart.items.reduce((s, i) => {
                const price = Number(i.product.price);
                const discountPerc = Number(i.product.discount_perc) || 0;
                const endDate = i.product.discount_end_date ? new Date(i.product.discount_end_date) : null;
                const now = new Date();
                const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
                const finalPrice = saleActive && !isNaN(price) ? price * (1 - discountPerc) : price;
                return s + finalPrice * i.quantity;
              }, 0);
              const shippingCost = (cart && cart.shipping) ? Number(cart.shipping.cost || 0) : (cart && cart.shipping_cost ? Number(cart.shipping_cost) : 0);
              const taxRate = Number(taxRateForState(shipping?.state));
              const tax = +(subtotal * taxRate).toFixed(2);
              const total = +(subtotal + tax + shippingCost).toFixed(2);

              const confirmMsg = `Review order:\nSubtotal: $${subtotal.toFixed(2)}\nTax: $${tax.toFixed(2)}\nShipping: $${shippingCost.toFixed(2)}\n\nTotal: $${total.toFixed(2)}\n\nContinue to Stripe Checkout?`;
              if (!window.confirm(confirmMsg)) return;

              const payload = {
                cart: cart.items.map(i => ({ product: i.product, quantity: i.quantity })),
                customer_name: billing.name || shipping.name,
                customer_email: billingEmail || '',
                shippingCost: shippingCost,
                taxCost: tax,
                captchaToken: captchaToken,
                shipping, billing,
                selectedRate: selectedRate ? {
                  id: selectedRate.object_id || selectedRate.raw?.id || selectedRate.rate_id || null,
                  provider: selectedRate.provider || null,
                  service: selectedRate.servicelevel?.name || selectedRate.service || null,
                  amount: selectedRate.amount || null
                } : null
              };
              const res = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                return alert(err.error || 'Checkout failed');
              }
              const j = await res.json();
              if (j && j.url) window.location = j.url;
            }}>Place Order</button>
          </div>
        </div>
      </Section>
    </div>
  );
}
