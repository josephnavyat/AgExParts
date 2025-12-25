// get-shipping-rates.js (Netlify function - CommonJS)
'use strict';

// Switch to EasyPost integration. If EASYPOST_API_KEY is present we'll attempt
// to use the official SDK (if installed) or the REST endpoint. When the key
// is missing we return a small set of mocked rates so local/dev UI continues
// to function.

const https = require('https');
// SOAP client for Estes v4 WSDL
let soap; try { soap = require('soap'); } catch (e) { soap = null; }
const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY || '';
const SHIPPING_ALLOWED_CARRIERS = process.env.SHIPPING_ALLOWED_CARRIERS || '';
// (Estes integration removed — starting fresh)

// In-memory token cache for client-credentials flow
// Estes integration removed: token helpers and SOAP client omitted

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
  // Normalize incoming address & parcel into the shape EasyPost expects.
  const norm = (addr) => ({
    street1: addr && (addr.address1 || addr.street || addr.street1) || '',
    street2: addr && (addr.address2 || addr.street2) || '',
    city: addr && (addr.city || '') || '',
    state: addr && (addr.state || addr.stateProvince || '') || '',
    zip: addr && (addr.postalCode || addr.zip || '') || '',
    country: addr && (addr.country || 'US') || 'US',
    name: addr && (addr.name || '') || '',
    phone: addr && (addr.phone || '') || ''
  });

  // Normalize parcel: convert weight to ounces (EasyPost expects ounces for weight)
  const normalizeParcel = (p) => {
    if (!p) return {};
    const out = {};
    // numeric dims as integers
    out.length = Math.max(1, Math.round(Number(p.length) || Number(p.l) || 0));
    out.width = Math.max(1, Math.round(Number(p.width) || Number(p.w) || 0));
    out.height = Math.max(1, Math.round(Number(p.height) || Number(p.h) || 0));
    // weight conversion to ounces
    let raw = Number(p.weight) || Number(p.mass) || Number(p.oz) || 0;
    const mu = (p.mass_unit || p.weight_unit || '').toString().toLowerCase();
    if (mu === 'oz' || mu === 'ounces') raw = raw;
    else if (mu === 'lb' || mu === 'pounds' || mu === 'lbs') raw = raw * 16;
    else if (mu === 'kg' || mu === 'kilograms') raw = raw * 2.2046226218 * 16;
    else if (mu === 'g' || mu === 'grams') raw = raw / 28.34952;
    // default: if client sent large integer weight in lbs (unlikely) assume oz if very big; otherwise keep
    out.weight = Math.max(1, Math.round(raw));
    out.predefined_package = null;
    return out;
  };

  return {
    shipment: {
      to_address: norm(to_address),
      from_address: norm(from_address),
      parcel: normalizeParcel(parcel)
    }
  };
}

/**
 * Call Estes RateQuote v4 SOAP service using the WSDL.
 * Uses ESTES_API_KEY if present (sent as Authorization header) or falls back to Basic auth when client id/secret provided.
 */
