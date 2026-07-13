import { Pool } from 'pg';
import { DATABASE_URL } from './env';

const connectionString = DATABASE_URL;


export const pool = new Pool({
  connectionString,
  max: 20, // Max clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: true,
});

// Test connection on startup
pool.connect()
  .then((client) => {
    console.log(`Connected to PostgreSQL database at ${connectionString.split('@')[1]}`);
    client.release();
  })
  .catch((err) => {
    console.error('Error acquiring client from pool', err);
    process.exit(1); // Exit if DB connection fails on startup
  });

export const query = (text: string, params?: any[]) => pool.query(text, params);
