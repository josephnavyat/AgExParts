// get-shipping-rates.js
// Netlify function to calculate shipping rates using Shippo
/*const shippo = require('shippo')(process.env.SHIPPO_API_KEY);
import { Shippo } from "shippo";



exports.handler = async function(event, context) {
  if (!process.env.SHIPPO_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SHIPPO_API_KEY not set' })
    };
  }
  try {
    const { to_address, from_address, parcel } = JSON.parse(event.body);
    if (!to_address || !from_address || !parcel) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    const shipment = await shippo.shipment.create({
      address_from: from_address,
      address_to: to_address,
      parcels: [parcel],
      async: false
    });
    if (!shipment.rates || shipment.rates.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: 'No shipping rates found for the provided addresses and parcel. Please check the address and try again.' })
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ rates: shipment.rates })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};*/

// get-shipping-rates.js (Netlify function - CommonJS)
'use strict';

const https = require('https');

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY || '';

/**
 * Fallback: create shipment by calling Shippo REST API directly.
 * Uses Basic auth with API token as username and empty password (Shippo style).
 */
function createShipmentViaRest(apiKey, bodyPayload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(bodyPayload);

    const auth = Buffer.from(`${apiKey}:`).toString('base64');
    const options = {
      hostname: 'api.goshippo.com',
      port: 443,
      path: '/shipments/',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
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
          reject({ error: 'Invalid JSON from Shippo', raw: data, err });
        }
      });
    });

    req.on('error', (e) => reject({ error: 'request error', details: e }));
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

const shippoClient = initShippoClient();

module.exports.handler = async function(event, context) {
  if (!SHIPPO_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SHIPPO_API_KEY not set in environment' })
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

  // Build the shipment payload Shippo expects
  const shipmentBody = {
    address_from: from_address,
    address_to: to_address,
    parcels: [parcel],
    async: false
  };

  try {
    // If we have a shippoClient, check for known method shapes
    if (shippoClient) {
      // Log keys available (helpful for Netlify logs when debugging)
      try {
        const keys = Object.keys(shippoClient).slice(0, 50);
        console.log('Shippo client keys (sample):', keys);
      } catch (e) {
        console.log('Could not list shippo client keys:', e && e.message);
      }

      console.log('Available Shippo client methods:', Object.keys(shippoClient));

      // Try createShipment first, fallback to create_shipment
      let shipment;
      if (typeof shippoClient.createShipment === 'function') {
        shipment = await shippoClient.createShipment({
          address_from: from_address,
          address_to: to_address,
          parcels: [parcel],
          async: false
        });
      } else if (typeof shippoClient.create_shipment === 'function') {
        shipment = await shippoClient.create_shipment({
          address_from: from_address,
          address_to: to_address,
          parcels: [parcel],
          async: false
        });
      } else {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'No shipment creation method found on Shippo client. Check package version and documentation.' })
        };
      }

      if (!shipment || !shipment.rates) {
        return { statusCode: 200, body: JSON.stringify({ error: 'No rates returned', details: shipment }) };
      }
      return { statusCode: 200, body: JSON.stringify({ rates: shipment.rates }) };
    } else {
      console.log('No shippo SDK client initialized — using REST fallback.');
    }

    // Fallback: call Shippo REST API directly
    const restResp = await createShipmentViaRest(SHIPPO_API_KEY, shipmentBody);

    // Shippo REST returns shipment JSON including .rates
    if (!restResp || !restResp.rates || restResp.rates.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ error: 'No shipping rates found', details: restResp }) };
    }

    return { statusCode: 200, body: JSON.stringify({ rates: restResp.rates }) };

  } catch (err) {
    console.error('Error creating shipment:', err);
    // Try to return any useful structure if present
    if (err && err.body) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Shippo API error', details: err.body }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: err && err.message ? err.message : String(err) }) };
  }
};
