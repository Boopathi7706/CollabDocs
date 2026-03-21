import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

export const pool = new Pool({
  connectionString,
  max: 20, // Max clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
