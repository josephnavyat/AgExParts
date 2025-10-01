// get-shipping-rates.js
// Netlify function to calculate shipping rates using Shippo
import Shippo from 'shippo';
const shippo = Shippo(process.env.SHIPPO_API_KEY);

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
};
