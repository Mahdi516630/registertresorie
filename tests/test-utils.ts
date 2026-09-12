import { RegistryRecord, CGRecord, PCRecord, AppUser, CGType, PCType, PCCategory } from '../src/types';

/**
 * Interface pour les suites de tests compatibles à la fois
 * avec Vitest/CLI et avec le moteur de test in-app.
 */
export interface TestCase {
  id: string;
  name: string;
  category: 'TDD' | 'UTILITY' | 'PRODUCTION';
  run: () => void | Promise<void>;
}

export interface TestResult {
  id: string;
  name: string;
  category: 'TDD' | 'UTILITY' | 'PRODUCTION';
  status: 'passed' | 'failed' | 'running' | 'pending';
  durationMs?: number;
  error?: string;
  details?: string;
}

/**
 * Utilitaires d'assertions légers pour TDD et exécution hybride (Vitest / In-App)
 */
export const assert = {
  isTrue(value: boolean, message = 'Expected true'): void {
    if (!value) throw new Error(message);
  },
  isFalse(value: boolean, message = 'Expected false'): void {
    if (value) throw new Error(message);
  },
  equal<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Échec d'assertion: attendu "${expected}", obtenu "${actual}"`);
    }
  },
  deepEqual<T>(actual: T, expected: T, message?: string): void {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(message || `Échec deepEqual:\nAttendu: ${expectedStr}\nObtenu: ${actualStr}`);
    }
  },
  isAbove(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      throw new Error(message || `Attendu supérieur à ${expected}, mais obtenu ${actual}`);
    }
  },
  includes(container: string | any[], item: any, message?: string): void {
    if (typeof container === 'string') {
      if (!container.includes(item)) {
        throw new Error(message || `La chaîne "${container}" ne contient pas "${item}"`);
      }
    } else if (Array.isArray(container)) {
      if (!container.includes(item)) {
        throw new Error(message || `Le tableau ne contient pas l'élément demandé`);
      }
    }
  },
  matches(value: string, regex: RegExp, message?: string): void {
    if (!regex.test(value)) {
      throw new Error(message || `La valeur "${value}" ne correspond pas à la regex ${regex}`);
    }
  },
  throws(fn: () => void, message?: string): void {
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || `La fonction aurait dû lever une exception`);
    }
  },
};

/**
 * Utilitaires de création d'objets factices pour les tests (Fixtures / Factory)
 */
export function createMockCGRecord(overrides: Partial<CGRecord> = {}): CGRecord {
  return {
    id: `test-cg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recordType: 'CG',
    numSerial: '100001',
    name: 'Ahmed Hassan Mohamed',
    montant: 33000,
    date: '2026-09-12',
    notes: 'Dossier de test unitaire TDD',
    cv: 6,
    type: 'NORMAL',
    numCars: '24D1234',
    montantCV: 27000,
    montantDossier: 6000,
    numQuittance1: 'Q-2026-1001',
    numQuittance2: 'Q-2026-1002',
    ...overrides,
  };
}

export function createMockPCRecord(overrides: Partial<PCRecord> = {}): PCRecord {
  return {
    id: `test-pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recordType: 'PC',
    numSerial: '200001',
    name: 'Kadra Omar Farah',
    montant: 14000,
    date: '2026-09-12',
    notes: 'Dossier de test permis',
    type: 'NORMAL',
    categories: ['B', 'D'] as PCCategory[],
    numQuittance: 'Q-2026-3001',
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: `usr-test-${Date.now()}`,
    name: 'Agent Testeur',
    email: 'agent.test@prefecture.dj',
    password: 'Password123!',
    role: 'AGENT',
    status: 'APPROVED',
    department: 'Trésorie De La Préfecture De Djibouti • Djibouti',
    phone: '+253 77 11 22 33',
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: 'mahdiyacoubali318@gmail.com',
    ...overrides,
  };
}
