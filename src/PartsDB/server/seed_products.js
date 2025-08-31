import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function seed() {
  const db = await open({
    filename: './products.db',
    driver: sqlite3.Database
  });
  const products = [
    {
      part_number: 'AGX-1001',
      name: 'Tractor Hydraulic Filter',
      image: '/logo.png',
      description: 'High-efficiency hydraulic filter for tractors.',
      price: 29.99,
      quantity: 50,
      category: 'Hydraulics',
      manufacturer: 'AgEx'
    },
    {
      part_number: 'AGX-2002',
      name: 'Plow Blade',
      image: '/hero-16x9.png',
      description: 'Durable steel plow blade for field tillage.',
      price: 49.99,
      quantity: 30,
      category: 'Tillage',
      manufacturer: 'FieldPro'
    },
    {
      part_number: 'AGX-3003',
      name: 'Seeder Drive Chain',
      image: '/logo.png',
      description: 'Heavy-duty drive chain for seeders.',
      price: 19.99,
      quantity: 100,
      category: 'Seeding',
      manufacturer: 'ChainWorks'
    }
  ];
  for (const p of products) {
    await db.run(
      `INSERT OR IGNORE INTO products (part_number, name, image, description, price, quantity, category, manufacturer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.part_number, p.name, p.image, p.description, p.price, p.quantity, p.category, p.manufacturer]
    );
  }
  await db.close();
  console.log('Sample products inserted.');
}

seed();
