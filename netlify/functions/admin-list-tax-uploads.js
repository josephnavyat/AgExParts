const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!auth || !auth.startsWith('Bearer ')) return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization' }) };
  let payload;
  try { payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET); } catch (e) { return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }; }
  if (payload.user_type !== 'admin') return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`SELECT teu.id, teu.user_id, u.username, teu.file_url, teu.file_key, teu.filename, teu.status, teu.uploaded_at
      FROM tax_exempt_uploads teu
      LEFT JOIN users u ON u.id = teu.user_id
      ORDER BY teu.uploaded_at DESC`);
    const rows = await Promise.all(res.rows.map(async r => {
      if (r.file_key && process.env.AWS_S3_BUCKET) {
        try {
          const cmd = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: r.file_key });
          const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 30 });
          return { ...r, preview_url: url };
        } catch (e) {
          return { ...r };
        }
      }
      return { ...r };
    }));
    return { statusCode: 200, body: JSON.stringify({ uploads: rows }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  } finally { await client.end(); }
};
