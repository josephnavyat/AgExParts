const { Client } = require('pg');

exports.handler = async (event) => {
  const sku = event.queryStringParameters && event.queryStringParameters.sku;
  if (!sku) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing sku parameter' })
    };
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT pav.attribute_name, pav.value_text, pav.value_number, pav.value_bool, a.unit
       FROM part_attribute_values pav
       JOIN attributes a ON pav.attribute_name = a.name
       WHERE pav.part_sku = $1`,
      [sku]
    );
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await client.end();
  }
};
