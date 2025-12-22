# 🚀 Guide Déploiement o2switch - Cross-Platform

## 📋 Prérequis

- Compte o2switch avec Node.js activé
- cPanel access
- FTP/SFTP configuré

## 🔧 Build Production Local

### Windows (PowerShell/Git Bash)

```powershell
# Setup initial
npm run setup
npm run build:prod

# Ou script unifié
node scripts/deploy-o2switch.js
```

### Linux/macOS

```bash
# Setup initial
npm install
npm run build:prod

# Ou script unifié
node scripts/deploy-o2switch.js
```

## 📁 Structure Déploiement

```
dist/
├── public/          # Frontend build (→ public_html/)
│   ├── index.html
│   ├── assets/
│   └── ...
└── index.js         # Server build (→ app/)
```

## ⚙️ Configuration o2switch

### 1. Variables Environnement (.env.production)

```env
NODE_ENV=production
PORT=5000

# Database Supabase
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...

# API Keys
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# WordPress/WooCommerce
WP_API_URL=https://brolabentertainment.com/wp-json/wp/v2
WC_API_URL=https://brolabentertainment.com/wp-json/wc/v3
WC_CONSUMER_KEY=ck_...
WC_CONSUMER_SECRET=cs_...

# Email SMTP
SMTP_HOST=pro1.mail.ovh.net
SMTP_PORT=587
SMTP_USER=contact@brolabentertainment.com
SMTP_PASS=...

# Security
SESSION_SECRET=...
```

### 2. Structure cPanel

```
/
├── public_html/           # Frontend (dist/public/)
│   ├── index.html
│   └── assets/
├── app/                   # Backend (dist/index.js)
│   ├── index.js
│   ├── .env.production
│   └── package.json
└── logs/
```

### 3. Node.js Configuration cPanel

- **Entry Point**: `app/index.js`
- **Environment**: `Production`
- **Node Version**: `24.x` ou plus récent

## 🚀 Déploiement

### Méthode 1: FTP Upload

```bash
# Build local
npm run build:prod

# Upload via FTP
# public_html/ ← dist/public/*
# app/ ← dist/index.js + .env.production
```

### Méthode 2: rsync (Linux/Mac)

```bash
# Sync frontend
rsync -avz dist/public/ user@server:public_html/

# Sync backend
rsync -avz dist/index.js user@server:app/
rsync -avz .env.production user@server:app/
```

### Méthode 3: Git Deploy (Advanced)

```bash
# Sur serveur o2switch
git clone https://github.com/treimaine/BroLab-Store.git
cd BroLab-Store
npm install --production
npm run build:prod

# Setup symlinks
ln -sf /path/to/BroLab-Store/dist/public/* /public_html/
ln -sf /path/to/BroLab-Store/dist/index.js /app/
```

## ✅ Validation Post-Déploiement

### Tests Fonctionnels

- [ ] Page d'accueil charge
- [ ] API endpoints répondent
- [ ] Base données connectée
- [ ] WooCommerce sync fonctionne
- [ ] Paiements Stripe opérationnels
- [ ] Emails envoyés

### Performance

- [ ] Temps chargement < 3s
- [ ] Images optimisées
- [ ] Cache headers configurés

### Monitoring

```bash
# Logs application
tail -f ~/logs/nodejs.log

# Processus Node
ps aux | grep node

# Performance
curl -I https://votre-domaine.com
```

## 🔧 Dépannage

### Erreurs Communes

```bash
# Port déjà utilisé
PORT=5001 npm run start:prod

# Permissions
chmod +x app/index.js

# Node modules
npm cache clean --force
rm -rf node_modules && npm install
```

### Variables Debug

```env
DEBUG=express:*
NODE_OPTIONS=--inspect
```

## 📞 Support o2switch

- Documentation Node.js: support.o2switch.fr
- Ticket support pour configuration avancée
- Community forum pour questions générales

---

_Guide testé sur Windows 11, Ubuntu 22.04, macOS Monterey_
