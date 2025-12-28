'use strict';

const https = require('https');
const defaults = require('./estes-defaults');
const fs = require('fs');
const path = require('path');

function postJson(urlString, body, headers = {}) { return new Promise((resolve) => { const debug = JSON.parse(require('fs').readFileSync('./estes-debug.json','utf8')); // use debug.quote.response when present
  const resp = debug.quote && debug.quote.response && debug.quote.response.data && debug.quote.response.data.length>0 ? { statusCode: 200, body: JSON.stringify(debug.quote.response) } : { statusCode: 200, body: JSON.stringify(debug.quote.response || debug.quote) }; resolve(resp); }); }

      const isRatesNotFound = (resp.statusCode === 422) || (data && data.error && data.error.code === 70020) || (data && data.error && data.error.information && Array.isArray(data.error.information) && data.error.information.some(i => (i.messageId || '').startsWith('GSC')));
      if (isRatesNotFound) {
        try {
          const retryPayload = JSON.parse(JSON.stringify(estesPayload));
          // clear city fields to allow ZIP-only matching
          if (retryPayload.quoteRequest && retryPayload.quoteRequest.origin && retryPayload.quoteRequest.origin.address) retryPayload.quoteRequest.origin.address.city = '';
          if (retryPayload.quoteRequest && retryPayload.quoteRequest.destination && retryPayload.quoteRequest.destination.address) retryPayload.quoteRequest.destination.address.city = '';
          console.error('estes-quote-retrying-zip-only');
          const retryResp = await postJson(url, retryPayload, headers);
          let retryData;
          try { retryData = JSON.parse(retryResp.body); } catch (e) { retryData = { raw: retryResp.body }; }
          if (retryResp.statusCode && retryResp.statusCode < 400) {
            return { statusCode: 200, body: JSON.stringify({ carrier: 'Estes', scac: 'EXLA', quoteNumber: retryData.quoteNumber, transitDays: retryData.transitDays, total: retryData.charges && retryData.charges.total, breakdown: retryData.charges, retryAttempted: true }) };
          }
          // If retry still failed, include both responses for debugging
          return { statusCode: resp.statusCode || 500, body: JSON.stringify({ error: 'Estes quote failed (initial and retry)', status: resp.statusCode, estesResponse: data, retry: { status: retryResp.statusCode, response: retryData } }) };
        } catch (e) {
          console.error('estes-quote-retry-error', e && e.message);
          return { statusCode: resp.statusCode || 500, body: JSON.stringify({ error: 'Estes quote failed and retry errored', status: resp.statusCode, estesResponse: data, retryError: e && e.message }) };
        }
      }

      return { statusCode: resp.statusCode || 500, body: JSON.stringify({ error: 'Estes quote failed', status: resp.statusCode, estesResponse: data }) };
    }

    // Normalize possible Estes response shapes to provide a numeric `total` and a `breakdown` object.
    try {
      let total = null;
      let breakdown = null;

      // Common shape: data.charges.total or charges.total
      if (data && data.charges && (data.charges.total || data.charges.totalCharges)) {
        total = Number(data.charges.total || data.charges.totalCharges);
        breakdown = data.charges;
      }

      // Some responses include a top-level quoteRate or quoteRate inside data[0]
      if ((total === null || isNaN(total)) && data) {
        // If response has `quoteRate` at top-level
        if (data.quoteRate && (data.quoteRate.totalCharges || data.quoteRate.total)) {
          total = Number(data.quoteRate.totalCharges || data.quoteRate.total);
          breakdown = data.quoteRate;
        }
        // If response has `data` array with elements containing `quoteRate.totalCharges`, pick the cheapest
          else if (Array.isArray(data.data) && data.data.length > 0) {
            const candidates = data.data.map(d => {
              if (!d || !d.quoteRate) return null;
              const v = d.quoteRate.totalCharges || d.quoteRate.total || null;
              const n = v != null ? Number(String(v).replace(/[^0-9.-]+/g, '')) : NaN;
              return isNaN(n) ? null : { n, raw: d };
            }).filter(Boolean);
            if (candidates.length > 0) {
              candidates.sort((a,b) => a.n - b.n);
              const pick = candidates[0];
              total = Number(pick.n);
              breakdown = pick.raw.quoteRate || pick.raw;
              // prefer quoteNumber and transitDays from the chosen item
              data.quoteNumber = pick.raw.quoteId || pick.raw.quoteId || data.quoteNumber;
              data.transitDays = (pick.raw.transitDetails && pick.raw.transitDetails.transitDays) || data.transitDays;
            }
          }
        // Some older logs show `data` as the primary object (already parsed earlier), handle that too
        else if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          if (first && first.quoteRate && (first.quoteRate.totalCharges || first.quoteRate.total)) {
            total = Number(first.quoteRate.totalCharges || first.quoteRate.total);
            breakdown = first.quoteRate;
          }
        }
      }

      // Fallback: try to find a numeric value anywhere in the parsed object
      if ((total === null || isNaN(total)) && data) {
        // search common keys
        const maybe = data && (data.total || data.totalCharges || (data.charges && (data.charges.total || data.charges.totalCharges)));
        if (maybe) total = Number(maybe);
      }

      // Ensure total is a number (fallback to null if not available)
      if (total != null && !isNaN(total)) {
        // If we have a data array and selected a pick, include its serviceLevelText and quoteId
        let serviceLevelText = null;
        let quoteId = data.quoteNumber || null;
        if (Array.isArray(data.data) && data.data.length > 0) {
          // find matching entry in data that corresponds to the breakdown if possible
          const match = data.data.find(d => {
            if (!d) return false;
            const v = d.quoteRate && (d.quoteRate.totalCharges || d.quoteRate.total);
            if (!v) return false;
            const n = Number(String(v).replace(/[^0-9.-]+/g, ''));
            return !isNaN(n) && Number(n) === Number(total);
          });
          if (match) {
            serviceLevelText = match.serviceLevelText || null;
            quoteId = match.quoteId || quoteId;
          }
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ carrier: 'Estes', scac: 'EXLA', quoteNumber: quoteId, serviceLevelText: serviceLevelText, transitDays: data.transitDays || (data.data && data.data[0] && data.data[0].transitDetails && data.data[0].transitDetails.transitDays) || null, total: total, breakdown: breakdown || data })
        };
      }
    } catch (e) {
      // ignore and fall through to generic return
      console.warn('estes-normalize-failed', e && e.message);
    }

    // Generic fallback: return what we can
    return {
      statusCode: 200,
      body: JSON.stringify({ carrier: 'Estes', scac: 'EXLA', quoteNumber: data.quoteNumber, transitDays: data.transitDays, total: (data && data.charges && data.charges.total) || null, breakdown: data })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', message: err && err.message }) };
  }
};
