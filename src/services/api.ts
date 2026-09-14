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

  async configureDatabaseUrl(connectionString: string): Promise<{ success: boolean; message: string; recordCount?: number; userCount?: number }> {
    const res = await fetch('/api/db/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString }),
    });
    return await res.json();
  },

  async syncDatabase(): Promise<{ success: boolean; message: string; recordsSynced?: number; usersSynced?: number }> {
    const res = await fetch('/api/db/sync', { method: 'POST' });
    return await res.json();
  },

  async getSchemaSql(): Promise<string> {
    const res = await fetch('/api/db/schema-sql');
    return await res.text();
  },

  // Records
  async getRecords(params?: {
    limit?: number | 'all';
    offset?: number;
    search?: string;
    recordType?: string;
    year?: string;
    month?: string;
  }): Promise<{ source: string; records: RegistryRecord[]; totalCount?: number; count?: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    if (params?.search) query.set('search', params.search);
    if (params?.recordType) query.set('recordType', params.recordType);
    if (params?.year) query.set('year', params.year);
    if (params?.month) query.set('month', params.month);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`/api/records${qs}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erreur récupération dossiers: HTTP ${res.status}`);
    }
    return await res.json();
  },

  async getRecordsStats(): Promise<{ totalRecords: number; totalRevenue: number; cgCount: number; pcCount: number }> {
    const res = await fetch('/api/records/stats');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erreur statistiques: HTTP ${res.status}`);
    }
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

  async batchCreateRecords(records: RegistryRecord[]): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch('/api/records/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur enregistrement par lot');
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
