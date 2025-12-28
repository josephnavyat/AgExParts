const handler = require('./netlify/functions/estes-quote.js').handler;
const fs = require('fs');
(async ()=>{
  const debug = JSON.parse(fs.readFileSync('./estes-debug.json','utf8'));
  const payload = debug.quote.requestPayload;
  const event = { body: JSON.stringify(payload), headers: { 'content-type':'application/json' }, httpMethod: 'POST' };
  try {
    const res = await handler(event, {});
    console.log('handler result status:', res.statusCode);
    console.log(res.body);
  } catch (e) {
    console.error('handler threw', e);
  }
})();
