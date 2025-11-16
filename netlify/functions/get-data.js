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
      headers: { 'X-Products-Source': 'demo', 'X-Products-Count': String(demoProducts.length) },
      body: JSON.stringify(demoProducts),
    };
  }

  try {
    /*
      Fetch products and include one representative compatibility row (if any)
      so the client can populate manufacturer, machine_type and model dropdowns.
      We LEFT JOIN against a subquery that picks one machine_compatibility row per
      product SKU via the machine_compatibility_link table. This is conservative
      (returns a single compatibility entry) but keeps the payload simple for the UI.
    */
    const result = await sql`
      SELECT p.*, mc.manufacturer, mc.machine_type, mc.model
      FROM products p
      LEFT JOIN (
        SELECT mcl.sku, m.manufacturer, m.machine_type, m.model
        FROM machine_compatibility_link mcl
        JOIN machine_compatibility m ON mcl.machine_compatibility_id = m.id
        -- If multiple links exist per sku, pick the first one (arbitrary but stable)
        GROUP BY mcl.sku, m.manufacturer, m.machine_type, m.model
      ) mc ON mc.sku = p.sku;
    `;
    return {
      statusCode: 200,
      headers: { 'X-Products-Source': 'db', 'X-Products-Count': String(result.length) },
      body: JSON.stringify(result),
    };
  } catch (error) {
    // If DB query failed, return demo products + error message in header for debug
    return {
      statusCode: 200,
      headers: { 'X-Products-Source': 'error-fallback', 'X-Products-Error': error.message, 'X-Products-Count': String(demoProducts.length) },
      body: JSON.stringify(demoProducts),
    };
  }
};
