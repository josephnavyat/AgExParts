const uploadFn = require('../netlify/functions/upload-tax-exempt');
const adminListFn = require('../netlify/functions/admin-list-tax-uploads');
const adminApproveFn = require('../netlify/functions/admin-approve-tax-exempt');

test('functions export handler', () => {
  expect(typeof uploadFn.handler).toBe('function');
  expect(typeof adminListFn.handler).toBe('function');
  expect(typeof adminApproveFn.handler).toBe('function');
});
