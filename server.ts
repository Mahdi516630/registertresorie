import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  getPool, 
  initDatabase, 
  getDbStatus, 
  mapRowToRecord, 
  mapRowToUser 
} from './server/db.js';

// Load default seeds as fallback if Neon DB is not yet populated
import { INITIAL_REGISTRY_DATA } from './src/data/initialData.js';
import { INITIAL_USERS } from './src/data/initialUsers.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize DB if DATABASE_URL is present
  if (process.env.DATABASE_URL) {
    console.log('Connecting to PostgreSQL Neon database...');
    initDatabase().then((res) => {
      console.log(res.message);
    }).catch((err) => {
      console.error('Init DB error:', err);
    });
  } else {
    console.log('DATABASE_URL not set in environment. Running in transitional mode.');
  }

  // ----------------------------------------------------
  // API: Healthcheck & Status
  // ----------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/status', async (req, res) => {
    try {
      const status = await getDbStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
    const pool = getPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM records ORDER BY date DESC, created_at DESC');
        const records = result.rows.map(mapRowToRecord);
        return res.json({ source: 'neon', records });
      } catch (err: any) {
        console.error('Error fetching records from Neon:', err.message);
        // Fallback response with error info
        return res.status(500).json({ error: err.message });
      }
    }
    // If not connected to Neon
    return res.json({ source: 'local', records: INITIAL_REGISTRY_DATA, message: 'DATABASE_URL non configurée' });
  });

  app.post('/api/records', async (req, res) => {
    const record = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(400).json({ 
        error: 'DATABASE_URL non configurée. Impossible d\'écrire dans PostgreSQL Neon.' 
      });
    }

    try {
      const query = `
        INSERT INTO records (
          id, record_type, num_serial, name, montant, date, created_at, notes,
          cv, cg_type, num_cars, montant_cv, montant_dossier, num_quittance1, num_quittance2,
          pc_type, categories, num_quittance
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *;
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

      const result = await pool.query(query, values);
      return res.status(201).json(mapRowToRecord(result.rows[0]));
    } catch (err: any) {
      console.error('Error creating record in Neon:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/records/:id', async (req, res) => {
    const { id } = req.params;
    const record = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(400).json({ error: 'DATABASE_URL non configurée' });
    }

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

      const values = [
        id,
        record.recordType,
        record.numSerial,
        record.name,
        record.montant,
        record.date,
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

      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record introuvable' });
      }
      return res.json(mapRowToRecord(result.rows[0]));
    } catch (err: any) {
      console.error('Error updating record in Neon:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/records/:id', async (req, res) => {
    const { id } = req.params;
    const pool = getPool();

    if (!pool) {
      return res.status(400).json({ error: 'DATABASE_URL non configurée' });
    }

    try {
      const result = await pool.query('DELETE FROM records WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record introuvable' });
      }
      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Bulk Seed initial records into Neon DB
  app.post('/api/records/seed', async (req, res) => {
    const pool = getPool();
    if (!pool) {
      return res.status(400).json({ error: 'DATABASE_URL non configurée' });
    }

    try {
      const recordsToInsert = req.body?.records || INITIAL_REGISTRY_DATA;
      let insertedCount = 0;

      for (const record of recordsToInsert) {
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
            name = EXCLUDED.name;
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

        await pool.query(query, values);
        insertedCount++;
      }

      return res.json({ success: true, count: insertedCount, message: `${insertedCount} dossiers importés dans Neon PostgreSQL !` });
    } catch (err: any) {
      console.error('Seed error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // API: Users Management & RBAC
  // ----------------------------------------------------
  app.get('/api/users', async (req, res) => {
    const pool = getPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
        const users = result.rows.map(mapRowToUser);
        return res.json({ source: 'neon', users });
      } catch (err: any) {
        console.error('Error fetching users from Neon:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }
    return res.json({ source: 'local', users: INITIAL_USERS });
  });

  app.post('/api/users', async (req, res) => {
    const user = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(400).json({ error: 'DATABASE_URL non configurée' });
    }

    try {
      const query = `
        INSERT INTO users (
          id, name, email, password, role, status, department, phone, created_at, approved_at, approved_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `;
      const values = [
        user.id || `usr-${Date.now()}`,
        user.name,
        user.email.toLowerCase().trim(),
        user.password,
        user.role || 'AGENT',
        user.status || 'PENDING',
        user.department || null,
        user.phone || null,
        user.createdAt || new Date().toISOString(),
        user.approvedAt || (user.status === 'APPROVED' ? new Date().toISOString() : null),
        user.approvedBy || null,
      ];

      const result = await pool.query(query, values);
      return res.status(201).json(mapRowToUser(result.rows[0]));
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Un compte avec cette adresse email existe déjà.' });
      }
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { role, status, approvedBy, department, phone } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(400).json({ error: 'DATABASE_URL non configurée' });
    }

    try {
      const approvedAt = status === 'APPROVED' ? new Date().toISOString() : null;

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

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }

      return res.json(mapRowToUser(result.rows[0]));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const pool = getPool();

    if (!pool) {
      return res.status(400).json({ error: 'DATABASE_URL non configurée' });
    }

    try {
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // API: Authentication
  // ----------------------------------------------------
  app.post(['/api/auth/login', '/api/login'], async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPassword = (password || '').trim();

    const pool = getPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
        }

        const userRow = result.rows[0];
        if (userRow.password !== cleanPassword) {
          return res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
        }

        const user = mapRowToUser(userRow);

        if (user.status === 'PENDING') {
          return res.status(403).json({
            error: 'Votre compte est en attente d\'approbation par l\'administrateur (Mahdi). Vous ne pouvez pas encore vous connecter.',
            status: 'PENDING'
          });
        }

        if (user.status === 'REJECTED') {
          return res.status(403).json({
            error: 'L\'accès à ce compte a été suspendu ou refusé par l\'administration.',
            status: 'REJECTED'
          });
        }

        return res.json({ success: true, user });
      } catch (err: any) {
        console.error('Login query error in Neon:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    // If Neon not configured, test against in-memory/seed
    const localUser = INITIAL_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword
    );
    if (!localUser) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }
    return res.json({ success: true, user: localUser, note: 'Mode local' });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
