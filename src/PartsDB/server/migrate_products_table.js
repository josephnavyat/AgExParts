import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function migrate() {
  const db = await open({
    filename: './products.db',
    driver: sqlite3.Database
  });
  // Rename old table if exists
  await db.exec('ALTER TABLE products RENAME TO products_old');
  // Create new table with full schema
  await db.exec(`CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT UNIQUE,
    name TEXT,
    image TEXT,
    description TEXT,
    price REAL,
    quantity INTEGER,
    category TEXT,
    vendor TEXT
  )`);
  // Copy data from old table (if any). If the old table had 'manufacturer', copy it into 'vendor'.
  await db.exec(`INSERT INTO products (id, name, image, description, price, quantity, category, vendor)
    SELECT id, name, image, description, price, quantity, category, manufacturer FROM products_old`);
  // Drop old table
  await db.exec('DROP TABLE products_old');
  await db.close();
  console.log('Migration complete!');
}

migrate();
