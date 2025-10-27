const bcrypt = require('bcryptjs');
const { Client } = require('pg');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { token, password } = JSON.parse(event.body || '{}');
    if (!token || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Token and password required' }) };
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // Find token and ensure not expired
    const res = await client.query('SELECT user_id, expires_at FROM password_resets WHERE token = $1', [token]);
    if (res.rows.length === 0) {
      await client.end();
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }
    const row = res.rows[0];
    const expires = new Date(row.expires_at);
    if (expires < new Date()) {
      // token expired
      await client.query('DELETE FROM password_resets WHERE token = $1', [token]);
      await client.end();
      return { statusCode: 400, body: JSON.stringify({ error: 'Token expired' }) };
    }

    // Hash new password and update user
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, row.user_id]);

    // Remove used token
    await client.query('DELETE FROM password_resets WHERE token = $1', [token]);
    await client.end();

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('reset-password error', err && err.message ? err.message : err);
    try { if (typeof client !== 'undefined' && client) await client.end(); } catch (e) {}
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
