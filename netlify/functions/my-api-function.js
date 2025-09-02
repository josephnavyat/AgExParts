import { Client } from '@neondatabase/serverless';

export default async (req) => {
  const client = new Client(process.env.NETLIFY_DATABASE_URL);
  try {
    await client.connect();
    const { rows } = await client.query('SELECT * FROM products;');
    return new Response(JSON.stringify(rows), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await client.end();
  }
};