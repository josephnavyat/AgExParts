// Load a saved debug request (estes-debug.json or estes-debug-pre.json) and POST it through the handler to capture output.
const fs = require('fs');
const path = require('path');
const handler = require('../netlify/functions/estes-quote.js');

// Load local .env file (if present) into process.env (simple parser, no dependencies)
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
      // remove surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    });
  }
} catch (e) { console.warn('Could not load .env file', e && e.message); }

async function run() {
  const p = process.argv[2] || 'estes-debug.json';
  const file = path.resolve(process.cwd(), p);
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    process.exit(2);
  }
  const raw = fs.readFileSync(file, 'utf8');
  let json;
  try { json = JSON.parse(raw); } catch (e) { console.error('Invalid JSON file'); process.exit(2); }
  // Try to extract request payload shape from file
  // Try common shapes: top-level payload, requestPayload, quote.requestPayload, or the whole file
  let payload = json.payload || json.requestPayload || json;
  if (json.quote && json.quote.requestPayload) payload = json.quote.requestPayload;
  // If the payload wraps a quoteRequest under another key, unwrap it
  if (payload.quoteRequest && Object.keys(payload).length === 1) payload = payload.quoteRequest;
  // If payload has a quoteRequest plus sibling origin/destination, merge them so handler finds postal codes
  let bodyToSend = payload;
  if (payload && payload.quoteRequest && (payload.origin || payload.destination || payload.payment || payload.requestor || payload.commodity)) {
    const merged = Object.assign({}, payload.quoteRequest);
    if (payload.origin) merged.origin = payload.origin;
    if (payload.destination) merged.destination = payload.destination;
    if (payload.payment) merged.payment = payload.payment;
    if (payload.requestor) merged.requestor = payload.requestor;
    if (payload.commodity) merged.commodity = payload.commodity;
    bodyToSend = { quoteRequest: merged };
  }
  const event = { httpMethod: 'POST', body: JSON.stringify(bodyToSend) };
  console.log('Posting payload from', file);
  try {
    const qr = payload.quoteRequest || payload;
    console.log('payload summary:', {
      shipDate: qr.shipDate,
      shipTime: qr.shipTime,
      origin_postal: qr.origin && (qr.origin.postalCode || (qr.origin.address && qr.origin.address.postalCode)),
      dest_postal: qr.destination && (qr.destination.postalCode || (qr.destination.address && qr.destination.address.postalCode)),
      serviceLevels: qr.serviceLevels && qr.serviceLevels.slice(0,3)
    });
  } catch (e) { console.warn('could not summarize payload'); }
  const res = await handler.handler(event);
  try { console.log('Handler response status:', res.statusCode); console.log(JSON.stringify(JSON.parse(res.body), null, 2)); }
  catch (e) { console.log('Handler response body:', res.body); }
  // write a local log for inspection
  try {
    const out = { timestamp: new Date().toISOString(), sent: bodyToSend, response: null };
    try { out.response = JSON.parse(res.body); } catch (e) { out.response = { raw: res.body }; }
    const fname = path.resolve(process.cwd(), `estes-runlog-${Date.now()}.json`);
    fs.writeFileSync(fname, JSON.stringify(out, null, 2));
    console.log('Wrote run log to', fname);
  } catch (e) { console.warn('Could not write run log', e && e.message); }
}

run().catch(e => { console.error(e); process.exit(1); });
