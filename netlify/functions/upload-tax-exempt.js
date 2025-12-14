const Busboy = require('busboy');
// Removed S3 dependency: will email attachments instead
const { Client } = require('pg');
const fetch = require('node-fetch');
const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Basic env validation: Mailgun must be configured to send attachments
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  if (!mailgunApiKey || !mailgunDomain) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Mail server not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN required)' }) };
  }

  // Netlify provides body as base64 when content-type is multipart
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Expected multipart/form-data' }) };
  }

  // Parse multipart using Busboy; provide full headers so Busboy can read boundary
  const bb = Busboy({ headers: event.headers });

  // We'll collect fields and file bytes to attach to an email
  let uploadResult = null; // { filename, mimeType, buffer }
  const fields = {};

  try {
    // collect upload promises so we can wait for S3 uploads to finish
    const uploadPromises = [];
    await new Promise((resolve, reject) => {
      bb.on('file', (name, file, info) => {
        const { filename, mimeType } = info;
        // Basic mime/type check
        const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowed.includes(mimeType)) return reject(new Error('Invalid file type'));
        // enforce 5MB size limit for email attachments
        const MAX_BYTES = (process.env.TAX_UPLOAD_MAX_MB ? parseInt(process.env.TAX_UPLOAD_MAX_MB, 10) : 5) * 1024 * 1024;
        let totalBytes = 0;
        const chunks = [];
        file.on('data', chunk => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_BYTES) {
            file.resume();
            return reject(new Error('File too large'));
          }
          chunks.push(chunk);
        });
        file.on('end', () => {
          const buffer = Buffer.concat(chunks);
          uploadResult = { filename, mimeType, buffer };
        });
      });

      bb.on('field', (name, val) => {
        fields[name] = val;
      });

      bb.on('error', err => reject(err));
      bb.on('finish', () => resolve());

      const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
      bb.end(body);
    });

  // nothing else to wait for; file is captured into uploadResult in 'end' handler
  } catch (err) {
    console.error('Upload parse/upload error', err && err.message ? err.message : err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to parse or upload file', detail: (err && err.message) || String(err) }) };
  }

  if (!uploadResult) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No file uploaded' }) };
  }

  // Placeholder: virus scan hook. Integrate your scanning service here.
  async function maybeVirusScan(upload) {
    // For now, just log.
    console.log('Skipping virus scan for', upload.filename);
    return { ok: true };
  }

  const scanRes = await maybeVirusScan(uploadResult);
  if (!scanRes.ok) {
    return { statusCode: 400, body: JSON.stringify({ error: 'File failed virus scan' }) };
  }

  // Record the upload in DB (tax_exempt_uploads)
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
  const username = fields.username || null;
    // Ensure table exists; allow file_url/file_key to be NULL because files are emailed (not uploaded to S3)
    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_exempt_uploads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        file_url TEXT,
        file_key TEXT,
        filename TEXT,
        status VARCHAR(32) DEFAULT 'pending',
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    // If an older schema had NOT NULL constraints, drop them so we can insert NULLs
    try {
      await client.query('ALTER TABLE tax_exempt_uploads ALTER COLUMN file_url DROP NOT NULL');
      await client.query('ALTER TABLE tax_exempt_uploads ALTER COLUMN file_key DROP NOT NULL');
    } catch (e) {
      // Ignore errors here; if alter fails (column absent), proceed — table likely newly created or already nullable
      console.info('tax_exempt_uploads alter-not-null skipped or failed:', e && e.message ? e.message : e);
    }

    // Try to find user id by username
    let userId = null;
    if (username) {
      const u = await client.query('SELECT id FROM users WHERE username = $1', [username]);
      if (u.rows && u.rows[0]) userId = u.rows[0].id;
    }

    // Insert DB record noting file was emailed (no S3 keys)
    const insertRes = await client.query(
      `INSERT INTO tax_exempt_uploads (user_id, file_url, file_key, filename, status, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
      [userId, null, null, uploadResult.filename, 'emailed']
    );
    const record = insertRes.rows[0];

    // Send the file as an attachment to support via Mailgun
    try {
      if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        const mgUrl = `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`;
        const subject = 'New tax exemption upload received';
        const html = `<p>A new tax exemption document was uploaded by ${username || 'unknown user'}.</p>
          <p>Filename: ${uploadResult.filename}</p>
          <p>Record ID: ${record.id}</p>`;

        const boundary = '----agexparts' + Date.now();
        const lines = [];
        function addField(name, value) {
          lines.push(`--${boundary}`);
          lines.push(`Content-Disposition: form-data; name="${name}"`);
          lines.push('');
          lines.push(value);
        }
        addField('from', process.env.MAILGUN_FROM || `no-reply@${process.env.MAILGUN_DOMAIN}`);
        addField('to', process.env.TAX_ADMIN_EMAILS || 'support@agexparts.com');
        addField('subject', subject);
        addField('html', html);

        // Attachment part
        lines.push(`--${boundary}`);
        lines.push(`Content-Disposition: form-data; name="attachment"; filename="${uploadResult.filename}"`);
        lines.push(`Content-Type: ${uploadResult.mimeType || 'application/octet-stream'}`);
        lines.push('');
        const pre = lines.join('\r\n') + '\r\n';
        const post = `\r\n--${boundary}--\r\n`;
        const multipartBody = Buffer.concat([Buffer.from(pre, 'utf8'), uploadResult.buffer, Buffer.from(post, 'utf8')]);

        const resp = await fetch(mgUrl, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from('api:' + process.env.MAILGUN_API_KEY).toString('base64'),
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: multipartBody
        });
        const text = await resp.text();
        if (!resp.ok) {
          console.error('Mailgun send error:', resp.status, text);
          // Update DB record to 'email_failed'
          await client.query('UPDATE tax_exempt_uploads SET status = $1 WHERE id = $2', ['email_failed', record.id]);
          return { statusCode: 502, body: JSON.stringify({ error: 'Mailgun send failed', detail: text }) };
        }
      } else {
        console.error('Mailgun not configured');
        await client.query('UPDATE tax_exempt_uploads SET status = $1 WHERE id = $2', ['email_failed', record.id]);
        return { statusCode: 500, body: JSON.stringify({ error: 'Mailgun not configured' }) };
      }
    } catch (err) {
      console.error('Failed to send email to admins:', err);
      await client.query('UPDATE tax_exempt_uploads SET status = $1 WHERE id = $2', ['email_failed', record.id]);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, upload: { filename: uploadResult.filename }, recordId: record.id }) };
  } catch (err) {
    console.error('DB insert error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to record upload' }) };
  } finally {
    await client.end();
  }
};

