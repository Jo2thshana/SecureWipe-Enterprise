import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const host = process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.PGPORT || '5432', 10);
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const database = process.env.PGDATABASE || 'securewipe';

  console.log(`Probing PostgreSQL on ${host}:${port} for user "${user}"...`);
  const pool = new Pool({
    host,
    port,
    user,
    password,
    database: 'postgres' // Connect to default postgres DB first to check existence
  });

  try {
    const res = await pool.query('SELECT version()');
    console.log('SUCCESS_CONN: Connected to PostgreSQL server!');
    console.log('Version:', res.rows[0].version);
    
    // Check if securewipe db exists
    const dbRes = await pool.query("SELECT datname FROM pg_database WHERE datname = 'securewipe'");
    if (dbRes.rows.length > 0) {
      console.log("SUCCESS_DB: 'securewipe' database exists.");
    } else {
      console.log("WARNING_DB: 'securewipe' database DOES NOT exist.");
    }
  } catch (err: any) {
    console.log('FAILURE_CONN: Could not connect to local PostgreSQL.');
    console.log('Error Code:', err.code);
    console.log('Error Message:', err.message);
  } finally {
    await pool.end();
  }
}

check();
