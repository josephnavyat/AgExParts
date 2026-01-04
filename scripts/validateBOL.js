#!/usr/bin/env node
// validateBOL.js
// Quick validation to catch common Estes errors seen in logs:
// - hazmatFlag must be boolean
// - handling unit weight must equal sum(lineItem.weight * pieces)
// - HU tareWeight numeric
// - totalShipmentWeight must equal sum(HU weight + HU tare)

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'BOL_filled.json');
if (!fs.existsSync(filePath)) {
  console.error('Could not find', filePath);
  process.exit(1);
}

const raw = fs.readFileSync(filePath, 'utf8');
let bol;
try { bol = JSON.parse(raw); } catch (e) { console.error('Invalid JSON in', filePath, e.message); process.exit(2); }

const issues = [];

function push(code, type, message) { issues.push({ code, type, message }); }

// Helper: find handling units in known locations
let handlingUnits = [];
if (bol.handlingUnits && Array.isArray(bol.handlingUnits)) handlingUnits = bol.handlingUnits;
else if (bol.commodity && bol.commodity.handlingUnits) handlingUnits = bol.commodity.handlingUnits;
else if (bol.commodities && bol.commodities.handlingUnits) handlingUnits = bol.commodities.handlingUnits;
else if (bol.commodities && bol.commodities.commodity) {
  // older schema: commodities.commodity is list of commodity lines, not HUs
  handlingUnits = [];
}

// 1) Hazmat flags
if ('hazmatFlag' in bol) {
  if (typeof bol.hazmatFlag !== 'boolean') {
    push('EBG0053', 'E', 'Top-level hazmatFlag must be boolean TRUE or FALSE (not empty or string)');
  }
}

// scan commodities array for per-commodity hazmat flags
function scanCommodityList(list) {
  if (!Array.isArray(list)) return;
  list.forEach((c,i) => {
    const info = c.commodityInfo || c;
    if (info && info.hazmat && ('hazmatFlag' in info.hazmat)) {
      if (typeof info.hazmat.hazmatFlag !== 'boolean') {
        push('EBG0053', 'E', `commodity[${i}].commodityInfo.hazmat.hazmatFlag must be boolean (currently ${JSON.stringify(info.hazmat.hazmatFlag)})`);
      }
    }
  });
}
if (bol.commodities && Array.isArray(bol.commodities.commodity)) scanCommodityList(bol.commodities.commodity);
if (bol.commodity && Array.isArray(bol.commodity.commodity)) scanCommodityList(bol.commodity.commodity);
if (bol.commodity && bol.commodity.handlingUnits) {
  // some schemas have lineItems inside handlingUnits
}

// 2) Handling unit weight checks
let sumHUWeights = 0;
let sumHUTares = 0;
if (handlingUnits.length === 0) {
  // try to infer HUs from commodities if present (commodities.commodity with pieces/weight)
  if (bol.commodities && Array.isArray(bol.commodities.commodity)) {
    // compute commodity-based totals
    const sumComWeights = bol.commodities.commodity.reduce((s,c,i)=>{
      const info = c.commodityInfo || c;
      const w = Number(info.weight || 0);
      const p = Number(info.pieces || 1);
      return s + (Number.isFinite(w) ? w * (Number.isFinite(p) ? p : 1) : 0);
    },0);
    if (bol.totalWeight && Number(bol.totalWeight) !== sumComWeights) {
      push('EBG0169', 'E', `totalWeight (${bol.totalWeight}) does not equal sum of commodity (weight*pieces) (${sumComWeights})`);
    }
  }
} else {
  handlingUnits.forEach((hu, idx) => {
    const huWeight = Number(hu.weight || 0);
    const huTare = Number(hu.tareWeight || 0);
    sumHUWeights += huWeight;
    sumHUTares += huTare;
    if (!Number.isFinite(huWeight)) push('EBG0169','E', `HU[${idx}] weight is not numeric (${hu.weight})`);
    if (!Number.isFinite(huTare)) push('EBG0149','E', `HU[${idx}] tareWeight is not numeric (${hu.tareWeight})`);

    // compute sum of line items (weight * pieces)
    const lineItems = hu.lineItems || hu.items || [];
    const sumLines = lineItems.reduce((s,li,i)=>{
      const w = Number(li.weight || 0);
      const p = Number(li.pieces || 1);
      return s + (Number.isFinite(w) ? w * (Number.isFinite(p) ? p : 1) : 0);
    },0);
    if (sumLines !== huWeight) {
      push('EBG0169','E', `HU[${idx}] weight (${huWeight}) != sum(line.weight * pieces) (${sumLines}). Check line item weights/pieces or HU weight.`);
    }
  });

  // compare totalShipmentWeight or totalWeight
  const totalShipmentWeight = Number(bol.totalShipmentWeight || bol.totalWeight || 0);
  if (totalShipmentWeight) {
    const expected = sumHUWeights + sumHUTares;
    if (totalShipmentWeight !== expected) {
      push('EBG0169','E', `totalShipmentWeight (${totalShipmentWeight}) != sum(HU weights) + sum(HU tares) (${expected}).`);
    }
  }
}

// 3) Numeric types for commodity weights/pieces
if (bol.commodities && Array.isArray(bol.commodities.commodity)) {
  bol.commodities.commodity.forEach((c,i)=>{
    const info = c.commodityInfo || c;
    if ('weight' in info && typeof info.weight === 'string') {
      // try parse
      const n = Number(info.weight);
      if (!Number.isFinite(n)) push('TYPE001','E', `commodity[${i}].commodityInfo.weight should be numeric, got '${info.weight}'`);
    }
    if ('pieces' in info && typeof info.pieces === 'string') {
      const n = Number(info.pieces);
      if (!Number.isFinite(n)) push('TYPE002','E', `commodity[${i}].commodityInfo.pieces should be numeric, got '${info.pieces}'`);
    }
  });
}

// Output results
if (issues.length === 0) {
  console.log('No validation issues found.');
  process.exit(0);
}

console.log('Validation issues found:');
issues.forEach((it,i)=>{
  console.log(`${i+1}. [${it.code}] (${it.type}) ${it.message}`);
});

// Exit non-zero to indicate errors
process.exit(3);
