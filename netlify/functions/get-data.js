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
    // Log demo fallback so it's visible in Netlify function logs
    console.log('get-data: demo-fallback', { demoProducts: demoProducts.length });
    return {
      statusCode: 200,
      headers: { 'X-Data-Source': 'demo-fallback' },
      body: JSON.stringify({ products: demoProducts, compatibility: [] }),
    };
  }

  try {
    const result = await sql`SELECT * FROM products;`;

    // fetch compatibility rows. older schema used `manufactur` while newer uses
    // `manufacturer` — try both and fall back to an empty array if neither exists.
    let compat = [];
    let compatErr = null;
    try {
      // include the id so links can reference compatibility rows
      compat = await sql`SELECT id, manufactur AS manufacturer, machine_type, model FROM machine_compatibility;`;
    } catch (e1) {
      // try the other common column name
      try {
        compat = await sql`SELECT id, manufacturer, machine_type, model FROM machine_compatibility;`;
      } catch (e2) {
        // both compatibility attempts failed; record the message but continue
        compatErr = e2.message || e1.message || 'compatibility query failed';
        compat = [];
      }
    }

    // fetch links between products and compatibility rows (product_sku -> machine_compatibility_id)
    let links = [];
    let linksErr = null;
    try {
      // prefer the column `product_sku` if it exists
      links = await sql`SELECT product_sku, machine_compatibility_id FROM machine_compatibility_link;`;
      // normalize field name to product_sku (already correct)
      links = links.map(l => ({ product_sku: l.product_sku, machine_compatibility_id: l.machine_compatibility_id }));
    } catch (e1) {
      try {
        // fall back to sku as product_sku for older schemas
        links = await sql`SELECT sku AS product_sku, machine_compatibility_id FROM machine_compatibility_link;`;
        links = links.map(l => ({ product_sku: l.product_sku, machine_compatibility_id: l.machine_compatibility_id }));
      } catch (e2) {
        linksErr = e2.message || e1.message || 'links query failed';
        links = [];
      }
    }

    const headers = { 'X-Data-Source': 'database' };
  if (compatErr) headers['X-Compat-Error'] = compatErr;
  if (linksErr) headers['X-CompatLinks-Error'] = linksErr;

    // Debug log: show counts returned so it's easy to inspect in function logs
    try {
      console.log('get-data: database', {
        products: result && result.length ? result.length : 0,
        compatibility: compat && compat.length ? compat.length : 0,
        compat_links: links && links.length ? links.length : 0,
      });
    } catch (e) {
      console.log('get-data: debug log failed', e && e.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products: result, compatibility: compat, compat_links: links }),
    };
  } catch (error) {
    // If DB query failed, log and return demo products + error header
    console.error('get-data: products query failed', { message: error && error.message });
    return {
      statusCode: 200,
      headers: { 'X-Products-Error': error.message, 'X-Data-Source': 'demo-fallback' },
      body: JSON.stringify({ products: demoProducts, compatibility: [] }),
    };
  }
};
