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
    // Log which user/email the token maps to (mask token for safety)
    try {
      const masked = token.slice(0, 6) + '...' + token.slice(-6);
      console.log(`reset attempt token=${masked} -> user_id=${row.user_id} email=${row.email}`);
    } catch (e) { /* ignore logging errors */ }
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
    // Update the user's password and return the affected id to verify
    const updateRes = await client.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id', [hashed, row.user_id]);
    if (updateRes.rows.length === 0) {
      // No rows updated
      console.error(`Password update affected 0 rows for user_id=${row.user_id}`);
      await client.end();
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update password' }) };
    }

    // Remove used token
    await client.query('DELETE FROM password_resets WHERE token = $1', [token]);
    // Clear any login lock for this email so password reset also resets lockout
    try {
      await client.query('DELETE FROM login_locks WHERE email = $1', [row.email]);
    } catch (e) {
      // If table doesn't exist or delete fails, continue - not critical
      console.warn('failed to clear login_locks for email', row.email, e && e.message ? e.message : e);
    }
    console.log(`password updated for user_id=${row.user_id}`);
    await client.end();

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('reset-password error', err && err.message ? err.message : err);
    try { if (typeof client !== 'undefined' && client) await client.end(); } catch (e) {}
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
