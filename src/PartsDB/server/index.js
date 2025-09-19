
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
  origin: [/^https?:\/\/localhost:\d+$/, 'https://agexparts.netlify.app']
}));
app.use(express.json());

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parts');
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