const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');
const https = require('https');

// EasyPost API key for server-side re-quote validation
const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY || '';

// Cloudflare Turnstile secret must be set in environment
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;

exports.handler = async (event) => {
  try {
    let parsedBody = {};
    try {
      parsedBody = event.body && typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
    } catch (parseErr) {
      console.error('Invalid JSON body for create-checkout-session:', event.body, parseErr && parseErr.message ? parseErr.message : parseErr);
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }
    const { cart, customer_name, customer_email, shippingCost, captchaToken, shipping, billing, selectedRate } = parsedBody;

    if (!Array.isArray(cart) || cart.length === 0) {
      console.warn('create-checkout-session called with empty or invalid cart:', cart);
      return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty or invalid' }) };
    }

    // Ensure Stripe secret key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not set in environment');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration: STRIPE_SECRET_KEY missing' }) };
    }

    // Verify Turnstile token and ensure secret is configured
  // Allow short-circuit via TURNSTILE_BYPASS=1 for urgent testing (disable in production after fix)
  if (process.env.TURNSTILE_BYPASS === '1') {
    console.warn('Turnstile bypass enabled via TURNSTILE_BYPASS=1 - skipping captcha verification');
  } else {
    if (!TURNSTILE_SECRET) {
      console.error('TURNSTILE_SECRET not set in environment');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration: captcha secret missing' }) };
    }
    if (!captchaToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Captcha token required' }) };
    }
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(TURNSTILE_SECRET)}&response=${encodeURIComponent(captchaToken)}`
      });
      const verifyJson = await verifyRes.json();
      if (!verifyJson.success) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Captcha verification failed' }) };
      }
    } catch (err) {
      console.error('turnstile verify error', err && err.message ? err.message : err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Captcha verification error' }) };
    }
  }

  // Server-side verification of the selected shipping rate to prevent client tampering.
  // If a selectedRate was provided, re-request rates from EasyPost with the same shipment
  // payload and ensure the selected rate still exists and the amount hasn't changed.
  if (selectedRate) {
    if (!EASYPOST_API_KEY) {
      console.warn('EASYPOST_API_KEY not set; skipping server-side shipping rate validation');
    } else {
      // build shipment payload similar to client
      const mmToIn = mm => mm ? (mm / 25.4) : undefined;
      const first = cart[0] && cart[0].product ? cart[0].product : null;
      // compute total weight in pounds
      let totalWeightLb = 0;
      for (const it of cart) {
        const w = Number(it.product.weight) || 1;
        totalWeightLb += w * (Number(it.quantity) || 1);
      }

      const parcel = {
        length: mmToIn(first?.length_mm) || 10,
        width: mmToIn(first?.width_mm) || 8,
        height: mmToIn(first?.height_mm) || 4,
        distance_unit: 'in',
        weight: +(totalWeightLb.toFixed(2)),
        mass_unit: 'lb'
      };

      const from_address = {
        name: process.env.VITE_STORE_NAME || 'Store',
        street1: process.env.VITE_STORE_STREET || '123 Main St',
        city: process.env.VITE_STORE_CITY || 'City',
        state: process.env.VITE_STORE_STATE || 'CA',
        zip: process.env.VITE_STORE_ZIP || '00000',
        country: 'US',
        phone: process.env.VITE_STORE_PHONE || ''
      };

      const to_address = shipping;

      // helper to call EasyPost shipments endpoint
      const createShipmentViaEasyPost = (apiKey, shipmentPayload) => {
        return new Promise((resolve, reject) => {
          const postData = JSON.stringify({ shipment: shipmentPayload });
          const auth = Buffer.from(`${apiKey}:`).toString('base64');
          const options = {
            hostname: 'api.easypost.com',
            port: 443,
            path: '/v2/shipments',
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              Accept: 'application/json'
            }
          };
          const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                if (res.statusCode && res.statusCode >= 400) return reject({ statusCode: res.statusCode, body: parsed });
                resolve(parsed);
              } catch (err) {
                reject({ error: 'Invalid JSON from EasyPost', raw: data, err });
              }
            });
          });
          req.on('error', e => reject({ error: 'request error', details: e }));
          req.write(postData);
          req.end();
        });
      };

      try {
        const shipmentPayload = { to_address, from_address, parcel };
        const resp = await createShipmentViaEasyPost(EASYPOST_API_KEY, shipmentPayload);
        const respRates = resp && resp.rates ? resp.rates : (resp?.shipment && resp.shipment.rates ? resp.shipment.rates : null);
        if (!respRates || respRates.length === 0) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Shipping rates could not be re-quoted. Please recalculate shipping.' }) };
        }

        // normalize and try to match
        const normalized = respRates.map(r => ({
          id: r.id || r.rate_id || null,
          provider: r.carrier || r.provider || null,
          service: r.service || r.service_code || (r.service_level && r.service_level.name) || null,
          amount: (typeof r.rate === 'string' ? parseFloat(r.rate) : r.rate) ?? null,
          raw: r
        }));

        const selId = selectedRate.id || selectedRate.object_id || selectedRate.raw?.id || null;
        const selProvider = (selectedRate.provider || '').toLowerCase();
        const selService = ((selectedRate.service || (selectedRate.servicelevel && selectedRate.servicelevel.name) || '')).toLowerCase();
        const selAmount = parseFloat(selectedRate.amount || selectedRate.rate || 0);

        const match = normalized.find(r => {
          if (selId && r.id && String(r.id) === String(selId)) return true;
          const prov = (r.provider || '').toLowerCase();
          const serv = (r.service || '').toLowerCase();
          if (prov === selProvider && serv === selService && Math.abs(Number(r.amount) - selAmount) <= 0.5) return true;
          return false;
        });

        if (!match) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Selected shipping rate invalid or changed. Please re-calculate shipping and choose a new rate.', details: { requote: normalized } }) };
        }
      } catch (e) {
        console.warn('Error re-quoting EasyPost for validation:', e);
        return { statusCode: 400, body: JSON.stringify({ error: 'Failed to validate shipping rate. Please retry shipping calculation.' }) };
      }
    }
  }

  // Map cart items to Stripe line_items
  const getImageUrl = (img) => img && img.startsWith('http') ? img : (img ? `https://agexparts.netlify.app${img}` : '');
  const line_items = cart.map(({ product, quantity }) => {
    const priceNum = Number(product && product.price) || 0;
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: product && product.name ? product.name : 'Item',
          images: product && product.image ? [getImageUrl(product.image)] : [],
        },
        unit_amount: Math.round(priceNum * 100), // price in cents
      },
      quantity: Number(quantity) || 1,
    };
  });
  if (shippingCost && shippingCost > 0) {
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Shipping',
        },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    });
  }

  // Build truncated items JSON for metadata. Include line_total and ensure we stay within Stripe metadata size limits (~500 chars).
  const itemsArr = [];
  for (const { product, quantity } of cart) {
    const item = {
      part_id: product.id,
      qty: quantity,
      unit_price: Number(product.price),
      line_total: Number((product.price * quantity).toFixed(2)),
      name: product.name
    };
    const testItems = [...itemsArr, item];
    const testStr = JSON.stringify(testItems);
    // Keep a conservative limit to avoid hitting Stripe metadata size limits
    if (testStr.length > 480) break;
    itemsArr.push(item);
  }
  const itemsJson = JSON.stringify(itemsArr);
  const itemsTruncated = JSON.stringify(itemsArr).length !== JSON.stringify(cart.map(({ product, quantity }) => ({ part_id: product.id, qty: quantity, unit_price: Number(product.price), line_total: Number((product.price * quantity).toFixed(2)), name: product.name }))).length;

  // Build base session params so we can retry with different tax settings if needed
  const disableAutoTax = process.env.DISABLE_STRIPE_AUTOMATIC_TAX === '1' || process.env.DISABLE_STRIPE_AUTOMATIC_TAX === 'true';

  const sessionParams = {
    payment_method_types: ['card'],
    line_items,
    // automatic_tax will be added conditionally below
    mode: 'payment',
    success_url: 'https://agexparts.netlify.app/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://agexparts.netlify.app/cancel',
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU'] // Add more countries as needed
    },
    metadata: {
      cart_summary: cart.map(({ product, quantity }) => `${product.name.slice(0, 30)} x${quantity}`).join(', '),
      shipping_cost: shippingCost || 0,
    items: itemsJson,
    items_truncated: itemsTruncated ? '1' : '0',
  shipping: shipping ? JSON.stringify({ name: shipping.name, street1: shipping.street1, city: shipping.city, state: shipping.state, zip: shipping.zip, phone: shipping.phone || '' }) : '',
  billing: billing ? JSON.stringify({ name: billing.name, street1: billing.street1, city: billing.city, state: billing.state, zip: billing.zip, email: customer_email || billing.email || '', phone: billing.phone || '' }) : ''
    }
  };

  // include selectedRate in metadata if provided
  if (typeof event.body === 'string') {
    try {
      const parsed = JSON.parse(event.body);
      if (parsed && parsed.selectedRate) {
        sessionParams.metadata = sessionParams.metadata || {};
        sessionParams.metadata.selected_rate = JSON.stringify(parsed.selectedRate);
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  // If customer email was provided, include it so Stripe can attach customer info to session
  if (customer_email) sessionParams.customer_email = customer_email;

  // Prefer automatic tax unless explicitly disabled via env
  if (!disableAutoTax) sessionParams.automatic_tax = { enabled: true };

  // If a customer email was provided, try to find an existing customer or create one
  // and attach shipping/billing info so Stripe Checkout can pre-fill the fields.
  if (customer_email) {
    try {
      // Try to find existing customer by email (returns list)
      const existing = await stripe.customers.list({ email: customer_email, limit: 1 });
      let customer = existing && existing.data && existing.data.length > 0 ? existing.data[0] : null;
      if (!customer) {
        // Build address object from provided shipping or billing
        const addrSource = (shipping && shipping.street1) ? shipping : (billing && billing.street1 ? billing : null);
        const address = addrSource ? {
          line1: addrSource.street1 || '',
          city: addrSource.city || '',
          state: addrSource.state || '',
          postal_code: addrSource.zip || '',
          country: (addrSource.country || 'US')
        } : undefined;

        const createParams = {
          email: customer_email,
          name: customer_name || (billing && billing.name) || (shipping && shipping.name) || undefined,
        };
    // include a top-level phone on the customer when available
    const possiblePhone = (shipping && shipping.phone) || (billing && billing.phone) || undefined;
    if (possiblePhone) createParams.phone = possiblePhone;
        if (address) createParams.address = address;
        if (shipping && shipping.street1) {
          createParams.shipping = {
            name: shipping.name || createParams.name,
            address: address
          };
        }
        customer = await stripe.customers.create(createParams);
      } else {
        // Optionally update customer shipping when shipping provided
        if (shipping && shipping.street1) {
          try {
            await stripe.customers.update(customer.id, {
              shipping: {
                name: shipping.name || customer.name,
                address: {
                  line1: shipping.street1 || '',
                  city: shipping.city || '',
                  state: shipping.state || '',
                  postal_code: shipping.zip || '',
                  country: shipping.country || 'US'
                }
              }
            });
            // Also update phone at the customer level when present
            try {
              const updatePhone = (shipping && shipping.phone) || (billing && billing.phone) || null;
              if (updatePhone) {
                await stripe.customers.update(customer.id, { phone: updatePhone });
              }
            } catch (phErr) {
              console.warn('Failed to update customer phone:', phErr && phErr.message ? phErr.message : phErr);
            }
          } catch (uErr) {
            // non-fatal: continue without blocking session creation
            console.warn('Failed to update Stripe customer shipping info:', uErr && uErr.message ? uErr.message : uErr);
          }
        }
      }

      if (customer && customer.id) {
        sessionParams.customer = customer.id;
        // Also set customer_email for helpfulness (redundant but explicit)
        sessionParams.customer_email = customer_email;
        sessionParams.metadata = sessionParams.metadata || {};
        sessionParams.metadata.stripe_customer_id = customer.id;
      }
    } catch (custErr) {
      console.warn('Stripe customer lookup/create error, proceeding without customer:', custErr && custErr.message ? custErr.message : custErr);
    }
  }

  // If no customer_email provided but we do have shipping information, create a customer so
  // Stripe Checkout can be pre-filled with the shipping address. This helps when users
  // supply an address but did not enter an email on the form.
  if (!customer_email && (!sessionParams.customer) && shipping && shipping.street1) {
    try {
      const address = {
        line1: shipping.street1 || '',
        city: shipping.city || '',
        state: shipping.state || '',
        postal_code: shipping.zip || '',
        country: (shipping.country || 'US')
      };
      const createParams = {
        name: shipping.name || undefined,
      };
      if (address) createParams.address = address;
      if (shipping && shipping.street1) {
        createParams.shipping = {
          name: shipping.name || createParams.name,
          address: address,
        };
        if (shipping.phone) createParams.shipping.phone = shipping.phone;
      }
      const newCustomer = await stripe.customers.create(createParams);
      if (newCustomer && newCustomer.id) {
        sessionParams.customer = newCustomer.id;
        sessionParams.metadata = sessionParams.metadata || {};
        sessionParams.metadata.stripe_customer_id = newCustomer.id;
      }
    } catch (createCustErr) {
      console.warn('Failed to create Stripe customer from shipping data:', createCustErr && createCustErr.message ? createCustErr.message : createCustErr);
    }
  }

  let session;
  try {
    // In dev or when TURNSTILE_BYPASS is enabled, print session params for debugging (non-sensitive fields only)
    if (process.env.NODE_ENV !== 'production' || process.env.TURNSTILE_BYPASS === '1') {
      try { console.debug('Checkout sessionParams (debug):', { ...sessionParams, metadata: sessionParams.metadata }); } catch (e) {}
    }
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err) {
    // If Stripe complains about a missing/invalid origin address in test mode, retry without automatic tax
    const msg = (err && err.raw && err.raw.message) || (err && err.message) || '';
    const isOriginError = msg.toLowerCase().includes('valid origin address') || msg.toLowerCase().includes('origin address');
    if (isOriginError && sessionParams.automatic_tax) {
      console.warn('Stripe automatic tax failed (test origin address). Retrying checkout session creation without automatic_tax. Error:', msg);
      // remove automatic tax and retry
      delete sessionParams.automatic_tax;
      session = await stripe.checkout.sessions.create(sessionParams);
    } else {
      // return structured error to caller
      console.error('Stripe session creation error:', err && err.stack ? err.stack : err);
      const debugDetails = (process.env.NODE_ENV !== 'production' || process.env.TURNSTILE_BYPASS === '1') ? { message: msg, raw: err && err.raw ? err.raw : undefined } : undefined;
      return { statusCode: 500, body: JSON.stringify({ error: 'Stripe session creation failed', details: msg, debug: debugDetails }) };
    }
  }
    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url, debug: (process.env.NODE_ENV !== 'production' || process.env.TURNSTILE_BYPASS === '1') ? { metadata: sessionParams.metadata, customer: sessionParams.customer || null } : undefined }),
    };
  } catch (outerErr) {
    console.error('create-checkout-session handler error:', outerErr && outerErr.stack ? outerErr.stack : outerErr);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error', details: outerErr && outerErr.message ? outerErr.message : String(outerErr) }) };
  }
};