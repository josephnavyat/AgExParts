const { Client } = require('pg');

exports.handler = async (event) => {
  const order_no = event.queryStringParameters?.order_no;
  if (!order_no) {
    return { statusCode: 400, body: 'Missing order_no' };
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Get order
    const orderRes = await client.query('SELECT * FROM orders WHERE order_no = $1', [order_no]);
    if (orderRes.rows.length === 0) {
      return { statusCode: 404, body: 'Order not found' };
    }
    const order = orderRes.rows[0];

    // Get order items
    const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = itemsRes.rows;

    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify(order),
    };
  } catch (err) {
    await client.end();
    return { statusCode: 500, body: 'Error: ' + err.message };
  }
};
