const { Client } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    // Example: extract info from session
    const order = {
      order_no: session.id,
      status: 'paid',
      customer_name: session.metadata?.customer_name || session.customer_details?.name,
      customer_email: session.metadata?.customer_email || session.customer_details?.email,
      ship_address1: session.customer_details?.address?.line1,
      ship_address2: session.customer_details?.address?.line2,
      ship_city: session.customer_details?.address?.city,
      ship_state: session.customer_details?.address?.state,
      ship_postal_code: session.customer_details?.address?.postal_code,
      ship_country: session.customer_details?.address?.country,
      subtotal: session.amount_subtotal / 100,
      discount_total: 0,
      shipping_total: session.total_details?.amount_shipping ? session.total_details.amount_shipping / 100 : 0,
      tax_total: session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0,
      grand_total: session.amount_total / 100,
      currency: session.currency,
      payment_ref: session.payment_intent,
    };

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const query = `
      INSERT INTO orders (
        order_no, status, customer_name, customer_email,
        ship_address1, ship_address2, ship_city, ship_state, ship_postal_code, ship_country,
        subtotal, discount_total, shipping_total, tax_total, grand_total, currency,
        payment_ref
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17
      ) RETURNING *;
    `;
    const values = [
      order.order_no,
      order.status,
      order.customer_name,
      order.customer_email,
      order.ship_address1,
      order.ship_address2,
      order.ship_city,
      order.ship_state,
      order.ship_postal_code,
      order.ship_country,
      order.subtotal,
      order.discount_total,
      order.shipping_total,
      order.tax_total,
      order.grand_total,
      order.currency,
      order.payment_ref,
    ];
    // Insert order and get the inserted row (with id)
    const orderResult = await client.query(query, values);
    const orderRow = orderResult.rows[0];

    // Example: get items from session metadata (must be set in checkout session creation)
    let items = [];
    try {
      items = JSON.parse(session.metadata?.items || '[]');
    } catch (e) {
      items = [];
    }

    // Insert each item into order_items table with logging and error handling
    const itemQuery = `
      INSERT INTO order_items (
        order_id, part_id, qty, unit_price, tax_code, tax_amount, line_total, fulfillment_method, supplier_id, location_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
    `;
    console.log('Order items to insert:', items);
    try {
      for (const item of items) {
        await client.query(itemQuery, [
          orderRow.id,
          item.part_id,
          item.qty,
          item.unit_price,
          item.tax_code,
          item.tax_amount,
          item.line_total,
          item.fulfillment_method,
          item.supplier_id,
          item.location_id
        ]);
      }
    } catch (err) {
      console.error('Error inserting order items:', err);
    }
    await client.end();
  }

  return { statusCode: 200, body: 'Webhook received' };
};
