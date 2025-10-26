const Busboy = require('busboy');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { Client } = require('pg');
const fetch = require('node-fetch');
const crypto = require('crypto');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Basic env validation
  if (!process.env.AWS_S3_BUCKET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'AWS_S3_BUCKET not configured' }) };
  }

  // Netlify provides body as base64 when content-type is multipart
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Expected multipart/form-data' }) };
  }

  // Parse multipart using Busboy; provide full headers so Busboy can read boundary
  const bb = Busboy({ headers: event.headers });

  // We'll collect fields and upload the file stream to S3
  let uploadResult = null;
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
        // enforce 8MB size limit
        let totalBytes = 0;
        file.on('data', chunk => {
          totalBytes += chunk.length;
          if (totalBytes > 8 * 1024 * 1024) { // 8MB
            file.resume();
            return reject(new Error('File too large'));
          }
        });

        const key = `tax-exempt/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: file,
          ContentType: mimeType
        };
        const parallelUpload = new Upload({ client: s3Client, params: uploadParams });
        const p = parallelUpload.done().then(data => {
          // AWS SDK v3 does not return Location; construct URL if region and bucket known
          const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
          uploadResult = { url, key, filename };
          return uploadResult;
        });
        uploadPromises.push(p);
      });

      bb.on('field', (name, val) => {
        fields[name] = val;
      });

      bb.on('error', err => reject(err));
      bb.on('finish', () => resolve());

      const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
      bb.end(body);
    });

    // wait for any S3 uploads to complete
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }
  } catch (err) {
    console.error('Upload parse/upload error', err && err.message ? err.message : err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to parse or upload file', detail: (err && err.message) || String(err) }) };
  }

  if (!uploadResult) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No file uploaded' }) };
  }

  // Placeholder: virus scan hook. Integrate your scanning service here.
  async function maybeVirusScan(upload) {
    // Example: call a scanning service with S3 key or stream. For now, just log.
    console.log('Skipping virus scan for', upload.key);
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
    // Ensure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_exempt_uploads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        file_url TEXT NOT NULL,
        file_key TEXT NOT NULL,
        filename TEXT,
        status VARCHAR(32) DEFAULT 'pending',
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    // Try to find user id by username
    let userId = null;
    if (username) {
      const u = await client.query('SELECT id FROM users WHERE username = $1', [username]);
      if (u.rows && u.rows[0]) userId = u.rows[0].id;
    }

    const insertRes = await client.query(
      `INSERT INTO tax_exempt_uploads (user_id, file_url, file_key, filename, status, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
      [userId, uploadResult.url, uploadResult.key, uploadResult.filename, 'pending']
    );
    const record = insertRes.rows[0];

    // Notify admins via Mailgun if configured
    try {
      if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN && process.env.TAX_ADMIN_EMAILS) {
        const mgUrl = `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`;
        const subject = 'New tax exemption upload received';
        const html = `<p>A new tax exemption document was uploaded by ${username || 'unknown user'}.</p>
          <p>Filename: ${uploadResult.filename}</p>
          <p>Preview: ${uploadResult.url}</p>
          <p>Record ID: ${record.id}</p>`;
        const form = new URLSearchParams();
        form.append('from', process.env.MAILGUN_FROM || `no-reply@${process.env.MAILGUN_DOMAIN}`);
        form.append('to', process.env.TAX_ADMIN_EMAILS);
        form.append('subject', subject);
        form.append('html', html);
        await fetch(mgUrl, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
      }
    } catch (err) {
      console.error('Failed to notify admins:', err);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, upload: uploadResult, recordId: record.id }) };
  } catch (err) {
    console.error('DB insert error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to record upload' }) };
  } finally {
    await client.end();
  }
};

