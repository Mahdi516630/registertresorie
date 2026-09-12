import React, { useState, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  RecordsTable 
} from './components/RecordsTable';
import { 
  DashboardAnalytics 
} from './components/DashboardAnalytics';
import { 
  RecordModal 
} from './components/RecordModal';
import { 
  DeleteConfirmModal 
} from './components/DeleteConfirmModal';
import { 
  ReceiptModal 
} from './components/ReceiptModal';
import { 
  LoginPage 
} from './components/LoginPage';
import { 
  UserManagement 
} from './components/UserManagement';
import { 
  NeonDatabaseModal 
} from './components/NeonDatabaseModal';
import { 
  RegistryRecord, 
  RecordType,
  AppUser,
  UserRole,
  UserStatus
} from './types';
import { 
  INITIAL_REGISTRY_DATA 
} from './data/initialData';
import { 
  INITIAL_USERS,
  ADMIN_EMAIL
} from './data/initialUsers';
import { 
  exportRecordsToCSV 
} from './utils/formatters';
import { 
  api 
} from './services/api';
import { 
  CheckCircle2, 
  RotateCcw, 
  ShieldCheck, 
  FileSpreadsheet, 
  Car, 
  CreditCard,
  Database,
  Server
} from 'lucide-react';

const STORAGE_KEY = 'cg_pc_registry_data_v1';
const CURRENCY_KEY = 'cg_pc_registry_currency_v1';
const USERS_STORAGE_KEY = 'cg_pc_registry_users_v2';
const AUTH_USER_KEY = 'cg_pc_registry_auth_user_v2';

