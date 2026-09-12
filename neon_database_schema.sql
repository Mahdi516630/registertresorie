-- ====================================================================
-- REGISTRE DES CARTES GRISES (CG) & PERMIS DE CONDUIRE (PC)
-- SCRIPT DE CRÉATION DE BASE DE DONNÉES POUR POSTGRESQL / NEON TECH
-- ====================================================================
-- Instructions :
-- 1. Rendez-vous sur votre tableau de bord Neon (https://console.neon.tech)
-- 2. Ouvrez l'onglet "SQL Editor" dans votre projet Neon
-- 3. Copiez et collez l'intégralité de ce script puis cliquez sur "Run"
-- 4. Copiez votre chaîne de connexion (DATABASE_URL) et configurez-la dans vos secrets
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

-- Index pour accélérer les recherches d'utilisateurs et de statuts
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Table des Titres Sécurisés (Cartes Grises & Permis)
CREATE TABLE IF NOT EXISTS records (
    id VARCHAR(128) PRIMARY KEY,
    record_type VARCHAR(10) NOT NULL,                   -- 'CG' (Carte Grise) ou 'PC' (Permis de Conduire)
    num_serial VARCHAR(128) NOT NULL,                  -- Numéro de série / récépissé
    name VARCHAR(255) NOT NULL,                        -- Nom du titulaire / usager
    montant NUMERIC(12, 2) NOT NULL DEFAULT 0.00,      -- Montant total perçu (en FDJ ou devise)
    date DATE NOT NULL,                                -- Date de l'acte / quittance (YYYY-MM-DD)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- Horodatage de création
    notes TEXT,                                        -- Remarques et observations

    -- Colonnes spécifiques aux Cartes Grises (CG)
    cv INTEGER,                                        -- Puissance fiscale en chevaux (CV)
    cg_type VARCHAR(32),                               -- 'NORMAL', 'DUPLICATA', 'EXO'
    num_cars VARCHAR(128),                             -- Numéro d'immatriculation / plaque ou châssis
    montant_cv NUMERIC(12, 2) DEFAULT 0.00,            -- Taxe CV (4 500 FDJ/CV ou 2 250 FDJ/CV)
    montant_dossier NUMERIC(12, 2) DEFAULT 0.00,       -- Frais de dossier administratifs
    num_quittance1 VARCHAR(128),                       -- N° 1ère quittance (Taxe CV)
    num_quittance2 VARCHAR(128),                       -- N° 2ème quittance (Frais dossier)

    -- Colonnes spécifiques aux Permis de Conduire (PC)
    pc_type VARCHAR(32),                               -- 'NORMAL' ou 'DUPLICATA'
    categories TEXT[] DEFAULT '{}',                    -- Catégories de permis (ex: ARRAY['A', 'B'])
    num_quittance VARCHAR(128)                         -- N° Quittance Trésor
);

-- Index pour optimiser les requêtes analytiques et de recherche
CREATE INDEX IF NOT EXISTS idx_records_type ON records(record_type);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_serial ON records(num_serial);
CREATE INDEX IF NOT EXISTS idx_records_name ON records(name);
CREATE INDEX IF NOT EXISTS idx_records_num_cars ON records(num_cars);
CREATE INDEX IF NOT EXISTS idx_records_cg_type ON records(cg_type);
CREATE INDEX IF NOT EXISTS idx_records_pc_type ON records(pc_type);

-- 3. Insertion du Super-Administrateur Principal (Mahdi Yacoub Ali)
-- Si l'e-mail existe déjà, garantit son statut ADMIN et APPROVED
INSERT INTO users (
    id, 
    name, 
    email, 
    password, 
    role, 
    status, 
    department, 
    phone, 
    created_at, 
    approved_at, 
    approved_by
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

-- Confirmation du succès de l'exécution
SELECT 'Configuration PostgreSQL Neon réussie ! Tables users et records prêtes.' AS status_message;
