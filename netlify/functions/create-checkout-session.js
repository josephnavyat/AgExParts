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

  // Build a full items array (with line_total) and then produce a safely-truncated JSON string
  const fullItems = cart.map(({ product, quantity }) => ({
    part_id: product.id,
    qty: quantity,
    unit_price: Number(product.price),
    line_total: Number((product.price * quantity).toFixed(2)),
    name: product.name
  }));

  // Try to include as many full items as possible under a conservative limit (480 chars)
  let itemsToUse = fullItems.slice();
  let itemsJson = JSON.stringify(itemsToUse);
  let itemsTruncated = false;
  const LIMIT = 480;
  if (itemsJson.length > LIMIT) {
    itemsTruncated = true;
    // First strategy: drop trailing items until it fits
    while (itemsToUse.length > 0 && itemsJson.length > LIMIT) {
      itemsToUse.pop();
      itemsJson = JSON.stringify(itemsToUse);
    }
  }

  // If still too large, try shortening names (take first 20 chars)
  if (itemsJson.length > LIMIT) {
    itemsToUse = fullItems.map(it => ({ ...it, name: (it.name || '').slice(0, 20) }));
    itemsJson = JSON.stringify(itemsToUse);
    itemsTruncated = true;
  }

  // As a last resort, fall back to minimal fields and truncate the string
  if (itemsJson.length > LIMIT) {
    itemsToUse = fullItems.map(it => ({ part_id: it.part_id, qty: it.qty, line_total: it.line_total }));
    itemsJson = JSON.stringify(itemsToUse).slice(0, LIMIT);
    itemsTruncated = true;
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: 'https://agexparts.netlify.app/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://agexparts.netlify.app/cancel',
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU'] // Add more countries as needed
    },
    metadata: {
      cart_summary: String(cart.map(({ product, quantity }) => `${product.name.slice(0, 30)} x${quantity}`).join(', ')),
      shipping_cost: String(shippingCost || 0),
      items: String(itemsJson),
      items_truncated: itemsTruncated ? '1' : '0'
    }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url }),
  };
};