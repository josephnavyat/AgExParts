const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Expects environment variables to be set in Netlify: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET
// Example POST JSON: { filename: "gallery/AA65248.png", data: "<base64-data>", contentType: "image/png" }

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { filename, data, contentType } = body;
    if (!filename || !data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'filename and data required' }) };
    }

    // build endpoint from account id (S3 API base URL provided by user)
    const endpoint = process.env.R2_S3_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: false,
    });

    const buffer = Buffer.from(data, 'base64');
    const params = {
      Bucket: process.env.R2_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      ACL: 'public-read',
    };

    await s3.send(new PutObjectCommand(params));

    const publicUrl = `${endpoint}/${process.env.R2_BUCKET}/${encodeURIComponent(filename)}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ url: publicUrl }),
    };
  } catch (err) {
    console.error('upload-image error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
