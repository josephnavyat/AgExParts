// get-shipping-rates.cjs
// Netlify function to calculate shipping rates using EasyPost (REST)

const https = require('https');

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY || '';

function createShipmentViaEasyPost(apiKey, shipmentPayload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ shipment: shipmentPayload });
    const auth = Buffer.from(`${apiKey}:`).toString('base64');
    const options = {
      hostname: 'api.easypost.com',
      port: 443,
      path: '/v2/shipments',
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Accept: 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) return reject({ statusCode: res.statusCode, body: parsed });
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

exports.handler = async function(event, context) {
  if (!EASYPOST_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'EASYPOST_API_KEY not set' }) };
  }
  try {
    const { to_address, from_address, parcel } = JSON.parse(event.body || '{}');
    if (!to_address || !from_address || !parcel) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const shipmentPayload = { to_address, from_address, parcel };
    const resp = await createShipmentViaEasyPost(EASYPOST_API_KEY, shipmentPayload);
    const respRates = resp && resp.rates ? resp.rates : (resp?.shipment && resp.shipment.rates ? resp.shipment.rates : null);
    if (!respRates || respRates.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ error: 'No shipping rates found', details: resp }) };
    }

    const normalized = respRates.map((r) => ({
      object_id: r.id || r.rate_id || null,
      provider: r.carrier || r.provider || null,
      servicelevel: { name: r.service || r.service_code || null },
      amount: (typeof r.rate === 'string' ? parseFloat(r.rate) : r.rate) ?? null,
      estimated_days: r.delivery_days || r.estimated_days || null,
      raw: r
    }));

    return { statusCode: 200, body: JSON.stringify({ rates: normalized }) };
  } catch (err) {
    console.error('EasyPost error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err && err.message ? err.message : String(err) }) };
  }
};
