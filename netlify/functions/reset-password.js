const bcrypt = require('bcryptjs');
const { Client } = require('pg');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { token, password, email } = JSON.parse(event.body || '{}');
    if (!token || !password || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Token, email and password required' }) };
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // Find token and ensure not expired
    // Join password_resets to users to make sure the token belongs to the supplied email
    const res = await client.query(
      `SELECT pr.user_id, pr.expires_at, u.email FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE pr.token = $1`,
      [token]
    );
    if (res.rows.length === 0) {
      await client.end();
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }
    const row = res.rows[0];
    // Ensure the email on the token matches the supplied email
    if ((row.email || '').toLowerCase() !== (email || '').toLowerCase()) {
      await client.end();
      return { statusCode: 400, body: JSON.stringify({ error: 'Token does not match provided email' }) };
    }
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
