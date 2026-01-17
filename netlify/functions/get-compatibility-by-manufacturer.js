let sql;
try {
  const { neon } = require('@neondatabase/serverless');
  if (process.env.DATABASE_URL) sql = neon(process.env.DATABASE_URL);
} catch (e) {
  // fall through
}

exports.handler = async function (event) {
  const manufacturer = event.queryStringParameters && event.queryStringParameters.manufacturer;
  if (!manufacturer) {
    return { statusCode: 400, body: JSON.stringify({ error: 'manufacturer required' }) };
  }

  if (!sql) {
    return { statusCode: 200, body: JSON.stringify({ machine_types: [], models_by_machine_type: {} }) };
  }

  try {
    // case-insensitive match on manufacturer
    const mts = await sql`
      SELECT DISTINCT mc.machine_type
      FROM machine_compatibility mc
      JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
      WHERE LOWER(mc.manufacturer) = LOWER(${manufacturer})
        AND mc.machine_type IS NOT NULL
      ORDER BY mc.machine_type
    `;

    const rows = await sql`
      SELECT mc.machine_type, mc.model
      FROM machine_compatibility mc
      JOIN machine_compatibility_link mcl ON mcl.machine_compatibility_id = mc.id
      WHERE LOWER(mc.manufacturer) = LOWER(${manufacturer})
        AND mc.model IS NOT NULL
      ORDER BY mc.machine_type, mc.model
    `;

    const machine_types = Array.isArray(mts) ? mts.map(r => r.machine_type).filter(Boolean) : [];
    const models_by_machine_type = {};
    if (Array.isArray(rows)) {
      for (const r of rows) {
        const mt = r.machine_type;
        const mo = r.model;
        if (!mt) continue;
        if (!models_by_machine_type[mt]) models_by_machine_type[mt] = new Set();
        if (mo) models_by_machine_type[mt].add(mo);
      }
    }
    // convert sets to arrays and sort
    for (const k of Object.keys(models_by_machine_type)) {
      models_by_machine_type[k] = Array.from(models_by_machine_type[k]).filter(Boolean).sort((a,b)=>a.localeCompare(b));
    }

    return { statusCode: 200, body: JSON.stringify({ machine_types, models_by_machine_type }) };
  } catch (err) {
    console.error('get-compatibility-by-manufacturer error', err && err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Query failed' }) };
  }
};
