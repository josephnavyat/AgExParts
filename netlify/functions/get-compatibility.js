// netlify/functions/get-compatibility.js
let sql;
try {
  const { neon } = require('@neondatabase/serverless');
  if (process.env.DATABASE_URL) sql = neon(process.env.DATABASE_URL);
} catch (e) {
  // ignore — will return empty fallback
}

exports.handler = async function(event) {
  const sku = event.queryStringParameters && event.queryStringParameters.sku;
  if (!sku) return { statusCode: 400, body: JSON.stringify({ error: 'sku required' }) };

  if (!sql) {
    return { statusCode: 200, body: JSON.stringify([]) };
  }

  try {
    // Detect which column stores the SKU (product_sku or sku)
    const cols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'machine_compatibility_link' AND column_name IN ('product_sku', 'sku')
    `;
    const found = Array.isArray(cols) ? cols.map(r => r.column_name) : [];
    const skuCol = found.includes('product_sku') ? 'product_sku' : (found.includes('sku') ? 'sku' : null);

    if (!skuCol) return { statusCode: 200, body: JSON.stringify([]) };

    const rows = await sql`
      SELECT m.manufacturer, m.machine_type, m.model
      FROM machine_compatibility_link l
      JOIN machine_compatibility m ON l.machine_compatibility_id = m.id
      WHERE l.${sql.raw(skuCol)} = ${sku}
      ORDER BY m.manufacturer, m.machine_type, m.model;
    `;
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
