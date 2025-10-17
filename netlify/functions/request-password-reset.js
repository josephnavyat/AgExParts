const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
  }

  // Check if user exists
  const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (userRes.rowCount === 0) {
    return { statusCode: 404, body: JSON.stringify({ error: 'No user found with that email' }) };
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Store token in DB
  await pool.query(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userRes.rows[0].id, token, expires]
  );

  // Send email
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const resetUrl = `${process.env.BASE_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Password Reset Request',
    html: `<p>You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p>`
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
