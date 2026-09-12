export type RecordType = 'CG' | 'PC';

export type PCType = 'NORMAL' | 'DUPLICATA';
export type PCCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type CGType = 'NORMAL' | 'DUPLICATA' | 'EXO';

export interface BaseRecord {
  id: string;
  recordType: RecordType;
  numSerial: string;
  name: string;
  montant: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
  notes?: string;
}

export interface PCRecord extends BaseRecord {
  recordType: 'PC';
  categories: PCCategory[]; // Multiple categories allowed per holder (e.g., ['A', 'B'])
  categorie?: PCCategory; // Backward-compatible single category
  type: PCType;
  numQuittance: string;
}

export interface CGRecord extends BaseRecord {
  recordType: 'CG';
  cv: number; // Puissance fiscale
  type: CGType;
  numCars: string; // Numéro d'immatriculation / plaque ou numéro de châssis
  montantCV?: number; // Montant selon les CV (4500 FDJ/CV en Normal, 2250 en Duplicata)
  montantDossier?: number; // Frais de dossier (saisi manuellement)
  numQuittance1?: string; // 1ère quittance (Taxe CV)
  numQuittance2?: string; // 2ème quittance (Frais de dossier pour CG Normal)
  numQuittance?: string; // Optional if EXO, required if NORMAL
}

export type RegistryRecord = PCRecord | CGRecord;

export type TimeFilterMode = 'year' | 'month' | 'all';

export interface FilterState {
  recordType: 'ALL' | 'CG' | 'PC';
  operationType: 'ALL' | 'NORMAL' | 'DUPLICATA' | 'EXO';
  year: string; // e.g. "2026", "2025", "ALL"
  month: string; // "ALL" or "01".."12"
  searchQuery: string;
  pcCategory: 'ALL' | PCCategory;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalRecords: number;
  cgCount: number;
  pcCount: number;
  cgRevenue: number;
  pcRevenue: number;
  normalCount: number;
  duplicataCount: number;
  exoCount: number;
  exoTheoreticalExemption: number;
  averageMontant: number;
}

export type UserRole = 'ADMIN' | 'OPERATOR' | 'AGENT';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  department?: string;
  phone?: string;
}

