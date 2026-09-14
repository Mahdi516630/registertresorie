import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

let pool: pg.Pool | null = null;
let isConnected = false;
let connectionError: string | null = null;

export function getPool(): pg.Pool | null {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim() === '') {
    connectionError = 'Variable DATABASE_URL non configurée';
    return null;
  }

  try {
    pool = new Pool({
      connectionString: connectionString.trim(),
      ssl: {
        rejectUnauthorized: false, // Required for Neon cloud PostgreSQL
      },
      connectionTimeoutMillis: 8000,
      max: 10,
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL Pool error:', err.message);
      connectionError = err.message;
    });

    return pool;
  } catch (err: any) {
    console.error('Failed to create PostgreSQL pool:', err);
    connectionError = err?.message || 'Erreur d\'initialisation du pool PostgreSQL';
    return null;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      isConnected = false;
      console.log('PostgreSQL Pool closed gracefully');
    } catch (err: any) {
      console.error('Error closing PostgreSQL pool:', err);
    }
  }
}

export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  const p = getPool();
  if (!p) {
    return { 
      success: false, 
      message: connectionError || 'Aucune chaîne DATABASE_URL trouvée dans l\'environnement.' 
    };
  }

  try {
    const client = await p.connect();
    try {
      // 1. Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(128) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(32) NOT NULL DEFAULT 'AGENT',
          status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
          department VARCHAR(255),
          phone VARCHAR(64),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          approved_at TIMESTAMPTZ,
          approved_by VARCHAR(255)
        );
      `);

      // 2. Records table
      await client.query(`
        CREATE TABLE IF NOT EXISTS records (
          id VARCHAR(128) PRIMARY KEY,
          record_type VARCHAR(10) NOT NULL,
          num_serial VARCHAR(128) NOT NULL,
          name VARCHAR(255) NOT NULL,
          montant NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          date DATE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          notes TEXT,
          cv INTEGER,
          cg_type VARCHAR(32),
          num_cars VARCHAR(128),
          montant_cv NUMERIC(12, 2) DEFAULT 0.00,
          montant_dossier NUMERIC(12, 2) DEFAULT 0.00,
          num_quittance1 VARCHAR(128),
          num_quittance2 VARCHAR(128),
          pc_type VARCHAR(32),
          categories TEXT[] DEFAULT '{}',
          num_quittance VARCHAR(128)
        );
      `);

      // 3. Ensure indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_records_type ON records(record_type);
        CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
      `);

      // 4. Ensure Super-Admin exists
      await client.query(`
        INSERT INTO users (
          id, name, email, password, role, status, department, phone, created_at, approved_at, approved_by
        )
        VALUES (
          'usr-admin-mahdi',
          'Mahdi Yacoub Ali',
          'mahdiyacoubali318@gmail.com',
          'MAHDI8006',
          'ADMIN',
          'APPROVED',
          'Trésorie De La Préfecture De Djibouti • Djibouti',
          '+253 77 00 00 00',
          NOW(),
          NOW(),
          'SYSTEM_INITIALIZER'
        )
        ON CONFLICT (email) DO UPDATE SET
          role = 'ADMIN',
          status = 'APPROVED';
      `);

      isConnected = true;
      connectionError = null;
      return { success: true, message: 'Base de données PostgreSQL Neon initialisée et connectée avec succès !' };
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Database connection / init failed:', err.message);
    isConnected = false;
    connectionError = err.message;
    return { success: false, message: `Connexion Neon échouée: ${err.message}` };
  }
}

export async function getDbStatus() {
  const p = getPool();
  if (!p) {
    return {
      connected: false,
      database: 'none',
      message: connectionError || 'DATABASE_URL non configurée',
      recordCount: 0,
      userCount: 0,
    };
  }

  try {
    const resTest = await p.query('SELECT NOW() as now_time');
    const recordsCountRes = await p.query('SELECT COUNT(*) as count FROM records');
    const usersCountRes = await p.query('SELECT COUNT(*) as count FROM users');

    return {
      connected: true,
      database: 'postgresql_neon',
      now: resTest.rows[0]?.now_time,
      recordCount: parseInt(recordsCountRes.rows[0]?.count || '0', 10),
      userCount: parseInt(usersCountRes.rows[0]?.count || '0', 10),
      message: 'Connecté en direct à PostgreSQL Neon (Données Réelles)',
    };
  } catch (err: any) {
    return {
      connected: false,
      database: 'error',
      message: `Erreur requête Neon: ${err.message}`,
      recordCount: 0,
      userCount: 0,
    };
  }
}

// Map Postgres Row to Application Record
export function mapRowToRecord(row: any): any {
  const base = {
    id: row.id,
    recordType: row.record_type,
    numSerial: row.num_serial,
    name: row.name,
    montant: parseFloat(row.montant) || 0,
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    notes: row.notes || undefined,
  };

  if (row.record_type === 'CG') {
    return {
      ...base,
      recordType: 'CG',
      cv: parseInt(row.cv, 10) || 0,
      type: row.cg_type || 'NORMAL',
      numCars: row.num_cars || '',
      montantCV: parseFloat(row.montant_cv) || 0,
      montantDossier: parseFloat(row.montant_dossier) || 0,
      numQuittance1: row.num_quittance1 || '',
      numQuittance2: row.num_quittance2 || '',
      numQuittance: row.num_quittance || '',
    };
  } else {
    return {
      ...base,
      recordType: 'PC',
      type: row.pc_type || 'NORMAL',
      categories: Array.isArray(row.categories) ? row.categories : (row.categories ? [row.categories] : ['B']),
      numQuittance: row.num_quittance || '',
    };
  }
}

// Map Postgres Row to App User
export function mapRowToUser(row: any): any {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    status: row.status,
    department: row.department || undefined,
    phone: row.phone || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : undefined,
    approvedBy: row.approved_by || undefined,
  };
}