export default function App() {
  // Load data from localStorage or default to empty list (database authoritative)
  const [records, setRecords] = useState<RegistryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge any legacy sample/mock records that are not in the database
          const clean = parsed.filter(
            (r: RegistryRecord) =>
              !r.id?.startsWith('cg-2026-') &&
              !r.id?.startsWith('pc-2026-') &&
              !r.id?.startsWith('cg-2025-') &&
              !r.id?.startsWith('pc-2025-')
          );
          return clean;
        }
      }
    } catch (e) {
      console.error('Error loading saved records:', e);
    }
    return [];
  });

  // User database with Mahdi as super-admin
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove unlisted mock users
          const clean = parsed.filter(
            (u: AppUser) => !['usr-agent-01', 'usr-pend-01', 'usr-pend-02'].includes(u.id)
          );
          // Ensure Mahdi admin is always present and active
          const hasMahdi = clean.some(
            (u: AppUser) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
          );
          if (!hasMahdi) {
            return [INITIAL_USERS[0], ...clean];
          }
          return clean.length > 0 ? clean : INITIAL_USERS;
        }
      }
    } catch (e) {
      console.error('Error loading saved users:', e);
    }
    return INITIAL_USERS;
  });

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading auth user:', e);
    }
    return null;
  });

  // Currency preference (Default: Franc Djibouti / FDJ)
  const [currency, setCurrency] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY);
      if (saved && saved !== 'FCFA' && saved !== 'DZD' && saved !== 'MAD') {
        return saved;
      }
      return 'FDJ';
    } catch {
      return 'FDJ';
    }
  });

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<'register' | 'analytics' | 'users'>('register');

  // Modal states
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RegistryRecord | null>(null);
  const [modalInitialType, setModalInitialType] = useState<RecordType>('CG');

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<RegistryRecord | null>(null);

  // Receipt modal states
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<RegistryRecord | null>(null);

  // Neon PostgreSQL Database modal & connection state
  const [isNeonModalOpen, setIsNeonModalOpen] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbInfo, setDbInfo] = useState<{ recordCount: number; userCount: number; message: string }>({
    recordCount: 0,
    userCount: 0,
    message: '',
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check Database connection on mount
  const refreshDbStatus = async () => {
    try {
      const status = await api.getStatus();
      if (status.connected) {
        setIsDbConnected(true);
        setDbInfo({
          recordCount: status.recordCount,
          userCount: status.userCount,
          message: status.message,
        });

        // Load real records from PostgreSQL (single source of truth)
        const remoteRecordsRes = await api.getRecords().catch(() => null);
        if (remoteRecordsRes && Array.isArray(remoteRecordsRes.records)) {
          setRecords(remoteRecordsRes.records);
        }

        // Load real users from PostgreSQL
        const remoteUsersRes = await api.getUsers().catch(() => null);
        if (remoteUsersRes && Array.isArray(remoteUsersRes.users) && remoteUsersRes.users.length > 0) {
          setUsers(remoteUsersRes.users);
        }
      } else {
        setIsDbConnected(false);
      }
    } catch (e) {
      console.error('Error fetching DB status:', e);
      setIsDbConnected(false);
    }
  };

  useEffect(() => {
    refreshDbStatus();
  }, []);

  // Synchronize records with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving records:', e);
    }
  }, [records]);

  // Synchronize users with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users:', e);
    }
  }, [users]);

  // Synchronize current user status
  useEffect(() => {
    if (currentUser) {
      const freshUser = users.find((u) => u.id === currentUser.id);
      if (freshUser) {
        if (freshUser.status !== 'APPROVED') {
          // Account suspended or revoked
          setCurrentUser(null);
          localStorage.removeItem(AUTH_USER_KEY);
          showToast("Votre accès a été suspendu par l'administrateur.");
        } else if (
          freshUser.role !== currentUser.role ||
          freshUser.name !== currentUser.name
        ) {
          setCurrentUser(freshUser);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(freshUser));
        }
      }
    }
  }, [users, currentUser]);

  // Synchronize currency
  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_KEY, currency);
    } catch (e) {
      console.error('Error saving currency:', e);
    }
  }, [currency]);

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Login handler
  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error saving auth session:', e);
    }
    showToast(`Bienvenue, ${user.name} ! Connexion réussie.`);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {
      console.error('Error clearing auth session:', e);
    }
    setCurrentTab('register');
    showToast('Déconnexion effectuée avec succès.');
  };

  // Registration handler (Pending admin approval)
  const handleRegister = (newUser: AppUser) => {
    const emailClean = newUser.email.toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailClean)) {
      return { 
        success: false, 
        message: 'Un compte existe déjà avec cette adresse e-mail.' 
      };
    }

    setUsers((prev) => [...prev, newUser]);

    // Persist to Neon Postgres if connected
    api.createUser(newUser).catch((err) => {
      console.warn('Neon createUser fallback to local:', err.message);
    });

    return {
      success: true,
      message: "Demande enregistrée. En attente de validation par l'administrateur (Mahdi)."
    };
  };

  // User Management Actions (for Admin Mahdi)
  const handleUpdateUserStatus = (userId: string, newStatus: UserStatus) => {
    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            status: newStatus,
            approvedAt: newStatus === 'APPROVED' ? new Date().toISOString() : u.approvedAt,
            approvedBy: newStatus === 'APPROVED' ? (currentUser?.email || ADMIN_EMAIL) : u.approvedBy,
          };
        }
        return u;
      })
    );

    // Persist to Neon Postgres
    api.updateUser(userId, {
      status: newStatus,
      approvedBy: currentUser?.email || ADMIN_EMAIL,
    }).catch((err) => {
      console.warn('Neon updateUser fallback:', err.message);
    });

    if (newStatus === 'APPROVED') {
      showToast(`Accès autorisé pour ${targetUser?.name || 'l\'agent'}. Il peut désormais se connecter !`);
    } else if (newStatus === 'REJECTED') {
      showToast(`Accès bloqué/refusé pour ${targetUser?.name || 'l\'agent'}.`);
    }
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    api.updateUser(userId, { role: newRole }).catch((err) => {
      console.warn('Neon updateUser role fallback:', err.message);
    });

    showToast("Rôle de l'utilisateur mis à jour.");
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    api.deleteUser(userId).catch((err) => {
      console.warn('Neon deleteUser fallback:', err.message);
    });
    showToast("Compte utilisateur supprimé.");
  };

  const handleAddUser = (newUser: AppUser) => {
    setUsers((prev) => [newUser, ...prev]);
    api.createUser(newUser).catch((err) => {
      console.warn('Neon addUser fallback:', err.message);
    });
    showToast(`Utilisateur ${newUser.name} créé avec succès.`);
  };

  // Open modal to add a new record
  const handleOpenNewModal = (type: RecordType) => {
    setEditingRecord(null);
    setModalInitialType(type);
    setIsRecordModalOpen(true);
  };

  // Open modal to edit an existing record
  const handleEditRecord = (record: RegistryRecord) => {
    setEditingRecord(record);
    setModalInitialType(record.recordType);
    setIsRecordModalOpen(true);
  };

  // Save record (Create or Update)
  const handleSaveRecord = (savedRecord: RegistryRecord) => {
    if (editingRecord) {
      // Update
      setRecords((prev) =>
        prev.map((r) => (r.id === savedRecord.id ? savedRecord : r))
      );
      api.updateRecord(savedRecord.id, savedRecord).catch((err) => {
        console.warn('Neon updateRecord fallback:', err.message);
      });
      showToast(`Dossier ${savedRecord.numSerial} mis à jour avec succès.`);
    } else {
      // Create new
      setRecords((prev) => [savedRecord, ...prev]);
      api.createRecord(savedRecord).catch((err) => {
        console.warn('Neon createRecord fallback:', err.message);
      });
      showToast(`Nouveau dossier ${savedRecord.numSerial} enregistré avec succès.`);
    }
    setIsRecordModalOpen(false);
    setEditingRecord(null);
  };

  // Trigger delete confirmation modal
  const handleDeletePrompt = (record: RegistryRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (recordToDelete) {
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      api.deleteRecord(recordToDelete.id).catch((err) => {
        console.warn('Neon deleteRecord fallback:', err.message);
      });
      showToast(`Dossier ${recordToDelete.numSerial} supprimé du registre.`);
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
    }
  };

  // View receipt
  const handleViewReceipt = (record: RegistryRecord) => {
    setReceiptRecord(record);
    setIsReceiptModalOpen(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    const filename = `registre_cg_pc_${new Date().toISOString().split('T')[0]}.csv`;
    exportRecordsToCSV(records, filename);
    showToast(`Export CSV téléchargé (${records.length} dossiers).`);
  };

  // Purge any local/unindexed records not found in database and re-sync
  const handleClearUnindexedData = async () => {
    if (window.confirm('Voulez-vous supprimer toutes les données locales non répertoriées dans la base de données et re-synchroniser ?')) {
      try {
        const res = await api.getRecords();
        if (res && Array.isArray(res.records)) {
          setRecords(res.records);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.records));
          showToast(`Synchronisation réussie : ${res.records.length} dossier(s) répertorié(s) dans la base de données.`);
        }
      } catch {
        setRecords([]);
        localStorage.removeItem(STORAGE_KEY);
        showToast('Données non répertoriées supprimées avec succès.');
      }
    }
  };

  // Calculated overall totals
  const totalRecords = records.length;
  const totalRevenue = records.reduce((sum, r) => sum + r.montant, 0);
  const cgCount = records.filter((r) => r.recordType === 'CG').length;
  const pcCount = records.filter((r) => r.recordType === 'PC').length;
  const pendingUsersCount = users.filter((u) => u.status === 'PENDING').length;

  // ================= IF NOT LOGGED IN -> SHOW LOGIN / REGISTER PAGE =================
  if (!currentUser) {
    return (
      <>
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-bounce-short">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <LoginPage
          onLogin={handleLogin}
          onRegister={handleRegister}
          users={users}
          onOpenDbModal={() => setIsNeonModalOpen(true)}
          isDbConnected={isDbConnected}
        />

        <NeonDatabaseModal
          isOpen={isNeonModalOpen}
          onClose={() => setIsNeonModalOpen(false)}
          onRefreshData={refreshDbStatus}
          currentRecords={records}
          onShowToast={showToast}
        />
      </>
    );
  }

  // ================= LOGGED IN USER INTERFACE =================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Database Connection Notice Banner */}
      <div className={`border-b text-xs py-2 px-4 flex items-center justify-between flex-wrap gap-2 ${
        isDbConnected 
          ? 'bg-emerald-600 text-white border-emerald-700' 
          : 'bg-slate-900 text-slate-300 border-slate-800'
      }`}>
        <div className="flex items-center space-x-2">
          <Database className={`w-4 h-4 ${isDbConnected ? 'text-emerald-200' : 'text-amber-400'}`} />
          <span>
            {isDbConnected ? (
              <strong>
                PostgreSQL Neon Connecté : Mode Données Réelles Actif ({dbInfo.recordCount} dossiers en base réelle)
              </strong>
            ) : (
              <span>
                <strong>PostgreSQL Neon :</strong> Obtenez le script SQL <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">CREATE TABLE</code> pour Neon et connectez votre base réelle pour quitter le mode simulation.
              </span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsNeonModalOpen(true)}
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] cursor-pointer shadow-xs transition-colors ${
            isDbConnected 
              ? 'bg-white text-emerald-800 hover:bg-emerald-50' 
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
        >
          <span>{isDbConnected ? 'Gérer / Synchroniser Base Neon' : 'Copier Script SQL Neon & Configurer'}</span>
        </button>
      </div>

      {/* Main Administrative Header with user profile and tabs */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewModal={handleOpenNewModal}
        onExportCSV={handleExportCSV}
        onResetData={handleClearUnindexedData}
        totalRecords={totalRecords}
        totalRevenue={totalRevenue}
        cgCount={cgCount}
        pcCount={pcCount}
        currency={currency}
        setCurrency={setCurrency}
        currentUser={currentUser}
        onLogout={handleLogout}
        pendingUsersCount={pendingUsersCount}
        onOpenDbModal={() => setIsNeonModalOpen(true)}
        isDbConnected={isDbConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Registry & Operations Table Tab */}
        {currentTab === 'register' && (
          <RecordsTable
            records={records}
            onEdit={handleEditRecord}
            onDelete={handleDeletePrompt}
            onViewReceipt={handleViewReceipt}
            currency={currency}
            onAddNew={handleOpenNewModal}
          />
        )}

        {/* Analyst Dashboard by Month or Years Tab */}
        {currentTab === 'analytics' && (
          <DashboardAnalytics
            records={records}
            currency={currency}
          />
        )}

        {/* Admin-only User Management Tab */}
        {currentTab === 'users' && currentUser.role === 'ADMIN' && (
          <UserManagement
            users={users}
            currentUser={currentUser}
            onUpdateUserStatus={handleUpdateUserStatus}
            onUpdateUserRole={handleUpdateUserRole}
            onDeleteUser={handleDeleteUser}
            onAddUser={handleAddUser}
          />
        )}
      </main>

      {/* Footer bar */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Système opérationnel • Registre des Titres Sécurisés</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">Session : {currentUser.name} ({currentUser.role})</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleClearUnindexedData}
              className="text-slate-400 hover:text-red-600 hover:underline flex items-center space-x-1 cursor-pointer transition-colors"
              title="Supprimer les données non répertoriées dans la base de données"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Nettoyer les données non répertoriées</span>
            </button>
            <span>•</span>
            <span>Version 3.0 - Authentification & RBAC</span>
          </div>
        </div>
      </footer>

      {/* Add / Edit Record Modal */}
      {isRecordModalOpen && (
        <RecordModal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            setEditingRecord(null);
          }}
          onSave={handleSaveRecord}
          editingRecord={editingRecord}
          initialType={modalInitialType}
          allRecords={records}
          currency={currency}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && recordToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          record={recordToDelete}
        />
      )}

      {/* Official Printable Receipt Modal */}
      {isReceiptModalOpen && receiptRecord && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setReceiptRecord(null);
          }}
          record={receiptRecord}
          currency={currency}
        />
      )}

      {/* PostgreSQL Neon Database Management & SQL Modal */}
      <NeonDatabaseModal
        isOpen={isNeonModalOpen}
        onClose={() => setIsNeonModalOpen(false)}
        onRefreshData={refreshDbStatus}
        currentRecords={records}
        onShowToast={showToast}
      />
    </div>
  );
}

