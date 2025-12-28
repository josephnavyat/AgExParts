import fs from 'fs';
const src = fs.readFileSync('./.tmp_estes_quote.js','utf8');
// write a module file that exports handler
fs.writeFileSync('./.tmp_estes_quote.mjs', src);
const mod = await import('./.tmp_estes_quote.mjs');
const handler = mod.handler;
const debug = JSON.parse(fs.readFileSync('./estes-debug.json','utf8'));
const p = debug.quote.requestPayload;
p.quoteRequest.origin = p.origin || p.quoteRequest.origin;
p.quoteRequest.destination = p.destination || p.quoteRequest.destination;
delete p.origin; delete p.destination;
const event = { body: JSON.stringify(p), headers: { 'content-type':'application/json' }, httpMethod: 'POST' };
const res = await handler(event, {});
console.log('statusCode:', res.statusCode);
console.log(JSON.parse(res.body));
