import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Terminal, 
  HardDrive,
  UploadCloud,
  ShieldCheck,
  Rocket,
  Server,
  Code2
} from 'lucide-react';
import { api, DbStatusResponse } from '../services/api';
import { RegistryRecord } from '../types';

interface NeonDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  currentRecords: RegistryRecord[];
  onShowToast: (msg: string) => void;
}

const NEON_SQL_SCRIPT = `-- ====================================================================
-- REGISTRE DES CARTES GRISES (CG) & PERMIS DE CONDUIRE (PC)
-- SCRIPT DE CRÉATION DE BASE DE DONNÉES POUR POSTGRESQL / NEON TECH
-- ====================================================================

-- 1. Table des Utilisateurs & Contrôle d'Accès (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'AGENT',          -- 'ADMIN', 'OPERATOR', 'AGENT'
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',      -- 'PENDING', 'APPROVED', 'REJECTED'
    department VARCHAR(255),
    phone VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Table des Titres Sécurisés (Cartes Grises & Permis)
CREATE TABLE IF NOT EXISTS records (
    id VARCHAR(128) PRIMARY KEY,
    record_type VARCHAR(10) NOT NULL,                   -- 'CG' ou 'PC'
    num_serial VARCHAR(128) NOT NULL,                  -- N° de récépissé
    name VARCHAR(255) NOT NULL,                        -- Nom du titulaire
    montant NUMERIC(12, 2) NOT NULL DEFAULT 0.00,      -- Montant total en FDJ
    date DATE NOT NULL,                                -- Date d'enregistrement (YYYY-MM-DD)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- Date de création
    notes TEXT,

    -- Spécifique Cartes Grises (CG)
    cv INTEGER,                                        -- Puissance fiscale en CV
    cg_type VARCHAR(32),                               -- 'NORMAL', 'DUPLICATA', 'EXO'
    num_cars VARCHAR(128),                             -- Plaque ou châssis
    montant_cv NUMERIC(12, 2) DEFAULT 0.00,            -- Taxe CV
    montant_dossier NUMERIC(12, 2) DEFAULT 0.00,       -- Frais de dossier
    num_quittance1 VARCHAR(128),                       -- 1ère quittance (CV)
    num_quittance2 VARCHAR(128),                       -- 2ème quittance (Dossier)

    -- Spécifique Permis de Conduire (PC)
    pc_type VARCHAR(32),                               -- 'NORMAL' ou 'DUPLICATA'
    categories TEXT[] DEFAULT '{}',                    -- Catégories ex: ARRAY['A', 'B']
    num_quittance VARCHAR(128)                         -- N° Quittance
);

CREATE INDEX IF NOT EXISTS idx_records_type ON records(record_type);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_serial ON records(num_serial);
CREATE INDEX IF NOT EXISTS idx_records_name ON records(name);
CREATE INDEX IF NOT EXISTS idx_records_num_cars ON records(num_cars);

-- 3. Insertion du Super-Administrateur (Mahdi Yacoub Ali)
INSERT INTO users (
    id, name, email, password, role, status, department, phone, created_at, approved_at, approved_by
)
VALUES (
    'usr-admin-mahdi',
    'Mahdi Yacoub Ali',
    'mahdiyacoubali318@gmail.com',
    'MAHDI8006',
    'ADMIN',
    'APPROVED',
    'Trésorie De La Préfecture De Djibouti • Djibouti',
    '+253 77 00 00 00',
    NOW(),
    NOW(),
    'SYSTEM_INITIALIZER'
)
ON CONFLICT (email) DO UPDATE SET
    role = 'ADMIN',
    status = 'APPROVED';

SELECT 'PostgreSQL Neon initialisé avec succès !' AS resultat;`;

