let stripe;
if (!process.env.STRIPE_SECRET_KEY) {
  // Delay requiring stripe until after we check env to avoid throwing with a stack that contains the key.
  console.error('Missing STRIPE_SECRET_KEY in environment. Stripe checkout will not be available.');
} else {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

exports.handler = async (event) => {
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  const { cart, customer_name, customer_email, shippingCost } = body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty or invalid' }) };
  }

  // Map cart items to Stripe line_items
  const getImageUrl = (img) => {
    if (!img) return '';
    if (typeof img === 'string' && img.startsWith('http')) return img;
    if (typeof img === 'string') return `https://agexparts.netlify.app/${img.replace(/^\/+/, '')}`;
    return '';
  };
  const line_items = cart.map(({ product, quantity }) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: product.name,
        images: product.image ? [getImageUrl(product.image)] : [],
      },
      // Validate price is numeric and positive
      unit_amount: (typeof product.price === 'number' && !isNaN(product.price) && product.price > 0) ? Math.round(product.price * 100) : null,
    },
    quantity,
  }));
  // If any line_items have invalid unit_amount, return 400
  if (line_items.some(li => !li.price_data.unit_amount || li.price_data.unit_amount <= 0)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid product price detected' }) };
  }
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
  billing_address_collection: 'required',
    success_url: 'https://agexparts.netlify.app/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://agexparts.netlify.app/cancel',
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU'] // Add more countries as needed
    },
    metadata: {
      cart_summary: cart.map(({ product, quantity }) => `${product.name.slice(0, 30)} x${quantity}`).join(', '),
      shipping_cost: shippingCost || 0,
      items: itemsJson,
      items_truncated: itemsTruncated ? '1' : '0'
    }
  };

  // Prefer automatic tax unless explicitly disabled via env
  if (!disableAutoTax) sessionParams.automatic_tax = { enabled: true };

  if (customer_email && typeof customer_email === 'string') sessionParams.customer_email = customer_email;

  let session;
  try {
    if (!stripe) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Payment provider not configured' }) };
    }
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err) {
    // Sanitize error returned to client; log full error server-side for debugging.
    const msg = (err && err.raw && err.raw.message) || (err && err.message) || 'Unknown error from payment provider';
    console.error('Stripe checkout error:', err);
    const isOriginError = typeof msg === 'string' && (msg.toLowerCase().includes('valid origin address') || msg.toLowerCase().includes('origin address'));
    if (isOriginError && sessionParams.automatic_tax) {
      console.warn('Stripe automatic tax failed (test origin address). Retrying checkout session creation without automatic_tax.');
      try {
        delete sessionParams.automatic_tax;
        session = await stripe.checkout.sessions.create(sessionParams);
      } catch (retryErr) {
        console.error('Retry stripe error:', retryErr);
        return { statusCode: 502, body: JSON.stringify({ error: 'Payment provider error' }) };
      }
    } else {
      return { statusCode: 502, body: JSON.stringify({ error: 'Payment provider error' }) };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url }),
  };
};