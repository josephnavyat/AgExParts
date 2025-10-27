const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Client } = require('pg');

exports.handler = async function(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { email } = JSON.parse(event.body || '{}');
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Email required' }) };
    }

    // Create a new DB client for this invocation and check if user exists
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      await client.end();
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'No user found with that email' }) };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Store token in DB
    await client.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userRes.rows[0].id, token, expires]
    );

    // Prepare transporter with sane defaults
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const secure = port === 465; // true for 465, false for other ports (STARTTLS)

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
      // Note: if your provider requires extra TLS options you can add `tls: { rejectUnauthorized: false }` here temporarily for debugging
    });

    const base = (process.env.BASE_URL || '').replace(/\/+$/, '');
    if (!base) {
      console.error('BASE_URL is not set');
    }
  // Include the email in the reset URL to help ensure the token is used for the intended account
  const resetUrl = `${base}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Send email: prefer Mailgun HTTP API if configured, otherwise use SMTP transporter
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;
    const mailFrom = process.env.MAILGUN_FROM || process.env.SMTP_FROM || `no-reply@${mailgunDomain || 'example.com'}`;

  if (mailgunApiKey && mailgunDomain) {
      // Use Mailgun HTTP API
      const mgUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;
      const params = new URLSearchParams();
      params.append('from', mailFrom);
      params.append('to', email);
      params.append('subject', 'Password Reset Request');
      params.append('html', `<p>You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p>`);

      const resp = await fetch(mgUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('api:' + mailgunApiKey).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`Mailgun error: ${resp.status} ${text}`);
      }
      console.log('Mailgun response:', text);
    } else {
      // Fallback to SMTP transporter
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Password Reset Request',
        html: `<p>You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p>`
      });
    }
    // Log minimal debug info (mask token for safety)
    try {
      const masked = token.slice(0, 6) + '...' + token.slice(-6);
      console.log(`password reset created for user id=${userRes.rows[0].id} email=${email} token=${masked}`);
    } catch (e) { /* ignore */ }

    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('request-password-reset error', err && err.message ? err.message : err);
    try { if (typeof client !== 'undefined' && client) await client.end(); } catch (e) { /* ignore */ }
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err && err.message ? err.message : 'Server error' })
    };
  }
};
