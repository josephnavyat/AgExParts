let sql;
try {
  const { neon } = require('@neondatabase/serverless');
  if (process.env.DATABASE_URL) sql = neon(process.env.DATABASE_URL);
} catch (e) {
  // fall through
}

exports.handler = async function (event) {
  const qs = event.queryStringParameters || {};
  const manufacturer = qs.manufacturer || null;
  const machine_type = qs.machine_type || null;
  const model = qs.model || null;

  if (!sql) return { statusCode: 200, body: JSON.stringify({ sample: [], db: false, message: 'no db' }) };

  try {
    const conditions = [];
    if (manufacturer) conditions.push(sql`LOWER(TRIM(mc.manufacturer)) = LOWER(TRIM(${manufacturer}))`);
    if (machine_type) conditions.push(sql`LOWER(TRIM(mc.machine_type)) = LOWER(TRIM(${machine_type}))`);
    if (model) conditions.push(sql`LOWER(TRIM(mc.model)) = LOWER(TRIM(${model}))`);

    if (conditions.length === 0) return { statusCode: 200, body: JSON.stringify({ sample: [], db: true, message: 'no filters provided' }) };

    // detect sku-like column
    const cols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'machine_compatibility_link' AND column_name IN ('product_sku', 'sku')
    `;
    const found = Array.isArray(cols) ? cols.map(r => r.column_name) : [];
    const skuCol = found.includes('product_sku') ? 'product_sku' : (found.includes('sku') ? 'sku' : null);

    let rows;
    if (skuCol === 'product_sku') {
      rows = await sql`
        SELECT mc.id AS compatibility_id, mc.manufacturer, mc.machine_type, mc.model, mcl.product_sku AS product_sku
        FROM machine_compatibility mc
        JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
        WHERE ${sql.join(conditions, sql` AND `)}
        LIMIT 100
      `;
    } else if (skuCol === 'sku') {
      rows = await sql`
        SELECT mc.id AS compatibility_id, mc.manufacturer, mc.machine_type, mc.model, mcl.sku AS product_sku
        FROM machine_compatibility mc
        JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
        WHERE ${sql.join(conditions, sql` AND `)}
        LIMIT 100
      `;
    } else {
      // no sku-like column, still return compatibility rows (without sku)
      rows = await sql`
        SELECT mc.id AS compatibility_id, mc.manufacturer, mc.machine_type, mc.model
        FROM machine_compatibility mc
        WHERE ${sql.join(conditions, sql` AND `)}
        LIMIT 100
      `;
    }

    return { statusCode: 200, body: JSON.stringify({ sample: rows || [], skuCol, db: true }) };
  } catch (err) {
    console.error('debug-compat-sample error', err && err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err && err.message }) };
  }
};
