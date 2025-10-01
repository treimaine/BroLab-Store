# BroLab Entertainment - Docker Development Environment

This Docker setup provides a complete development environment for the BroLab Entertainment beats marketplace platform.

## Architecture Overview

The application uses a modern, cloud-first architecture:

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Convex (cloud-hosted real-time database)
- **Authentication**: Clerk
- **Payments**: Stripe + PayPal
- **Product Management**: WordPress/WooCommerce integration
- **Caching**: In-memory (with optional Redis)

## Services

### Core Services

#### `app` (Main Application)

- **Ports**: 5000 (Express), 5173 (Vite dev server)
- **Profile**: `full-stack`
- **Description**: Full-stack development server with hot reload

### Optional Services (Profiles)

#### `redis` (Caching)

- **Profile**: `caching`
- **Port**: 6379
- **Description**: Redis cache server (currently using in-memory cache)

#### `postgres` (Legacy Database)

- **Profile**: `legacy-db`
- **Port**: 5432
- **Description**: PostgreSQL for legacy data (currently using Convex)

#### `clamav` (File Security)

- **Profile**: `security`
- **Port**: 3310
- **Description**: Antivirus scanning for file uploads (not implemented yet)

#### `mailhog` (Email Testing)

- **Profile**: `email-testing`
- **Ports**: 1025 (SMTP), 8025 (Web UI)
- **Description**: Email testing server for development

## Quick Start

### 1. Basic Development (Recommended)

```bash
# Start only the main application
docker-compose -f docker-compose.dev.yml --profile full-stack up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Access the application
open http://localhost:5000
```

### 2. With Caching (Redis)

```bash
# Start app with Redis caching
docker-compose -f docker-compose.dev.yml --profile full-stack --profile caching up -d
```

### 3. With Email Testing

```bash
# Start app with email testing
docker-compose -f docker-compose.dev.yml --profile full-stack --profile email-testing up -d

# Access Mailhog UI
open http://localhost:8025
```

### 4. Full Development Environment

```bash
# Start all services
docker-compose -f docker-compose.dev.yml --profile full-stack --profile caching --profile email-testing up -d
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file with the following variables:

```bash
# Convex Database
CONVEX_DEPLOYMENT=dev:your-deployment-id
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# WooCommerce Integration
WOOCOMMERCE_API_URL=https://your-site.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# PayPal Payments
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
```

### Optional Environment Variables

```bash
# Development Features
VITE_DEV_TOOLS=true
NODE_ENV=development
PORT=5000

# Feature Flags
VITE_FEATURE_REALTIME_UPDATES=true
VITE_FEATURE_ANALYTICS_CHARTS=true
VITE_FEATURE_ADVANCED_FILTERS=true
```

## Development Workflow

### 1. Start Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd brolab-entertainment

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start development environment
docker-compose -f docker-compose.dev.yml --profile full-stack up -d
```

### 2. Development Commands

```bash
# View application logs
docker-compose -f docker-compose.dev.yml logs -f app

# Execute commands in container
docker-compose -f docker-compose.dev.yml exec app npm run type-check
docker-compose -f docker-compose.dev.yml exec app npm run lint
docker-compose -f docker-compose.dev.yml exec app npm test

# Restart services
docker-compose -f docker-compose.dev.yml restart app

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

### 3. Debugging

```bash
# Access container shell
docker-compose -f docker-compose.dev.yml exec app sh

# View container logs
docker-compose -f docker-compose.dev.yml logs app

# Check container health
docker-compose -f docker-compose.dev.yml ps
```

## File Structure

```
brolab-entertainment/
├── client/                 # React frontend
├── server/                 # Express backend
├── convex/                 # Convex database functions
├── shared/                 # Shared types and utilities
├── attached_assets/        # Static assets
├── docker-compose.dev.yml  # Development environment
├── Dockerfile.dev          # Development container
└── .dockerignore          # Docker ignore rules
```

## Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check if ports are in use
lsof -i :5000
lsof -i :5173

# Stop conflicting services
docker-compose -f docker-compose.dev.yml down
```

#### Environment Variables

```bash
# Verify environment variables are loaded
docker-compose -f docker-compose.dev.yml exec app env | grep CONVEX
```

#### Container Health

```bash
# Check container status
docker-compose -f docker-compose.dev.yml ps

# View health check logs
docker inspect brolab_app_dev | grep -A 10 Health
```

### Performance Optimization

#### Volume Mounting

The development setup uses volume mounting for hot reload:

- Source code: `.:/app`
- Node modules: `/app/node_modules` (anonymous volume)
- Assets: `./attached_assets:/app/attached_assets`

#### Memory Usage

```bash
# Monitor container resource usage
docker stats brolab_app_dev
```

## Production Considerations

This Docker setup is for **development only**. For production:

1. Use multi-stage builds for smaller images
2. Implement proper secrets management
3. Use external databases and caching
4. Configure proper logging and monitoring
5. Implement security scanning and updates

## External Dependencies

The application integrates with several external services:

- **Convex**: Real-time database (cloud-hosted)
- **Clerk**: Authentication service
- **Stripe**: Payment processing
- **PayPal**: Alternative payment processing
- **WordPress/WooCommerce**: Product management
- **Vercel**: Deployment platform (production)

## Support

For issues with the Docker setup:

1. Check the logs: `docker-compose logs app`
2. Verify environment variables
3. Ensure all required services are running
4. Check network connectivity to external services

For application-specific issues, refer to the main project documentation.
