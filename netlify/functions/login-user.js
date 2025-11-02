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

  // Ensure a table exists to track failed login attempts / lockouts
  await client.query(`
    CREATE TABLE IF NOT EXISTS login_locks (
      email TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      lockout_until TIMESTAMPTZ NULL
    )
  `);

  // Check if the user exists first
  const userRes = await client.query('SELECT id, username, first_name, last_name, email, address, phone, user_type, password_hash FROM users WHERE email = $1', [email]);
  if (userRes.rows.length === 0) {
    await client.end();
    // Don't create lock records for unknown emails to avoid abuse
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid email or password' })
    };
  }

  const user = userRes.rows[0];

  // Check lock status for this email
  const lockRes = await client.query('SELECT attempts, lockout_until FROM login_locks WHERE email = $1', [email]);
  if (lockRes.rows.length > 0 && lockRes.rows[0].lockout_until) {
    const lockUntil = new Date(lockRes.rows[0].lockout_until);
    const now = new Date();
    if (lockUntil > now) {
      const remainingMs = lockUntil - now;
      const minutes = Math.ceil(remainingMs / 60000);
      await client.end();
      return {
        statusCode: 429,
        body: JSON.stringify({ error: `Account locked due to too many failed login attempts. Try again in ${minutes} minute(s) or reset your password.` })
      };
    }
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    // Increment attempts and set lockout when threshold reached
    const THRESHOLD = 5;
    const incRes = await client.query(`
      INSERT INTO login_locks (email, attempts, lockout_until)
      VALUES ($1, 1, NULL)
      ON CONFLICT (email) DO UPDATE
        SET attempts = login_locks.attempts + 1,
            lockout_until = CASE WHEN login_locks.attempts + 1 >= $2 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
      RETURNING attempts, lockout_until
    `, [email, THRESHOLD]);

    const row = incRes.rows[0] || { attempts: 0, lockout_until: null };
    await client.end();
    if (row.lockout_until) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Account locked due to too many failed login attempts. Try again in 15 minutes.' })
      };
    }
    const remaining = THRESHOLD - row.attempts;
    return {
      statusCode: 401,
      body: JSON.stringify({ error: `Invalid email or password. ${remaining} attempt(s) remaining before temporary lockout.` })
    };
  }

  // Successful login: clear any lock record
  await client.query('DELETE FROM login_locks WHERE email = $1', [email]);

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
  await client.end();
  return {
    statusCode: 200,
    body: JSON.stringify({ token })
  };
};
