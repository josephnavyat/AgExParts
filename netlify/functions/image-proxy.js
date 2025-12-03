// Simple image proxy for Netlify functions.
// Usage: /.netlify/functions/image-proxy?url=https://cdn.agexparts.com/B45-1130.webp
// Returns the image with CORS headers so the browser can use it from the app origin.

exports.handler = async function (event) {
  try {
    const url = (event.queryStringParameters && event.queryStringParameters.url) || null;
    if (!url) return { statusCode: 400, body: 'missing url query parameter' };

    // Basic safety: only allow cdn.agexparts.com (adjust as needed)
    const allowedHost = 'cdn.agexparts.com';
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return { statusCode: 400, body: 'invalid url' };
    }
    if (!parsed.hostname.endsWith(allowedHost)) {
      return { statusCode: 403, body: 'forbidden host' };
    }

  // Fetch the image from upstream (use global fetch available on modern Node runtimes)
  const upstream = await fetch(url);
    if (!upstream.ok) return { statusCode: upstream.status, body: `upstream ${upstream.status}` };

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    // Return binary body as base64 so Netlify functions can return it safely
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
      body: Buffer.from(buffer).toString('base64'),
    };
  } catch (err) {
    console.error('image-proxy error', err);
    return { statusCode: 500, body: 'proxy error' };
  }
};
