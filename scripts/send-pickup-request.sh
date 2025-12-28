#!/usr/bin/env bash
set -euo pipefail

# Usage: APIKEY=your-api-key TOKEN=your-bearer-token ./scripts/send-pickup-request.sh

if [ -z "${APIKEY-}" ] || [ -z "${TOKEN-}" ]; then
  echo "Set APIKEY and TOKEN environment variables before running. Example:" >&2
  echo "  APIKEY=apikey-here TOKEN=your-token-here ./scripts/send-pickup-request.sh" >&2
  exit 1
fi



curl --location --request POST "https://cloudapi.estes-express.com/v1/rate-quotes" 
  --header apikey: $APIKEY
  --header "Authorization: Bearer $TOKEN" 
  --header "Content-Type: application/json" 
  --data-raw '{
      quoteRequest: {
        shipDate: '2025-12-30T00:00:00.000Z',
        shipTime: '12:00',
        serviceLevels: ['ALL'],
        payment: {
            account: process.env.ESTES_ACCOUNT,
            payor: 'Shipper',
            terms: 'Prepaid'
        },
        requestor: {
            name: 'Tony Merfeld',
            phone: '3198594214',
            email: 'support@agexparts.com'
        },
      origin: {
          name: 'AgEx Parts',
          locationId: '123',
          address: { city: 'Cedar Falls', stateProvince: 'IA', postalCode: '50613', country: 'US' },
          contact: { name: 'Henry Jones', phone: '8045559876', phoneExt: '12', email: 'origin.email@email.com' }
        },
        destination: {
          name: 'XYZ Destination Company',
          locationId: '987-B',
          address: {city: 'Opelika', stateProvince: 'AL', postalCode: '36801', country: 'US' },
          contact: { name: 'Lucy Patel', phone: '8045554321', phoneExt: '1212', email: 'destination.email@email.com' }
        },
        commodity: {
          handlingUnits: [
            {
              count: 1,
              type: 'PT',
              weight: 600,
              tareWeight: 10,
              weightUnit: 'Pounds',
              length: 48,
              width: 40,
              height: 48,
              dimensionsUnit: 'Inches',
              isStackable: false,
              isTurnable: true,
              lineItems: [
                {
                  description: 'Boxes of widgets',
                  weight: 600,
                  pieces: 1,
                  packagingType: 'BX',
                  classification: '92.5',
                  nmfc: '158880',
                  nmfcSub: '3',
                  isHazardous: false
                }
              ]
            }
          ]
        },
      },
    }; '

echo
