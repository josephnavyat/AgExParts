const bcrypt = require('bcryptjs');
const { Client } = require('pg');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const { username, password, first_name, last_name, email, address, phone } = JSON.parse(event.body || '{}');
  if (!username || !password || !first_name || !last_name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Username, password, first name, and last name required' })
    };
  }

  const client = new Client({
    connectionString: process.env.PG_CONNECTION_STRING
  });
  await client.connect();

  // Check if user exists
  const userExists = await client.query('SELECT id FROM users WHERE username = $1', [username]);
  if (userExists.rows.length > 0) {
    await client.end();
    return {
      statusCode: 409,
      body: JSON.stringify({ error: 'Username already exists' })
    };
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Insert user
  await client.query(
    'INSERT INTO users (username, password_hash, first_name, last_name, email, address, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [username, hashedPassword, first_name, last_name, email || null, address || null, phone || null]
  );
  await client.end();

  return {
    statusCode: 201,
    body: JSON.stringify({ success: true })
  };
};
