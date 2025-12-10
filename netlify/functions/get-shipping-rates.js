// get-shipping-rates.js (Netlify function - CommonJS)
'use strict';

// Switch to EasyPost integration. If EASYPOST_API_KEY is present we'll attempt
// to use the official SDK (if installed) or the REST endpoint. When the key
// is missing we return a small set of mocked rates so local/dev UI continues
// to function.

const https = require('https');
const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY || '';

function callEasyPostRest(apiKey, bodyPayload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(bodyPayload);
    const options = {
      hostname: 'api.easypost.com',
      port: 443,
      path: '/v2/shipments',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            return reject({ statusCode: res.statusCode, body: parsed });
          }
          resolve(parsed);
        } catch (err) {
          reject({ error: 'Invalid JSON from EasyPost', raw: data, err });
        }
      });
    });

    req.on('error', (e) => reject({ error: 'request error', details: e }));
    req.write(postData);
    req.end();
  });
}

/**
 * Build an EasyPost compatible shipment payload from the incoming shape.
 * We keep the same high-level input keys: to_address, from_address, parcel
 * and map them to EasyPost's expected nested structure.
 */
function buildEasyPostShipment(to_address, from_address, parcel) {
  // EasyPost expects parcel weight in ounces or grams depending on units; the
  // client currently sends mass_unit and distance_unit. We'll forward parcel
  // as-is and let the API handle units. For minimal change, we place the
  // parcel under 'parcel' key.
  return {
    shipment: {
      to_address,
      from_address,
      parcel
    }
  };
}

/**
 * Convert EasyPost rates to a generic { rates: [...] } shape the client expects.
 * EasyPost returns rates under shipment.rates when creating a shipment.
 */
function normalizeEasyPostRates(easyResp) {
  const rates = [];
  if (!easyResp) return rates;
  // Some responses include rates directly under easyResp.rates or
  // easyResp.shipment.rates
  const src = easyResp.rates || (easyResp.shipment && easyResp.shipment.rates) || (easyResp.shipment && easyResp.shipment.rate && [easyResp.shipment.rate]);
  if (!src) return rates;
  for (const r of src) {
    // Normalize into the shape the frontend expects:
    // - amount (string/number)
    // - object_id (unique id)
    // - provider (carrier)
    // - servicelevel: { name, token }
    const amountRaw = r.rate || r.price || (r.amount && r.amount.amount) || (r.retail_rate || null);
    const amount = amountRaw !== null && amountRaw !== undefined ? String(amountRaw) : null;
    const objectId = r.id || r.object_id || r.rate_id || (r.extra && r.extra.id) || null;
    rates.push({
      amount,
      object_id: objectId,
      provider: r.carrier || r.provider || null,
      // provide a minimal servicelevel object so frontend can show name/token
      servicelevel: { name: r.service || (r.service_level && r.service_level.name) || null, token: r.service || null },
      estimated_days: r.delivery_days || r.estimated_days || r.est_delivery_days || null,
      currency: r.currency || (r.amount && r.amount.currency) || 'USD',
      raw: r,
      extra: r
    });
  }
  return rates;
}

module.exports.handler = async function(event, context) {
  // Parse body
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { to_address, from_address, parcel } = payload;
  if (!to_address || !from_address || !parcel) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Missing required fields. Send JSON with to_address, from_address, parcel.'
      })
    };
  }

  // If no EasyPost key is configured, return mocked rates to keep local UI working.
  if (!EASYPOST_API_KEY) {
    console.log('EASYPOST_API_KEY not set — returning mocked shipping rates for local development');
    const mocked = [
      { amount: '12.00', object_id: 'mock-ground-12', provider: 'MockCarrier', servicelevel: { name: 'Ground', token: 'Ground' }, estimated_days: 5, currency: 'USD', raw: { id: 'mock-ground-12' } },
      { amount: '24.00', object_id: 'mock-express-24', provider: 'MockCarrier', servicelevel: { name: 'Express', token: 'Express' }, estimated_days: 2, currency: 'USD', raw: { id: 'mock-express-24' } }
    ];
    return { statusCode: 200, body: JSON.stringify({ rates: mocked }) };
  }

  // Build EasyPost payload and call SDK or REST
  const shipmentPayload = buildEasyPostShipment(to_address, from_address, parcel);

  try {
    // Try to use the EasyPost SDK if available
    try {
      const EasyPost = require('@easypost/api');
      const client = new EasyPost(EASYPOST_API_KEY);
      console.log('Using EasyPost SDK');
      // SDK call: client.Shipment.create(shipmentPayload.shipment)
      const created = await client.Shipment.create(shipmentPayload.shipment);
      const normalized = normalizeEasyPostRates(created);
      if (!normalized || normalized.length === 0) return { statusCode: 200, body: JSON.stringify({ error: 'No rates returned', details: created }) };
      return { statusCode: 200, body: JSON.stringify({ rates: normalized }) };
    } catch (sdkErr) {
      // SDK not installed or failed — fall back to REST
      console.log('EasyPost SDK not available or failed, falling back to REST:', sdkErr && sdkErr.message);
      const restResp = await callEasyPostRest(EASYPOST_API_KEY, shipmentPayload);
      const normalized = normalizeEasyPostRates(restResp);
      if (!normalized || normalized.length === 0) return { statusCode: 200, body: JSON.stringify({ error: 'No rates returned', details: restResp }) };
      return { statusCode: 200, body: JSON.stringify({ rates: normalized }) };
    }
  } catch (err) {
    console.error('Error creating EasyPost shipment:', err);
    if (err && err.body) return { statusCode: 500, body: JSON.stringify({ error: 'EasyPost API error', details: err.body }) };
    return { statusCode: 500, body: JSON.stringify({ error: err && err.message ? err.message : String(err) }) };
  }
};