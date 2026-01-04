#!/usr/bin/env node
// Minimal script that hardcodes API key and Bearer token and sends the pickup request.
// Replace API_KEY and TOKEN values below and run: node scripts/sendPickupSimple.js

const https = require('https');
const { URL } = require('url');

const API_KEY = 'pjHf8SHvAk61ypg8kGNgMAITx77hKWn3'; // <-- set your API key here
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJraWQiOiJRdVZieTZkTWlGalR2MDFaaWRxVy9wNnlkUVE9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI4ZjEyMTc5Yy1hOWViLTQ4OWItYjk4ZC1kYTE3Y2NiZGYzZDYiLCJjdHMiOiJPQVVUSDJfU1RBVEVMRVNTX0dSQU5UIiwiYXV0aF9sZXZlbCI6MCwiYXVkaXRUcmFja2luZ0lkIjoiNDg4ZDY1YWItYzNkMy00ZWJmLWFmMDEtOTZhYTMxZDA0Njk4LTUwNTU1NDkzIiwic3VibmFtZSI6IjhmMTIxNzljLWE5ZWItNDg5Yi1iOThkLWRhMTdjY2JkZjNkNiIsImlzcyI6Imh0dHBzOi8vb3BlbmFtLXRydWNrc2wybC11c2U0LXN0YWdpbmcuaWQuZm9yZ2Vyb2NrLmlvOjQ0My9hbS9vYXV0aDIvYWxwaGEiLCJ0b2tlbk5hbWUiOiJhY2Nlc3NfdG9rZW4iLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiYXV0aEdyYW50SWQiOiJDRTBwdzhOdFRvNzhBZ3BxTE1IWFEzc25Ib3ciLCJjbGllbnRfaWQiOiJLb25nQVdTIiwiYXVkIjoiS29uZ0FXUyIsIm5iZiI6MTc2NzM5NDI3OSwic2NvcGUiOlsib3BlbmlkIl0sImF1dGhfdGltZSI6MTc2NzM5NDI3OSwicmVhbG0iOiIvYWxwaGEiLCJleHAiOjE3NjczOTc4NzksImlhdCI6MTc2NzM5NDI3OSwiZXhwaXJlc19pbiI6MzYwMCwianRpIjoiRG5oQzBIZFJGSElUSjRaSGhoNlpfbDByMlprIiwicm9sZXMiOlsiaW1hZ2VzIiwiY2hhcmdlcyIsImNsYWltcyIsInJhdGVRdW90ZSIsIm15RXN0ZXNBY2Nlc3MiLCJwaWNrdXAiLCJpbnZvaWNlIiwidHJhY2tpbmciLCJib2wiXSwidXNlcm5hbWUiOiJBZ0V4UGFydHMiLCJhY2NvdW50Q29kZSI6IkIxMzI3MDMifQ.ij6A6nbcVXwWwwMr37o9m6PZOnSOdVnWlbDs-0ya0LzzalADD88jklts1IiTZCC2KZHqHJihxOnt3NS_vD9sBOdawKrrRqB29TZcB7zK8mMY44vf7i_6H_QKGbOr1hgfEtriOnU4E4yV6K6Tr3H8XTHVhrfXIoeD2An6n5w2Wgdah6EXljhhvLdAf_jr7d_rWyqbjxRay5MJmQf2FXXD0lufaIkVL2AtyTskS6RqWSFgXvKKmNzl53LPQLflcs2h5wjjoYTCQpdGBTEMsaSsouBuwXfLr5DlmzNual_zMR14Wfu6v2pDnCElYdBqQQxc2NO83qz860LnUb_43Ak0pw'
const URL_STR = 'https://uat-cloudapi.estes-express.com/v1/bol';

// Load the full BOL JSON file as payload
let payload;
try {
  payload = require('./BOL_filled.json');
} catch (e) {
  console.error('Could not load scripts/BOL_filled.json:', e.message);
  payload = { shipper: { shipperName: 'ACCEPTANCE TESTER' }, requestAction: 'LL' };
}

function send() {
  if (!API_KEY || !TOKEN) {
    console.log('API_KEY or TOKEN empty — dry-run mode. Fill values to actually send.');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    return;
  }

  const body = JSON.stringify(payload);
  // Debug: write outgoing body to tmp for inspection
  try {
    const fs = require('fs');
    const outDir = require('path').resolve(__dirname, '..', 'tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(require('path').join(outDir, 'bol-request-out.json'), body, 'utf8');
    console.log('Wrote request body to', require('path').join(outDir, 'bol-request-out.json'));

    // compute and print handling unit sums
    try {
      const b = JSON.parse(body);
      const hus = b.commodities && b.commodities.handlingUnits ? b.commodities.handlingUnits : [];
      hus.forEach((hu, idx) => {
        const huWeight = Number(hu.weight || 0);
        const huTare = Number(hu.tareWeight || 0);
        const sumLines = (hu.lineItems || []).reduce((s, li) => s + (Number(li.weight || 0) * Number(li.pieces || 1)), 0);
        console.log(`HU[${idx}] weight=${huWeight}, tare=${huTare}, sumLines=${sumLines}`);
      });
    } catch (e) { /* ignore */ }
  } catch (e) { console.warn('Failed to write debug file:', e.message); }
  const url = new URL(URL_STR);

  const opts = {
    method: 'POST',
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'apikey': API_KEY,
      'Authorization': 'Bearer ' + TOKEN
    }
  };

  const req = https.request(opts, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try { console.log(JSON.stringify(JSON.parse(data), null, 2)); }
      catch (e) { console.log('Response (raw):', data); }
    });
  });
  req.on('error', e => { console.error('Error:', e.message); process.exit(2); });
  req.write(body); req.end();
}

send();
