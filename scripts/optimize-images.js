#!/usr/bin/env node
// Usage: node scripts/optimize-images.js --source ./public/images --preview
// or: node scripts/optimize-images.js --db --apply

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const minimist = require('minimist');

const argv = minimist(process.argv.slice(2));
const preview = argv.preview || false;
const sourceDir = argv.source || path.join(__dirname, '..', 'public');

async function processFile(filePath) {
  const p = path.parse(filePath);
  const rel = path.relative(sourceDir, filePath);
  const outThumb = path.join(p.dir, `${p.name}.thumb.webp`);
  const outWebp = path.join(p.dir, `${p.name}.webp`);
  console.log('Processing', rel);
  if (preview) return { file: rel, thumb: outThumb, webp: outWebp };
  try {
    await sharp(filePath).resize(400).webp({ quality: 75 }).toFile(outThumb);
    await sharp(filePath).resize(800).webp({ quality: 80 }).toFile(outWebp);
    return { file: rel, thumb: outThumb, webp: outWebp };
  } catch (err) {
    console.error('Failed to process', rel, err.message);
    return null;
  }
}

async function walkAndProcess(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...(await walkAndProcess(full)));
    } else if (e.isFile() && full.match(/\.(png|jpg|jpeg)$/i)) {
      const r = await processFile(full);
      if (r) results.push(r);
    }
  }
  return results;
}

(async () => {
  console.log('Source dir:', sourceDir);
  const res = await walkAndProcess(sourceDir);
  console.log('Done. Files processed:', res.length);
  if (preview) console.log(JSON.stringify(res.slice(0, 20), null, 2));
})();
