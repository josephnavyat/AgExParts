const https = require('https');
const fs = require('fs');
const path = require('path');

// Load local .env into process.env (simple parser)
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envRaw = fs.readFileSync(envPath, 'utf8');
    envRaw.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    });
  }
} catch (e) { console.warn('Could not load .env file', e && e.message); }

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

const authUrl = process.env.ESTES_AUTH_URL  || '';
const ratesUrl = process.env.ESTES_RATES_ENDPOINT || '';
const apiKey = process.env.ESTES_API_KEY || '';
const basicB64 = process.env.ESTES_STRING || '';

async function run() {
  if (!apiKey || !basicB64) {
    console.error('Missing ESTES_API_KEY or ESTES_STRING in environment');
    process.exit(2);
  }

  // Sanitized payload (use your preferred values)
  const payload = {
    quoteRequest: {
      shipDate: '2025-12-30T00:00:00.000Z',
      shipTime: '12:00',
      serviceLevels: ['ALL']
    },
    payment: { account: process.env.ESTES_ACCOUNT || 'B132703', payor: 'Shipper', terms: 'Prepaid' },
    requestor: { name: 'Tony Merfeld', phone: '3198594214', email: 'support@agexparts.com' },
    origin: {
      name: 'AgEx Parts',
      locationId: '123',
      address: { city: 'Cedar Falls', stateProvince: 'IA', postalCode: '50613', country: 'US' },
      contact: { name: 'Henry Jones', phone: '8045559876', phoneExt: '12', email: 'origin.email@email.com' }
    },
    destination: {
      name: 'XYZ Destination Company',
      locationId: '987-B',
      address: { city: 'Opelika', stateProvince: 'AL', postalCode: '36801', country: 'US' },
      contact: { name: 'Lucy Patel', phone: '8045554321', phoneExt: '1212', email: 'destination.email@email.com' }
    },
    commodity: {
      handlingUnits: [
        {
          count: 1,
          type: 'PT',
          weight: 600,
          tareWeight: 10,
          weightUnit: 'Pounds',
          length: 48,
          width: 40,
          height: 48,
          dimensionsUnit: 'Inches',
          isStackable: false,
          isTurnable: true,
          lineItems: [
            {
              description: 'Boxes of widgets',
              weight: 600,
              pieces: 1,
              packagingType: 'BX',
              classification: '92.5',
              nmfc: '158880',
              nmfcSub: '3',
              isHazardous: false
            }
          ]
        }
      ]
    }
  };

  // save pre payload
  try { fs.writeFileSync(path.resolve(process.cwd(), 'estes-debug-pre.json'), JSON.stringify({ timestamp: new Date().toISOString(), payload }, null, 2)); } catch (e) {}

  // append a short log entry (timestamp + payload) so it's easy to find in plaintext logs
  try {
    const logObj = { timestamp: new Date().toISOString(), event: 'pre-payload', payload };
    // overwrite the log at the start of each run so the file contains only the latest run
    const logPath = path.resolve(process.cwd(), 'estes-debug.log');
    fs.writeFileSync(logPath, JSON.stringify(logObj, null, 2) + '\n\n');
  } catch (e) {}

  try {
    const authResp = await postJson(authUrl, {}, { apiKey: apiKey, Authorization: `Basic ${basicB64}` });
    let authJson = {};
    try { authJson = JSON.parse(authResp.body); } catch (e) { authJson = { raw: authResp.body }; }
    if (!authResp.statusCode || authResp.statusCode >= 400) {
      console.error('Auth failed', authResp.statusCode, authJson);
      process.exit(3);
    }
    const token = authJson.bearerToken || authJson.token || authJson.accessToken || authJson.access_token;
    if (!token) { console.error('No token returned'); process.exit(4); }

    // log full auth response (status, headers, raw body, parsed JSON) and redact tokens
    try {
      const authLogFull = { statusCode: authResp.statusCode, headers: authResp.headers, rawBody: authResp.body };
      try { authLogFull.json = JSON.parse(authResp.body); } catch (e) { authLogFull.json = null; }
      if (authLogFull.json) {
        if (authLogFull.json.bearerToken) authLogFull.json.bearerToken = '<REDACTED>';
        if (authLogFull.json.token) authLogFull.json.token = '<REDACTED>';
        if (authLogFull.json.accessToken) authLogFull.json.accessToken = '<REDACTED>';
        if (authLogFull.json.access_token) authLogFull.json.access_token = '<REDACTED>';
      }
      fs.appendFileSync(path.resolve(process.cwd(), 'estes-debug.log'), JSON.stringify({ timestamp: new Date().toISOString(), event: 'auth-response', response: authLogFull }, null, 2) + '\n\n');
    } catch (e) {}

    const headers = { Authorization: `Bearer ${token}`, apiKey: apiKey, 'Content-Type': 'application/json' };
    const quoteResp = await postJson(ratesUrl, payload, headers);
  let quoteJson = {};
  try { quoteJson = JSON.parse(quoteResp.body); } catch (e) { quoteJson = { raw: quoteResp.body }; }

    const debug = { timestamp: new Date().toISOString(), auth: { url: authUrl, headers: { apiKey: apiKey, Authorization: '<REDACTED>' }, response: authJson }, quote: { url: ratesUrl, headers: { Authorization: '<REDACTED>', apiKey: apiKey }, requestPayload: payload, response: quoteJson } };
    fs.writeFileSync(path.resolve(process.cwd(), 'estes-debug.json'), JSON.stringify(debug, null, 2));
    // overwrite pre json with the payload in the same shape as estes-debug-pre.json (shipDate as ISO)
    try {
      const pre = { timestamp: new Date().toISOString(), payload: Object.assign({}, payload) };
      // convert shipDate to ISO timestamp
      if (pre.payload && pre.payload.quoteRequest && pre.payload.quoteRequest.shipDate) {
        const d = new Date(pre.payload.quoteRequest.shipDate);
        if (!isNaN(d.getTime())) pre.payload.quoteRequest.shipDate = d.toISOString();
      }
      fs.writeFileSync(path.resolve(process.cwd(), 'estes-debug-pre.json'), JSON.stringify(pre, null, 2));
    } catch (e) {}

    // log full quote response (status, headers, raw body, parsed JSON)
    try {
      const quoteLogFull = { statusCode: quoteResp.statusCode, headers: quoteResp.headers, rawBody: quoteResp.body };
      try { quoteLogFull.json = JSON.parse(quoteResp.body); } catch (e) { quoteLogFull.json = null; }
      // prepare curl snippet (redact token)
      const redactedToken = token ? '<REDACTED>' : '';
      const redactedApiKey = apiKey ? apiKey : '';
      const curlSnippet = `curl --location --request POST '${ratesUrl}' \\n+--header 'apikey: ${redactedApiKey}' \\n+--header 'Authorization: Bearer ${redactedToken}' \\n+--header 'Content-Type: application/json' \\n+--data-raw '`;
      fs.appendFileSync(path.resolve(process.cwd(), 'estes-debug.log'), JSON.stringify({ timestamp: new Date().toISOString(), event: 'quote-response', curl: curlSnippet, request: payload, response: quoteLogFull }, null, 2) + '\n\n');
    } catch (e) {}

    console.log('Auth status', authResp.statusCode, 'Quote status', quoteResp.statusCode);
    console.log('Saved estes-debug.json and estes-debug-pre.json');
    console.log('Quote response summary:', quoteJson.error || quoteJson.data || quoteJson);
  } catch (e) {
    console.error('Error running auth-and-quote-direct', e && e.message);
    // append error to log as well
    try {
      const errObj = { timestamp: new Date().toISOString(), event: 'error', message: e && e.message, stack: e && e.stack };
      fs.appendFileSync(path.resolve(process.cwd(), 'estes-debug.log'), JSON.stringify(errObj, null, 2) + '\n\n');
    } catch (ex) {}
    process.exit(5);
  }
}

run();
