# BroLab Beats Store - Local Development & Production Deployment Guide

## Overview
This guide covers setting up the BroLab beats marketplace for local development and production deployment on o2switch cPanel hosting.

## Project Architecture Summary
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase for production and development)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + TanStack Query
- **Payment**: Stripe + PayPal integration
- **CMS Integration**: WordPress/WooCommerce REST API
- **File Management**: Supabase Storage with security scanning
- **Security**: Row-Level Security (RLS) with comprehensive validation

## 🚀 Local Development Setup

### Prerequisites
- Node.js 20+ and npm
- Database option (choose one):
  - Supabase account (recommended)
  - Local PostgreSQL 14+ 
  - Docker with PostgreSQL
- Git
- Code editor (VS Code recommended)

### 1. Clone and Setup Project

```bash
# Clone the repository
git clone <your-repo-url> brolab-beats
cd brolab-beats

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 2. Database Setup

#### Option A: Supabase (Recommended for Local Development)
```bash
# 1. Create account at https://supabase.com
# 2. Create new project
# 3. Go to Settings > Database
# 4. Copy connection string
# 5. Update DATABASE_URL in .env file
```

#### Option B: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE brolab_beats_dev;
CREATE USER brolab_user WITH PASSWORD 'brolab_password';
GRANT ALL PRIVILEGES ON DATABASE brolab_beats_dev TO brolab_user;
\q
```

#### Option C: Docker PostgreSQL (Optional)
```bash
# Start PostgreSQL container (if you have Docker)
docker-compose -f docker-compose.dev.yml up -d postgres
```

### 3. Environment Configuration

Create `.env` file with these variables:

```env
# Session Security (generate with: openssl rand -hex 32)
SESSION_SECRET=your_64_character_hex_session_secret_here

# Database Configuration (choose one option)
# Option 1: Supabase (recommended)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Option 2: Local PostgreSQL
# DATABASE_URL=postgresql://brolab_user:brolab_password@localhost:5432/brolab_beats_dev

# WordPress/WooCommerce API
WORDPRESS_API_URL=https://brolabentertainment.com/wp-json/wp/v2
WOOCOMMERCE_API_URL=https://brolabentertainment.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret

# Stripe (Test Keys)
STRIPE_SECRET_KEY=sk_test_your_test_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
DEFAULT_FROM=BroLab <contact@brolabentertainment.com>

# Development Settings
NODE_ENV=development
PORT=5000
```

### 4. Database Migration

```bash
# Push schema to database
npm run db:push

# Optional: Generate migrations
npm run db:generate
```

### 5. Development Server

```bash
# Start development server (unified frontend + backend on port 5000)
npm run dev

# Application will be available at:
# http://localhost:5000
```

## 🔧 Development Workflow

### Project Structure
```
brolab-beats/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   ├── lib/               # Core libraries
│   │   ├── supabase.ts    # Supabase client configuration
│   │   ├── rlsSecurity.ts # Row-Level Security management
│   │   └── validation.ts  # Input validation schemas
│   └── wordpress.ts       # WooCommerce integration
├── shared/                # Shared TypeScript types
│   └── schema.ts          # Database schema
└── scripts/               # Build and deployment scripts
```

### Key Development Commands

```bash
# Database operations
npm run db:push            # Push schema changes to database
npm run db:studio          # Open Drizzle Studio (database GUI)
npm run db:generate        # Generate migration files

# Development
npm run dev                # Start unified development server (port 5000)
npm run build              # Build for production
npm run start              # Start production server
npm run check              # TypeScript type checking
npm run test               # Run test suite
npm run lint               # Lint code
npm run format             # Format code

# Local Development Utilities
npm run setup              # Full setup (install dependencies + sync database)
npm run clean              # Clean installation (remove node_modules and reinstall)
```

**For Local Development**: All scripts are included in `package.local.json` which gets copied during local setup.

### Adding New Features

1. **Database Changes**:
   ```bash
   # Edit shared/schema.ts
   # Then push changes
   npm run db:push
   ```

2. **API Endpoints**:
   ```bash
   # Add routes in server/routes.ts
   # Update storage interface in server/storage.ts
   ```

