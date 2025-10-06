const { v4: uuidv4 } = require('uuid');
const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    const { form, cart } = data;
    // Create order object
    const orderId = uuidv4();
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    // Insert order
    const orderInsert = await client.query(
      `INSERT INTO orders (id, customer_name, customer_email, customer_phone, ship_address1, ship_city, ship_state, ship_postal_code, ship_country, notes, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [orderId, form.name, form.email, form.phone, form.address, form.city, form.state, form.zip, 'US', form.notes, 'Awaiting Freight Quote', new Date().toISOString()]
    );
    // Insert order items
    for (const { product, quantity } of cart.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, sku, price, quantity, weight)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [orderId, product.id, product.name, product.sku, product.price, quantity, product.weight]
      );
    }
    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, orderId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
