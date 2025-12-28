(async () => {
  // Load .env if present
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      raw.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx === -1) return;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        const commentIdx = val.indexOf('#');
        if (commentIdx !== -1) val = val.slice(0, commentIdx).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      });
    }
  } catch (e) { /* ignore */ }

  const handler = require('../netlify/functions/estes-quote.js').handler;
  const baseQuote = {
    shipDate: new Date().toISOString().split('T')[0],
    serviceLevels: ['ALL'],
  origin: { address: { address1: '1128 Dunkerton Road', city: 'Cedar Falls', stateProvince: 'IA', postalCode: '50613', country: 'US' } },
  destination: { address: { address1: '1125 Preston Street', city: 'Opelika', stateProvince: 'AL', postalCode: '36801', country: 'US' } },
  commodity: { handlingUnits: [{ count: 1, type: 'PT', weight: 600, weightUnit: 'Pounds', length: 48, width: 40, height: 48, dimensionsUnit: 'Inches', lineItems: [{ weight: 600, pieces: 1 }] }] }
  };

  // Test 1: known-good public address pair (Mountain View, CA -> Chicago, IL)
  const testQuote = {
    shipDate: new Date().toISOString().split('T')[0],
    serviceLevels: ['ALL'],
    origin: { address: { address1: '1600 Amphitheatre Pkwy', city: 'Mountain View', stateProvince: 'CA', postalCode: '94043', country: 'US' } },
    destination: { address: { address1: '233 S Wacker Dr', city: 'Chicago', stateProvince: 'IL', postalCode: '60606', country: 'US' } },
    commodity: { handlingUnits: [{ count: 1, type: 'PT', weight: 600, weightUnit: 'Pounds', length: 48, width: 40, height: 48, dimensionsUnit: 'Inches', lineItems: [{ weight: 600, pieces: 1 }] }] }
  };

  const payload = { quoteRequest: testQuote, payment: { account: process.env.ESTES_ACCOUNT || '', payor: 'Shipper', terms: 'Prepaid' } };
  const event = { httpMethod: 'POST', body: JSON.stringify(payload) };
  try {
    const res = await handler(event);
    console.log('TEST1 RESPONSE:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('ERROR CALLING FUNCTION:', err);
  }
})();
