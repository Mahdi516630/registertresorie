import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  getPool, 
  initDatabase, 
  getDbStatus, 
  mapRowToRecord, 
  mapRowToUser, 
  closePool,
  isPostgresConnected,
  testAndSetDatabaseUrl,
  syncLocalToNeon,
  getActiveConnectionString
} from './server/db.js';
import {
  getLocalRecords,
  saveLocalRecords,
  getLocalUsers,
  saveLocalUsers
} from './server/localStore.js';
import { RegistryRecord, AppUser } from './src/types.js';

async function startServer() {
  const app = express();
  
  // Port configuration:
  // - In Render environments (RENDER=true), use process.env.PORT provided by Render (default 10000).
  // - In AI Studio container, strictly bind to port 3000 as required by the reverse proxy.
  const PORT = process.env.RENDER && process.env.PORT 
    ? parseInt(process.env.PORT, 10) 
    : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize DB if DATABASE_URL or active connection string is present
  const connStr = getActiveConnectionString();
  if (connStr) {
    console.log('Vérification de la connexion à la base de données PostgreSQL Neon...');
    try {
      const res = await initDatabase();
      console.log(res.message);
    } catch (err: any) {
      console.warn('Initialisation DB en arrière-plan:', err.message || err);
    }
  } else {
    console.log('DATABASE_URL non configurée dans l\'environnement. Mode local actif.');
  }

  // ----------------------------------------------------
  // API: Healthcheck & Status (Render Health Check Endpoint)
  // ----------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      platform: process.env.RENDER ? 'render' : 'container',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.get('/api/status', async (req, res) => {
    try {
      const status = await getDbStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dynamic Neon Database Configuration Endpoint
  app.post('/api/db/config', async (req, res) => {
    try {
      const { connectionString } = req.body;
      if (!connectionString) {
        return res.status(400).json({ success: false, message: 'Chaîne de connexion requise' });
      }
      const result = await testAndSetDatabaseUrl(connectionString);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Sync Local Records to Neon Endpoint
  app.post('/api/db/sync', async (req, res) => {
    try {
      const result = await syncLocalToNeon();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Manual Trigger to Initialize / Test DB
  app.post('/api/db/init', async (req, res) => {
    try {
      const result = await initDatabase();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Return the SQL script for Neon
  app.get('/api/db/schema-sql', (req, res) => {
    try {
      const sqlPath = path.join(process.cwd(), 'neon_database_schema.sql');
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        res.type('text/plain').send(sql);
      } else {
        res.status(404).send('Schema file not found');
      }
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // ----------------------------------------------------
  // API: Records (Cartes Grises & Permis)
  // ----------------------------------------------------
  app.get('/api/records', async (req, res) => {
    const { limit, offset, search, recordType, year, month } = req.query;

    // If PostgreSQL Neon is connected, try reading directly from it
    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const conditions: string[] = [];
          const params: any[] = [];
          let paramIdx = 1;

          if (recordType && recordType !== 'ALL') {
            conditions.push(`record_type = $${paramIdx++}`);
            params.push(recordType);
          }

          if (year && year !== 'ALL') {
            conditions.push(`EXTRACT(YEAR FROM date) = $${paramIdx++}`);
            params.push(parseInt(year as string, 10));
          }

          if (month && month !== 'ALL') {
            conditions.push(`EXTRACT(MONTH FROM date) = $${paramIdx++}`);
            params.push(parseInt(month as string, 10));
          }

          if (search && typeof search === 'string' && search.trim()) {
            const q = `%${search.trim().toLowerCase()}%`;
            conditions.push(`(
              LOWER(num_serial) LIKE $${paramIdx} OR 
              LOWER(name) LIKE $${paramIdx} OR 
              LOWER(COALESCE(num_cars, '')) LIKE $${paramIdx} OR 
              LOWER(COALESCE(num_quittance, '')) LIKE $${paramIdx} OR 
              LOWER(COALESCE(num_quittance1, '')) LIKE $${paramIdx} OR 
              LOWER(COALESCE(num_quittance2, '')) LIKE $${paramIdx}
            )`);
            params.push(q);
            paramIdx++;
          }

          const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM records ${whereClause}`, params);
          const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

          let query = `SELECT * FROM records ${whereClause} ORDER BY date DESC, created_at DESC`;
          if (limit && limit !== 'all') {
            const parsedLimit = parseInt(limit as string, 10);
            const parsedOffset = offset ? parseInt(offset as string, 10) : 0;
            query += ` LIMIT ${parsedLimit} OFFSET ${parsedOffset}`;
          }

          const result = await pool.query(query, params);
          const records = result.rows.map(mapRowToRecord);

          return res.json({ 
            source: 'neon', 
            records, 
            totalCount,
            count: records.length 
          });
        } catch (err: any) {
          console.warn('Neon query failed, using local storage:', err.message);
        }
      }
    }

    // Resilient Fallback to Local Persistent Store
    try {
      let records = getLocalRecords();

      if (recordType && recordType !== 'ALL') {
        records = records.filter(r => r.recordType === recordType);
      }

      if (year && year !== 'ALL') {
        const y = parseInt(year as string, 10);
        records = records.filter(r => r.date && new Date(r.date).getFullYear() === y);
      }

      if (month && month !== 'ALL') {
        const m = parseInt(month as string, 10);
        records = records.filter(r => r.date && new Date(r.date).getMonth() + 1 === m);
      }

      if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim().toLowerCase();
        records = records.filter(r => {
          const anyR = r as any;
          return (
            (r.numSerial && r.numSerial.toLowerCase().includes(s)) ||
            (r.name && r.name.toLowerCase().includes(s)) ||
            (anyR.numCars && anyR.numCars.toLowerCase().includes(s)) ||
            (anyR.numQuittance && anyR.numQuittance.toLowerCase().includes(s)) ||
            (anyR.numQuittance1 && anyR.numQuittance1.toLowerCase().includes(s)) ||
            (anyR.numQuittance2 && anyR.numQuittance2.toLowerCase().includes(s))
          );
        });
      }

      // Sort by date desc
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalCount = records.length;
      let pagedRecords = records;
      if (limit && limit !== 'all') {
        const parsedLimit = parseInt(limit as string, 10);
        const parsedOffset = offset ? parseInt(offset as string, 10) : 0;
        pagedRecords = records.slice(parsedOffset, parsedOffset + parsedLimit);
      }

      return res.json({
        source: 'local_fallback',
        records: pagedRecords,
        totalCount,
        count: pagedRecords.length
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message, records: [] });
    }
  });

  // Fast aggregation endpoint
  app.get('/api/records/stats', async (req, res) => {
    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const statsRes = await pool.query(`
            SELECT 
              COUNT(*) as total_records,
              COALESCE(SUM(montant), 0) as total_revenue,
              COUNT(*) FILTER (WHERE record_type = 'CG') as cg_count,
              COUNT(*) FILTER (WHERE record_type = 'PC') as pc_count
            FROM records;
          `);
          const row = statsRes.rows[0];
          return res.json({
            totalRecords: parseInt(row.total_records || '0', 10),
            totalRevenue: parseFloat(row.total_revenue || '0'),
            cgCount: parseInt(row.cg_count || '0', 10),
            pcCount: parseInt(row.pc_count || '0', 10),
          });
        } catch (err: any) {
          console.warn('Neon stats failed, calculating from local store:', err.message);
        }
      }
    }

    const records = getLocalRecords();
    const totalRecords = records.length;
    const totalRevenue = records.reduce((sum, r) => sum + (Number(r.montant) || 0), 0);
    const cgCount = records.filter(r => r.recordType === 'CG').length;
    const pcCount = records.filter(r => r.recordType === 'PC').length;

    return res.json({ totalRecords, totalRevenue, cgCount, pcCount });
  });

  // Create record
  app.post('/api/records', async (req, res) => {
    const record: RegistryRecord = {
      ...req.body,
      id: req.body.id || `rec-${(req.body.recordType || 'cg').toLowerCase()}-${Date.now()}`,
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    // Always update local store
    const localRecords = getLocalRecords();
    const existingIndex = localRecords.findIndex(r => r.id === record.id);
    if (existingIndex >= 0) {
      localRecords[existingIndex] = record;
    } else {
      localRecords.unshift(record);
    }
    saveLocalRecords(localRecords);

    // If Postgres is connected, save to Neon
    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const query = `
            INSERT INTO records (
              id, record_type, num_serial, name, montant, date, created_at, notes,
              cv, cg_type, num_cars, montant_cv, montant_dossier, num_quittance1, num_quittance2,
              pc_type, categories, num_quittance
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (id) DO UPDATE SET
              montant = EXCLUDED.montant,
              date = EXCLUDED.date,
              name = EXCLUDED.name,
              notes = EXCLUDED.notes
            RETURNING *;
          `;

          const anyRec = record as any;
          const values = [
            record.id,
            record.recordType,
            record.numSerial,
            record.name,
            record.montant,
            record.date,
            record.createdAt,
            record.notes || null,
            anyRec.cv || null,
            record.type && record.recordType === 'CG' ? record.type : null,
            anyRec.numCars || null,
            anyRec.montantCV || 0,
            anyRec.montantDossier || 0,
            anyRec.numQuittance1 || null,
            anyRec.numQuittance2 || null,
            record.type && record.recordType === 'PC' ? record.type : null,
            anyRec.categories || [],
            anyRec.numQuittance || null,
          ];

          const result = await pool.query(query, values);
          return res.status(201).json(mapRowToRecord(result.rows[0]));
        } catch (err: any) {
          console.warn('Neon insert warning, persisted locally:', err.message);
        }
      }
    }

    return res.status(201).json(record);
  });

  // Update record
  app.put('/api/records/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const localRecords = getLocalRecords();
    const idx = localRecords.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Dossier introuvable' });
    }

    const updatedRecord: RegistryRecord = { ...localRecords[idx], ...updates, id };
    localRecords[idx] = updatedRecord;
    saveLocalRecords(localRecords);

    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const query = `
            UPDATE records SET
              record_type = $2,
              num_serial = $3,
              name = $4,
              montant = $5,
              date = $6,
              notes = $7,
              cv = $8,
              cg_type = $9,
              num_cars = $10,
              montant_cv = $11,
              montant_dossier = $12,
              num_quittance1 = $13,
              num_quittance2 = $14,
              pc_type = $15,
              categories = $16,
              num_quittance = $17
            WHERE id = $1
            RETURNING *;
          `;

          const anyUpdated = updatedRecord as any;
          const values = [
            id,
            updatedRecord.recordType,
            updatedRecord.numSerial,
            updatedRecord.name,
            updatedRecord.montant,
            updatedRecord.date,
            updatedRecord.notes || null,
            anyUpdated.cv || null,
            updatedRecord.type && updatedRecord.recordType === 'CG' ? updatedRecord.type : null,
            anyUpdated.numCars || null,
            anyUpdated.montantCV || 0,
            anyUpdated.montantDossier || 0,
            anyUpdated.numQuittance1 || null,
            anyUpdated.numQuittance2 || null,
            updatedRecord.type && updatedRecord.recordType === 'PC' ? updatedRecord.type : null,
            anyUpdated.categories || [],
            anyUpdated.numQuittance || null,
          ];

          const result = await pool.query(query, values);
          if (result.rows.length > 0) {
            return res.json(mapRowToRecord(result.rows[0]));
          }
        } catch (err: any) {
          console.warn('Neon update warning, updated locally:', err.message);
        }
      }
    }

    return res.json(updatedRecord);
  });

  // Delete record
  app.delete('/api/records/:id', async (req, res) => {
    const { id } = req.params;

    const localRecords = getLocalRecords();
    const filtered = localRecords.filter(r => r.id !== id);
    saveLocalRecords(filtered);

    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          await pool.query('DELETE FROM records WHERE id = $1', [id]);
        } catch (err: any) {
          console.warn('Neon delete warning, deleted locally:', err.message);
        }
      }
    }

    return res.json({ success: true, deletedId: id });
  });

  // High-performance batch insertion
  app.post('/api/records/batch', async (req, res) => {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Tableau de dossiers records requis' });
    }

    // Save to local store
    const localRecords = getLocalRecords();
    const recordsMap = new Map<string, RegistryRecord>(localRecords.map(r => [r.id, r]));
    for (const r of records) {
      recordsMap.set(r.id, r);
    }
    saveLocalRecords(Array.from(recordsMap.values()));

    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            let insertedCount = 0;

            for (const record of records) {
              const query = `
                INSERT INTO records (
                  id, record_type, num_serial, name, montant, date, created_at, notes,
                  cv, cg_type, num_cars, montant_cv, montant_dossier, num_quittance1, num_quittance2,
                  pc_type, categories, num_quittance
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                ON CONFLICT (id) DO UPDATE SET
                  montant = EXCLUDED.montant,
                  date = EXCLUDED.date,
                  name = EXCLUDED.name,
                  notes = EXCLUDED.notes;
              `;

              const values = [
                record.id,
                record.recordType,
                record.numSerial,
                record.name,
                record.montant,
                record.date,
                record.createdAt || new Date().toISOString(),
                record.notes || null,
                record.cv || null,
                record.type && record.recordType === 'CG' ? record.type : null,
                record.numCars || null,
                record.montantCV || 0,
                record.montantDossier || 0,
                record.numQuittance1 || null,
                record.numQuittance2 || null,
                record.type && record.recordType === 'PC' ? record.type : null,
                record.categories || [],
                record.numQuittance || null,
              ];

              await client.query(query, values);
              insertedCount++;
            }

            await client.query('COMMIT');
            return res.json({ 
              success: true, 
              count: insertedCount, 
              message: `${insertedCount} dossiers enregistrés avec succès dans PostgreSQL Neon !` 
            });
          } catch (err: any) {
            await client.query('ROLLBACK');
            console.warn('Neon batch failed, persisted locally:', err.message);
          } finally {
            client.release();
          }
        } catch (e: any) {
          console.warn('Neon batch connection failed:', e.message);
        }
      }
    }

    return res.json({ 
      success: true, 
      count: records.length, 
      message: `${records.length} dossiers enregistrés avec succès dans le registre local !` 
    });
  });

  // ----------------------------------------------------
  // API: Users Management & RBAC
  // ----------------------------------------------------
  app.get('/api/users', async (req, res) => {
    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const result = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
          const users = result.rows.map(mapRowToUser);
          return res.json({ source: 'neon', users });
        } catch (err: any) {
          console.warn('Neon get users failed, using local store:', err.message);
        }
      }
    }

    const localUsers = getLocalUsers();
    return res.json({ source: 'local_fallback', users: localUsers });
  });

  app.post('/api/users', async (req, res) => {
    const userBody = req.body;
    const cleanEmail = (userBody.email || '').toLowerCase().trim();

    const localUsers = getLocalUsers();
    if (localUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: 'Un compte avec cette adresse email existe déjà.' });
    }

    const newUser: AppUser = {
      id: userBody.id || `usr-${Date.now()}`,
      name: userBody.name,
      email: cleanEmail,
      password: userBody.password,
      role: userBody.role || 'AGENT',
      status: userBody.status || 'PENDING',
      department: userBody.department || undefined,
      phone: userBody.phone || undefined,
      createdAt: userBody.createdAt || new Date().toISOString(),
      approvedAt: userBody.status === 'APPROVED' ? new Date().toISOString() : undefined,
      approvedBy: userBody.approvedBy || undefined,
    };

    localUsers.push(newUser);
    saveLocalUsers(localUsers);

    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const query = `
            INSERT INTO users (
              id, name, email, password, role, status, department, phone, created_at, approved_at, approved_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
          `;
          const values = [
            newUser.id,
            newUser.name,
            newUser.email,
            newUser.password,
            newUser.role,
            newUser.status,
            newUser.department || null,
            newUser.phone || null,
            newUser.createdAt,
            newUser.approvedAt || null,
            newUser.approvedBy || null,
          ];

          const result = await pool.query(query, values);
          return res.status(201).json(mapRowToUser(result.rows[0]));
        } catch (err: any) {
          console.warn('Neon user insert warning, persisted locally:', err.message);
        }
      }
    }

    return res.status(201).json(newUser);
  });

  app.patch('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { role, status, approvedBy, department, phone } = req.body;

    const localUsers = getLocalUsers();
    const idx = localUsers.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const updatedUser: AppUser = {
      ...localUsers[idx],
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(approvedBy ? { approvedBy } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(status === 'APPROVED' ? { approvedAt: new Date().toISOString() } : {}),
    };
    localUsers[idx] = updatedUser;
    saveLocalUsers(localUsers);

    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const query = `
            UPDATE users SET
              role = COALESCE($2, role),
              status = COALESCE($3, status),
              approved_at = CASE WHEN $3 = 'APPROVED' THEN NOW() ELSE approved_at END,
              approved_by = COALESCE($4, approved_by),
              department = COALESCE($5, department),
              phone = COALESCE($6, phone)
            WHERE id = $1
            RETURNING *;
          `;

          const result = await pool.query(query, [
            id,
            role || null,
            status || null,
            approvedBy || null,
            department || null,
            phone || null,
          ]);

          if (result.rows.length > 0) {
            return res.json(mapRowToUser(result.rows[0]));
          }
        } catch (err: any) {
          console.warn('Neon user patch warning, updated locally:', err.message);
        }
      }
    }

    return res.json(updatedUser);
  });

  app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    const localUsers = getLocalUsers();
    const filtered = localUsers.filter(u => u.id !== id);
    saveLocalUsers(filtered);

    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          await pool.query('DELETE FROM users WHERE id = $1', [id]);
        } catch (err: any) {
          console.warn('Neon user delete warning, deleted locally:', err.message);
        }
      }
    }

    return res.json({ success: true, deletedId: id });
  });

  // ----------------------------------------------------
  // API: Authentication
  // ----------------------------------------------------
  app.post(['/api/auth/login', '/api/login'], async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPassword = (password || '').trim();

    let targetUser: AppUser | null = null;

    if (isPostgresConnected()) {
      const pool = getPool();
      if (pool) {
        try {
          const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
          if (result.rows.length > 0) {
            targetUser = mapRowToUser(result.rows[0]);
          }
        } catch (err: any) {
          console.warn('Neon auth query failed, checking local users:', err.message);
        }
      }
    }

    if (!targetUser) {
      const localUsers = getLocalUsers();
      targetUser = localUsers.find(u => u.email.toLowerCase() === cleanEmail) || null;
    }

    if (!targetUser) {
      return res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
    }

    if (targetUser.password !== cleanPassword) {
      return res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
    }

    if (targetUser.status === 'PENDING') {
      return res.status(403).json({
        error: 'Votre compte est en attente d\'approbation par l\'administrateur (Mahdi). Vous ne pouvez pas encore vous connecter.',
        status: 'PENDING'
      });
    }

    if (targetUser.status === 'REJECTED') {
      return res.status(403).json({
        error: 'L\'accès à ce compte a été suspendu ou refusé par l\'administration.',
        status: 'REJECTED'
      });
    }

    return res.json({ success: true, user: targetUser });
  });

  // ----------------------------------------------------
  // Vite Middleware (Development) / Static Files (Production)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT} (Node ${process.version}, ${process.env.NODE_ENV || 'development'})`);
  });

  // Graceful shutdown handling for Render zero-downtime deploys and SIGTERM/SIGINT
  const handleShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      await closePool();
      process.exit(0);
    });

    // Force close after 10s if hanging
    setTimeout(() => {
      console.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();

