let sql;
try {
  const { neon } = require('@neondatabase/serverless');
  if (process.env.DATABASE_URL) sql = neon(process.env.DATABASE_URL);
} catch (e) {
  // fall through
}

exports.handler = async function (event) {
  if (!sql) {
    return {
      statusCode: 200,
      body: JSON.stringify({ manufacturers: [], machine_types: [], models: [] }),
    };
  }

  try {
    // Only include compatibility rows that are linked to products via machine_compatibility_link
    // Join to the link table to ensure we only return compatibility rows that are linked to at least one product.
    // Avoid referencing specific SKU columns here because some deployments use `product_sku` while others use `sku`.
    const mans = await sql`
      SELECT DISTINCT mc.manufacturer
      FROM machine_compatibility mc
      JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
      WHERE mc.manufacturer IS NOT NULL
      ORDER BY mc.manufacturer
    `;
    const mts = await sql`
      SELECT DISTINCT mc.machine_type
      FROM machine_compatibility mc
      JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
      WHERE mc.machine_type IS NOT NULL
      ORDER BY mc.machine_type
    `;
    const mods = await sql`
      SELECT DISTINCT mc.model
      FROM machine_compatibility mc
      JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
      WHERE mc.model IS NOT NULL
      ORDER BY mc.model
    `;

    const manufacturers = Array.isArray(mans) ? mans.map(r => r.manufacturer).filter(Boolean) : [];
    const machine_types = Array.isArray(mts) ? mts.map(r => r.machine_type).filter(Boolean) : [];
    const models = Array.isArray(mods) ? mods.map(r => r.model).filter(Boolean) : [];

    return {
      statusCode: 200,
      body: JSON.stringify({ manufacturers, machine_types, models }),
    };
  } catch (err) {
    console.error('get-compatibility-options error', err && err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Query failed' }) };
  }
};
