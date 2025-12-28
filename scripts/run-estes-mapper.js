// Run the Estes payload mapper and print the mapped payload for inspection.
(async () => {
  try {
    const mapper = require('../netlify/functions/estes-quote.js');
    const checkout = {
      destination: { addressLine1: '1125 Preston Street', city: 'Opelika', stateProvince: 'AL', postalCode: '36801', country: 'US' },
      items: [{ name: 'Test Item', weight: 600, quantity: 1 }]
    };
    const payload = mapper.buildEstesPayloadFromCheckout({ checkout });
    console.log(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('Mapper error:', err && err.message);
    process.exit(1);
  }
})();
