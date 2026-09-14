# 🚀 Guide de Déploiement sur Render (Render.com)

Ce guide détaille les étapes simples et complètes pour déployer l'application **Registre CG & PC (Cartes Grises & Permis de Conduire)** en production sur la plateforme cloud **Render**.

---

## 📋 Spécifications Techniques de l'Application

- **Type de service Render** : Web Service (Node.js)
- **Environnement d'exécution** : Node.js (v18, v20 ou v22)
- **Base de données** : PostgreSQL (Neon Tech ou Render PostgreSQL)
- **Commande de Build** : `npm install --include=dev && npm run build`
- **Commande de Start** : `npm start`
- **Port d'écoute** : Détecté automatiquement via `process.env.PORT` sur Render (ou 3000 par défaut)
- **Route Health Check** : `/api/health`

---

## 🌟 Méthode 1 : Déploiement Automatique via Blueprint (`render.yaml`) (Recommandé)

Le dépôt contient déjà le fichier `render.yaml` prêt à l'emploi.

1. **Publiez le code** sur votre compte **GitHub** ou **GitLab** :
   ```bash
   git add .
   git commit -m "feat: configuration de déploiement Render"
   git push origin main
   ```
2. Rendez-vous sur [dashboard.render.com](https://dashboard.render.com/).
3. Cliquez sur le bouton **New +** en haut à droite, puis sélectionnez **Blueprint**.
4. Connectez votre dépôt GitHub contenant le projet.
5. Render va lire automatiquement le fichier `render.yaml` :
   - **Nom** : `registre-cg-pc`
   - **Plan** : Free
   - **Build Command** : `npm install --include=dev && npm run build`
   - **Start Command** : `npm start`
   - **Health Check** : `/api/health`
6. Render vous demandera d'entrer la variable :
   - `DATABASE_URL` : Collez votre chaîne de connexion Neon (ex: `postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require`).
7. Cliquez sur **Apply** : Render va construire l'application, exécuter Vite + esbuild et démarrer le serveur.

---

## 🛠️ Méthode 2 : Création Manuelle d'un Web Service sur Render

Si vous préférez configurer le service manuellement depuis l'interface Render :

1. Allez sur [dashboard.render.com](https://dashboard.render.com/).
2. Cliquez sur **New +** > **Web Service**.
3. Choisissez **Build and deploy from a Git repository** et sélectionnez votre dépôt.
4. Renseignez les paramètres suivants :

| Paramètre | Valeur à renseigner |
| :--- | :--- |
| **Name** | `registre-cg-pc` |
| **Region** | `Frankfurt (EU Central)` *(recommandé pour une faible latence vers Djibouti et l'Afrique de l'Est)* |
| **Branch** | `main` |
| **Root Directory** | *(laisser vide)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` (ou Starter) |

5. Cliquez sur **Advanced** et configurez :
   - **Health Check Path** : `/api/health`
   - **Auto-Deploy** : `Yes`

6. Dans la section **Environment Variables** (Variables d'environnement), ajoutez :

| Clé (Key) | Valeur (Value) | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Active le mode production haute performance |
| `DATABASE_URL` | `postgresql://...` | Votre chaîne de connexion Neon PostgreSQL (avec `?sslmode=require`) |

7. Cliquez sur **Create Web Service**.

---

## 🗄️ Initialisation Automatique de la Base de Données

Dès le premier démarrage sur Render :
1. Le serveur se connecte à l'URL `DATABASE_URL` spécifiée.
2. Il crée automatiquement toutes les tables requises :
   - `users` (comptes, rôles RBAC, statuts)
   - `records` (cartes grises, permis, quittances, montants)
   - Tous les index optimisés pour la recherche rapide.
3. Il crée automatiquement le compte **Super-Administrateur** :
   - **Email** : `mahdiyacoubali318@gmail.com`
   - **Mot de passe** : `MAHDI8006`
   - **Rôle** : `ADMIN`
   - **Statut** : `APPROVED`
   - **Département** : `Trésorie De La Préfecture De Djibouti • Djibouti`

---

## 🩺 Vérification et Diagnostics

Une fois le déploiement terminé sur Render, vous disposerez d'une URL sécurisée du type `https://registre-cg-pc.onrender.com`.

- **Vérifier l'état du serveur** :
  Ouvrez `https://votre-app.onrender.com/api/health` dans votre navigateur. Vous devez obtenir :
  ```json
  {
    "status": "ok",
    "uptime": 12.34,
    "timestamp": "2026-09-13T...",
    "platform": "render",
    "environment": "production"
  }
  ```

- **Vérifier la base de données** :
  Ouvrez `https://votre-app.onrender.com/api/status` :
  ```json
  {
    "connected": true,
    "database": "postgresql_neon",
    "recordCount": 0,
    "userCount": 1,
    "message": "Connecté en direct à PostgreSQL Neon (Données Réelles)"
  }
  ```

---

## 💡 Conseils Render Spécifiques

- **Veille du plan gratuit (Spin-down)** : Sur le plan Free de Render, le service se met en veille après 15 minutes d'inactivité. La première requête après réveil prend environ 30 secondes. Pour un service 24/7 sans interruption, passez au plan Starter ($7/mois).
- **Import initial des données** : Une fois connecté avec le compte administrateur, cliquez sur l'icône de base de données en haut à droite puis sur **« Envoyer les données de démonstration dans Neon »** si vous souhaitez alimenter votre base de données avec des enregistrements de départ.
