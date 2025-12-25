'use strict';

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

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.originZip || !body.destinationZip || !body.weight || !body.freightClass) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const estesPayload = {
      requester: {
        accountNumber: process.env.ESTES_ACCOUNT,
        requestDate: new Date().toISOString().split('T')[0]
      },
      shipment: {
        origin: { postalCode: body.originZip, countryCode: 'US' },
        destination: { postalCode: body.destinationZip, countryCode: 'US' },
        paymentTerms: 'Prepaid',
        handlingUnits: [
          {
            quantity: body.pallets || 1,
            type: 'Pallet',
            dimensions: {
              length: body.length || 48,
              width: body.width || 40,
              height: body.height || 48,
              unit: 'IN'
            },
            weight: { value: body.weight, unit: 'LB' },
            freightClass: String(body.freightClass)
          }
        ],
        accessorials: body.accessorials || []
      }
    };

    const url = process.env.ESTES_API_URL || process.env.ESTES_RATES_ENDPOINT;
    if (!url) return { statusCode: 500, body: JSON.stringify({ error: 'ESTES_API_URL not configured' }) };

    const headers = { 'x-api-key': process.env.ESTES_API_KEY || '' };
    const resp = await postJson(url, estesPayload, headers);

    let data;
    try { data = JSON.parse(resp.body); } catch (e) { data = { raw: resp.body }; }

    if (!resp.statusCode || resp.statusCode >= 400) {
      return { statusCode: resp.statusCode || 500, body: JSON.stringify({ error: 'Estes quote failed', status: resp.statusCode, estesResponse: data }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ carrier: 'Estes', scac: 'EXLA', quoteNumber: data.quoteNumber, transitDays: data.transitDays, total: data.charges && data.charges.total, breakdown: data.charges })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', message: err && err.message }) };
  }
};
