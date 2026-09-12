import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  ShieldCheck, 
  Search, 
  UserPlus, 
  Trash2, 
  Check, 
  X, 
  Shield, 
  Building2, 
  Mail, 
  Phone, 
  Calendar,
  AlertTriangle,
  Lock,
  RefreshCw
} from 'lucide-react';
import { AppUser, UserRole, UserStatus } from '../types';

interface UserManagementProps {
  users: AppUser[];
  currentUser: AppUser;
  onUpdateUserStatus: (userId: string, status: UserStatus) => void;
  onUpdateUserRole: (userId: string, role: UserRole) => void;
  onDeleteUser: (userId: string) => void;
  onAddUser: (user: AppUser) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentUser,
  onUpdateUserStatus,
  onUpdateUserRole,
  onDeleteUser,
  onAddUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Add User Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDepartment, setNewDepartment] = useState('Guichet Cartes Grises & Permis');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('AGENT');
  const [newStatus, setNewStatus] = useState<UserStatus>('APPROVED');
  const [addError, setAddError] = useState<string | null>(null);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  // User counts
  const totalCount = users.length;
  const pendingCount = users.filter((u) => u.status === 'PENDING').length;
  const approvedCount = users.filter((u) => u.status === 'APPROVED').length;
  const rejectedCount = users.filter((u) => u.status === 'REJECTED').length;

  // Handle Add user form submission
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const emailClean = newEmail.trim().toLowerCase();
    if (!newName.trim() || !emailClean || !newPassword) {
      setAddError('Veuillez renseigner le nom, l’email et le mot de passe.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === emailClean)) {
      setAddError('Un utilisateur existe déjà avec cette adresse email.');
      return;
    }

    const created: AppUser = {
      id: `usr-${Date.now()}`,
      name: newName.trim(),
      email: emailClean,
      password: newPassword,
      role: newRole,
      status: newStatus,
      createdAt: new Date().toISOString(),
      approvedAt: newStatus === 'APPROVED' ? new Date().toISOString() : undefined,
      approvedBy: newStatus === 'APPROVED' ? currentUser.email : undefined,
      department: newDepartment.trim() || undefined,
      phone: newPhone.trim() || undefined,
    };

    onAddUser(created);
    setIsAddModalOpen(false);

    // Reset fields
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewDepartment('Guichet Cartes Grises & Permis');
    setNewPhone('');
    setNewRole('AGENT');
    setNewStatus('APPROVED');
  };

  return (
    <div className="space-y-6" id="user-management-module">
      
      {/* Top Banner & Title */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Gestion des Utilisateurs & Autorisations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Validez les demandes d'accès des nouveaux inscrits et gérez les privilèges d'accès au Registre.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Admin connecté : <strong>{currentUser.name}</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter Utilisateur</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pending Requests Highlight Card */}
        <div className={`p-5 rounded-2xl border transition-all ${
          pendingCount > 0 
            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30 shadow-xs' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              En attente de validation
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900 font-mono">
              {pendingCount}
            </span>
            {pendingCount > 0 && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-200/80 px-2 py-0.5 rounded-full animate-pulse">
                Action requise !
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-700 mt-2">
            Inscrits sans accès qui attendent votre autorisation.
          </p>
        </div>

        {/* Approved Active Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Comptes Autorisés (Actifs)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {approvedCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Agents et administrateurs autorisés à se connecter.
          </p>
        </div>

        {/* Blocked / Rejected Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Comptes Suspendus / Rejetés
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-700 font-mono">
              {rejectedCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Accès bloqué ou révoqué par la direction.
          </p>
        </div>

        {/* Total Users Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Utilisateurs
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Comptes enregistrés dans le système.
          </p>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email, service..."
            className="block w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Status and Role Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Status filter */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-500 font-medium">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les statuts ({users.length})</option>
              <option value="PENDING">En attente ({pendingCount})</option>
              <option value="APPROVED">Autorisés ({approvedCount})</option>
              <option value="REJECTED">Bloqués ({rejectedCount})</option>
            </select>
          </div>

          {/* Role filter */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-500 font-medium">Rôle :</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="ADMIN">Administrateurs</option>
              <option value="AGENT">Agents de saisie</option>
              <option value="OPERATOR">Opérateurs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Utilisateur / Identité</th>
                <th className="py-3.5 px-3">Service & Contact</th>
                <th className="py-3.5 px-3">Rôle</th>
                <th className="py-3.5 px-3">Statut d'Accès</th>
                <th className="py-3.5 px-3">Date Création</th>
                <th className="py-3.5 px-4 text-right">Actions Administrateur (Mahdi)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucun utilisateur ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isMahdiAdmin = user.email.toLowerCase() === 'mahdiyacoubali318@gmail.com';
                  const isCurrent = user.id === currentUser.id;

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        user.status === 'PENDING' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            user.role === 'ADMIN'
                              ? 'bg-blue-600 text-white'
                              : user.status === 'PENDING'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-semibold">
                                  Vous
                                </span>
                              )}
                              {isMahdiAdmin && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 text-indigo-800 font-semibold">
                                  Super-Admin
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 font-mono text-[11px] flex items-center space-x-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Service & Contact */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <div className="text-slate-800 font-medium">
                            {user.department || 'Trésorie De La Préfecture De Djibouti • Djibouti'}
                          </div>
                          {user.phone && (
                            <div className="text-slate-400 font-mono text-[11px] flex items-center space-x-1">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-3">
                        {isMahdiAdmin ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Administrateur
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => onUpdateUserRole(user.id, e.target.value as UserRole)}
                            className="text-xs font-semibold rounded-md border border-slate-300 py-1 px-2 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="AGENT">Agent de Saisie</option>
                            <option value="OPERATOR">Opérateur Guichet</option>
                            <option value="ADMIN">Administrateur</option>
                          </select>
                        )}
                      </td>

                      {/* Access Status Badge */}
                      <td className="py-3.5 px-3">
                        {user.status === 'PENDING' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 mr-1 text-amber-700 animate-spin-slow" />
                            <span>En attente d'approbation</span>
                          </span>
                        )}
                        {user.status === 'APPROVED' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            <span>Autorisé / Actif</span>
                          </span>
                        )}
                        {user.status === 'REJECTED' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <X className="w-3.5 h-3.5 mr-1 text-rose-600" />
                            <span>Bloqué / Rejeté</span>
                          </span>
                        )}
                      </td>

                      {/* Creation Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end space-x-1.5">
                          
                          {/* Case 1: PENDING -> Action is to APPROVE (Autoriser) or REJECT */}
                          {user.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onUpdateUserStatus(user.id, 'APPROVED')}
                                title="Autoriser la connexion de cet utilisateur"
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Autoriser</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateUserStatus(user.id, 'REJECTED')}
                                title="Rejeter la demande"
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-medium text-xs transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Rejeter</span>
                              </button>
                            </>
                          )}

                          {/* Case 2: APPROVED -> Can suspend/block */}
                          {user.status === 'APPROVED' && !isMahdiAdmin && (
                            <button
                              type="button"
                              onClick={() => onUpdateUserStatus(user.id, 'REJECTED')}
                              title="Suspendre l'accès"
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-300 font-medium text-xs transition-colors cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Suspendre</span>
                            </button>
                          )}

                          {/* Case 3: REJECTED -> Can reactivate */}
                          {user.status === 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => onUpdateUserStatus(user.id, 'APPROVED')}
                              title="Réactiver et autoriser l'accès"
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Réactiver</span>
                            </button>
                          )}

                          {/* Delete button (protected for primary admin) */}
                          {!isMahdiAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Confirmez-vous la suppression définitive du compte de ${user.name} ?`)) {
                                  onDeleteUser(user.id);
                                }
                              }}
                              title="Supprimer définitivement"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL ADD USER DIRECTLY ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Créer un Nouvel Utilisateur
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Omar Hassan Ahmed"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse E-mail *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nom@transports.dj"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mot de passe temporaire *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rôle</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="AGENT">Agent de Saisie</option>
                    <option value="OPERATOR">Opérateur Titres</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statut d'Accès</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="APPROVED">Autorisé Directement</option>
                    <option value="PENDING">En attente d'approbation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Service / Département</label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Guichet Cartes Grises & Permis"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
