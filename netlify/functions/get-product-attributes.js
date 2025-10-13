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
      'SELECT attribute_name, value_text, value_number, value_bool FROM part_attribute_values WHERE part_sku = $1',
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
