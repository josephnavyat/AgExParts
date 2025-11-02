const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const { email, password } = JSON.parse(event.body || '{}');
  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Email and password required' })
    };
  }

  const client = new Client({
  connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  // Get user
  const userRes = await client.query('SELECT id, username, first_name, last_name, email, address, phone, user_type, password_hash FROM users WHERE email = $1', [email]);
  await client.end();
  if (userRes.rows.length === 0) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid email or password' })
    };
  }

  const user = userRes.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid email or password' })
    };
  }

  // Create JWT with user info
  const token = jwt.sign({
    userId: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    address: user.address,
    phone: user.phone,
    user_type: user.user_type
  }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return {
    statusCode: 200,
    body: JSON.stringify({ token })
  };
};
