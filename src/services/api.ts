import { RegistryRecord, AppUser, UserRole, UserStatus } from '../types';

export interface DbStatusResponse {
  connected: boolean;
  database: string;
  message: string;
  recordCount: number;
  userCount: number;
  now?: string;
}

export const api = {
  async getStatus(): Promise<DbStatusResponse> {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      return {
        connected: false,
        database: 'none',
        message: e.message || 'Impossible de joindre le serveur API',
        recordCount: 0,
        userCount: 0,
      };
    }
  },

  async initDb(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/db/init', { method: 'POST' });
    return await res.json();
  },

  async getSchemaSql(): Promise<string> {
    const res = await fetch('/api/db/schema-sql');
    return await res.text();
  },

  // Records
  async getRecords(): Promise<{ source: string; records: RegistryRecord[] }> {
    const res = await fetch('/api/records');
    if (!res.ok) throw new Error(`Erreur récupération dossiers: HTTP ${res.status}`);
    return await res.json();
  },

  async createRecord(record: RegistryRecord): Promise<RegistryRecord> {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur lors de la création du dossier');
    }
    return await res.json();
  },

  async updateRecord(id: string, record: Partial<RegistryRecord>): Promise<RegistryRecord> {
    const res = await fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur lors de la mise à jour du dossier');
    }
    return await res.json();
  },

  async deleteRecord(id: string): Promise<void> {
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur lors de la suppression');
    }
  },

  async seedRecords(records: RegistryRecord[]): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch('/api/records/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur import initial');
    }
    return await res.json();
  },

  // Users
  async getUsers(): Promise<{ source: string; users: AppUser[] }> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error(`Erreur récupération utilisateurs: HTTP ${res.status}`);
    return await res.json();
  },

  async createUser(user: Partial<AppUser>): Promise<AppUser> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur création utilisateur');
    }
    return await res.json();
  },

  async updateUser(id: string, updates: { role?: UserRole; status?: UserStatus; approvedBy?: string }): Promise<AppUser> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur mise à jour utilisateur');
    }
    return await res.json();
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur suppression utilisateur');
    }
  },

  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; user: AppUser }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Identifiants invalides');
    }
    return data;
  }
};
