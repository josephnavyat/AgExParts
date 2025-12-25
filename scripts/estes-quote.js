#!/usr/bin/env node
/*
  Small helper to POST an Estes rate/quote request when total weight > 100 lbs.

  Usage:
    # export credentials first (recommended)
    export ESTES_API_KEY="your_api_key"
    # or
    export ESTES_CLIENT_ID="your_client_id"
    export ESTES_CLIENT_SECRET="your_client_secret"

    node scripts/estes-quote.js --payload ./payload.json

  If no payload path is provided the script will use a small sample payload.
  The script will compute total weight from commodity.handlingUnits[].weight
  (fallback to lineItems weights) and will only call the remote API when
  totalWeight > 100. The endpoint used is /v1/rates — adjust if your Estes
  API documentation specifies a different path.
*/

import fs from 'fs';
import path from 'path';
import process from 'process';

const DEFAULT_ENDPOINT = 'https://cloudapi.estes-express.com/v1/rates';

function usage() {
  console.log('Usage: node scripts/estes-quote.js --payload payload.json');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--payload' && args[i+1]) { out.payload = args[++i]; }
    else if ((a === '-h' || a === '--help')) usage();
    else { /* ignore unknown */ }
  }
  return out;
}

function computeTotalWeight(body) {
  let total = 0;
  if (body && body.commodity && Array.isArray(body.commodity.handlingUnits)) {
    for (const hu of body.commodity.handlingUnits) {
      if (typeof hu.weight === 'number') total += hu.weight;
      else if (Array.isArray(hu.lineItems)) {
        for (const li of hu.lineItems) {
          if (typeof li.weight === 'number') total += li.weight;
        }
      }
    }
  }
  return total;
}

function redact(obj) {
  const SENSITIVE = /api|secret|key|token|password/i;
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE.test(k)) out[k] = 'REDACTED';
      else out[k] = redact(v);
    }
    return out;
  }
  return obj;
}

async function main() {
  const args = parseArgs();
  let body = null;
  if (args.payload) {
    const p = path.resolve(process.cwd(), args.payload);
    if (!fs.existsSync(p)) {
      console.error('Payload file not found:', p);
      process.exit(2);
    }
    try {
      const raw = fs.readFileSync(p, 'utf8');
      body = JSON.parse(raw);
    } catch (err) {
      console.error('Failed to read/parse payload:', err.message);
      process.exit(3);
    }
  } else {
    // Minimal inline sample (matches the schema shape)
    body = {
      quoteRequest: { shipDate: new Date().toISOString().slice(0,10), serviceLevels: ['LTL'] },
      payment: { account: 'ABC1234', payor: 'Shipper', terms: 'Prepaid' },
      origin: { address: { city: 'Richmond', stateProvince: 'VA', postalCode: '23220', country: 'US' } },
      destination: { address: { city: 'Harrisburg', stateProvince: 'PA', postalCode: '17101', country: 'US' } },
      commodity: { handlingUnits: [ { count: 1, type: 'PL', weight: 150, tareWeight: 50, weightUnit: 'Pounds', length: 48, width: 40, height: 48, dimensionsUnit: 'Inches', isStackable: true, isTurnable: false, lineItems: [ { description: 'Sample', weight: 150, pieces: 1, packagingType: 'PL', classification: '92.5' } ] } ] }
    };
  }

  // The schema the user provided nests many fields under top-level keys; our
  // script accepts the whole object and expects commodity.handlingUnits.
  const totalWeight = computeTotalWeight(body);
  console.log('Computed total weight (lbs):', totalWeight);
  if (totalWeight <= 100) {
    console.log('Total weight <= 100 lbs. Skipping Estes rate request per rule.');
    process.exit(0);
  }

  // Determine auth method
  const apiKey = process.env.ESTES_API_KEY;
  const clientId = process.env.ESTES_CLIENT_ID;
  const clientSecret = process.env.ESTES_CLIENT_SECRET;
  if (!apiKey && !(clientId && clientSecret)) {
    console.error('No credentials found. Set ESTES_API_KEY or ESTES_CLIENT_ID and ESTES_CLIENT_SECRET in env.');
    process.exit(4);
  }

  const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  // If no apiKey but client creds exist, we'll use Basic auth via fetch options

  // Endpoint (adjust if Estes doc requires a different path)
  const endpoint = process.env.ESTES_RATES_ENDPOINT || DEFAULT_ENDPOINT;

  try {
    const fetchOpts = {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    };
    if (!apiKey && clientId && clientSecret) {
      // Add basic auth header
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      fetchOpts.headers['Authorization'] = `Basic ${basic}`;
    }

    console.log('Posting rate request to Estes...');
    const res = await fetch(endpoint, fetchOpts);
    const txt = await res.text();
    let json = null;
    try { json = JSON.parse(txt); } catch (e) { /* not JSON */ }
    // Redact sensitive fields if present
    const safe = json ? redact(json) : txt;
    console.log('Response status:', res.status, res.statusText);
    console.log('Response body (redacted):');
    console.log(typeof safe === 'string' ? safe : JSON.stringify(safe, null, 2));
    if (!res.ok) process.exit(5);
  } catch (err) {
    console.error('Request failed:', err.message);
    process.exit(6);
  }
}

// Node 18+ includes global fetch. If not available, user should run with Node 18+ or
// install a fetch polyfill.
if (typeof fetch === 'undefined') {
  console.error('Global fetch is not available in this Node runtime. Use Node 18+ or add a fetch polyfill.');
  process.exit(7);
}

main();
