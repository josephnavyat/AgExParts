
import 'dotenv/config';
import express from 'express';
import pkg from 'pg';
import cors from 'cors';

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 4000;

// Use Neon connection string from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({
  origin: ['https://agexparts.netlify.app', 'http://localhost:5173', 'http://localhost:5174']
}));
app.use(express.json());

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    // Convert price to number if present
    const products = result.rows.map(product => ({
      ...product,
      price: product.price !== undefined && product.price !== null ? Number(product.price) : product.price
    }));
    res.json(products);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test route to verify backend is running
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok' });
});

// ...other routes...

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



/*import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';

const app = express();
const PORT = 4000;
// Allow only Netlify frontend
app.use(cors({ origin: 'https://agexparts.netlify.app' }));
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
});*/
