import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';

const app = express();
const PORT = 4000;
app.use(cors());
app.use(express.json());

let db;

async function initDb() {
  db = await open({
    filename: './products.db',
    driver: sqlite3.Database
  });
  await db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image TEXT,
    description TEXT
  )`);
}

app.get('/api/products', async (req, res) => {
  const products = await db.all('SELECT * FROM products');
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const { name, image, description } = req.body;
  const result = await db.run(
    'INSERT INTO products (name, image, description) VALUES (?, ?, ?)',
    [name, image, description]
  );
  res.json({ id: result.lastID, name, image, description });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
