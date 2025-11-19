#!/usr/bin/env node
// Usage: node scripts/optimize-images.js --source ./public/images --preview
// or: node scripts/optimize-images.js --db --apply

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const minimist = require('minimist');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const argv = minimist(process.argv.slice(2));
const preview = argv.preview || false;
const upload = argv.upload || false;
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
    if (upload) {
      // Upload both generated files to R2/S3 if env vars are present
      const bucket = process.env.R2_BUCKET || process.env.AWS_S3_BUCKET;
      const accessKey = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
      const secretKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
      const endpoint = process.env.R2_S3_ENDPOINT || process.env.AWS_S3_ENDPOINT || undefined;
      if (!bucket || !accessKey || !secretKey) {
        console.warn('R2 upload requested but R2_BUCKET/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY not set in env; skipping upload');
      } else {
        const client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }, forcePathStyle: false });
        // helper to upload
        const uploadOne = async (localPath, keyName) => {
          const body = fs.readFileSync(localPath);
          const cmd = new PutObjectCommand({ Bucket: bucket, Key: keyName, Body: body, ContentType: 'image/webp', ACL: 'public-read' });
          await client.send(cmd);
        };
        try {
          const thumbKey = path.basename(outThumb);
          const webpKey = path.basename(outWebp);
          await uploadOne(outThumb, thumbKey);
          await uploadOne(outWebp, webpKey);
          console.log('Uploaded', thumbKey, webpKey, 'to', bucket);
        } catch (err) {
          console.error('Upload failed for', rel, err && err.message);
        }
      }
    }
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