3. **Frontend Components**:
   ```bash
   # Add components in client/src/components/
   # Use shadcn/ui for consistent styling
   npx shadcn-ui add button  # Add new UI components
   ```

## 🌐 Production Deployment on o2switch cPanel

### 1. Prepare Production Build

```bash
# Create production build
npm run build

# Test production build locally
npm run start
```

### 2. cPanel Setup Requirements

#### Node.js Application Setup
1. Login to cPanel
2. Go to "Node.js Selector" or "Node.js App"
3. Create new Node.js application:
   - **Version**: 18.x or higher
   - **App Root**: `public_html/brolab-beats`
   - **App URL**: Your domain or subdomain
   - **Startup File**: `server/index.js`

#### Database Setup
1. Create PostgreSQL database in cPanel:
   - Database name: `username_brolab_beats`
   - User: `username_brolab_user`
   - Password: Strong password
2. Note connection details for environment variables

### 3. File Upload and Configuration

#### Upload Methods
**Option A: Git Deployment (Recommended)**
```bash
# If cPanel supports Git
git remote add production <cPanel-git-url>
git push production main
```

**Option B: File Manager Upload**
1. Compress your project: `tar -czf brolab-beats.tar.gz .`
2. Upload via cPanel File Manager
3. Extract in application directory

#### Production Environment Variables
Create `.env` file in production with:

```env
# Production Database
DATABASE_URL="postgresql://username_brolab_user:password@localhost:5432/username_brolab_beats"

# Supabase Configuration (if using Supabase)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# WordPress/WooCommerce (Production URLs)
WORDPRESS_URL="https://brolabentertainment.com/wp-json/wp/v2"
WOOCOMMERCE_URL="https://brolabentertainment.com/wp-json/wc/v3"
WOOCOMMERCE_CONSUMER_KEY="your_production_consumer_key"
WOOCOMMERCE_CONSUMER_SECRET="your_production_consumer_secret"

# Stripe (Live Keys)
STRIPE_SECRET_KEY="sk_live_your_live_key"
VITE_STRIPE_PUBLIC_KEY="pk_live_your_live_key"
STRIPE_WEBHOOK_SECRET="whsec_your_live_webhook_secret"

# PayPal (Live)
VITE_PAYPAL_CLIENT_ID="your_live_paypal_client_id"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_production_email@gmail.com"
SMTP_PASS="your_production_app_password"
DEFAULT_FROM="BroLab <contact@brolabentertainment.com>"

# Production Settings
NODE_ENV="production"
PORT=3000
SESSION_SECRET="your_strong_session_secret"
```

### 4. cPanel Configuration

#### Package.json Scripts for Production
```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "tsc && vite build",
    "postinstall": "npm run build"
  }
}
```

#### Install Dependencies
```bash
# In cPanel terminal or through Node.js interface
npm install --production
```

