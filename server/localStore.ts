import fs from 'fs';
import path from 'path';
import { INITIAL_USERS } from '../src/data/initialUsers.js';
import { RegistryRecord, AppUser } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Default initial records for Djibouti Registry
const DEFAULT_RECORDS: RegistryRecord[] = [
  {
    id: 'rec-cg-sample-1',
    recordType: 'CG',
    numSerial: '100001',
    name: 'Mohamed Ali Hassan',
    montant: 33500,
    date: '2026-03-01',
    createdAt: new Date('2026-03-01T08:30:00Z').toISOString(),
    notes: 'Première immatriculation véhicule tourisme',
    cv: 7,
    type: 'NORMAL',
    numCars: 'DJ-12345-A',
    montantCV: 31500, // 7 * 4500 FDJ
    montantDossier: 2000,
    numQuittance1: 'Q-2026-00124',
    numQuittance2: 'Q-2026-00125',
  },
  {
    id: 'rec-pc-sample-1',
    recordType: 'PC',
    numSerial: '200001',
    name: 'Amina Ahmed Farah',
    montant: 14000,
    date: '2026-03-02',
    createdAt: new Date('2026-03-02T09:15:00Z').toISOString(),
    notes: 'Délivrance initiale permis catégorie B et A',
    type: 'NORMAL',
    categories: ['A', 'B'],
    numQuittance: 'Q-2026-00189',
  },
  {
    id: 'rec-cg-sample-2',
    recordType: 'CG',
    numSerial: '100002',
    name: 'Ibrahim Omar Guelleh',
    montant: 15000,
    date: '2026-03-03',
    createdAt: new Date('2026-03-03T10:00:00Z').toISOString(),
    notes: 'Duplicata suite à perte carte grise',
    cv: 6,
    type: 'DUPLICATA',
    numCars: 'DJ-98765-B',
    montantCV: 13500, // 6 * 2250 FDJ
    montantDossier: 1500,
    numQuittance1: 'Q-2026-00210',
    numQuittance2: 'Q-2026-00211',
  },
];

export function getLocalRecords(): RegistryRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(RECORDS_FILE)) {
      const content = fs.readFileSync(RECORDS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error reading local records:', err);
  }
  // Initialize with sample records if not exists
  saveLocalRecords(DEFAULT_RECORDS);
  return DEFAULT_RECORDS;
}

export function saveLocalRecords(records: RegistryRecord[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local records:', err);
  }
}

export function getLocalUsers(): AppUser[] {
  ensureDataDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.error('Error reading local users:', err);
  }
  // Initialize with default admin user
  saveLocalUsers(INITIAL_USERS);
  return INITIAL_USERS;
}

export function saveLocalUsers(users: AppUser[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local users:', err);
  }
}