// Estes SOAP helper removed

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
  // Compute a simple total weight heuristic (lbs) from parcel or commodity shapes.
  // The frontend sends `parcel` for EasyPost; some callers may supply commodity.handlingUnits.
  function computePayloadWeight(pl) {
    let w = 0;
    try {
      if (pl && typeof pl.weight === 'number') return pl.weight;
      // fallback: sum handlingUnits
      if (pl && pl.commodity && Array.isArray(pl.commodity.handlingUnits)) {
        for (const hu of pl.commodity.handlingUnits) {
          if (typeof hu.weight === 'number') w += hu.weight;
          else if (Array.isArray(hu.lineItems)) {
            for (const li of hu.lineItems) if (typeof li.weight === 'number') w += li.weight;
          }
        }
      }
      // fallback to parcel.weight (string or number)
      if (pl && pl.parcel && pl.parcel.weight) {
        // try to interpret units: if client provided mass_unit (e.g., 'oz'), convert to pounds
        let raw = Number(pl.parcel.weight) || 0;
        const mu = (pl.parcel.mass_unit || pl.parcel.weight_unit || '').toString().toLowerCase();
        if (mu === 'oz' || mu === 'ounces') {
          raw = raw / 16; // ounces -> pounds
        } else if (mu === 'kg' || mu === 'kilograms') {
          raw = raw * 2.2046226218; // kg -> pounds
        } else if (mu === 'g' || mu === 'grams') {
          raw = raw / 453.59237; // grams -> pounds
        }
        w += raw;
      }
  // Note: do not re-add raw payload.parcel.weight here (already handled above with unit conversion)
    } catch (e) {
      console.warn('Weight compute error', e && e.message);
    }
    return w;
  }

  const totalWeight = computePayloadWeight(payload);
  console.info('Computed totalWeight (lbs):', totalWeight);

  // Estes integration removed — proceed to EasyPost/mock flow

  if (!EASYPOST_API_KEY) {
    console.log('EASYPOST_API_KEY not set — returning mocked shipping rates for local development');
    // Provide a few realistic mocked carriers; later we'll filter by SHIPPING_ALLOWED_CARRIERS if set
    const mockedAll = [
      { amount: '10.00', object_id: 'mock-ups-ground-10', provider: 'UPS', servicelevel: { name: 'Ground', token: 'ground' }, estimated_days: 4, currency: 'USD', raw: { id: 'mock-ups-ground-10', carrier: 'UPS' } },
      { amount: '18.00', object_id: 'mock-fedex-18', provider: 'FedEx', servicelevel: { name: 'Express', token: 'express' }, estimated_days: 2, currency: 'USD', raw: { id: 'mock-fedex-18', carrier: 'FedEx' } },
      { amount: '8.50', object_id: 'mock-usps-8', provider: 'USPS', servicelevel: { name: 'Priority', token: 'priority' }, estimated_days: 5, currency: 'USD', raw: { id: 'mock-usps-8', carrier: 'USPS' } }
    ];
    let mocked = mockedAll;
    if (SHIPPING_ALLOWED_CARRIERS && SHIPPING_ALLOWED_CARRIERS.trim().length > 0) {
      const allowed = SHIPPING_ALLOWED_CARRIERS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      mocked = mockedAll.filter(r => {
        const p = (r.provider || r.raw && (r.raw.carrier || r.raw.provider) || '').toString().toLowerCase();
        return allowed.some(a => p.includes(a));
      });
    } else {
      // default: exclude USPS
      mocked = mockedAll.filter(r => !(r.provider || '').toString().toLowerCase().includes('usps'));
    }
    return { statusCode: 200, body: JSON.stringify({ rates: mocked }) };
  }

  // Build EasyPost payload and call REST endpoint
  const shipmentPayload = buildEasyPostShipment(to_address, from_address, parcel);
  try {
    // If heavy (>100 lbs) or oversized by common carriers, skip EasyPost and return Estes result (if any)
    const skipEasyPost = totalWeight > 100 || (shipmentPayload && shipmentPayload.shipment && shipmentPayload.shipment.parcel && (() => {
      const p = shipmentPayload.shipment.parcel; const L = Number(p.length||0); const W = Number(p.width||0); const H = Number(p.height||0);
      const girth = 2*(W+H); return (L + girth) > 165; // UPS common max
    })());
    if (skipEasyPost) {
      console.info('Skipping EasyPost call due to heavy/oversize; returning placeholder freight rate');
      // Provide a minimal placeholder freight rate so the UI shows an option for heavy shipments.
      const freightPlaceholder = {
        amount: '250.00',
        object_id: 'freight-placeholder-250',
        provider: 'Freight',
        servicelevel: { name: 'Freight (estimate)', token: 'freight_estimate' },
        estimated_days: 5,
        currency: 'USD',
        raw: { note: 'Placeholder freight rate — replace with real carrier quote when available' }
      };
      const bodyOut = { rates: [freightPlaceholder] };
      return { statusCode: 200, body: JSON.stringify(bodyOut) };
    }
    const restResp = await callEasyPostRest(EASYPOST_API_KEY, shipmentPayload);
    const normalized = normalizeEasyPostRates(restResp);
    if (!normalized || normalized.length === 0) return { statusCode: 200, body: JSON.stringify({ error: 'No rates returned', details: restResp }) };
    // If SHIPPING_ALLOWED_CARRIERS is set, use it as a whitelist (comma-separated).
    // Otherwise default to excluding USPS/Postal carriers.
    const providerName = (r) => {
      if (!r) return '';
      if (r.provider) return String(r.provider).toLowerCase();
      if (r.raw && (r.raw.carrier || r.raw.provider)) return String(r.raw.carrier || r.raw.provider).toLowerCase();
      return '';
    };

    let filtered = normalized;
    if (SHIPPING_ALLOWED_CARRIERS && SHIPPING_ALLOWED_CARRIERS.trim().length > 0) {
      const allowed = SHIPPING_ALLOWED_CARRIERS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      console.info('Shipping allowed carriers whitelist:', allowed);
      filtered = normalized.filter(r => {
        const p = providerName(r);
        return allowed.some(a => p.includes(a));
      });
    } else {
      // Default behavior: exclude USPS / United States Postal Service carriers from results
      filtered = normalized.filter(r => {
        const p = providerName(r);
        return !(p.includes('usps') || p.includes('postal') || p.includes('united states postal') || p.includes('united states post'));
      });
    }
    console.info('Shipping rates: original', normalized.length, 'filtered', filtered.length);
  const respBody = { rates: filtered };
  if (context && context.estes_quote) respBody.estes_quote = context.estes_quote;
  if (context && context.estes_error) respBody.estes_error = context.estes_error;
  return { statusCode: 200, body: JSON.stringify(respBody) };
  } catch (err) {
    console.error('Error creating EasyPost shipment (REST):', err);
    if (err && err.body) return { statusCode: 500, body: JSON.stringify({ error: 'EasyPost API error', details: err.body }) };
    return { statusCode: 500, body: JSON.stringify({ error: err && err.message ? err.message : String(err) }) };
  }
};