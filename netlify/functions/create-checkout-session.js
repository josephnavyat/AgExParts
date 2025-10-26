const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { cart, customer_name, customer_email, shippingCost } = JSON.parse(event.body);

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
      items_truncated: itemsTruncated ? '1' : '0'
    }
  };

  // Prefer automatic tax unless explicitly disabled via env
  if (!disableAutoTax) sessionParams.automatic_tax = { enabled: true };

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