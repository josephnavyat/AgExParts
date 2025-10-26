const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function sendMailgun(to, subject, html) {
  const domain = process.env.MAILGUN_DOMAIN;
  const key = process.env.MAILGUN_API_KEY;
  if (!domain || !key) return;
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  const form = new URLSearchParams();
  form.append('from', process.env.MAILGUN_FROM || `no-reply@${domain}`);
  form.append('to', to);
  form.append('subject', subject);
  form.append('html', html);
  await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!auth || !auth.startsWith('Bearer ')) return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization' }) };
  let payload;
  try { payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET); } catch (e) { return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }; }
  if (payload.user_type !== 'admin') return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };

  const { uploadId, approve, exp_date } = JSON.parse(event.body || '{}');
  if (!uploadId) return { statusCode: 400, body: JSON.stringify({ error: 'uploadId required' }) };

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ures = await client.query('SELECT * FROM tax_exempt_uploads WHERE id = $1', [uploadId]);
    if (!ures.rows.length) return { statusCode: 404, body: JSON.stringify({ error: 'Upload not found' }) };
    const upload = ures.rows[0];
    if (approve) {
      // update user
      if (upload.user_id) {
        await client.query('UPDATE users SET tax_exempt_status = TRUE, tax_exempt_exp_date = $1 WHERE id = $2', [exp_date || null, upload.user_id]);
      }
      await client.query('UPDATE tax_exempt_uploads SET status = $1 WHERE id = $2', ['approved', uploadId]);
      // notify user
      if (upload.user_id) {
        const u = await client.query('SELECT email, username FROM users WHERE id = $1', [upload.user_id]);
        if (u.rows && u.rows[0] && u.rows[0].email) {
          const email = u.rows[0].email;
          const subject = 'Your tax exemption has been approved';
          const html = `<p>Your tax exemption has been approved. It expires on ${exp_date || 'N/A'}.</p>`;
          await sendMailgun(email, subject, html);
        }
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } else {
      await client.query('UPDATE tax_exempt_uploads SET status = $1 WHERE id = $2', ['denied', uploadId]);
      // optionally notify user
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  } finally { await client.end(); }
};
