const handler = require('./netlify/functions/estes-quote.js').handler;
const fs = require('fs');
(async ()=>{
  try {
    const debug = JSON.parse(fs.readFileSync('./estes-debug.json','utf8'));
    const p = debug.quote.requestPayload;
    if (!p.quoteRequest) throw new Error('no quoteRequest in debug payload');
    // ensure quoteRequest.origin/destination exist where the function expects them
    p.quoteRequest.origin = p.origin || p.quoteRequest.origin || p.quoteRequest.origin;
    p.quoteRequest.destination = p.destination || p.quoteRequest.destination || p.quoteRequest.destination;
    delete p.origin; delete p.destination;
    const event = { body: JSON.stringify(p), headers: { 'content-type':'application/json' }, httpMethod: 'POST' };
    const res = await handler(event, {});
    console.log('statusCode:', res.statusCode);
    console.log(res.body);
  } catch (e) {
    console.error('error running handler test:', e && e.message);
  }
})();
