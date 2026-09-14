import pg from 'pg';
import dotenv from 'dotenv';
import { getLocalRecords, getLocalUsers, saveLocalRecords, saveLocalUsers } from './localStore.js';
import { RegistryRecord, AppUser } from '../src/types.js';

dotenv.config({ override: true });

const { Pool } = pg;

let pool: pg.Pool | null = null;
let isConnected = false;
let connectionError: string | null = null;
let customConnectionString: string | null = null;

export function getActiveConnectionString(): string | null {
  let url = customConnectionString || process.env.DATABASE_URL || null;
  if (url) {
    url = url.trim();
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1).trim();
    }
  }
  return url || null;
}

export function isPostgresConnected(): boolean {
  return isConnected && pool !== null;
}

export function getConnectionError(): string | null {
  return connectionError;
}

export function getPool(): pg.Pool | null {
  if (pool && isConnected) return pool;
  if (pool && !isConnected) return null; // Prevent hammering known failed connection

  const connStr = getActiveConnectionString();
  if (!connStr || connStr.trim() === '') {
    connectionError = 'Variable DATABASE_URL non configurée';
    isConnected = false;
    return null;
  }

  try {
    pool = new Pool({
      connectionString: connStr.trim(),
      ssl: {
        rejectUnauthorized: false, // Required for Neon cloud PostgreSQL
      },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20,
    });

    pool.on('error', (err) => {
      console.warn('PostgreSQL Pool background warning:', err.message);
      connectionError = err.message;
      isConnected = false;
    });

    return pool;
  } catch (err: any) {
    console.warn('Failed to create PostgreSQL pool:', err?.message || err);
    connectionError = err?.message || 'Erreur d\'initialisation du pool PostgreSQL';
    isConnected = false;
    return null;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
    } catch (err: any) {
      console.warn('Error closing PostgreSQL pool:', err?.message || err);
    } finally {
      pool = null;
      isConnected = false;
    }
  }
}

export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  const connStr = getActiveConnectionString();
  if (!connStr || connStr.trim() === '') {
    isConnected = false;
    connectionError = 'DATABASE_URL non configurée';
    return { 
      success: false, 
      message: 'DATABASE_URL non configurée dans l\'environnement.' 
    };
  }

  // Create a clean pool instance to test
  if (pool) {
    await closePool();
  }

  try {
    const newPool = new Pool({
      connectionString: connStr.trim(),
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20,
    });

    newPool.on('error', (err) => {
      connectionError = err.message;
      isConnected = false;
    });

    const client = await newPool.connect();
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

      // 3. Ensure high-performance indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        CREATE INDEX IF NOT EXISTS idx_records_serial ON records(num_serial);
        CREATE INDEX IF NOT EXISTS idx_records_name ON records(name);
        CREATE INDEX IF NOT EXISTS idx_records_type ON records(record_type);
        CREATE INDEX IF NOT EXISTS idx_records_cg_type ON records(cg_type);
        CREATE INDEX IF NOT EXISTS idx_records_pc_type ON records(pc_type);
        CREATE INDEX IF NOT EXISTS idx_records_num_cars ON records(num_cars);
        CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
        CREATE INDEX IF NOT EXISTS idx_records_quittance ON records(num_quittance);
        CREATE INDEX IF NOT EXISTS idx_records_quittance1 ON records(num_quittance1);
        CREATE INDEX IF NOT EXISTS idx_records_quittance2 ON records(num_quittance2);
        CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
        CREATE INDEX IF NOT EXISTS idx_records_date_created ON records(date DESC, created_at DESC);
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

      pool = newPool;
      isConnected = true;
      connectionError = null;
      console.log('PostgreSQL Neon connecté et initialisé avec succès !');
      return { success: true, message: 'Base de données PostgreSQL Neon initialisée et connectée avec succès !' };
    } finally {
      client.release();
    }
  } catch (err: any) {
    const isAuthError = err.message?.includes('password authentication failed') || err.code === '28P01';
    const friendlyMsg = isAuthError
      ? `Authentification Neon échouée (mot de passe invalide pour '${err.message?.split('for user')?.[1]?.trim() || 'neondb_owner'}')`
      : `Connexion Neon échouée: ${err.message}`;
    
    console.warn(`[Base de données] ${friendlyMsg}. Bascule automatique sur le stockage local persistant.`);
    isConnected = false;
    connectionError = friendlyMsg;
    await closePool();
    return { success: false, message: friendlyMsg };
  }
}

