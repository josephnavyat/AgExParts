// Auth-only test: POST to Estes authenticate endpoint and print status + redacted body
// Probe multiple Estes auth endpoints and header names to find one that accepts your credentials
// Send the exact curl-equivalent authenticate request using env vars
(async () => {
  // Try to load local .env file if environment variables are not already set
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      raw.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx === -1) return;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        // remove inline comments
        const commentIdx = val.indexOf('#');
        if (commentIdx !== -1) val = val.slice(0, commentIdx).trim();
        // strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
    }
  } catch (e) { /* ignore env load failures */ }

  const API_KEY = (process.env.ESTES_API_KEY || '').trim();
  // ESTES_STRING may be the base64 value; trim whitespace
  let BASIC_B64 = (process.env.ESTES_STRING || process.env.ESTES_BASIC_B64 || '').trim();
  // If someone left a literal like base64('...') in .env, reject it
  if (/^base64\(/i.test(BASIC_B64) || BASIC_B64 === '') {
    // fallback to computing from ESTES_BASIC if available
    if (process.env.ESTES_BASIC) BASIC_B64 = Buffer.from(process.env.ESTES_BASIC).toString('base64');
  }

  const AUTH_URL = process.env.ESTES_AUTH_URL || 'https://cloudapi.estes-express.com/authenticate';
  const https = require('https');

  function postJson(urlString, body, headers = {}) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(urlString);
        const data = JSON.stringify(body);
        const opts = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname + (url.search || ''),
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(data) }, headers)
        };
        const req = https.request(opts, (res) => {
          let out = '';
          res.on('data', (c) => out += c);
          res.on('end', () => resolve({ statusCode: res.statusCode, body: out, headers: res.headers }));
        });
        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
      } catch (e) { reject(e); }
    });
  }

  try {
    if (!API_KEY) return console.error('ESTES_API_KEY is empty in environment');
    if (!BASIC_B64) return console.error('ESTES_STRING/ESTES_BASIC_B64/ESTES_BASIC not set or invalid in environment');

    const headers = {
      Accept: 'application/json',
      'apiKey': API_KEY,
      'Authorization': `Basic ${BASIC_B64}`,
      'Content-Type': 'application/json'
    };

    console.log('POST', AUTH_URL, 'headers:', Object.keys(headers));
    const resp = await postJson(AUTH_URL, {}, headers);
    let parsed;
    try { parsed = JSON.parse(resp.body); } catch (_) { parsed = { raw: resp.body }; }
    console.log('status:', resp.statusCode);
    console.log('body:', parsed);
  } catch (err) {
    console.error('auth-error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
