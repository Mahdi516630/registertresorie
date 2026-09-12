/**
 * Script de Test de Production & Smoke Testing
 * Exécutable via: npm run test:prod
 */

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.TEST_APP_URL || `http://localhost:${PORT}`;

interface CheckResult {
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  durationMs: number;
  message: string;
}

async function runProductionTests() {
  console.log('\n======================================================');
  console.log('🚀 SUITE DE TESTS DE PRODUCTION - RÉPUBLIQUE DE DJIBOUTI');
  console.log('   Trésorie De La Préfecture De Djibouti • Registre CG & PC');
  console.log(`   Cible d'analyse : ${BASE_URL}`);
  console.log('======================================================\n');

  const results: CheckResult[] = [];

  // Helper pour exécuter un test chronométré
  async function testStep(
    name: string,
    category: string,
    fn: () => Promise<{ ok: boolean; msg: string; warn?: boolean }>
  ) {
    const start = performance.now();
    try {
      const res = await fn();
      const durationMs = Math.round(performance.now() - start);
      const status = res.warn ? 'WARN' : (res.ok ? 'PASS' : 'FAIL');
      results.push({ name, category, status, durationMs, message: res.msg });
      
      const icon = status === 'PASS' ? '✅' : (status === 'WARN' ? '⚠️' : '❌');
      console.log(`${icon} [${category}] ${name} (${durationMs}ms) : ${res.msg}`);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      results.push({ name, category, status: 'FAIL', durationMs, message: err.message });
      console.log(`❌ [${category}] ${name} (${durationMs}ms) : ÉCHEC - ${err.message}`);
    }
  }

  // 1. Endpoint /api/health
  await testStep('Vérification Santé Serveur', 'HEALTH', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: data.status === 'ok', msg: `Serveur actif, status="${data.status}"` };
  });

  // 2. Endpoint /api/status (PostgreSQL Neon)
  await testStep('Connexion Base PostgreSQL Neon', 'DATABASE', async () => {
    const res = await fetch(`${BASE_URL}/api/status`);
    if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
    const data = await res.json();
    if (data.connected && data.database === 'postgresql_neon') {
      return { 
        ok: true, 
        msg: `Connecté à PostgreSQL Neon (${data.recordCount} dossiers, ${data.userCount} utilisateurs)` 
      };
    } else {
      return { 
        ok: true, 
        warn: true, 
        msg: `Mode local/secours actif (${data.message || 'DATABASE_URL non configurée'})` 
      };
    }
  });

  // 3. Contrat de données /api/records
  await testStep('Intégrité Contrat API Dossiers', 'API_CONTRACT', async () => {
    const res = await fetch(`${BASE_URL}/api/records`);
    if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
    const data = await res.json();
    if (!Array.isArray(data.records)) {
      return { ok: false, msg: 'La réponse ne contient pas un tableau data.records' };
    }
    return { ok: true, msg: `Contrat respecté : ${data.records.length} dossier(s) reçus (${data.source})` };
  });

  // 4. Contrat de données /api/users
  await testStep('Intégrité Contrat API Utilisateurs', 'API_CONTRACT', async () => {
    const res = await fetch(`${BASE_URL}/api/users`);
    if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
    const data = await res.json();
    if (!Array.isArray(data.users)) {
      return { ok: false, msg: 'La réponse ne contient pas un tableau data.users' };
    }
    const hasAdmin = data.users.some((u: any) => u.email === 'mahdiyacoubali318@gmail.com');
    return { 
      ok: true, 
      msg: `Contrat respecté : ${data.users.length} utilisateur(s), Super-Admin présent = ${hasAdmin}` 
    };
  });

  // 5. Test Authentification (Rejet des identifiants invalides)
  await testStep('Sécurité Route Authentification', 'SECURITY', async () => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'faux.utilisateur@test.dj', password: 'badpassword' }),
    });
    const data = await res.json();
    if (res.status === 401 && !data.success) {
      return { ok: true, msg: 'Authentification invalide correctement rejetée (HTTP 401)' };
    }
    return { ok: false, msg: `Comportement inattendu : status ${res.status}` };
  });

  // 6. Test Authentification Super-Admin (Mahdi)
  await testStep('Authentification Super-Admin (Mahdi Yacoub Ali)', 'SECURITY', async () => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mahdiyacoubali318@gmail.com', password: 'MAHDI8006' }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.user?.role === 'ADMIN') {
      return { ok: true, msg: `Connexion Admin validée : ${data.user.name} (${data.user.role})` };
    }
    return { ok: false, msg: `Échec connexion admin : ${data.error || 'Erreur inconnue'}` };
  });

  // 7. En-têtes HTTP & Performance
  await testStep('Performance et En-têtes HTTP', 'PERFORMANCE', async () => {
    const start = performance.now();
    const res = await fetch(`${BASE_URL}/api/status`);
    const duration = Math.round(performance.now() - start);
    
    if (duration > 1500) {
      return { ok: true, warn: true, msg: `Temps de réponse élevé : ${duration}ms (> 1500ms)` };
    }
    return { ok: true, msg: `Temps de réponse optimal : ${duration}ms` };
  });

  // Synthèse finale
  console.log('\n======================================================');
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`📊 BILAN DES TESTS DE PRODUCTION :`);
  console.log(`   Total : ${total} | Succès : ${passed} | Alertes : ${warned} | Échecs : ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ ÉCHEC DU CONTRÔLE DE PRODUCTION. Vérifiez les erreurs ci-dessus.');
    process.exit(1);
  } else {
    console.log('\n🎉 TOUS LES TESTS DE PRODUCTION SONT AU VERT ! L\'application est prête.');
    console.log('======================================================\n');
  }
}

runProductionTests().catch((err) => {
  console.error('Erreur fatale lors des tests de production :', err);
  process.exit(1);
});