export async function testAndSetDatabaseUrl(newUrl: string): Promise<{ success: boolean; message: string }> {
  if (!newUrl || !newUrl.trim()) {
    return { success: false, message: 'Veuillez saisir une URL de connexion valide.' };
  }

  const cleanUrl = newUrl.trim();
  customConnectionString = cleanUrl;

  const initResult = await initDatabase();
  if (initResult.success) {
    // Sync local records if any into newly connected Neon DB
    try {
      await syncLocalToNeon();
    } catch (e: any) {
      console.warn('Sync local data to Neon error:', e.message);
    }
    return { success: true, message: 'Connexion établie avec succès à la base PostgreSQL Neon !' };
  } else {
    // Revert if failed
    customConnectionString = null;
    return { success: false, message: initResult.message };
  }
}

export async function syncLocalToNeon(): Promise<{ success: boolean; recordsCount: number; message: string }> {
  if (!isPostgresConnected() || !pool) {
    return { success: false, recordsCount: 0, message: 'PostgreSQL Neon non connecté.' };
  }

  const records = getLocalRecords();
  if (records.length === 0) {
    return { success: true, recordsCount: 0, message: 'Aucun dossier local à synchroniser.' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let synced = 0;
    for (const record of records) {
      const query = `
        INSERT INTO records (
          id, record_type, num_serial, name, montant, date, created_at, notes,
          cv, cg_type, num_cars, montant_cv, montant_dossier, num_quittance1, num_quittance2,
          pc_type, categories, num_quittance
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          montant = EXCLUDED.montant,
          date = EXCLUDED.date,
          name = EXCLUDED.name,
          notes = EXCLUDED.notes;
      `;

      const anyR = record as any;
      const values = [
        record.id,
        record.recordType,
        record.numSerial,
        record.name,
        record.montant,
        record.date,
        record.createdAt || new Date().toISOString(),
        record.notes || null,
        anyR.cv || null,
        record.type && record.recordType === 'CG' ? record.type : null,
        anyR.numCars || null,
        anyR.montantCV || 0,
        anyR.montantDossier || 0,
        anyR.numQuittance1 || null,
        anyR.numQuittance2 || null,
        record.type && record.recordType === 'PC' ? record.type : null,
        anyR.categories || [],
        anyR.numQuittance || null,
      ];

      await client.query(query, values);
      synced++;
    }
    await client.query('COMMIT');
    return { success: true, recordsCount: synced, message: `${synced} dossiers synchronisés vers Neon avec succès !` };
  } catch (err: any) {
    await client.query('ROLLBACK');
    return { success: false, recordsCount: 0, message: err.message };
  } finally {
    client.release();
  }
}

export async function getDbStatus() {
  const localRecords = getLocalRecords();
  const localUsers = getLocalUsers();

  if (!isPostgresConnected() || !pool) {
    if (getActiveConnectionString() && !connectionError) {
      await initDatabase();
    }
  }

  if (!isPostgresConnected() || !pool) {
    return {
      connected: false,
      database: 'local_fallback',
      message: connectionError || 'DATABASE_URL non configurée ou mot de passe expiré (Stockage local persistant actif)',
      recordCount: localRecords.length,
      userCount: localUsers.length,
      neonError: connectionError,
    };
  }

  try {
    const resTest = await pool.query('SELECT NOW() as now_time');
    const recordsCountRes = await pool.query('SELECT COUNT(*) as count FROM records');
    const usersCountRes = await pool.query('SELECT COUNT(*) as count FROM users');

    return {
      connected: true,
      database: 'postgresql_neon',
      now: resTest.rows[0]?.now_time,
      recordCount: parseInt(recordsCountRes.rows[0]?.count || '0', 10),
      userCount: parseInt(usersCountRes.rows[0]?.count || '0', 10),
      message: 'Connecté en direct à PostgreSQL Neon (Données Réelles)',
    };
  } catch (err: any) {
    isConnected = false;
    connectionError = err.message;
    return {
      connected: false,
      database: 'local_fallback',
      message: `Erreur Neon: ${err.message}`,
      recordCount: localRecords.length,
      userCount: localUsers.length,
      neonError: err.message,
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

export async function isDbAlive(): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    const res = await p.query('SELECT 1');
    return !!res;
  } catch {
    return false;
  }
}

