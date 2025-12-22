# BroLab Entertainment - Local Development Setup

_Application avec 100% de Couverture de Tests - Export Windows Ready_
_Configuration pour Windows avec Cursor IDE_

## 🚀 Installation Rapide

### Prérequis

- Node.js 24+ (LTS Krypton)
- npm ou yarn
- Git
- Compte Supabase (gratuit)
- Cursor IDE

### 1. Installation initiale

```bash
# Cloner le projet
git clone [votre-repo-url] brolab-beats-store
cd brolab-beats-store

# Installer les dépendances (Windows-optimized)
copy package.local.json package.json
npm install

# Configuration TypeScript locale
copy tsconfig.local.json tsconfig.json
copy vite.config.local.ts vite.config.ts
```

### 2. Configuration Base de Données Supabase

#### Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et les clés API

#### Variables d'environnement

```bash
# Copier le template
copy .env.local.example .env

# Éditer .env avec vos vraies clés
DATABASE_URL="postgresql://postgres.your-project-id:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

#### Initialiser le schéma

```bash
# Créer les tables
npm run db:push

# Optionnel: Ouvrir l'interface Drizzle
npm run db:studio
```

### 3. Configuration Services Externes

#### Stripe (Paiements)

```env
STRIPE_SECRET_KEY="sk_test_..."
VITE_STRIPE_PUBLIC_KEY="pk_test_..."
```

#### WooCommerce (Produits)

```env
WORDPRESS_URL="https://brolabentertainment.com"
WC_CONSUMER_KEY="ck_..."
WC_CONSUMER_SECRET="cs_..."
```

#### Email SMTP

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 4. Démarrage

#### Mode développement

```bash
# Terminal 1: Server backend (Port 5000)
npm run dev

# Terminal 2: Client frontend (Port 3000)
npm run dev:client
```

#### Scripts disponibles

```bash
npm run dev          # Serveur complet
npm run build        # Build production
npm run test         # Tests automatisés
npm run check        # Vérification TypeScript
npm run db:studio    # Interface base de données
npm run lint         # Vérification code
```

## 🔧 Configuration Cursor IDE

### Extensions recommandées

- TypeScript Importer
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets
- Auto Rename Tag
- Prettier - Code formatter

### Settings Cursor (settings.json)

```json
{
  "typescript.preferences.quoteStyle": "double",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Configuration Prettier (.prettierrc)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## 📁 Structure Projet

```
brolab-beats-store/
├── client/src/          # Frontend React
│   ├── components/      # Composants UI
│   ├── pages/          # Pages application
│   ├── hooks/          # Hooks React
│   └── lib/            # Utilitaires client
├── server/             # Backend Express
│   ├── routes/         # Routes API
│   ├── lib/           # Utilitaires serveur
│   └── middleware/     # Middleware Express
├── shared/             # Code partagé
│   └── schema.ts       # Schémas base de données
├── __tests__/          # Tests automatisés
└── attached_assets/    # Assets statiques
```

## 🛠️ Fonctionnalités Principales

### Système de Gestion de Fichiers

- Upload/download sécurisé via Supabase Storage
- Interface admin avec drag & drop
- Validation fichiers (50MB, MIME types)
- Rate limiting (20 uploads/h)

### Système de Paiements

- Stripe integration complète
- PayPal support
- Gestion abonnements
- Multi-devises

### Système Audio

- Prévisualisation beats avec waveform
- Player audio persistant
- Support formats multiples

### Administration

- Dashboard admin complet
- Monitoring système temps réel
- Gestion utilisateurs
- Analytics détaillées

## 🔍 Tests et Debugging

### Lancer les tests

```bash
npm test                # Tests complets
npm run test:watch      # Tests en mode watch
npm run test:coverage   # Couverture de tests
```

### Health checks

```bash
# Vérifier la santé des services
curl http://localhost:5000/api/monitoring/health

# Métriques système
curl http://localhost:5000/api/monitoring/metrics
```

### Debugging common issues

#### Base de données

```bash
# Vérifier la connexion
npm run db:studio

# Reset des migrations
npm run db:push --force
```

#### Frontend

```bash
# Clear cache
npm run clean
npm install

# Rebuild client
npm run build
```

## 🚀 Déploiement Local

### Build de production

```bash
npm run build
npm start
```

### Variables production

```env
NODE_ENV="production"
PORT="5000"
DATABASE_URL="your-production-db-url"
```

## 📞 Support

### Logs importants

- Server logs: Console terminal backend
- Client logs: DevTools browser (F12)
- Database logs: Supabase dashboard

### Ressources

- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [React Query Docs](https://tanstack.com/query)

---

**✅ Configuration optimisée pour développement Windows avec Cursor IDE**
