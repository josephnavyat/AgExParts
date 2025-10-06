const { v4: uuidv4 } = require('uuid');
const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    const { form, cart } = data;
    // Generate order_no and calculate totals
    const order_no = uuidv4();
    let subtotal = 0;
    let grand_total = 0;
    let shipping_total = 0;
    let tax_total = 0;
    let currency = 'usd';
    for (const { product, quantity } of cart.items) {
      subtotal += Number(product.price) * Number(quantity);
    }
    grand_total = subtotal; // For now, no shipping/tax
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    // Insert order
    const orderQuery = `
      INSERT INTO orders (
        order_no, status, customer_name, customer_email, customer_phone,
        ship_address1, ship_city, ship_state, ship_postal_code, ship_country,
        notes, subtotal, discount_total, shipping_total, tax_total, grand_total, currency, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *;
    `;
    const orderValues = [
      order_no,
      'Awaiting Freight Quote',
      form.name,
      form.email,
      form.phone,
      form.address,
      form.city,
      form.state,
      form.zip,
      'US',
      form.notes || '',
      subtotal,
      0,
      shipping_total,
      tax_total,
      grand_total,
      currency,
      new Date().toISOString()
    ];
    let orderResult;
    try {
      orderResult = await client.query(orderQuery, orderValues);
    } catch (orderErr) {
      console.error('Order insert error:', orderErr, orderValues);
      await client.end();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Order insert error', details: orderErr.message }),
      };
    }
    const orderRow = orderResult.rows[0];
    // Insert order items
    const itemQuery = `
      INSERT INTO order_items (
        order_id, part_id, qty, unit_price, tax_code, tax_amount, line_total, fulfillment_method, supplier_id, location_id, name, sku, weight
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
    `;
    for (const { product, quantity } of cart.items) {
      try {
        await client.query(itemQuery, [
          orderRow.id,
          product.id || null,
          quantity || 1,
          Number(product.price) || 0,
          '', // tax_code
          0, // tax_amount
          Number(product.price) * Number(quantity), // line_total
          null, // fulfillment_method
          null, // supplier_id
          null, // location_id
          product.name || '',
          product.sku || '',
          product.weight || 0
        ]);
      } catch (itemErr) {
        console.error('Order item insert error:', itemErr, product);
      }
    }
    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, order_no }),
    };
  } catch (err) {
    console.error('General error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
