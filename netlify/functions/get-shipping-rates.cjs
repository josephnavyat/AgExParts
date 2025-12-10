// get-shipping-rates.cjs
// Netlify function to calculate shipping rates using Shippo

const shippo = require('shippo')(process.env.SHIPPO_API_KEY);

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
    // Limit returned rates to a small number to avoid overwhelming the UI.
    try {
      const MAX_OPTIONS = Number(process.env.MAX_SHIPPING_OPTIONS) || 3;
      const rates = Array.isArray(shipment.rates) ? shipment.rates.slice() : [];
      rates.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
      const limited = rates.slice(0, MAX_OPTIONS);
      return {
        statusCode: 200,
        body: JSON.stringify({ rates: limited })
      };
    } catch (e) {
      // Fallback to returning all rates if anything goes wrong with filtering
      return {
        statusCode: 200,
        body: JSON.stringify({ rates: shipment.rates })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
