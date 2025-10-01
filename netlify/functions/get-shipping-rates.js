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

// Construct Shippo client in a way that works with multiple shippo package exports
let shippoClient;
try {
  // require the package
  const shippoPkg = require('shippo');

  // shippoPkg might be:
  // 1) a factory function: require('shippo')(APIKEY)
  // 2) a class constructor: new (require('shippo'))(APIKEY)
  // 3) an object with a Shippo property/class: new shippoPkg.Shippo(APIKEY)
  const apiKey = process.env.SHIPPO_API_KEY || '';

  if (!apiKey) {
    // We'll still export the handler but it will early-return if key not set
    shippoClient = null;
  } else if (typeof shippoPkg === 'function') {
    // factory function style
    shippoClient = shippoPkg(apiKey);
  } else if (typeof shippoPkg === 'object' && typeof shippoPkg.Shippo === 'function') {
    // has Shippo class: new shippoPkg.Shippo(apiKey)
    shippoClient = new shippoPkg.Shippo(apiKey);
  } else {
    // fallback: try new on default export (rare)
    try {
      shippoClient = new shippoPkg(apiKey);
    } catch (e) {
      // leave null and handler will error out later with helpful message
      shippoClient = null;
      console.error('Unable to initialize Shippo client automatically:', e);
    }
  }
} catch (requireErr) {
  console.error('Error requiring shippo package:', requireErr);
  shippoClient = null;
}

module.exports.handler = async function(event, context) {
  if (!process.env.SHIPPO_API_KEY) {
    console.error('SHIPPO_API_KEY not set in environment');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SHIPPO_API_KEY not set' })
    };
  }

  if (!shippoClient) {
    console.error('Shippo client not initialized correctly. Check installed shippo package version.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Shippo client not initialized. See server logs for details.' })
    };
  }

  // Parse body
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    console.error('Invalid JSON body', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { to_address, from_address, parcel } = payload;

  // Basic validation — Shippo expects specific fields; adjust as needed
  if (!to_address || !from_address || !parcel) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Missing required fields. Expecting JSON with keys: to_address, from_address, parcel.',
        example: {
          to_address: { name: 'Receiver', street1: '123 Main St', city: 'City', state: 'ST', zip: '12345', country: 'US' },
          from_address: { name: 'Sender', street1: '1 Warehouse Rd', city: 'Town', state: 'ST', zip: '54321', country: 'US' },
          parcel: { length: '10', width: '5', height: '5', distance_unit: 'in', weight: '2', mass_unit: 'lb' }
        }
      })
    };
  }

  try {
    console.log('Creating shipment with Shippo', {
      to: to_address.city || to_address.zip,
      from: from_address.city || from_address.zip,
      parcel
    });

    // Different shippo clients may expect slightly different method access,
    // but most support shippo.shipment.create(...)
    const createFn = shippoClient.shipment && shippoClient.shipment.create
      ? shippoClient.shipment.create.bind(shippoClient.shipment)
      : shippoClient.createShipment || shippoClient.create_shipment || null;

    if (!createFn) {
      console.error('No shipment creation method found on Shippo client');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Shippo client does not expose a shipment.create method. Check package version.' })
      };
    }

    const shipment = await createFn({
      address_from: from_address,
      address_to: to_address,
      parcels: [parcel],
      async: false
    });

    // If Shippo responds with an error structure, bubble it up
    if (!shipment) {
      console.error('Shippo returned empty shipment response');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Empty response from Shippo' })
      };
    }

    // If Shippo indicates errors
    if (shipment.object_state === 'ERROR' || shipment.status === 'ERROR') {
      console.error('Shippo returned an error payload', shipment);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Shippo error', details: shipment })
      };
    }

    // If no rates found
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
    console.error('Shippo API call failed', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Unknown error from Shippo' })
    };
  }
};

