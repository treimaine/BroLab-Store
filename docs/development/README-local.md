# BroLab Entertainment - Beats Store (Local Development)

A professional beats marketplace with WooCommerce integration, built with React, TypeScript, and Express.js.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Make setup script executable and run
chmod +x scripts/setup-local-complete.sh
./scripts/setup-local-complete.sh
```

### Option 2: Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Setup database schema
npm run db:push

# 4. Start development server
npm run dev
```

## 📋 Prerequisites

- **Node.js 20+** and npm
- **Database** (choose one):
  - [Supabase](https://supabase.com) (recommended for local development)
  - Local PostgreSQL 14+
  - Docker with PostgreSQL

## 🔧 Available Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:5000)
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking

# Database
npm run db:push      # Sync database schema
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run db:generate  # Generate migration files

# Utilities
npm run setup        # Full setup (install + db sync)
npm run clean        # Clean install (remove node_modules and reinstall)
```

## 🛠 Project Structure

```
brolab-beats-store/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and configurations
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── auth.ts          # Authentication logic
│   ├── db.ts           # Database connection
│   └── wordpress.ts     # WordPress/WooCommerce integration
├── shared/              # Shared types and schemas
│   └── schema.ts        # Database schema (Drizzle)
├── scripts/             # Build and deployment scripts
└── attached_assets/     # Static assets
```

## 🔑 Environment Variables

Key variables to configure in `.env`:

```env
# Database (choose one)
DATABASE_URL=postgresql://user:pass@localhost:5432/database

# WordPress/WooCommerce APIs
WORDPRESS_API_URL=https://your-site.com/wp-json/wp/v2
WOOCOMMERCE_API_URL=https://your-site.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_your_key
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret

# Frontend WooCommerce (required for client-side)
VITE_WC_KEY=ck_your_key
VITE_WC_SECRET=cs_your_secret

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_your_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key

# PayPal
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id

# Security
SESSION_SECRET=your_64_character_hex_secret

# Server Configuration
NODE_ENV=development
PORT=5000
```

## 🗄 Database Setup

### Option A: Supabase (Recommended)
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string from Settings > Database
4. Update `DATABASE_URL` in `.env`
5. Run `npm run db:push`

### Option B: Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt update && sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE brolab_beats_dev;
CREATE USER brolab_user WITH PASSWORD 'brolab_password';
GRANT ALL PRIVILEGES ON DATABASE brolab_beats_dev TO brolab_user;
\q

# Update .env
DATABASE_URL=postgresql://brolab_user:brolab_password@localhost:5432/brolab_beats_dev
```

### Option C: Docker PostgreSQL
```bash
# Start PostgreSQL container
docker-compose -f docker-compose.dev.yml up -d postgres

# Check logs
docker-compose -f docker-compose.dev.yml logs postgres
```

## 🌐 API Integration

The application integrates with:
- **WordPress REST API** for content management
- **WooCommerce REST API** for product catalog
- **Stripe** for payment processing
- **PayPal** for alternative payments

## 🔧 Development Workflow

1. **Start Development**:
   ```bash
   npm run dev
   # App available at http://localhost:5000
   ```

2. **Database Changes**:
   ```bash
   # Edit shared/schema.ts
   npm run db:push    # Apply changes
   npm run db:studio  # View database
   ```

3. **Building for Production**:
   ```bash
   npm run build
   npm run start
   ```

## 📱 Features

- **Professional Audio Player** with waveform visualization
- **WooCommerce Integration** for product management
- **Multi-Payment Support** (Stripe, PayPal)
- **Responsive Design** (mobile-first)
- **Authentication System** with user dashboard
- **Shopping Cart** with license selection
- **Admin Dashboard** with analytics

## 🛠 Troubleshooting

### Common Issues

**Port 5000 already in use:**
```bash
# Find and kill process using port 5000
lsof -ti:5000 | xargs kill -9
# Or change PORT in .env file
```

**Database connection failed:**
```bash
# Check DATABASE_URL format
# For local PostgreSQL: postgresql://user:pass@localhost:5432/dbname
# For Supabase: postgresql://postgres:pass@db.project.supabase.co:5432/postgres
```

**Build errors:**
```bash
# Clear cache and reinstall
npm run clean
```

**TypeScript errors:**
```bash
# Run type checking
npm run check
```

## 📚 Documentation

- `LOCAL_DEVELOPMENT_GUIDE.md` - Comprehensive development guide
- `DEPLOYMENT_CHECKLIST.md` - Production deployment
- `TESTING_GUIDE.md` - Testing procedures
- `replit.md` - Project architecture and history

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**BroLab Entertainment** - Professional beats for music producers worldwide 🎵