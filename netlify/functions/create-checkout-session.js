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
  const { cart, customer_name, customer_email, shippingCost, taxCost } = body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty or invalid' }) };
  }

  // Map cart items to Stripe line_items — compute sale-final price server-side.
  const getImageUrl = (img) => {
    if (!img) return '';
    if (typeof img === 'string' && img.startsWith('http')) return img;
    if (typeof img === 'string') return `https://agexparts.netlify.app/${img.replace(/^\/+/, '')}`;
    return '';
  };
  // Preprocess cart items to apply discounts reliably server-side
  const processed = cart.map(({ product, quantity }) => {
    let price = product && product.price != null ? Number(product.price) : NaN;
    if (typeof product.price === 'string') price = product.price.trim() === '' ? NaN : Number(product.price);
    const discountPerc = Number(product.discount_perc) || 0;
    const endDate = product && product.discount_end_date ? new Date(product.discount_end_date) : null;
    const now = new Date();
    const saleActive = discountPerc > 0 && (!endDate || now <= endDate);
    const finalPrice = saleActive && !isNaN(price) ? Number((price * (1 - discountPerc)).toFixed(2)) : price;
    const validPrice = !isNaN(finalPrice) && finalPrice > 0 ? finalPrice : null;
    return { product: { ...product, price: validPrice }, quantity, finalPrice: validPrice };
  });

  const line_items = processed.map(({ product, quantity, finalPrice }) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: product.name,
        images: product.image ? [getImageUrl(product.image)] : [],
      },
      // Validate price is numeric and positive
      unit_amount: (typeof finalPrice === 'number' && !isNaN(finalPrice) && finalPrice > 0) ? Math.round(finalPrice * 100) : null,
    },
    quantity,
  }));
  // If any line_items have invalid unit_amount, return 400
  if (line_items.some(li => !li.price_data.unit_amount || li.price_data.unit_amount <= 0)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid product price detected' }) };
  }
  // Add shipping and tax line items (if provided) but do NOT enable Stripe automatic_tax
  // or request billing/shipping collection — we only want Stripe to collect payment info.
  if (shippingCost && Number(shippingCost) > 0) {
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping' },
        unit_amount: Math.round(Number(shippingCost) * 100)
      },
      quantity: 1
    });
  }
  if (taxCost && Number(taxCost) > 0) {
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Tax' },
        unit_amount: Math.round(Number(taxCost) * 100)
      },
      quantity: 1
    });
  }

  // Build truncated items JSON for metadata. Include line_total and ensure we stay within Stripe metadata size limits (~500 chars).
  const itemsArr = [];
  for (const { product, quantity } of processed) {
    const item = {
      part_id: product.id,
      qty: quantity,
      unit_price: Number(product.price),
      line_total: Number(((Number(product.price) || 0) * quantity).toFixed(2)),
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
  // NOTE: Do not request billing or shipping address from Stripe — the checkout page
  // collects customer/shipping data and writes it to our DB. Stripe will be used only
  // to collect payment (card) information.
    metadata: {
      cart_summary: cart.map(({ product, quantity }) => `${product.name.slice(0, 30)} x${quantity}`).join(', '),
      shipping_cost: shippingCost || 0,
      tax_cost: taxCost || 0,
      items: itemsJson,
      items_truncated: itemsTruncated ? '1' : '0'
    }
  };

  // Attach compact shipping and billing payloads if provided by the frontend (keep them short)
  try {
    const shippingObj = body.shipping || null;
    const billingObj = body.billing || null;
    const maxLen = 380; // conservative size for metadata entries
    if (shippingObj) {
      const sStr = JSON.stringify(shippingObj);
      sessionParams.metadata.shipping = sStr.length > maxLen ? sStr.slice(0, maxLen) : sStr;
    }
    if (billingObj) {
      const bStr = JSON.stringify(billingObj);
      sessionParams.metadata.billing = bStr.length > maxLen ? bStr.slice(0, maxLen) : bStr;
    }
  } catch (e) {
    // ignore serialization errors
  }

  // Do not enable Stripe automatic_tax here; shipping/tax are calculated on the site and
  // we only want Stripe to collect payment information. Also do not set session.customer_email.
  if (customer_email && typeof customer_email === 'string') {
    // Pass the collected customer email to Stripe so Checkout does not prompt for it.
    sessionParams.customer_email = customer_email;
  }
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
  return { statusCode: 502, body: JSON.stringify({ error: 'Payment provider error' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url }),
  };
};