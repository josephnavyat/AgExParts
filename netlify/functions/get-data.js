// netlify/functions/get-data.js
// Tries to query the database via @neondatabase/serverless. If DATABASE_URL is not
// configured or the query fails (e.g. in local dev), return a small demo product
// list so the gallery can be tested.
let sql;
try {
  const { neon } = require('@neondatabase/serverless');
  if (process.env.DATABASE_URL) {
    sql = neon(process.env.DATABASE_URL);
  }
} catch (e) {
  // ignore; we'll fall back to demo data below
}

const demoProducts = [
  {
    id: 1,
    name: 'Demo Part A',
    sku: 'DEMO-A',
    part_number: 'A-100',
    price: 19.99,
    discount_perc: 0,
    website_visible: true,
    quantity: 5,
    image: '/logo.png',
    category: 'Demo',
    subcategory: 'Sample',
  },
  {
    id: 2,
    name: 'Demo Part B',
    sku: 'DEMO-B',
    part_number: 'B-200',
    price: 49.99,
    discount_perc: 0.1,
    discount_end_date: null,
    website_visible: true,
    quantity: 2,
    image: '/logo.png',
    category: 'Demo',
    subcategory: 'Sample',
  }
];

exports.handler = async function(event, context) {
  if (!sql) {
    return {
      statusCode: 200,
      headers: { 'X-Data-Source': 'demo-fallback' },
      body: JSON.stringify({ products: demoProducts, compatibility: [] }),
    };
  }

  try {
    const result = await sql`SELECT * FROM products;`;
    // fetch compatibility rows (manufactur is the column name in the compatibility table)
    const compat = await sql`SELECT manufactur AS manufacturer, machine_type, model FROM machine_compatibility;`;
    return {
      statusCode: 200,
      headers: { 'X-Data-Source': 'database' },
      body: JSON.stringify({ products: result, compatibility: compat }),
    };
  } catch (error) {
    // If DB query failed, return demo products + error message in header for debug
    return {
      statusCode: 200,
      headers: { 'X-Products-Error': error.message, 'X-Data-Source': 'demo-fallback' },
      body: JSON.stringify({ products: demoProducts, compatibility: [] }),
    };
  }
};
