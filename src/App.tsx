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
  Server,
  AlertTriangle,
  RefreshCw,
  Clock
} from 'lucide-react';

const CURRENCY_KEY = 'cg_pc_registry_currency_v1';
const AUTH_USER_KEY = 'cg_pc_registry_auth_user_v2';

export default function App() {
  // Authoritative data loaded strictly from PostgreSQL Neon
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  // Current logged in user session
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
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
  const [isCheckingDb, setIsCheckingDb] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(5);
  const [dbInfo, setDbInfo] = useState<{ recordCount: number; userCount: number; message: string }>({
    recordCount: 0,
    userCount: 0,
    message: '',
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check Database connection
  const refreshDbStatus = async (silent = false): Promise<boolean> => {
    if (!silent) setIsCheckingDb(true);
    try {
      const status = await api.getStatus();
      const connected = status.connected === true;
      setIsDbConnected(connected);
      setDbInfo({
        recordCount: status.recordCount || 0,
        userCount: status.userCount || 0,
        message: status.message || '',
      });

      // Load records & users (the server serves seamlessly from Neon or Local Fallback)
      const [remoteRecordsRes, remoteUsersRes] = await Promise.all([
        api.getRecords().catch((err) => {
          console.warn('Could not fetch records:', err.message);
          return null;
        }),
        api.getUsers().catch((err) => {
          console.warn('Could not fetch users:', err.message);
          return null;
        }),
      ]);

      if (remoteRecordsRes && Array.isArray(remoteRecordsRes.records)) {
        setRecords(remoteRecordsRes.records);
      }
      if (remoteUsersRes && Array.isArray(remoteUsersRes.users) && remoteUsersRes.users.length > 0) {
        setUsers(remoteUsersRes.users);
      }
      setIsCheckingDb(false);
      return connected;
    } catch (e: any) {
      console.error('Error fetching DB status:', e);
      setIsDbConnected(false);
      setDbInfo((prev) => ({
        ...prev,
        message: e.message || 'Impossible de joindre le serveur API',
      }));
      setIsCheckingDb(false);
      return false;
    }
  };

  // Initial connection check on mount
  useEffect(() => {
    refreshDbStatus();
  }, []);

  // Periodic status poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDbStatus(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Registration handler (Submitted to PostgreSQL Neon, pending admin approval)
  const handleRegister = async (newUser: AppUser) => {
    const emailClean = newUser.email.toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailClean)) {
      return { 
        success: false, 
        message: 'Un compte existe déjà avec cette adresse e-mail.' 
      };
    }

    try {
      const created = await api.createUser(newUser);
      setUsers((prev) => [...prev, created]);
      return {
        success: true,
        message: "Demande enregistrée dans la base de données. En attente de validation par l'administrateur (Mahdi)."
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erreur d'enregistrement : ${err.message}`
      };
    }
  };

  // User Management Actions (for Admin Mahdi)
  const handleUpdateUserStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      const updated = await api.updateUser(userId, {
        status: newStatus,
        approvedBy: currentUser?.email || ADMIN_EMAIL,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u))
      );
      if (newStatus === 'APPROVED') {
        showToast("Accès autorisé avec succès dans PostgreSQL Neon ! L'agent peut se connecter.");
      } else if (newStatus === 'REJECTED') {
        showToast("Accès révoqué dans PostgreSQL Neon.");
      }
    } catch (err: any) {
      showToast(`Erreur de mise à jour du statut : ${err.message}`);
      refreshDbStatus(true);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const updated = await api.updateUser(userId, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u))
      );
      showToast("Rôle utilisateur mis à jour dans PostgreSQL Neon.");
    } catch (err: any) {
      showToast(`Erreur de modification du rôle : ${err.message}`);
      refreshDbStatus(true);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("Compte utilisateur supprimé définitivement de PostgreSQL Neon.");
    } catch (err: any) {
      showToast(`Erreur de suppression de l'utilisateur : ${err.message}`);
      refreshDbStatus(true);
    }
  };

  const handleAddUser = async (newUser: AppUser) => {
    try {
      const created = await api.createUser(newUser);
      setUsers((prev) => [created, ...prev]);
      showToast(`Utilisateur ${newUser.name} créé avec succès dans PostgreSQL Neon.`);
    } catch (err: any) {
      showToast(`Erreur de création d'utilisateur : ${err.message}`);
      refreshDbStatus(true);
    }
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
  const handleSaveRecord = async (savedRecord: RegistryRecord) => {
    try {
      if (editingRecord) {
        const updated = await api.updateRecord(savedRecord.id, savedRecord);
        setRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        showToast(`Dossier ${updated.numSerial} mis à jour avec succès dans PostgreSQL Neon.`);
      } else {
        const created = await api.createRecord(savedRecord);
        setRecords((prev) => [created, ...prev]);
        setDbInfo((prev) => ({ ...prev, recordCount: prev.recordCount + 1 }));
        showToast(`Nouveau dossier ${created.numSerial} enregistré avec succès dans PostgreSQL Neon.`);
      }
      setIsRecordModalOpen(false);
      setEditingRecord(null);
    } catch (err: any) {
      showToast(`Erreur d'enregistrement : ${err.message}`);
      refreshDbStatus(true);
    }
  };

  // Trigger delete confirmation modal
  const handleDeletePrompt = (record: RegistryRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (recordToDelete) {
      try {
        await api.deleteRecord(recordToDelete.id);
        setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
        setDbInfo((prev) => ({ ...prev, recordCount: Math.max(0, prev.recordCount - 1) }));
        showToast(`Dossier ${recordToDelete.numSerial} supprimé du registre.`);
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
      } catch (err: any) {
        showToast(`Erreur de suppression : ${err.message}`);
        refreshDbStatus(true);
      }
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

  // Purge local cache and reload from Neon PostgreSQL
  const handleClearUnindexedData = async () => {
    await refreshDbStatus();
    showToast('Données re-synchronisées depuis PostgreSQL Neon.');
  };

  // Calculated overall totals
  const totalRecords = records.length;
  const totalRevenue = records.reduce((sum, r) => sum + r.montant, 0);
  const cgCount = records.filter((r) => r.recordType === 'CG').length;
  const pcCount = records.filter((r) => r.recordType === 'PC').length;
  const pendingUsersCount = users.filter((u) => u.status === 'PENDING').length;

  // ================= 1. INITIAL CHECKING STATE =================
  if (isCheckingDb && records.length === 0 && users.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-6 border border-blue-400/30 animate-pulse">
          <ShieldCheck className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Trésorerie De La Préfecture De Djibouti
        </h2>
        <p className="text-xs uppercase tracking-widest text-blue-300 font-bold mt-1">
          Registre Officiel CG & PC • Capacité 50 000 Dossiers
        </p>

        <div className="mt-8 flex items-center space-x-3 bg-slate-800/90 px-5 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm shadow-lg">
          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          <span>Chargement du Registre et vérification de la base...</span>
        </div>
      </div>
    );
  }

  // ================= 2. IF NOT LOGGED IN -> SHOW LOGIN / REGISTER PAGE =================
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

  // ================= 4. LOGGED IN USER INTERFACE (LIVE POSTGRESQL CONNECTED) =================
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
      {isDbConnected ? (
        <div className="bg-emerald-600 text-white border-b border-emerald-700 text-xs py-2 px-4 flex items-center justify-between flex-wrap gap-2 shadow-xs">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-200" />
            <span>
              <strong>
                PostgreSQL Neon Connecté : Mode Données Réelles Actif ({dbInfo.recordCount.toLocaleString('fr-FR')} dossiers en base) • Capacité 50 000+ dossiers indexés
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsNeonModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] cursor-pointer shadow-xs transition-colors bg-white text-emerald-800 hover:bg-emerald-50"
          >
            <span>Gérer / Synchroniser Base Neon</span>
          </button>
        </div>
      ) : (
        <div className="bg-amber-600 text-white border-b border-amber-700 text-xs py-2 px-4 flex items-center justify-between flex-wrap gap-2 shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
            <span>
              <strong>Mode Stockage Local Résilient Actif</strong> : La base Neon distante n'est pas connectée ({dbInfo.message || 'authentification échouée'}). Vos {records.length} dossiers sont sécurisés localement.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsNeonModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] cursor-pointer shadow-xs transition-colors bg-white text-amber-900 hover:bg-amber-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Configurer / Reconnecter Neon</span>
          </button>
        </div>
      )}

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

