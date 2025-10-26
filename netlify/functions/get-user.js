const { Client } = require('pg');
const jwt = require('jsonwebtoken');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!auth || !auth.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header' }) };
  }
  const token = auth.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT id, username, first_name, last_name, email, address, phone, user_type, tax_exempt_status, tax_exempt_exp_date
       FROM users WHERE id = $1`, [payload.userId]
    );
    if (!res.rows || res.rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }
    const user = res.rows[0];
    return { statusCode: 200, body: JSON.stringify({ user }) };
  } catch (err) {
    console.error('get-user error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  } finally {
    await client.end();
  }
};