export const NeonDatabaseModal: React.FC<NeonDatabaseModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  currentRecords,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'neon' | 'render'>('render');
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    onShowToast(`${label} copié !`);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const checkStatus = async () => {
    setLoading(true);
    try {
      const status = await api.getStatus();
      setDbStatus(status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(NEON_SQL_SCRIPT);
    setCopied(true);
    onShowToast('Script SQL copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestAndInit = async () => {
    setLoading(true);
    try {
      const res = await api.initDb();
      if (res.success) {
        onShowToast('Connexion Neon vérifiée et tables prêtes !');
      } else {
        onShowToast(res.message);
      }
      await checkStatus();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      onShowToast(`Erreur: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedRecords = async () => {
    setSeeding(true);
    try {
      const res = await api.seedRecords(currentRecords);
      onShowToast(res.message || 'Données synchronisées dans PostgreSQL Neon !');
      await checkStatus();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      onShowToast(`Erreur d'envoi: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = dbStatus?.connected === true;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="neon-db-modal"
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold">Connexion PostgreSQL Neon</h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isConnected 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {isConnected ? '🟢 Connecté (Production)' : '🟡 Non connecté'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Requête SQL DDL officielle à copier-coller dans votre console Neon.tech
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/80 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('render')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'render'
                ? 'bg-white text-blue-700 border-slate-200 -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50'
            }`}
          >
            <Rocket className="w-4 h-4 text-blue-600" />
            <span>Déploiement Render (Render.com)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-semibold">Prêt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('neon')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'neon'
                ? 'bg-white text-slate-900 border-slate-200 -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50'
            }`}
          >
            <Database className="w-4 h-4 text-slate-600" />
            <span>Base PostgreSQL Neon & SQL</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 flex-1">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {isConnected 
                    ? 'Connexion PostgreSQL active & opérationnelle' 
                    : 'En attente de la variable DATABASE_URL'}
                </div>
                <div className="text-xs opacity-90 mt-0.5">
                  {isConnected ? (
                    <span>
                      Dossiers en base réelle : <strong>{dbStatus?.recordCount}</strong> • Utilisateurs : <strong>{dbStatus?.userCount}</strong>
                    </span>
                  ) : (
                    <span>
                      {activeTab === 'render' 
                        ? 'Ajoutez DATABASE_URL dans les Environment Variables de votre service Render.'
                        : 'Copiez le script SQL ci-dessous dans votre SQL Editor Neon, puis ajoutez votre DATABASE_URL.'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={checkStatus}
                disabled={loading}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Tester Statut</span>
              </button>

              {isConnected && (
                <button
                  onClick={handleSeedRecords}
                  disabled={seeding}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${seeding ? 'animate-bounce' : ''}`} />
                  <span>Transférer Dossiers ({currentRecords.length})</span>
                </button>
              )}
            </div>
          </div>

          {activeTab === 'render' ? (
            /* TAB: RENDER DEPLOYMENT */
            <div className="space-y-6">
              {/* Ready banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-900">Application 100% prête pour déploiement sur Render</h3>
                    <p className="text-xs text-blue-800/90 mt-1 leading-relaxed">
                      Le fichier Blueprint <code>render.yaml</code> est présent à la racine de votre projet.
                      Vous pouvez déployer directement en connectant votre dépôt GitHub sur Render, ou créer un Web Service Node manuellement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Render Web Service Parameters Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Paramètres du Web Service Render</span>
                  </div>
                  <a
                    href="https://dashboard.render.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    <span>dashboard.render.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 block">Service Type</span>
                      <span className="text-slate-500">Web Service (Node.js)</span>
                    </div>
                    <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded font-mono">Web Service</code>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 block">Commande de Build (Build Command)</span>
                      <span className="text-slate-500">Compile le frontend Vite et le serveur esbuild</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-slate-100 text-blue-800 px-2.5 py-1 rounded font-mono font-medium">npm install --include=dev &amp;&amp; npm run build</code>
                      <button
                        onClick={() => handleCopyText('npm install --include=dev && npm run build', 'Build Command')}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        {copiedCmd === 'Build Command' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 block">Commande de Démarrage (Start Command)</span>
                      <span className="text-slate-500">Lance le serveur de production optimisé</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-slate-100 text-blue-800 px-2.5 py-1 rounded font-mono font-medium">npm start</code>
                      <button
                        onClick={() => handleCopyText('npm start', 'Start Command')}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        {copiedCmd === 'Start Command' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 block">Health Check Path</span>
                      <span className="text-slate-500">Vérification de disponibilité sans temps d'arrêt</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded font-mono font-medium">/api/health</code>
                      <button
                        onClick={() => handleCopyText('/api/health', 'Health Check Path')}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        {copiedCmd === 'Health Check Path' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 block">Région Recommandée</span>
                      <span className="text-slate-500">Faible latence pour Djibouti, Afrique de l'Est et Europe</span>
                    </div>
                    <span className="font-semibold text-slate-800">Frankfurt (EU Central)</span>
                  </div>
                </div>
              </div>

              {/* Environment Variables on Render */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  <span>Variables d'Environnement à Configurer sur Render</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 font-mono text-xs">NODE_ENV</span>
                      <button
                        onClick={() => handleCopyText('production', 'NODE_ENV')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {copiedCmd === 'NODE_ENV' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <code className="text-xs text-blue-600 font-mono">production</code>
                    <p className="text-[11px] text-slate-500 mt-1">Active la compression et le cache statique.</p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 font-mono text-xs">DATABASE_URL</span>
                      <button
                        onClick={() => handleCopyText('postgresql://user:password@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require', 'DATABASE_URL')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {copiedCmd === 'DATABASE_URL' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <code className="text-xs text-slate-600 font-mono truncate block">postgresql://...neon.tech/neondb?sslmode=require</code>
                    <p className="text-[11px] text-slate-500 mt-1">Chaîne de connexion PostgreSQL de Neon Tech.</p>
                  </div>
                </div>
              </div>

              {/* Automatic Super-Admin Credentials reminder */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <div className="font-bold mb-1 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Compte Super-Administrateur Initial (Créé automatiquement au 1er boot) :</span>
                </div>
                <div className="mt-1 space-y-0.5 text-amber-800">
                  <div>Email : <strong>mahdiyacoubali318@gmail.com</strong></div>
                  <div>Mot de passe : <strong>MAHDI8006</strong></div>
                  <div className="text-[11px] text-amber-700 mt-1">
                    Ce compte bénéficie de tous les privilèges ADMIN pour valider les nouveaux agents et gérer le registre.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB: NEON SQL & DDL */
            <div className="space-y-6">
              {/* Step-by-Step Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Ouvrir Neon Console</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    Connectez-vous sur Neon.tech, sélectionnez ou créez votre projet.
                  </p>
                  <a
                    href="https://console.neon.tech"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    <span>console.neon.tech</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Exécuter le Script SQL</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    Allez dans l'onglet <strong>SQL Editor</strong>, collez le script ci-dessous et cliquez sur <strong>Run</strong>.
                  </p>
                  <button
                    onClick={handleCopySql}
                    className="inline-flex items-center space-x-1 text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copier le script SQL</span>
                  </button>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Renseigner DATABASE_URL</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Copiez votre chaîne de connexion (Connection string) PostgreSQL et placez-la dans les variables d'environnement.
                  </p>
                </div>
              </div>

              {/* SQL Editor Block with 1-click copy */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Terminal className="w-4 h-4 text-blue-600" />
                    <span>Script SQL de Création des Tables (DDL Postgres)</span>
                  </div>

                  <button
                    id="btn-copy-neon-sql"
                    onClick={handleCopySql}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copié avec succès !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le Script SQL</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-md">
                  <pre className="bg-slate-950 text-slate-200 p-4 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed selection:bg-blue-700 selection:text-white">
                    <code>{NEON_SQL_SCRIPT}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PostgreSQL 15+ / Neon Serverless • SSL rejectUnauthorized: false</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Fermer
            </button>
            {activeTab === 'neon' ? (
              <button
                onClick={handleCopySql}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le Script SQL</span>
              </button>
            ) : (
              <button
                onClick={() => handleCopyText('npm install --include=dev && npm run build', 'Commande de Build')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                {copiedCmd === 'Commande de Build' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copier Commande Build</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
