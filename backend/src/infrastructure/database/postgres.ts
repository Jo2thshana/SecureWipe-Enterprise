import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString 
  ? new Pool({ connectionString }) 
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'securewipe'
    });

export async function initPostgres() {
  console.log('[Postgres] Checking database connection and initializing schema...');
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('[Postgres] Connected to database server successfully.');
  } catch (err) {
    console.error('[Postgres] Database connection failed. Please ensure PostgreSQL is running and credentials are correct.', err);
    throw err;
  }

  // Define DDL queries
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `;

  const createDevicesTable = `
    CREATE TABLE IF NOT EXISTS devices (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      capacity NUMERIC NOT NULL,
      used_space NUMERIC NOT NULL,
      free_space NUMERIC NOT NULL,
      connection_status VARCHAR(50) NOT NULL,
      path TEXT NOT NULL,
      risk_level VARCHAR(50) NOT NULL,
      is_os_disk BOOLEAN NOT NULL DEFAULT FALSE,
      is_safe BOOLEAN NOT NULL DEFAULT TRUE,
      bus_type VARCHAR(50),
      connection_type VARCHAR(50),
      media_type VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `;

  const createWipeJobsTable = `
    CREATE TABLE IF NOT EXISTS wipe_jobs (
      id VARCHAR(255) PRIMARY KEY,
      device_id VARCHAR(255) REFERENCES devices(id) ON DELETE CASCADE,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      mode VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      algorithm_used VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      bytes_wiped NUMERIC NOT NULL DEFAULT 0,
      total_bytes NUMERIC NOT NULL DEFAULT 0,
      total_files INTEGER NULL,
      succeeded_files INTEGER NULL,
      failed_files INTEGER NULL,
      success_rate DOUBLE PRECISION NULL,
      error TEXT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `;

  const createCertificatesTable = `
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(255) PRIMARY KEY,
      job_id VARCHAR(255) UNIQUE REFERENCES wipe_jobs(id) ON DELETE CASCADE,
      certificate_id VARCHAR(255) UNIQUE NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      device_name VARCHAR(255) NOT NULL,
      device_type VARCHAR(50) NOT NULL,
      algorithm_used VARCHAR(50) NOT NULL,
      wipe_date TIMESTAMP WITH TIME ZONE NOT NULL,
      verification_status VARCHAR(50) NOT NULL,
      confidence_score DOUBLE PRECISION NOT NULL,
      qr_code_data TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `;

  const createAuditLogsTable = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT NOT NULL,
      signature TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `;

  try {
    await pool.query(createUsersTable);
    await pool.query(createDevicesTable);
    await pool.query(createWipeJobsTable);
    await pool.query(createCertificatesTable);
    await pool.query(createAuditLogsTable);
    console.log('[Postgres] Database tables checked/created successfully.');
    
    // Seed database if empty
    const userCountRes = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountRes.rows[0].count, 10);
    
    if (userCount === 0) {
      console.log('[Postgres] Empty database detected. Seeding defaults...');
      await seedDatabase();
    }
  } catch (schemaErr) {
    console.error('[Postgres] Error initializing schema:', schemaErr);
    throw schemaErr;
  }
}

async function seedDatabase() {
  const adminSalt = bcrypt.genSaltSync(10);
  const adminPassHash = bcrypt.hashSync('AdminPass123!', adminSalt);
  const adminId = 'user-admin-uuid-001';
  const now = new Date();

  await pool.query(`
    INSERT INTO users (id, full_name, email, password_hash, role, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    adminId,
    'Super Admin',
    'admin@securewipe.com',
    adminPassHash,
    'ADMIN',
    now,
    now
  ]);

  const opSalt = bcrypt.genSaltSync(10);
  const opPassHash = bcrypt.hashSync('OperatorPass123!', opSalt);
  const opId = 'user-operator-uuid-002';

  await pool.query(`
    INSERT INTO users (id, full_name, email, password_hash, role, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    opId,
    'Disposal Operator',
    'operator@securewipe.com',
    opPassHash,
    'USER',
    now,
    now
  ]);

  const seedLog1Id = 'log-seed-001';
  const seedLog1Payload = `${seedLog1Id}|SYSTEM|SYSTEM_BOOT|SecureWipe compliance audit kernel booted.|${now.toISOString()}`;
  const seedLog1Sig = crypto
    .createHmac('sha256', process.env.HMAC_SECRET || 'hmac_audit_ledger_secret_protection_key_2026')
    .update(seedLog1Payload)
    .digest('hex');

  await pool.query(`
    INSERT INTO audit_logs (id, user_id, action, details, signature, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    seedLog1Id,
    null,
    'SYSTEM_BOOT',
    'SecureWipe compliance audit kernel booted.',
    seedLog1Sig,
    now,
    now
  ]);

  console.log('[Postgres] Seed operations complete.');
}
