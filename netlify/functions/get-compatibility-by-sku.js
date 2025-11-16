// netlify/functions/get-compatibility-by-sku.js
let sql;
try {
  const { neon } = require('@neondatabase/serverless');
  if (process.env.DATABASE_URL) sql = neon(process.env.DATABASE_URL);
} catch (e) {
  // fall through
}

const empty = { compatibility: [] };

exports.handler = async function(event) {
  const sku = (event.queryStringParameters && event.queryStringParameters.sku) || '';
  if (!sku) return { statusCode: 400, body: JSON.stringify({ error: 'missing sku' }) };
  console.log('get-compatibility-by-sku: request', { sku });
  if (!sql) {
    console.log('get-compatibility-by-sku: no db connection, returning empty');
    return { statusCode: 200, body: JSON.stringify(empty) };
  }

  try {
      // join machine_compatibility_link -> machine_compatibility
      const rows = await sql`
      SELECT mc.id, mc.manufacturer, mc.machine_type, mc.model
      FROM machine_compatibility mc
        JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
      WHERE mcl.sku = ${sku}
    `;
  console.log('get-compatibility-by-sku: result', { sku, count: rows && rows.length ? rows.length : 0 });
  return { statusCode: 200, body: JSON.stringify({ compatibility: rows }) };
  } catch (e) {
  console.error('get-compatibility-by-sku: query failed', { sku, message: e && e.message });
    return { statusCode: 200, body: JSON.stringify(empty) };
  }
};
