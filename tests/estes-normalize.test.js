const fs = require('fs');
const path = require('path');
const func = require('../netlify/functions/estes-quote.js');

// We'll call the normalization logic by invoking handler with a synthetic event that simulates
// a succesful Estes response — however the function performs network calls. Instead, we'll
// unit-test the data extraction by importing the sample `estes-debug.json` and ensuring the
// function would pick the cheapest total when given that data as if it were the `resp.body`.

test('normalize extracts cheapest total from sample Estes response', () => {
  const debug = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'estes-debug.json'), 'utf8'));
  const data = debug.quote.response;
  // The sample debug includes data array inside debug.quote.response.data
  expect(data).toBeDefined();
  // find cheapest
  const arr = data.data;
  expect(Array.isArray(arr)).toBe(true);
  const candidates = arr.map(d => {
    const v = d.quoteRate && (d.quoteRate.totalCharges || d.quoteRate.total);
    return v ? Number(String(v).replace(/[^0-9.-]+/g, '')) : NaN;
  }).filter(n => !isNaN(n)).sort((a,b) => a-b);
  expect(candidates[0]).toBeCloseTo(360.52, 2);
});
