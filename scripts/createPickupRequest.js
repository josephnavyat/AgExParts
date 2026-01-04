#!/usr/bin/env node
/*
 Simple script to POST a pickup request to Estes Cloud API.
 Usage:
  node scripts/createPickupRequest.js --apikey=YOUR_API_KEY --token=YOUR_BEARER_TOKEN [--send]
 Or set env vars ESTES_APIKEY and ESTES_TOKEN. Without --send the script will print the payload (dry-run).
*/

const https = require('https');
const { URL } = require('url');

// Try to load a local .env file if present (optional dependency)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed or .env not present — that's fine, we'll read process.env
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { send: false };

  args.forEach(arg => {
    if (arg === '--send') out.send = true;
    else if (arg.startsWith('--apikey=')) out.apikey = arg.split('=')[1];
    else if (arg.startsWith('--token=')) out.token = arg.split('=')[1];
    else if (arg.startsWith('--url=')) out.url = arg.split('=')[1];
  });

  // accept multiple env var names for convenience
  out.apikey = out.apikey || process.env.ESTES_APIKEY || process.env.ESTES_API_KEY || process.env.ESTES_KEY;
  out.token = out.token || process.env.ESTES_TOKEN || process.env.ESTES_BEARER || process.env.ESTES_AUTH_TOKEN;
  out.url = out.url || process.env.ESTES_PICKUP_URL || process.env.ESTES_URL || 'https://cloudapi.estes-express.com/v1/pickup-requests';
  return out;
}

const payload = {
  shipper: {
    shipperName: "ACCEPTANCE TESTER",
    accountCode: "123456",
    shipperAddress: {
      addressInfo: {
        addressLine1: "30 FIREMENS WAY",
        addressLine2: "",
        city: "POUGHKEEPSIE",
        stateProvince: "NY",
        postalCode: 12603,
        postalCode4: "",
        countryAbbrev: "US"
      }
    },
    shipperContacts: {
      shipperContact: [
        {
          contactInfo: {
            name: { firstName: "SARAH", middleName: "RANDAZZO X115", lastName: "INC" },
            email: "info@promptlogistics.com",
            phone: { areaCode: 845, number: 4736780, extension: 1234 },
            receiveNotifications: "Y",
            notificationMethod: "E"
          }
        }
      ]
    }
  },
  requestAction: "LL",
  paymentTerms: "PPD",
  pickupDate: "2020-07-24",
  pickupStartTime: 1000,
  pickupEndTime: 1600,
  totalPieces: 188,
  totalWeight: 3720,
  totalHandlingUnits: "8",
  hazmatFlag: "",
  expeditedCode: "",
  whoRequested: "3",
  trailer: [ { trailerInfo: { id: "12345", length: "22", type: "" } } ],
  referenceNumbers: {
    referenceNumber: [
      { referenceInfo: { type: "PRO", value: "0062020915", required: "N", totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: "PON", value: "API31082020", required: "N", totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: "BOL", value: "API08312020", required: "N", totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: "EUI", value: "APIE10022020", required: "N", totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: "LDN", value: "APIL10022020", required: "N", totalPieces: 0, totalWeight: 0 } },
      { referenceInfo: { type: "SNO", value: "APIS10022020", required: "N", totalPieces: 0, totalWeight: 0 } }
    ]
  },
  commodities: {
    commodity: [
      { commodityInfo: { code: "50", packageCode: "PT", description: "WIPES", hazmat: { hazmatCode: "UN1030", hazmatFlag: "X" }, pieces: "2", weight: "200", nmfcNumber: "SOS050820", nmfcSubNumber: "2020" } },
      { commodityInfo: { code: "50", packageCode: "CT", description: "CHIPS", pieces: "2", weight: "200", nmfcNumber: "28032020", nmfcSubNumber: "2803" } }
    ]
  },
  comments: { comment: [ { commentInfo: { type: "", commentText: "SOME TEXT" } } ] },
  consignee: { accountCode: "", accountName: "" },
  thirdParty: { accountCode: "", accountName: "" },
  addresses: { address: [ { addressInfo: { addressType: "C", addressLine1: "2110 LINCOLN HWY", addressLine2: "", city: "EDISON", stateProvince: "NJ", postalCode: 12603, countryAbbrev: "US" } }, { addressInfo: { addressType: 3, addressLine1: "212 2nd Suite 205A", addressLine2: "", city: "Lakewood", stateProvince: "NJ", postalCode: 12603, countryAbbrev: "US" } } ] },
  contacts: {
    contact: [
      { contactInfo: { contactType: "S", name: { firstName: "SARAH", middleName: "RANDAZZO X115 BABYVISION", lastName: "INC" }, email: "info@promptlogistics.com", phone: { areaCode: 845, number: 4736780, extension: 1234 }, receiveNotifications: "Y", notificationMethod: "E" } },
      { contactInfo: { contactType: "C", name: { firstName: "NEWPORT", lastName: "LOGISTICS" }, email: "info@promptlogistics.com", phone: { areaCode: 732, number: 2871440, extension: 225 }, receiveNotifications: "Y", notificationMethod: "E" } },
      { contactInfo: { contactType: 3, name: { firstName: "Prompt", lastName: "Logistics" }, email: "info@promptlogistics.com", phone: { areaCode: 732, number: 9058686, extension: 1234 }, receiveNotifications: "Y", notificationMethod: "E" } },
      { contactInfo: { contactType: "A", name: { firstName: "Michelle", lastName: "Gutin" }, email: "michael@promptlogistics.com", phone: { areaCode: 732, number: 9058686, extension: 1234 }, receiveNotifications: "Y", notificationMethod: "E" } }
    ],
    notifications: { notification: [ { notificationInfo: { type: "" } } ] }
  }
};

function run() {
  const opts = parseArgs();
  const body = JSON.stringify(payload, null, 2);

  console.log('URL:', opts.url);
  console.log('Dry run (no network) unless --send provided).');
  if (!opts.send) {
    console.log('\n--- Payload (truncated) ---\n');
    console.log(body.substring(0, 1000));
    console.log('\n--- end payload (use --send to actually POST) ---\n');
    console.log('To send: set env ESTES_API_KEY and ESTES_TOKEN or pass --apikey and --token, and run with --send');
    return;
  }

  if (!opts.apikey || !opts.token) {
    console.error('Missing apikey or token. Provide via --apikey/--token or ESTES_APIKEY/ESTES_TOKEN env vars.');
    process.exit(2);
  }

  const url = new URL(opts.url);
  const requestOptions = {
    method: 'POST',
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'apikey': opts.apikey,
      'Authorization': 'Bearer ' + opts.token
    }
  };

  const req = https.request(requestOptions, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try {
        console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
      } catch (e) {
        console.log('Response (raw):', data);
      }
    });
  });

  req.on('error', err => {
    console.error('Request error:', err.message);
    process.exit(3);
  });

  req.write(body);
  req.end();
}

if (require.main === module) run();
