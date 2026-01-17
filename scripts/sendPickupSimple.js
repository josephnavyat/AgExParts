#!/usr/bin/env node
// Minimal script that hardcodes API key and Bearer token and sends the pickup request.
// Replace API_KEY and TOKEN values below and run: node scripts/sendPickupSimple.js

const https = require('https');
const { URL } = require('url');

const API_KEY = 'pjHf8SHvAk61ypg8kGNgMAITx77hKWn3'; // <-- set your API key here
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJraWQiOiJRdVZieTZkTWlGalR2MDFaaWRxVy9wNnlkUVE9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI4ZjEyMTc5Yy1hOWViLTQ4OWItYjk4ZC1kYTE3Y2NiZGYzZDYiLCJjdHMiOiJPQVVUSDJfU1RBVEVMRVNTX0dSQU5UIiwiYXV0aF9sZXZlbCI6MCwiYXVkaXRUcmFja2luZ0lkIjoiNjEwY2I2MjItZTA2Zi00YmNjLTg1NDAtODcxNzExYzYwNDMwLTUwMzg4NjAxIiwic3VibmFtZSI6IjhmMTIxNzljLWE5ZWItNDg5Yi1iOThkLWRhMTdjY2JkZjNkNiIsImlzcyI6Imh0dHBzOi8vb3BlbmFtLXRydWNrc2wybC11c2U0LXN0YWdpbmcuaWQuZm9yZ2Vyb2NrLmlvOjQ0My9hbS9vYXV0aDIvYWxwaGEiLCJ0b2tlbk5hbWUiOiJhY2Nlc3NfdG9rZW4iLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiYXV0aEdyYW50SWQiOiJwTTRSSG51NFpmTzR4a1R5T1BkQTY3SFRhUGMiLCJjbGllbnRfaWQiOiJLb25nQVdTIiwiYXVkIjoiS29uZ0FXUyIsIm5iZiI6MTc2NzM2OTQ2Nywic2NvcGUiOlsib3BlbmlkIl0sImF1dGhfdGltZSI6MTc2NzM2OTQ2NywicmVhbG0iOiIvYWxwaGEiLCJleHAiOjE3NjczNzMwNjcsImlhdCI6MTc2NzM2OTQ2NywiZXhwaXJlc19pbiI6MzYwMCwianRpIjoiUlFKSkw5VkRUWlh6akpBMWtFOElPdnZiNEU0Iiwicm9sZXMiOlsiaW1hZ2VzIiwiY2hhcmdlcyIsImNsYWltcyIsInJhdGVRdW90ZSIsIm15RXN0ZXNBY2Nlc3MiLCJwaWNrdXAiLCJpbnZvaWNlIiwidHJhY2tpbmciLCJib2wiXSwidXNlcm5hbWUiOiJBZ0V4UGFydHMiLCJhY2NvdW50Q29kZSI6IkIxMzI3MDMifQ.JlefjH_pvVSLRCCKR4X4CGn0wUmzinWhw9I0QZjO6YTPohBNxo7FgWQm2yiVbYhQe1PU5FE2JYbN6HSzQ-FwePv5TjMU6GdIB2j0RD3fRgNEQZKl5L190Adg2XgS28xxFb--DCS0c-uTTHPwcsRibbh1orh4P7CHLdT_lP9dGMp-E14nUlk3BRHRiWZO7li2SyoqdYI2WqISQVPLt2rnMrW-zL_tQE-dI_HGbSOVESV5xv1aK80kQDI1BzSuymr2DpL5W5QOg225C-T-5cZTf_5-VNxVJGxdOVbtEPlKBXOojdDErITWb95F3Am7A3G5nz9n6S4AOR48F1Iw7vfiow';   // <-- set your bearer token here
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
