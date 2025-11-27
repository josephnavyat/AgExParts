// get-shipping-rates.js (Netlify function - CommonJS)
"use strict";

const https = require("https");

// Use EasyPost REST API (no SDK required here). Set EASYPOST_API_KEY in env.
const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY || '';

/**
 * Fallback: create shipment by calling Shippo REST API directly.
 * Uses Basic auth with API token as username and empty password (Shippo style).
 */
function createShipmentViaEasyPost(apiKey, shipmentPayload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ shipment: shipmentPayload });

    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const options = {
      hostname: "api.easypost.com",
      port: 443,
      path: "/v2/shipments",
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            return reject({ statusCode: res.statusCode, body: parsed });
          }
          resolve(parsed);
        } catch (err) {
          reject({ error: "Invalid JSON from EasyPost", raw: data, err });
        }
      });
    });

    req.on("error", (e) => reject({ error: "request error", details: e }));
    req.write(postData);
    req.end();
  });
}

/**
 * Safely initialize the Shippo SDK if the package is present.
 * This tries multiple shapes of exports (factory function, class, object with Shippo).
 */
function initShippoClient() {
  try {
    const shippoPkg = require('shippo'); // might throw if package not installed
    if (!SHIPPO_API_KEY) return null;

    if (typeof shippoPkg === 'function') {
      // Common case: require('shippo')(APIKEY)
      return shippoPkg(SHIPPO_API_KEY);
    }

    if (typeof shippoPkg === 'object') {
      if (typeof shippoPkg.Shippo === 'function') {
        // require('shippo').Shippo
        return new shippoPkg.Shippo(SHIPPO_API_KEY);
      }
      // fallback: try constructing directly if it's a class-like export
      try {
        return new shippoPkg(SHIPPO_API_KEY);
      } catch (e) {
        // not constructible
        return shippoPkg; // return raw object so we can introspect its methods
      }
    }

    return null;
  } catch (err) {
    // package missing or require failed
    console.error('Shippo require failed:', err && err.message ? err.message : err);
    return null;
  }
}

module.exports.handler = async function (event, context) {
  if (!EASYPOST_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "EASYPOST_API_KEY not set in environment" }),
    };
  }

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
  // Build the shipment payload for EasyPost
  // EasyPost expects a top-level `shipment` object; our helper wraps it.
  const shipmentPayload = {
    to_address: to_address,
    from_address: from_address,
    parcel: parcel
  };

  try {
    // Call EasyPost REST API
    const resp = await createShipmentViaEasyPost(EASYPOST_API_KEY, shipmentPayload);

    // EasyPost response contains `rates` as an array on the returned shipment object
    const respRates = resp && resp.rates ? resp.rates : (resp?.shipment && resp.shipment.rates ? resp.shipment.rates : null);
    if (!respRates || respRates.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ error: 'No shipping rates found', details: resp }) };
    }

    // Normalize EasyPost rate shape to match the frontend's expectations (similar to Shippo)
    const normalized = respRates.map((r) => ({
      object_id: r.id || r.rate_id || r.object_id || null,
      provider: r.carrier || r.provider || null,
      servicelevel: { name: r.service || r.service_code || null },
      amount: (typeof r.rate === 'string' ? parseFloat(r.rate) : r.rate) ?? null,
      estimated_days: r.delivery_days || r.estimated_days || null,
      raw: r
    }));

    return { statusCode: 200, body: JSON.stringify({ rates: normalized }) };

  } catch (err) {
    console.error('Error creating shipment (EasyPost):', err);
    if (err && err.body) {
      return { statusCode: 500, body: JSON.stringify({ error: 'EasyPost API error', details: err.body }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: err && err.message ? err.message : String(err) }) };
  }
};