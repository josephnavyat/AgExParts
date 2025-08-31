import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function createTable() {
  const db = await open({
    filename: './products.db',
    driver: sqlite3.Database
  });
  await db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT UNIQUE,
    name TEXT,
    image TEXT,
    description TEXT,
    price REAL,
    quantity INTEGER,
    category TEXT,
    manufacturer TEXT
  )`);
  await db.close();
  console.log('Products table created (if it did not exist).');
}

createTable();
