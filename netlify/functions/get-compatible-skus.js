let sql;
try {
  const { neon } = require('@neondatabase/serverless');
  if (process.env.DATABASE_URL) sql = neon(process.env.DATABASE_URL);
} catch (e) {}

exports.handler = async function (event) {
  const qs = event.queryStringParameters || {};
  const manufacturer = qs.manufacturer || null;
  const machine_type = qs.machine_type || null;
  const model = qs.model || null;

  if (!sql) return { statusCode: 200, body: JSON.stringify({ skus: null, db: false }) };

  try {
    // Build a parameterized query depending on which filters are provided
    const conditions = [];
    if (manufacturer) conditions.push(sql`mc.manufacturer = ${manufacturer}`);
    if (machine_type) conditions.push(sql`mc.machine_type = ${machine_type}`);
    if (model) conditions.push(sql`mc.model = ${model}`);

    // If no filters provided, return empty so client falls back to product-derived filtering
    if (conditions.length === 0) return { statusCode: 200, body: JSON.stringify({ skus: [] }) };

    // Determine which SKU column exists in the link table to avoid SQL errors
    const cols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'machine_compatibility_link' AND column_name IN ('product_sku', 'sku')
    `;
    const found = Array.isArray(cols) ? cols.map(r => r.column_name) : [];
    const skuCol = found.includes('product_sku') ? 'product_sku' : (found.includes('sku') ? 'sku' : null);

    if (!skuCol) {
      // No SKU-like column; return empty authoritative result
      return { statusCode: 200, body: JSON.stringify({ skus: [], db: true }) };
    }

    const rows = await sql`
      SELECT DISTINCT mcl.${sql.raw(skuCol)} AS product_sku
      FROM machine_compatibility mc
      JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
      WHERE ${sql.join(conditions, sql` AND `)}
    `;

    const skus = Array.isArray(rows) ? rows.map(r => r.product_sku).filter(Boolean) : [];
    return { statusCode: 200, body: JSON.stringify({ skus, db: true }) };
  } catch (err) {
    console.error('get-compatible-skus error', err && err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Query failed' }) };
  }
};
