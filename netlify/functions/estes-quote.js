'use strict';

const https = require('https');
const defaults = require('./estes-defaults');
const fs = require('fs');
const path = require('path');
const CACHE_FILE = path.resolve(process.cwd(), 'estes-cache.json');
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function postJson(urlString, body, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const data = JSON.stringify(body);
      const opts = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(data) }, headers)
      };
      const req = https.request(opts, (res) => {
        let out = '';
        res.on('data', (c) => out += c);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: out, headers: res.headers }));
      });
      req.on('error', (e) => reject(e));
      req.write(data);
      req.end();
    } catch (e) { reject(e); }
  });
}

/**
 * Map checkout/body to a full Estes payload using defaults. Exported for testing.
 */
function buildEstesPayloadFromCheckout(body) {
  const checkout = body.checkout || {};
  const destination = checkout.destination || body.destination || {};
  const items = checkout.items || body.items || [];

  const destPostal = (destination.postalCode || (destination.address && destination.address.postalCode) || destination.postal) || null;
  if (!destPostal) throw new Error('Missing destination postalCode in checkout payload');

  const totalWeight = items.reduce((s, it) => s + (Number(it.weight || it.itemWeight || 0) * (Number(it.quantity || it.qty || 1) || 1)), 0) || (body.weight || 600);
  const totalPieces = items.reduce((s, it) => s + (Number(it.quantity || it.qty || 1) || 1), 0) || 1;

  const handlingUnit = {
    count: 1,
    type: 'PT',
    weight: Math.max(1, Math.round(totalWeight)),
    tareWeight: 10,
    weightUnit: 'Pounds',
    length: body.length || 48,
    width: body.width || 40,
    height: body.height || 48,
    dimensionsUnit: 'Inches',
    isStackable: false,
    isTurnable: false,
    lineItems: items.length ? items.map(it => ({ description: it.name || it.title || 'item', weight: Number(it.weight || it.itemWeight || 0) || 0, pieces: Number(it.quantity || it.qty || 1) || 1, packagingType: it.packageCode || 'BX', classification: it.classification || '92.5', nmfc: it.nmfc || '', nmfcSub: it.nmfcSub || '', isHazardous: !!it.isHazardous })) : [{ weight: Math.max(1, Math.round(totalWeight)), pieces: totalPieces, packagingType: 'BX', classification: '92.5', nmfc: '', nmfcSub: '', isHazardous: false }]
  };

  const payload = {
    quoteRequest: {
      shipDate: new Date().toISOString().split('T')[0],
      shipTime: body.shipTime || undefined,
      serviceLevels: ['ALL'],
      origin: defaults.origin,
      destination: {
        name: destination.name || destination.company || '',
        locationId: destination.locationId || '',
        address: {
          address1: destination.addressLine1 || destination.address1 || destination.street || '',
          address2: destination.addressLine2 || destination.address2 || '',
          city: destination.city || '',
          stateProvince: destination.stateProvince || destination.state || '',
          postalCode: String(destPostal),
          country: destination.country || destination.countryAbbrev || 'US'
        },
        contact: {
          name: destination.contactName || destination.contact || '',
          phone: destination.phone || '',
          phoneExt: destination.phoneExt || '',
          email: destination.contactEmail || destination.email || ''
        }
      },
      commodity: { handlingUnits: [handlingUnit] },
      accessorials: body.accessorials || []
    },
    payment: { account: defaults.paymentAccount, payor: 'Shipper', terms: 'Prepaid' },
    requestor: defaults.requestor
  };

  return payload;
}
exports.buildEstesPayloadFromCheckout = buildEstesPayloadFromCheckout;

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
  let body = JSON.parse(event.body || '{}');
  // Accept wrapper payloads like { payload: { ... } } (from debug files)
  try { if (body && body.payload && typeof body.payload === 'object') body = body.payload; } catch (e) {}

  // Build the Estes payload. Accept either a full `quoteRequest` from client or build from checkout data.
  let estesPayload;
  if (body && body.quoteRequest) {
      // Accept payloads where origin/destination were provided at the top-level (as produced by the direct script)
      // by copying them into quoteRequest if missing.
      try {
        if ((!body.quoteRequest.origin || !body.quoteRequest.destination) && (body.origin || body.destination)) {
          body.quoteRequest.origin = body.quoteRequest.origin || body.origin || body.quoteRequest.origin;
          body.quoteRequest.destination = body.quoteRequest.destination || body.destination || body.quoteRequest.destination;
        }
      } catch (e) {}

      // basic validation: require shipDate and origin/destination postal codes
      const qr = body.quoteRequest || {};
      const originPost = (qr.origin && (qr.origin.postalCode || (qr.origin.address && qr.origin.address.postalCode))) || null;
      const destPost = (qr.destination && (qr.destination.postalCode || (qr.destination.address && qr.destination.address.postalCode))) || null;
      if (!qr.shipDate || !originPost || !destPost) {
        return { statusCode: 400, body: JSON.stringify({ error: 'quoteRequest must include shipDate and origin.destination postalCode' }) };
      }
      // forward client-provided structure, but sanitize commodity weights to ensure Estes receives numeric totals
      estesPayload = body;
      try {
        const qr = estesPayload.quoteRequest || {};
        if (qr.commodity && Array.isArray(qr.commodity.handlingUnits) && qr.commodity.handlingUnits.length > 0) {
          // compute total weight from handlingUnits or lineItems
          let computed = 0;
          let tareTotal = 0;
          let piecesTotal = 0;
          for (const hu of qr.commodity.handlingUnits) {
            // prefer explicit hu.weight, fall back to sum of lineItems
            if (hu && (hu.weight || hu.weight === 0)) {
              computed += Number(hu.weight) || 0;
            } else if (hu && Array.isArray(hu.lineItems) && hu.lineItems.length > 0) {
              for (const li of hu.lineItems) {
                const liPieces = Number(li.pieces || li.count || 1) || 1;
                piecesTotal += liPieces;
                computed += Number(li.weight || 0) * liPieces;
              }
            }
            if (hu && (hu.tareWeight || hu.tareWeight === 0)) {
              tareTotal += Number(hu.tareWeight) || 0;
            }
            if (hu && (hu.lineItems && Array.isArray(hu.lineItems))) {
              for (const li of hu.lineItems) {
                piecesTotal += Number(li.pieces || 0) || 0;
              }
            }
          }
          // if computed is zero, try to use top-level body.weight
          if (!computed && (estesPayload.weight || estesPayload.totalWeight)) computed = Number(estesPayload.weight || estesPayload.totalWeight) || 0;
          // apply computed weight back into first handling unit to ensure carrier sees non-zero
          if (computed > 0) {
            const first = qr.commodity.handlingUnits[0];
            // include tare to create gross weight for carrier
            const gross = Math.max(1, Math.round((Number(computed) || 0) + (Number(tareTotal) || 0)));
            first.weight = gross;
            if (!first.weightUnit) first.weightUnit = 'Pounds';
            // Also set an aggregate totalShipmentWeight including tare weight
            try {
              if (!qr.commodity) qr.commodity = {};
              qr.commodity.totalShipmentWeight = gross;
              // helpful extras
              if (!qr.commodity.totalPieces) qr.commodity.totalPieces = piecesTotal || 1;
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* best-effort */ }
    } else {
      // Expect client to send a `checkout` object with destination and items. We'll map fields below.
      const checkout = body.checkout || {};
      const destination = checkout.destination || body.destination || {};
      const items = checkout.items || body.items || [];

      // Validate destination postal code exists
      const destPostal = (destination.postalCode || (destination.address && destination.address.postalCode) || destination.postal) || null;
      if (!destPostal) return { statusCode: 400, body: JSON.stringify({ error: 'Missing destination postalCode in checkout payload' }) };

      // Map items -> a single handling unit (for now) and sum weight/pieces
      const totalWeight = items.reduce((s, it) => s + (Number(it.weight || it.itemWeight || 0) * (Number(it.quantity || it.qty || 1) || 1)), 0) || (body.weight || 600);
      const totalPieces = items.reduce((s, it) => s + (Number(it.quantity || it.qty || 1) || 1), 0) || 1;

      const handlingUnit = {
        count: 1,
        type: 'PT',
        weight: Math.max(1, Math.round(totalWeight)),
        tareWeight: 10,
        weightUnit: 'Pounds',
        length: body.length || 48,
        width: body.width || 40,
        height: body.height || 48,
        dimensionsUnit: 'Inches',
        isStackable: false,
            isTurnable: true,
            lineItems: items.length ? items.map(it => ({ description: it.name || it.title || 'item', weight: Number(it.weight || it.itemWeight || 0) || 0, pieces: Number(it.quantity || it.qty || 1) || 1, packagingType: it.packageCode || 'BX', classification: it.classification || '92.5', nmfc: it.nmfc || '', nmfcSub: it.nmfcSub || '', isHazardous: !!it.isHazardous })) : [{ weight: Math.max(1, Math.round(totalWeight)), pieces: totalPieces, packagingType: 'BX', classification: '92.5', nmfc: '', nmfcSub: '', isHazardous: false }]
      };

      estesPayload = {
        quoteRequest: {
          shipDate: new Date().toISOString().split('T')[0],
          shipTime: body.shipTime || undefined,
          serviceLevels: ['ALL'],
          origin: defaults.origin,
          destination: {
            name: destination.name || destination.company || '',
            locationId: destination.locationId || '',
            address: {
              address1: destination.addressLine1 || destination.address1 || destination.street || '',
              address2: destination.addressLine2 || destination.address2 || '',
              city: destination.city || '',
              stateProvince: destination.stateProvince || destination.state || '',
              postalCode: String(destPostal),
              country: destination.country || destination.countryAbbrev || 'US'
            },
                contact: {
                  name: destination.contactName || destination.contact || '',
                  phone: destination.phone || '',
                  phoneExt: destination.phoneExt || '',
                  email: destination.contactEmail || destination.email || ''
                },
          },
          commodity: { handlingUnits: [handlingUnit] },
          accessorials: body.accessorials || []
        },
        payment: { account: defaults.paymentAccount, payor: 'Shipper', terms: 'Prepaid' },
        requestor: defaults.requestor
      };
    }

    // Sanitizations: normalize shipTime, default serviceLevels, remove empty accessorials
    try {
      const qr = estesPayload && (estesPayload.quoteRequest || estesPayload);
      if (qr) {
        // normalize shipTime to HH:mm and clamp minutes to 59
        if (qr.shipTime && typeof qr.shipTime === 'string') {
          const parts = qr.shipTime.split(':').map(p => parseInt(p,10));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const hh = Math.max(0, Math.min(23, parts[0]));
            const mm = Math.max(0, Math.min(59, parts[1]));
            qr.shipTime = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
          } else {
            delete qr.shipTime;
          }
        }
        // default serviceLevels to ALL if missing or empty
        if (!qr.serviceLevels || !Array.isArray(qr.serviceLevels) || qr.serviceLevels.length === 0) qr.serviceLevels = ['ALL'];
        // drop accessorials if empty or only empty codes
        if (qr.accessorials && qr.accessorials.codes && Array.isArray(qr.accessorials.codes)) {
          const codes = qr.accessorials.codes.filter(c => c && String(c).trim().length > 0);
          if (codes.length === 0) delete qr.accessorials; else qr.accessorials.codes = codes;
        }
      }
    } catch (e) { console.warn('estes-sanitize-error', e && e.message); }

    // Normalize shipDate to full ISO timestamp (match auth-and-quote-direct)
    try {
      if (estesPayload && estesPayload.quoteRequest && estesPayload.quoteRequest.shipDate) {
        const sd = new Date(estesPayload.quoteRequest.shipDate);
        if (!isNaN(sd.getTime())) {
          estesPayload.quoteRequest.shipDate = sd.toISOString();
        }
      }
    } catch (e) {}

    // Ensure payment.account is populated from env or defaults if empty
    try {
      if (!estesPayload.payment) estesPayload.payment = {};
      if (!estesPayload.payment.account || String(estesPayload.payment.account).trim() === '') {
        estesPayload.payment.account = process.env.ESTES_ACCOUNT || defaults.paymentAccount || '';
      }
    } catch (e) {}

    // Save pre payload and overwrite a simple log for easy debugging (auth-and-quote-direct style)
    try {
      // Ensure the top-level payload mirrors the successful request shape we observed in logs
      // (duplicate quoteRequest.origin/destination at top-level and normalize common street suffixes)
      try {
        if (estesPayload && estesPayload.quoteRequest) {
          // duplicate into top-level if not already present
          if (!estesPayload.origin && estesPayload.quoteRequest.origin) {
            estesPayload.origin = JSON.parse(JSON.stringify(estesPayload.quoteRequest.origin));
          }
          if (!estesPayload.destination && estesPayload.quoteRequest.destination) {
            estesPayload.destination = JSON.parse(JSON.stringify(estesPayload.quoteRequest.destination));
          }
          // duplicate commodity to top-level to match successful request shape where carrier reads top-level commodity
          try {
            if (!estesPayload.commodity && estesPayload.quoteRequest.commodity) {
              estesPayload.commodity = JSON.parse(JSON.stringify(estesPayload.quoteRequest.commodity));
            }
            // ensure aggregates exist at top-level commodity as well
            if (estesPayload.commodity) {
              if (!estesPayload.commodity.totalShipmentWeight && estesPayload.quoteRequest && estesPayload.quoteRequest.commodity && estesPayload.quoteRequest.commodity.totalShipmentWeight) {
                estesPayload.commodity.totalShipmentWeight = estesPayload.quoteRequest.commodity.totalShipmentWeight;
              }
              if (!estesPayload.commodity.totalPieces && estesPayload.quoteRequest && estesPayload.quoteRequest.commodity && estesPayload.quoteRequest.commodity.totalPieces) {
                estesPayload.commodity.totalPieces = estesPayload.quoteRequest.commodity.totalPieces || estesPayload.quoteRequest.commodity.totalPieces;
              }
            }
          } catch (e) { /* best-effort */ }
          // normalize common street suffix abbreviations to full words (e.g., "Dr" -> "Drive")
          const expandSuffix = (s = '') => {
            try {
              return String(s).replace(/\bDr\.?\b/gi, 'Drive').replace(/\bRd\.?\b/gi, 'Road').replace(/\bSt\.?\b/gi, 'Street');
            } catch (e) { return s; }
          };
          if (estesPayload.quoteRequest.origin && estesPayload.quoteRequest.origin.address && estesPayload.quoteRequest.origin.address.address1) {
            estesPayload.quoteRequest.origin.address.address1 = expandSuffix(estesPayload.quoteRequest.origin.address.address1);
            if (estesPayload.origin && estesPayload.origin.address) estesPayload.origin.address.address1 = expandSuffix(estesPayload.origin.address.address1);
          }
          if (estesPayload.quoteRequest.destination && estesPayload.quoteRequest.destination.address && estesPayload.quoteRequest.destination.address.address1) {
            estesPayload.quoteRequest.destination.address.address1 = expandSuffix(estesPayload.quoteRequest.destination.address.address1);
            if (estesPayload.destination && estesPayload.destination.address) estesPayload.destination.address.address1 = expandSuffix(estesPayload.destination.address.address1);
          }
          // LTL-friendly normalizations: ensure numeric counts/pieces, weight units, and classification/nmfc fields
          try {
            const qr = estesPayload.quoteRequest;
            if (qr && qr.commodity && Array.isArray(qr.commodity.handlingUnits)) {
              let aggWeight = 0;
              let aggPieces = 0;
              for (const hu of qr.commodity.handlingUnits) {
                if (!hu) continue;
                // ensure count
                if (!hu.count || isNaN(Number(hu.count))) hu.count = 1;
                // normalize weight unit
                if (!hu.weightUnit) hu.weightUnit = 'Pounds';
                // ensure numeric weight
                if (hu.weight || hu.weight === 0) hu.weight = Number(hu.weight) || 0;
                if (hu.tareWeight || hu.tareWeight === 0) hu.tareWeight = Number(hu.tareWeight) || 0;
                // ensure lineItems exist and have pieces/weight/classification
                if (!Array.isArray(hu.lineItems) || hu.lineItems.length === 0) {
                  hu.lineItems = hu.lineItems || [{ weight: hu.weight || 0, pieces: hu.count || 1 }];
                }
                for (const li of hu.lineItems) {
                  if (!li) continue;
                  if (!li.pieces || isNaN(Number(li.pieces))) li.pieces = li.count || 1;
                  li.pieces = Number(li.pieces) || 1;
                  if (li.weight || li.weight === 0) li.weight = Number(li.weight) || 0;
                  if (!li.classification) li.classification = li.classification || '92.5';
                  // nmfc optional: keep if present
                  aggPieces += li.pieces || 0;
                  aggWeight += (li.weight || 0) * (li.pieces || 1);
                }
                // if hu.weight missing, use aggregate of lineItems + tare
                if ((!hu.weight || hu.weight === 0) && aggWeight > 0) {
                  hu.weight = aggWeight + (hu.tareWeight || 0);
                }
              }
              // ensure commodity aggregates
              try {
                if (!qr.commodity.totalShipmentWeight || qr.commodity.totalShipmentWeight === 0) qr.commodity.totalShipmentWeight = Math.max(1, Math.round(aggWeight + (qr.commodity.handlingUnits.reduce((s, h) => s + (Number(h.tareWeight || 0)), 0) || 0)));
                if (!qr.commodity.totalPieces || qr.commodity.totalPieces === 0) qr.commodity.totalPieces = aggPieces || qr.commodity.handlingUnits.reduce((s,h) => s + (Number(h.count || 1) || 1), 0);
              } catch (e) {}
            }
          } catch (e) { /* best-effort */ }
        }
      } catch (e) { /* best-effort normalization; ignore errors */ }
      if (String(process.env.ESTES_ENABLE_RUN_LOGS || '').toLowerCase() === 'true') {
        try { fs.writeFileSync(path.resolve(process.cwd(), 'estes-debug-pre.json'), JSON.stringify({ timestamp: new Date().toISOString(), payload: estesPayload }, null, 2)); } catch (e) {}
        try { const logObj = { timestamp: new Date().toISOString(), event: 'pre-payload', payload: estesPayload }; fs.writeFileSync(path.resolve(process.cwd(), 'estes-debug.log'), JSON.stringify(logObj, null, 2) + '\n\n'); } catch (e) {}
      }
    } catch (e) {}

    // First authenticate to obtain a Bearer token from Estes
  const authUrl = process.env.ESTES_AUTH_URL || 'https://cloudapi.estes-express.com/authenticate';
  const url = process.env.ESTES_RATES_ENDPOINT;
    if (!url) return { statusCode: 500, body: JSON.stringify({ error: 'ESTES_API_URL not configured' }) };

    const apiKey = process.env.ESTES_API_KEY || '';
    // Accept either a raw basic credential in ESTES_BASIC ("user:pass") or a precomputed base64 in ESTES_BASIC_B64
    const basicB64 = process.env.ESTES_STRING || (process.env.ESTES_STRING ? Buffer.from(process.env.ESTES_STRING).toString('base64') : '');
    if (!apiKey || !basicB64) {
      return { statusCode: 500, body: JSON.stringify({ error: 'ESTES_API_KEY or ESTES_BASIC credentials not configured' }) };
    }

    // Include common header name variants (some Estes examples use 'apikey' lowercase)
    const authHeaders = {
      Accept: 'application/json',
      apiKey: apiKey,
      Authorization: `Basic ${basicB64}`
    };
  const authResp = await postJson(authUrl, {}, authHeaders);
  let authData;
  try { authData = JSON.parse(authResp.body); } catch (e) { authData = { raw: authResp.body }; }
    if (!authResp.statusCode || authResp.statusCode >= 400) {
      // redact potentially sensitive parts but log helpful fields
      console.error('estes-auth-failed', { status: authResp.statusCode, message: authData && (authData.message || authData.error || authData) });
      return { statusCode: authResp.statusCode || 500, body: JSON.stringify({ error: 'Estes authentication failed', status: authResp.statusCode, response: authData }) };
    }
    // Token key may be named token, accessToken, access_token, or bearerToken depending on API shape
    const token = authData && (authData.bearerToken || authData.token || authData.accessToken || authData.access_token);
    if (!token) {
      console.error('estes-auth-no-token', { response: authData && (authData.message || authData) });
      return { statusCode: 500, body: JSON.stringify({ error: 'Estes auth returned no token', response: authData }) };
    }

    // Append auth response to plain log (redact token)
    try {
      const authLogFull = { statusCode: authResp.statusCode, headers: authResp.headers, rawBody: authResp.body };
      try { authLogFull.json = JSON.parse(authResp.body); } catch (e) { authLogFull.json = null; }
      if (authLogFull.json) {
        if (authLogFull.json.bearerToken) authLogFull.json.bearerToken = '<REDACTED>';
        if (authLogFull.json.token) authLogFull.json.token = '<REDACTED>';
        if (authLogFull.json.accessToken) authLogFull.json.accessToken = '<REDACTED>';
        if (authLogFull.json.access_token) authLogFull.json.access_token = '<REDACTED>';
      }
      if (String(process.env.ESTES_ENABLE_RUN_LOGS || '').toLowerCase() === 'true') {
        try { fs.appendFileSync(path.resolve(process.cwd(), 'estes-debug.log'), JSON.stringify({ timestamp: new Date().toISOString(), event: 'auth-response', response: authLogFull }, null, 2) + '\n\n'); } catch (e) {}
      }
    } catch (e) {}

    const headers = {
      Authorization: `Bearer ${token}`,
      'x-api-key': apiKey,
      apiKey: apiKey,
      apikey: apiKey,
      'Content-Type': 'application/json'
    };
  const resp = await postJson(url, estesPayload, headers);

    // write a redacted file log for debugging (includes initial request and Estes response)
    try {
      if (String(process.env.ESTES_ENABLE_RUN_LOGS || '').toLowerCase() === 'true') {
        try {
          const logDir = path.resolve(process.cwd(), 'estes-logs');
          if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
          const now = new Date().toISOString().replace(/[:.]/g,'-');
          const logfile = path.join(logDir, `estes-${now}.json`);
          const redact = (obj) => JSON.parse(JSON.stringify(obj, (k,v) => {
            if (typeof v === 'string' && (k.toLowerCase().includes('token') || k.toLowerCase().includes('authorization') || k.toLowerCase().includes('apikey') || k.toLowerCase().includes('api_key'))) return '<REDACTED>';
            return v;
          }));
          const toWrite = { timestamp: new Date().toISOString(), request: redact({ headers, payload: estesPayload }), response: null };
          try { toWrite.response = JSON.parse(resp.body); } catch (e) { toWrite.response = { raw: resp.body }; }
          try { fs.writeFileSync(logfile, JSON.stringify(toWrite, null, 2)); } catch (e) {}
        } catch (e) { /* ignore */ }
      }
    } catch (e) { console.error('estes-log-write-failed', e && e.message); }

    // Append full quote response and curl snippet to plain `estes-debug.log` for easy debugging
    try {
      const quoteLogFull = { statusCode: resp.statusCode, headers: resp.headers, rawBody: resp.body };
      try { quoteLogFull.json = JSON.parse(resp.body); } catch (e) { quoteLogFull.json = null; }
      const redactedToken = token ? '<REDACTED>' : '';
      const redactedApiKey = apiKey ? apiKey : '';
      const curlSnippet = `curl --location --request POST '${url}' \\\n+--header 'apikey: ${redactedApiKey}' \\\n+--header 'Authorization: Bearer ${redactedToken}' \\\n+--header 'Content-Type: application/json' \\\n+--data-raw '`;
      if (String(process.env.ESTES_ENABLE_RUN_LOGS || '').toLowerCase() === 'true') {
        try { fs.appendFileSync(path.resolve(process.cwd(), 'estes-debug.log'), JSON.stringify({ timestamp: new Date().toISOString(), event: 'quote-response', curl: curlSnippet, request: estesPayload, response: quoteLogFull }, null, 2) + '\n\n'); } catch (e) {}
      }
    } catch (e) {}

  let data;
  try { data = JSON.parse(resp.body); } catch (e) { data = { raw: resp.body }; }
    // Some Estes responses come back with HTTP 200 but contain an error payload
    // (for example { error: { code: 70020, message: 'Rates not found' } }).
    // Treat those as failures and attempt the same ZIP-only retry as when we get a 4xx/422.
    try {
      const hasRatesNotFoundError = data && data.error && (data.error.code === 70020 || (data.error.message && /Rates not found/i.test(String(data.error.message))));
      const noDataArray = Array.isArray(data.data) && data.data.length === 0;
      if (hasRatesNotFoundError || noDataArray) {
        // perform same zip-only retry as below
        try {
          const retryPayload = JSON.parse(JSON.stringify(estesPayload));
          if (retryPayload.quoteRequest && retryPayload.quoteRequest.origin && retryPayload.quoteRequest.origin.address) retryPayload.quoteRequest.origin.address.city = '';
          if (retryPayload.quoteRequest && retryPayload.quoteRequest.destination && retryPayload.quoteRequest.destination.address) retryPayload.quoteRequest.destination.address.city = '';
          console.error('estes-quote-retrying-zip-only-detected-in-body');
          const retryResp = await postJson(url, retryPayload, headers);
          let retryData;
          try { retryData = JSON.parse(retryResp.body); } catch (e) { retryData = { raw: retryResp.body }; }
            // Persist retry response to a separate retry log for visibility
            try {
              const retryLogDir = path.resolve(process.cwd(), 'estes-logs');
              if (!fs.existsSync(retryLogDir)) fs.mkdirSync(retryLogDir, { recursive: true });
              const nowRetry = new Date().toISOString().replace(/[:.]/g,'-');
              const retryFile = path.join(retryLogDir, `estes-retry-${nowRetry}.json`);
              const retryLogObj = { timestamp: new Date().toISOString(), event: 'retry-response', request: retryPayload, response: retryData, statusCode: retryResp.statusCode };
              try { if (String(process.env.ESTES_ENABLE_RUN_LOGS || '').toLowerCase() === 'true') { fs.writeFileSync(retryFile, JSON.stringify(retryLogObj, null, 2)); } } catch (e) { /* ignore write errors */ }
            } catch (e) { /* ignore logging errors */ }
          if (retryResp.statusCode && retryResp.statusCode < 400) {
            return { statusCode: 200, body: JSON.stringify({ carrier: 'Estes', scac: 'EXLA', quoteNumber: retryData.quoteNumber, transitDays: retryData.transitDays, total: retryData.charges && retryData.charges.total, breakdown: retryData.charges, retryAttempted: true }) };
          }
          // If retry failed, attempt to return a cached recent successful rate from estes-logs
          try {
            const logsDir = path.resolve(process.cwd(), 'estes-logs');
            if (fs.existsSync(logsDir)) {
              const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.json')).sort().reverse();
              for (const f of files) {
                try {
                  const full = JSON.parse(fs.readFileSync(path.join(logsDir, f), 'utf8'));
                  const resp = full && full.response;
                  const arr = resp && (Array.isArray(resp.data) ? resp.data : (resp.data && Array.isArray(resp.data) ? resp.data : null));
                  if (Array.isArray(arr) && arr.length > 0) {
                    // pick cheapest
                    const candidates = arr.map(d => {
                      const v = d && d.quoteRate && (d.quoteRate.totalCharges || d.quoteRate.total);
                      const n = v != null ? Number(String(v).replace(/[^0-9.-]+/g, '')) : NaN;
                      return (!isNaN(n) && d) ? { n, d } : null;
                    }).filter(Boolean);
                    if (candidates.length > 0) {
                      candidates.sort((a,b) => a.n - b.n);
                      const pick = candidates[0];
                      const chosen = pick.d;
                      const out = { carrier: 'Estes', scac: 'EXLA', quoteNumber: chosen.quoteId || null, serviceLevelText: chosen.serviceLevelText || null, transitDays: (chosen.transitDetails && chosen.transitDetails.transitDays) || null, total: Number(String(pick.n)), breakdown: chosen.quoteRate || chosen };
                      out.cached = true;
                      return { statusCode: 200, body: JSON.stringify(out) };
                    }
                  }
                } catch (e) { /* ignore parse errors */ }
              }
            }
          } catch (e) { /* ignore fallback errors */ }

          return { statusCode: retryResp.statusCode || 422, body: JSON.stringify({ error: 'Estes quote failed (initial and retry)', status: retryResp.statusCode, estesResponse: data, retry: { status: retryResp.statusCode, response: retryData } }) };
        } catch (e) {
          console.error('estes-quote-retry-error-detected-in-body', e && e.message);
          return { statusCode: 422, body: JSON.stringify({ error: 'Estes quote failed and retry errored', status: resp.statusCode, estesResponse: data, retryError: e && e.message }) };
        }
      }
    } catch (e) { /* ignore */ }
    // If Estes rejects the request with a 422 (Rates not found / invalid origin/destination),
    // attempt a minimal retry that clears city fields so the carrier can match by ZIP only.
    if (!resp.statusCode || resp.statusCode >= 400) {
      console.error('estes-quote-failed', { status: resp.statusCode, message: data && (data.message || data.error || data) });

      const isRatesNotFound = (resp.statusCode === 422) || (data && data.error && data.error.code === 70020) || (data && data.error && data.error.information && Array.isArray(data.error.information) && data.error.information.some(i => (i.messageId || '').startsWith('GSC')));
      if (isRatesNotFound) {
        try {
          const retryPayload = JSON.parse(JSON.stringify(estesPayload));
          // clear city fields to allow ZIP-only matching
          if (retryPayload.quoteRequest && retryPayload.quoteRequest.origin && retryPayload.quoteRequest.origin.address) retryPayload.quoteRequest.origin.address.city = '';
          if (retryPayload.quoteRequest && retryPayload.quoteRequest.destination && retryPayload.quoteRequest.destination.address) retryPayload.quoteRequest.destination.address.city = '';
          console.error('estes-quote-retrying-zip-only');
          const retryResp = await postJson(url, retryPayload, headers);
          let retryData;
          try { retryData = JSON.parse(retryResp.body); } catch (e) { retryData = { raw: retryResp.body }; }
          if (retryResp.statusCode && retryResp.statusCode < 400) {
            return { statusCode: 200, body: JSON.stringify({ carrier: 'Estes', scac: 'EXLA', quoteNumber: retryData.quoteNumber, transitDays: retryData.transitDays, total: retryData.charges && retryData.charges.total, breakdown: retryData.charges, retryAttempted: true }) };
          }
          // If retry still failed, include both responses for debugging
          return { statusCode: resp.statusCode || 500, body: JSON.stringify({ error: 'Estes quote failed (initial and retry)', status: resp.statusCode, estesResponse: data, retry: { status: retryResp.statusCode, response: retryData } }) };
        } catch (e) {
          console.error('estes-quote-retry-error', e && e.message);
          return { statusCode: resp.statusCode || 500, body: JSON.stringify({ error: 'Estes quote failed and retry errored', status: resp.statusCode, estesResponse: data, retryError: e && e.message }) };
        }
      }

      return { statusCode: resp.statusCode || 500, body: JSON.stringify({ error: 'Estes quote failed', status: resp.statusCode, estesResponse: data }) };
    }

    // Normalize possible Estes response shapes to provide a numeric `total` and a `breakdown` object.
    try {
      let total = null;
      let breakdown = null;

      // Common shape: data.charges.total or charges.total
      if (data && data.charges && (data.charges.total || data.charges.totalCharges)) {
        total = Number(data.charges.total || data.charges.totalCharges);
        breakdown = data.charges;
      }

      // Some responses include a top-level quoteRate or quoteRate inside data[0]
      if ((total === null || isNaN(total)) && data) {
        // If response has `quoteRate` at top-level
        if (data.quoteRate && (data.quoteRate.totalCharges || data.quoteRate.total)) {
          total = Number(data.quoteRate.totalCharges || data.quoteRate.total);
          breakdown = data.quoteRate;
        }
        // If response has `data` array with elements containing `quoteRate.totalCharges`, pick the cheapest
          else if (Array.isArray(data.data) && data.data.length > 0) {
            const candidates = data.data.map(d => {
              if (!d || !d.quoteRate) return null;
              const v = d.quoteRate.totalCharges || d.quoteRate.total || null;
              const n = v != null ? Number(String(v).replace(/[^0-9.-]+/g, '')) : NaN;
              return isNaN(n) ? null : { n, raw: d };
            }).filter(Boolean);
            if (candidates.length > 0) {
              candidates.sort((a,b) => a.n - b.n);
              const pick = candidates[0];
              total = Number(pick.n);
              breakdown = pick.raw.quoteRate || pick.raw;
              // prefer quoteNumber and transitDays from the chosen item
              data.quoteNumber = pick.raw.quoteId || pick.raw.quoteId || data.quoteNumber;
              data.transitDays = (pick.raw.transitDetails && pick.raw.transitDetails.transitDays) || data.transitDays;
            }
          }
        // Some older logs show `data` as the primary object (already parsed earlier), handle that too
        else if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          if (first && first.quoteRate && (first.quoteRate.totalCharges || first.quoteRate.total)) {
            total = Number(first.quoteRate.totalCharges || first.quoteRate.total);
            breakdown = first.quoteRate;
          }
        }
      }

      // Fallback: try to find a numeric value anywhere in the parsed object
      if ((total === null || isNaN(total)) && data) {
        // search common keys
        const maybe = data && (data.total || data.totalCharges || (data.charges && (data.charges.total || data.charges.totalCharges)));
        if (maybe) total = Number(maybe);
      }

      // Ensure total is a number (fallback to null if not available)
      if (total != null && !isNaN(total)) {
        // If we have a data array and selected a pick, include its serviceLevelText and quoteId
        let serviceLevelText = null;
        let quoteId = data.quoteNumber || null;
        if (Array.isArray(data.data) && data.data.length > 0) {
          // find matching entry in data that corresponds to the breakdown if possible
          const match = data.data.find(d => {
            if (!d) return false;
            const v = d.quoteRate && (d.quoteRate.totalCharges || d.quoteRate.total);
            if (!v) return false;
            const n = Number(String(v).replace(/[^0-9.-]+/g, ''));
            return !isNaN(n) && Number(n) === Number(total);
          });
          if (match) {
            serviceLevelText = match.serviceLevelText || null;
            quoteId = match.quoteId || quoteId;
          }
        }

        // Persist last-successful normalized quote to cache for fallback
        try {
          const cacheObj = { timestamp: Date.now(), carrier: 'Estes', scac: 'EXLA', quoteNumber: quoteId, serviceLevelText: serviceLevelText, transitDays: data.transitDays || null, total: Number(total), breakdown: breakdown || data };
          fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheObj, null, 2));
        } catch (e) { /* ignore cache write errors */ }

        return {
          statusCode: 200,
          body: JSON.stringify({ carrier: 'Estes', scac: 'EXLA', quoteNumber: quoteId, serviceLevelText: serviceLevelText, transitDays: data.transitDays || (data.data && data.data[0] && data.data[0].transitDetails && data.data[0].transitDetails.transitDays) || null, total: total, breakdown: breakdown || data })
        };
      }
    } catch (e) {
      // ignore and fall through to generic return
      console.warn('estes-normalize-failed', e && e.message);
    }

    // Generic fallback: return what we can. If cache available and fresh, return that instead.
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        const cached = JSON.parse(raw);
        if (cached && cached.timestamp && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
          cached.cached = true;
          return { statusCode: 200, body: JSON.stringify(cached) };
        }
      }
    } catch (e) { /* ignore cache read errors */ }

    return {
      statusCode: 200,
      body: JSON.stringify({ carrier: 'Estes', scac: 'EXLA', quoteNumber: data.quoteNumber, transitDays: data.transitDays, total: (data && data.charges && data.charges.total) || null, breakdown: data })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', message: err && err.message }) };
  }
};
