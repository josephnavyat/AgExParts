/*
Safe migration script: preview and optionally apply normalization of `products.image` values.

Usage:
  # preview only
  node scripts/migrate-images-to-r2.js --preview

  # apply changes (will backup image column first)
  node scripts/migrate-images-to-r2.js --apply

The script reads DATABASE_URL from environment. It will:
 - connect to DB
 - show a sample of current image values and the computed new key
 - if --apply, it will:
    - add image_backup column if missing and copy image
    - update image to the basename (strip any path)

Be sure to back up your DB before applying.
*/

const { Client } = require('pg');
const argv = require('minimist')(process.argv.slice(2));
const preview = argv.preview || false;
const apply = argv.apply || false;

if (!preview && !apply) {
  console.log('Usage: node scripts/migrate-images-to-r2.js --preview  OR --apply');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL env var is required');
  process.exit(1);
}

(async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    console.log('-- sample current image values (first 100) --');
    const res = await client.query(`SELECT id, image FROM products LIMIT 100`);
    const rows = res.rows.map(r => ({ id: r.id, image: r.image, basename: r.image ? r.image.replace(/^.*\//, '') : null }));
    console.table(rows.slice(0, 20));

    if (apply) {
      console.log('\n-- applying migration: backing up and updating image column --');
      // add backup column if not exists
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_backup text`);
      // populate backup where null
      await client.query(`UPDATE products SET image_backup = image WHERE image_backup IS NULL`);
      // update to basename
      const updateRes = await client.query(`UPDATE products SET image = regexp_replace(image, '^.*/', '') WHERE image IS NOT NULL`);
      console.log('Updated rows count:', updateRes.rowCount);
    } else {
      console.log('\nPreview mode only. Run with --apply to make changes.');
    }
  } catch (err) {
    console.error('Migration error', err);
  } finally {
    await client.end();
    console.log('\nDone');
  }
})();
