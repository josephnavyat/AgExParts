import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function seed() {
  const db = await open({
    filename: './products.db',
    driver: sqlite3.Database
  });
  const products = [
    {
      part_number: 'PG-0001',
      name: 'Product 1',
      image: '/logo.png',
      description: 'Description for product 1',
      price: 10.99,
      quantity: 25,
      category: 'General',
      manufacturer: 'DemoCo'
    },
    {
      part_number: 'PG-0002',
      name: 'Product 2',
      image: '/hero-16x9.png',
      description: 'Description for product 2',
      price: 12.99,
      quantity: 30,
      category: 'General',
      manufacturer: 'DemoCo'
    },
    {
      part_number: 'PG-0003',
      name: 'Product 3',
      image: '/logo.png',
      description: 'Description for product 3',
      price: 8.99,
      quantity: 40,
      category: 'General',
      manufacturer: 'DemoCo'
    },
    {
      part_number: 'PG-0004',
      name: 'Product 4',
      image: '/hero-16x9.png',
      description: 'Description for product 4',
      price: 15.99,
      quantity: 20,
      category: 'General',
      manufacturer: 'DemoCo'
    },
    {
      part_number: 'PG-0005',
      name: 'Product 5',
      image: '/logo.png',
      description: 'Description for product 5',
      price: 9.99,
      quantity: 50,
      category: 'General',
      manufacturer: 'DemoCo'
    },
    {
      part_number: 'PG-0006',
      name: 'Product 6',
      image: '/hero-16x9.png',
      description: 'Description for product 6',
      price: 11.99,
      quantity: 35,
      category: 'General',
      manufacturer: 'DemoCo'
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
  console.log('Gallery products inserted.');
}

seed();
