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
  console.log('get-compatible-skus request', { manufacturer, machine_type, model });
    // Build a parameterized query depending on which filters are provided
    const conditions = [];
  if (manufacturer) conditions.push(sql`LOWER(TRIM(mc.manufacturer)) = LOWER(TRIM(${manufacturer}))`);
  if (machine_type) conditions.push(sql`LOWER(TRIM(mc.machine_type)) = LOWER(TRIM(${machine_type}))`);
  if (model) conditions.push(sql`LOWER(TRIM(mc.model)) = LOWER(TRIM(${model}))`);

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
    console.log('get-compatible-skus detected sku column:', skuCol);

    if (!skuCol) {
      // No SKU-like column; return empty authoritative result
      return { statusCode: 200, body: JSON.stringify({ skus: [], db: true }) };
    }

    // Build query choosing the correct SKU column name in the SELECT clause
    let rows;

    // combine condition fragments into a single sql fragment (avoid sql.join which may not exist)
    let whereClause = null;
    if (conditions.length === 1) whereClause = conditions[0];
    else if (conditions.length === 2) whereClause = sql`${conditions[0]} AND ${conditions[1]}`;
    else if (conditions.length === 3) whereClause = sql`${conditions[0]} AND ${conditions[1]} AND ${conditions[2]}`;

    if (skuCol === 'product_sku') {
      rows = await sql`
        SELECT DISTINCT mcl.product_sku AS product_sku
        FROM machine_compatibility mc
        JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
        WHERE ${whereClause}
      `;
    } else {
      // sku
      rows = await sql`
        SELECT DISTINCT mcl.sku AS product_sku
        FROM machine_compatibility mc
        JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
        WHERE ${whereClause}
      `;
    }

    const skus = Array.isArray(rows) ? rows.map(r => r.product_sku).filter(Boolean) : [];
  console.log('get-compatible-skus returning', skus.length, 'skus');
    return { statusCode: 200, body: JSON.stringify({ skus, db: true }) };
  } catch (err) {
    console.error('get-compatible-skus error', err && err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Query failed' }) };
  }
};
