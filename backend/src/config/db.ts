import pg from 'pg';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';

const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const db = drizzle(pool);

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database.');
});

export default db;
