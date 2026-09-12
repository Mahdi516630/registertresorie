import React from 'react';
import { 
  FileText, 
  Car, 
  CreditCard, 
  BarChart3, 
  ListFilter, 
  PlusCircle, 
  Download, 
  RotateCcw,
  ShieldCheck,
  Users,
  LogOut,
  User,
  Clock,
  Database
} from 'lucide-react';
import { RecordType, AppUser } from '../types';
import { formatCurrency } from '../utils/formatters';

interface HeaderProps {
  currentTab: 'register' | 'analytics' | 'users';
  setCurrentTab: (tab: 'register' | 'analytics' | 'users') => void;
  onOpenNewModal: (type: RecordType) => void;
  onExportCSV: () => void;
  onResetData: () => void;
  totalRecords: number;
  totalRevenue: number;
  cgCount: number;
  pcCount: number;
  currency: string;
  setCurrency: (c: string) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  pendingUsersCount?: number;
  onOpenDbModal: () => void;
  isDbConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewModal,
  onExportCSV,
  onResetData,
  totalRecords,
  totalRevenue,
  cgCount,
  pcCount,
  currency,
  setCurrency,
  currentUser,
  onLogout,
  pendingUsersCount = 0,
  onOpenDbModal,
  isDbConnected,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Administrative branding */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-7 h-7 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Registre CG & PC
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Trésorie De La Préfecture De Djibouti • Djibouti
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Gestion des Cartes Grises, Permis de Conduire, Quittances & Analyses
              </p>
            </div>
          </div>

          {/* Quick Realtime Stats Summary Pill */}
          <div className="hidden xl:flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-500">CG:</span>
              <strong className="text-slate-800 font-semibold">{cgCount}</strong>
            </div>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="text-slate-500">PC:</span>
              <strong className="text-slate-800 font-semibold">{pcCount}</strong>
            </div>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Recettes:</span>
              <strong className="text-indigo-700 font-bold">{formatCurrency(totalRevenue, currency)}</strong>
            </div>
          </div>

          {/* Primary Action Buttons & User Profile */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Database Neon Status / Action Button */}
            <button
              id="btn-neon-db"
              type="button"
              onClick={onOpenDbModal}
              title="PostgreSQL Neon: Obtenir le script SQL et vérifier la connexion"
              className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg border transition-all cursor-pointer ${
                isDbConnected 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${isDbConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="font-bold">
                {isDbConnected ? 'Postgres Neon Connecté' : 'Base Neon (SQL / Config)'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            </button>

            {/* Currency switcher dropdown */}
            <div className="relative">
              <select
                aria-label="Devise monétaire"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
              >
                <option value="FDJ">Devise: Franc Djibouti (FDJ)</option>
                <option value="DJF">Devise: DJF</option>
                <option value="USD">Devise: USD ($)</option>
                <option value="EUR">Devise: EUR (€)</option>
              </select>
            </div>

            {/* Export CSV button */}
            <button
              id="btn-export-csv"
              onClick={onExportCSV}
              title="Exporter les données au format CSV / Excel"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs hover:border-slate-400 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Add CG button */}
            <button
              id="btn-add-cg"
              onClick={() => onOpenNewModal('CG')}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Car className="w-3.5 h-3.5" />
              <span>+ Carte Grise</span>
            </button>

            {/* Add PC button */}
            <button
              id="btn-add-pc"
              onClick={() => onOpenNewModal('PC')}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ Permis (PC)</span>
            </button>

            {/* Connected User Chip & Logout */}
            {currentUser && (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 py-1 px-2.5 rounded-xl border border-slate-200 text-left">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentUser.role === 'ADMIN' 
                      ? 'bg-gradient-to-tr from-blue-700 to-indigo-800 text-white' 
                      : 'bg-slate-700 text-white'
                  }`}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight flex items-center space-x-1">
                      <span>{currentUser.name.split(' ')[0]}</span>
                      {isAdmin && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded font-semibold">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[130px]">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  title="Se déconnecter"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-t border-slate-100 pt-1 -mb-px space-x-8">
          <button
            id="tab-btn-register"
            onClick={() => setCurrentTab('register')}
            className={`inline-flex items-center space-x-2 py-3 px-1 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              currentTab === 'register'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Registre & Opérations ({totalRecords})</span>
          </button>

          <button
            id="tab-btn-analytics"
            onClick={() => setCurrentTab('analytics')}
            className={`inline-flex items-center space-x-2 py-3 px-1 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              currentTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Tableau de Bord Analytique</span>
          </button>

          {/* Admin-only User Management tab */}
          {isAdmin && (
            <button
              id="tab-btn-users"
              onClick={() => setCurrentTab('users')}
              className={`inline-flex items-center space-x-2 py-3 px-1 text-sm font-semibold border-b-2 transition-colors cursor-pointer relative ${
                currentTab === 'users'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Gestion Utilisateurs</span>
              
              {/* Badge for pending users needing admin approval */}
              {pendingUsersCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
                  {pendingUsersCount} en attente
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

