const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    const { form, cart } = data;
    // Create order object
    const orderId = uuidv4();
    const order = {
      id: orderId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      notes: form.notes,
      status: 'Awaiting Freight Quote',
      created_at: new Date().toISOString(),
    };
    // Create order items
    const orderItems = cart.items.map(({ product, quantity }) => ({
      order_id: orderId,
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity,
      weight: product.weight,
    }));
    // Save to file (for demo; replace with DB in production)
    const ordersPath = path.join(__dirname, 'orders.json');
    const itemsPath = path.join(__dirname, 'order_items.json');
    let orders = [];
    let items = [];
    if (fs.existsSync(ordersPath)) {
      orders = JSON.parse(fs.readFileSync(ordersPath));
    }
    if (fs.existsSync(itemsPath)) {
      items = JSON.parse(fs.readFileSync(itemsPath));
    }
    orders.push(order);
    items.push(...orderItems);
    fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
    fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2));
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
