const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

// Cloudflare Turnstile secret must be set in environment
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;

exports.handler = async (event) => {
  const { cart, customer_name, customer_email, shippingCost, captchaToken, shipping, billing } = JSON.parse(event.body);

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

  // Map cart items to Stripe line_items
  const getImageUrl = (img) => img && img.startsWith('http') ? img : (img ? `https://agexparts.netlify.app${img}` : '');
  const line_items = cart.map(({ product, quantity }) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: product.name,
        images: product.image ? [getImageUrl(product.image)] : [],
      },
      unit_amount: Math.round(product.price * 100), // price in cents
    },
    quantity,
  }));
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
    shipping: shipping ? JSON.stringify({ name: shipping.name, street1: shipping.street1, city: shipping.city, state: shipping.state, zip: shipping.zip }) : '',
    billing: billing ? JSON.stringify({ name: billing.name, street1: billing.street1, city: billing.city, state: billing.state, zip: billing.zip, email: customer_email || '' }) : ''
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

  let session;
  try {
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
      // rethrow unknown errors so caller can observe them
      throw err;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url }),
  };
};