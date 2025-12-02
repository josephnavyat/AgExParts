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
    const rows = await sql`
      SELECT m.manufacturer, m.machine_type, m.model
      FROM machine_compatibility_link l
      JOIN machine_compatibility m ON l.machine_compatibility_id = m.id
      WHERE (l.sku = ${sku} OR l.product_sku = ${sku})
      ORDER BY m.manufacturer, m.machine_type, m.model;
    `;
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
