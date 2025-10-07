const { Client } = require('pg');

exports.handler = async (event) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Fetch orders and their items
  const ordersRes = await client.query('SELECT * FROM orders ORDER BY id DESC LIMIT 50');
  const orders = ordersRes.rows;

  // Fetch all order items for these orders
  const orderIds = orders.map(o => o.id);
  let itemsRes = { rows: [] };
  if (orderIds.length > 0) {
    itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = ANY($1)', [orderIds]);
  }
  const items = itemsRes.rows;

  // Attach items to their orders
  const ordersWithItems = orders.map(order => ({
    ...order,
    items: items.filter(item => item.order_id === order.id)
  }));

  await client.end();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ordersWithItems)
  };
};
