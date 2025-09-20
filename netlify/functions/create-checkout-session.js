const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { cart } = JSON.parse(event.body);

  // Map cart items to Stripe line_items
  const line_items = cart.map(({ product, quantity }) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: product.name,
      },
      unit_amount: Math.round(product.price * 100), // price in cents
    },
    quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: 'https://agexparts.netlify.app/success',
    cancel_url: 'https://agexparts.netlify.app/cancel',
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU'] // Add more countries as needed
    },
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url }),
  };
};