### 5. SSL Certificate Setup
1. Enable SSL in cPanel (Let's Encrypt recommended)
2. Force HTTPS redirects
3. Update CORS settings if needed

### 6. Domain Configuration

#### Custom Domain Setup
1. Point domain/subdomain to cPanel
2. Update DNS records
3. Configure domain in Node.js app settings

#### Environment-Specific URLs
```env
# Production
FRONTEND_URL="https://yourdomain.com"
BACKEND_URL="https://yourdomain.com/api"

# Development (unified on port 5000)
FRONTEND_URL="http://localhost:5000"
BACKEND_URL="http://localhost:5000/api"
```

## 🔄 Continuous Development Process

### Development Cycle
1. **Local Development**:
   ```bash
   # Make changes
   npm run dev
   # Application available at http://localhost:5000
   # Test locally (frontend + backend unified)
   # Commit changes
   git add .
   git commit -m "Feature: description"
   ```

2. **Database Schema Changes**:
   ```bash
   # Edit shared/schema.ts
   # Push changes to database
   npm run db:push
   # Open database GUI (if needed)
   npm run db:studio
   ```

3. **Testing Before Production**:
   ```bash
   # Build and test production locally
   npm run build
   npm run start
   # Test at http://localhost:5000
   ```

4. **Deploy to Production**:
   ```bash
   # Push to production
   git push production main
   # Or upload files manually
   ```

### Database Migrations in Production
```bash
# Connect to production database
npm run db:push  # Push schema changes
# Be careful with data loss warnings
```

### Monitoring and Maintenance

#### Log Monitoring
- Check cPanel error logs
- Monitor Node.js application logs
- Set up error tracking (Sentry recommended)

#### Performance Optimization
- Enable gzip compression in cPanel
- Configure CDN for static assets
- Monitor database performance

#### Backup Strategy
- Regular database backups
- Code repository backups
- Environment variable backups

## 🚨 Security Considerations

### Environment Variables Security
- Never commit `.env` files
- Use different keys for development/production
- Regularly rotate API keys

### Database Security
- Use strong passwords
- Limit database user permissions
- Regular security updates
- **Row-Level Security (RLS)**: Implement database-level access control

### Application Security
- Keep dependencies updated: `npm audit`
- Use HTTPS in production
- Implement rate limiting
- Validate all user inputs
- **File Upload Security**: Antivirus scanning and validation
- **Download Quota Enforcement**: License-based limits

## 📱 Testing Strategy

### Local Testing
```bash
# Unit tests (if implemented)
npm test

# Type checking
npm run check

# Build verification
npm run build && npm run start
```

### Production Testing Checklist
- [ ] All API endpoints working
- [ ] Database connections successful
- [ ] Payment processing functional
- [ ] WordPress/WooCommerce integration
- [ ] SSL certificate active
- [ ] Domain configuration correct
- [ ] Performance acceptable
- [ ] File upload system functional
- [ ] Download quota system working
- [ ] Email system operational

## 🆘 Troubleshooting Common Issues

### Build Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist .vite
npm run build
```

### Database Connection Issues
```bash
# Test database connection
npm run db:studio
# Check environment variables
echo $DATABASE_URL
```

### cPanel Deployment Issues
1. Check Node.js version compatibility
2. Verify file permissions
3. Check error logs in cPanel
4. Ensure all dependencies installed

## 🔗 Additional Resources

### Supabase Setup Guide
1. **Create Project**: Go to [supabase.com](https://supabase.com) and create new project
2. **Get Connection String**: Settings > Database > Connection string
3. **Schema Management**: Use Drizzle to manage schema with `npm run db:push`
4. **GUI Access**: Use Supabase dashboard or `npm run db:studio` for local management
5. **Row-Level Security**: Configure RLS policies for data protection

### Docker Development (Optional)
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### Automated Setup (Recommended)
```bash
# Download and extract the project zip
# Navigate to the project directory
cd brolab-beats-store

# Run the automated setup script
chmod +x scripts/setup-local-complete.sh
./scripts/setup-local-complete.sh
```

### Manual Setup Checklist
- [ ] Node.js 20+ installed
- [ ] Database setup (Supabase/PostgreSQL/Docker)
- [ ] Copy `package.local.json` to `package.json` (for local development)
- [ ] Copy `vite.config.local.ts` to `vite.config.ts` (for local development)
- [ ] `.env` file configured with database URL and API keys
- [ ] Dependencies installed (`npm install`)
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Development server running (`npm run dev`)
- [ ] Application accessible at http://localhost:5000

### Local Development Files
- `package.local.json` - Local development package.json with all necessary scripts
- `vite.config.local.ts` - Vite configuration optimized for local development (no Replit plugins)
- `README-local.md` - Complete local development documentation
- `scripts/setup-local-complete.sh` - Automated setup script for local development

This guide provides a comprehensive foundation for developing and deploying your BroLab beats store. The unified port 5000 architecture simplifies development while Supabase provides a modern cloud database solution for local development.

### Changelog

**2025-01-23** - Local Development Guide Update
- Updated database configuration to use Supabase as primary option
- Added comprehensive environment variables for all services
- Included Row-Level Security (RLS) setup instructions
- Added file management and upload system configuration
- Updated project structure to reflect current codebase
- Added new development commands and scripts
- Included security considerations for RLS and file uploads
- Updated troubleshooting section with new services