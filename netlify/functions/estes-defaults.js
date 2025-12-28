/**
 * Hard-coded Estes defaults for local testing.
 * Export minimal requestor and origin info and a default payment account.
 * In production you may want to move these into secure env vars or a secret store.
 */
module.exports = {
  paymentAccount: process.env.ESTES_ACCOUNT || 'ABC1234',
  requestor: {
    name: 'AgEx Parts',
    phone: '0000000000',
    email: 'requestor@agexparts.com'
  },
  origin: {
    name: 'AgEx Parts Warehouse',
    locationId: 'AGEX-001',
    address: {
      address1: '1128 Dunkerton Road',
      address2: '',
      city: 'Cedar Falls',
      stateProvince: 'IA',
      postalCode: '50613',
      country: 'US'
    },
    contact: {
      name: 'AgEx Parts',
      phone: '3190000000',
      phoneExt: '',
      email: 'origin@agexparts.com'
    }
  }
};
