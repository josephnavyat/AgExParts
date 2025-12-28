const fs = require('fs');
const path = require('path');
const modPath = path.resolve('./netlify/functions/estes-quote.js');
// load module source and evaluate in a wrapper to override postJson
let src = fs.readFileSync(modPath,'utf8');
// replace postJson function with a stub that returns the saved response from estes-debug.json
const stub = `function postJson(urlString, body, headers = {}) { return new Promise((resolve) => { const debug = JSON.parse(require('fs').readFileSync('./estes-debug.json','utf8')); // use debug.quote.response when present
  const resp = debug.quote && debug.quote.response && debug.quote.response.data && debug.quote.response.data.length>0 ? { statusCode: 200, body: JSON.stringify(debug.quote.response) } : { statusCode: 200, body: JSON.stringify(debug.quote.response || debug.quote) }; resolve(resp); }); }`;
src = src.replace(/function postJson\([\s\S]*?\}\);\n\n/ , stub + '\n\n');
// write to a temp file and require it
fs.writeFileSync('./.tmp_estes_quote.js', src);
const handler = require('./.tmp_estes_quote.js').handler;
(async ()=>{
  try {
    const debug = JSON.parse(fs.readFileSync('./estes-debug.json','utf8'));
    const p = debug.quote.requestPayload;
    p.quoteRequest.origin = p.origin || p.quoteRequest.origin;
    p.quoteRequest.destination = p.destination || p.quoteRequest.destination;
    delete p.origin; delete p.destination;
    const event = { body: JSON.stringify(p), headers: { 'content-type':'application/json' }, httpMethod: 'POST' };
    const res = await handler(event, {});
    console.log('statusCode:', res.statusCode);
    console.log(JSON.parse(res.body));
  } catch (e) {
    console.error('test error', e && e.message);
  }
})();
