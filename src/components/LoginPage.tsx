import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldAlert,
  UserPlus,
  Database
} from 'lucide-react';
import { AppUser } from '../types';
import { ADMIN_EMAIL, ADMIN_DEFAULT_PASS } from '../data/initialUsers';
import { api } from '../services/api';

interface LoginPageProps {
  onLogin: (user: AppUser) => void;
  onRegister: (newUser: AppUser) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  users: AppUser[];
  onOpenDbModal?: () => void;
  isDbConnected?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onRegister,
  users,
  onOpenDbModal,
  isDbConnected = false,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState(ADMIN_EMAIL);
  const [loginPassword, setLoginPassword] = useState(ADMIN_DEFAULT_PASS);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('Guichet Cartes Grises & Permis');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Handle Login Submit
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginNotice(null);
    setIsLoggingIn(true);

    const emailClean = loginEmail.trim().toLowerCase();

    try {
      // Direct PostgreSQL Neon Authentication
      const result = await api.login(emailClean, loginPassword);
      if (result.success && result.user) {
        onLogin(result.user);
        return;
      }
    } catch (err: any) {
      // Fallback check on users array if already loaded from DB
      const foundUser = users.find((u) => u.email.toLowerCase() === emailClean);
      if (foundUser && foundUser.password === loginPassword) {
        if (foundUser.status === 'PENDING') {
          setLoginError(
            "Connexion refusée : Votre compte est en attente d'approbation par l'administrateur (Mahdi). Vous ne pouvez pas vous connecter tant que votre accès n'a pas été validé."
          );
          setIsLoggingIn(false);
          return;
        }
        if (foundUser.status === 'REJECTED') {
          setLoginError(
            "Accès bloqué : Votre compte a été suspendu ou révoqué par l'administrateur."
          );
          setIsLoggingIn(false);
          return;
        }
        onLogin(foundUser);
        setIsLoggingIn(false);
        return;
      }

      setLoginError(err.message || "Identifiants invalides ou connexion à la base échouée.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setRegError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (regPassword.length < 6) {
      setRegError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    const emailClean = regEmail.trim().toLowerCase();
    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      name: regName.trim(),
      email: emailClean,
      password: regPassword,
      role: 'AGENT',
      status: 'PENDING', // CRITICAL: strictly pending until admin authorizes
      createdAt: new Date().toISOString(),
      department: regDepartment.trim(),
      phone: regPhone.trim() || undefined,
    };

    const res = onRegister(newUser);
    if (!res.success) {
      setRegError(res.message);
      return;
    }

    // Show explicit pending message
    setRegSuccess(
      "Demande d'inscription enregistrée ! Votre compte est actuellement en ATTENTE D'AUTORISATION par l'administrateur (Mahdi). Vous ne pourrez vous connecter qu'après validation."
    );

    // Reset fields
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegConfirmPassword('');

    // Pre-fill login email and inform user
    setLoginEmail(emailClean);
    setLoginPassword('');
    setLoginNotice(
      "Compte enregistré. En attente d'approbation par l'administrateur pour autoriser votre connexion."
    );

    // Wait a brief moment before switching back to login tab
    setTimeout(() => {
      setActiveTab('login');
    }, 2800);
  };

  // Quick fill Admin
  const handleFillAdmin = () => {
    setLoginEmail(ADMIN_EMAIL);
    setLoginPassword(ADMIN_DEFAULT_PASS);
    setLoginError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Decorative background gradients */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-600 blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Official Header branding */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 border border-blue-400/30">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Trésorie De La Préfecture De Djibouti • Djibouti
        </h2>
        <p className="mt-1 text-center text-xs font-semibold uppercase tracking-widest text-blue-300">
          République de Djibouti • Registre CG & PC
        </p>

        {/* Tab switcher: Se connecter / Créer un compte */}
        <div className="mt-6 flex bg-slate-800/90 p-1 rounded-xl border border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Connexion</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setRegError(null);
              setRegSuccess(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nouvelle Inscription</span>
          </button>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Database Status Button */}
        {onOpenDbModal && (
          <div className="mb-3 text-center">
            <button
              type="button"
              onClick={onOpenDbModal}
              className={`w-full inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
                isDbConnected
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
                  : 'bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Database className={`w-3.5 h-3.5 ${isDbConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>
                  {isDbConnected 
                    ? 'Postgres Neon : Connecté (Données réelles)' 
                    : 'Postgres Neon : Connexion Obligatoire (Cliquer pour configurer)'}
                </span>
              </div>
              <span className="text-[11px] underline text-slate-300 hover:text-white">
                {isDbConnected ? 'Gérer' : 'Script SQL'}
              </span>
            </button>
          </div>
        )}

        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          
          {/* ================= LOGIN FORM ================= */}
          {activeTab === 'login' && (
            <div>
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">Espace d'Authentification</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accès réservé aux agents agréés et administrateurs du registre.
                </p>
              </div>

              {/* Login Error Alert */}
              {loginError && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs animate-shake">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{loginError}</div>
                </div>
              )}

              {/* Login Notice Alert */}
              {loginNotice && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2 text-amber-800 text-xs">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{loginNotice}</div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Adresse E-mail *
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nom@transports.dj"
                      className="block w-full pl-10 pr-3 py-2.5 sm:text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mot de passe *
                    </label>
                  </div>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-10 py-2.5 sm:text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <span>Se connecter au Registre</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Admin Quick Preset Banner */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Compte Administrateur Principal</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleFillAdmin}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    >
                      Remplir
                    </button>
                  </div>
                  <div className="text-xs text-slate-600 font-mono space-y-0.5">
                    <div>Email : <strong className="text-slate-900">{ADMIN_EMAIL}</strong></div>
                    <div>Pass : <strong className="text-slate-900">{ADMIN_DEFAULT_PASS}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= REGISTER FORM ================= */}
          {activeTab === 'register' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">Demande d'Inscription</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Remplissez le formulaire. Votre compte sera soumis à l'approbation préalable de Mahdi (Administrateur).
                </p>
              </div>

              {/* Policy Notice Box */}
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-center space-x-1.5 font-bold mb-1 text-amber-950">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Règle de Sécurité de la Trésorie :</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Tout nouvel inscrit a un statut <strong>"En attente"</strong>. Vous ne pourrez pas vous connecter tant que l'administrateur n'aura pas formellement validé votre demande dans la page <em>Gestion Utilisateurs</em>.
                </p>
              </div>

              {/* Reg Error */}
              {regError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{regError}</div>
                </div>
              )}

              {/* Reg Success */}
              {regSuccess && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start space-x-2 text-emerald-900 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{regSuccess}</div>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nom & Prénom *
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ex: Mohamed Ali Hassan"
                      className="block w-full pl-10 pr-3 py-2 sm:text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Adresse E-mail *
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="mohamed.ali@transports.dj"
                      className="block w-full pl-10 pr-3 py-2 sm:text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Département / Service
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      placeholder="Ex: Guichet Cartes Grises"
                      className="block w-full pl-10 pr-3 py-2 sm:text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Téléphone (Optionnel)
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+253 77..."
                      className="block w-full pl-10 pr-3 py-2 sm:text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                    />
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mot de passe *
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••"
                        className="block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirmer *
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••"
                        className="block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRegPassword}
                      onChange={(e) => setShowRegPassword(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Afficher le mot de passe</span>
                  </label>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Soumettre ma Demande d'Accès</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
