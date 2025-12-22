# Production Deployment Guide

## Overview

This guide covers the deployment of the BroLab Entertainment platform to production environments with optimized performance and monitoring.

## Pre-Deployment Checklist

### 1. Environment Configuration

```bash
# Required environment variables
NODE_ENV=production
VITE_CONVEX_URL=your_production_convex_url
VITE_CLERK_PUBLISHABLE_KEY=your_production_clerk_key
CLERK_SECRET_KEY=your_production_clerk_secret
STRIPE_SECRET_KEY=your_production_stripe_key
STRIPE_WEBHOOK_SECRET=your_production_webhook_secret
```

### 2. Build Optimization

```bash
# Clean build
npm run clean:all

# Type check
npm run type-check

# Run tests
npm test

# Production build with analysis
ANALYZE=true npm run build

# Validate lazy loading
node scripts/validate-lazy-loading.mjs
```

### 3. Performance Validation

```bash
# Test production build
node scripts/test-production-build.js

# Check bundle sizes
ls -la dist/public/js/

# Validate code splitting
grep -r "import(" client/src/
```

## Deployment Steps

### 1. Build Process

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting production deployment..."

# Clean previous build
echo "🧹 Cleaning previous build..."
npm run clean

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Type checking
echo "🔍 Type checking..."
npm run type-check

# Run tests
echo "🧪 Running tests..."
npm test

# Build for production
echo "🔨 Building for production..."
npm run build

# Validate build
echo "✅ Validating build..."
node scripts/test-production-build.js

echo "✅ Build completed successfully!"
```

### 2. Server Configuration

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/brolab
server {
    listen 80;
    listen [::]:80;
    server_name brolab.com www.brolab.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name brolab.com www.brolab.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location / {
        root /var/www/brolab/dist/public;
        try_files $uri $uri/ /index.html;

        # Security headers for HTML
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
}
```

#### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "brolab-api",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      max_memory_restart: "1G",
      node_args: "--max-old-space-size=1024",
    },
  ],
};
```

### 3. Database Setup

#### Convex Production Setup

```bash
# Deploy Convex functions
npx convex deploy --prod

# Set production environment variables
npx convex env set CLERK_WEBHOOK_SECRET your_webhook_secret --prod
npx convex env set STRIPE_WEBHOOK_SECRET your_stripe_secret --prod
```

## Performance Optimization

### 1. CDN Configuration

```javascript
// Configure CDN for static assets
const CDN_BASE_URL = "https://cdn.brolab.com";

// Update asset URLs in production
if (process.env.NODE_ENV === "production") {
  // Configure asset loading from CDN
}
```

### 2. Lazy Loading Optimization

```typescript
// Production lazy loading configuration
const productionLazyConfig = {
  // Preload critical components
  preloadDelay: 1000,

  // Enable monitoring
  enableMonitoring: true,

  // Optimize for production
  retryOnError: true,
  maxRetries: 3,
};
```

### 3. Bundle Analysis

```bash
# Generate bundle analysis
ANALYZE=true npm run build

# Check for optimization opportunities
node scripts/detailed-bundle-analysis.js
```

## Monitoring Setup

### 1. Performance Monitoring

```typescript
// Production monitoring configuration
const monitoringConfig = {
  // Web Vitals tracking
  trackWebVitals: true,

  // Lazy loading performance
  trackLazyLoading: true,

  // Error tracking
  trackErrors: true,

  // User analytics
  trackUserBehavior: true,
};
```

### 2. Health Checks

```bash
# Health check endpoint
curl -f http://localhost:3001/api/health || exit 1

# Database connectivity
curl -f http://localhost:3001/api/health/db || exit 1

# External services
curl -f http://localhost:3001/api/health/services || exit 1
```

### 3. Log Monitoring

```bash
# Setup log rotation
sudo logrotate -d /etc/logrotate.d/brolab

# Monitor error logs
tail -f /var/log/brolab/error.log

# Monitor access logs
tail -f /var/log/nginx/brolab.access.log
```

## Security Configuration

### 1. Environment Security

```bash
# Secure environment variables
chmod 600 .env.production

# Use secrets management
export $(cat .env.production | xargs)
```

### 2. Rate Limiting

```typescript
// Production rate limiting
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
};
```

### 3. CORS Configuration

```typescript
// Production CORS settings
const corsConfig = {
  origin: ["https://brolab.com", "https://www.brolab.com"],
  credentials: true,
  optionsSuccessStatus: 200,
};
```

## Backup and Recovery

### 1. Database Backup

```bash
# Automated backup script
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/brolab"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Convex data (if applicable)
# Note: Convex handles backups automatically

# Backup uploaded files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/brolab/uploads/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### 2. Disaster Recovery

```bash
# Recovery procedure
#!/bin/bash
# recover.sh

echo "🚨 Starting disaster recovery..."

# Stop services
pm2 stop all
sudo systemctl stop nginx

# Restore from backup
tar -xzf /backups/brolab/files_latest.tar.gz -C /

# Restart services
sudo systemctl start nginx
pm2 start ecosystem.config.js --env production

echo "✅ Recovery completed"
```

## Deployment Automation

### 1. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "24"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy to server
        run: |
          rsync -avz --delete dist/ user@server:/var/www/brolab/
          ssh user@server 'pm2 restart brolab-api'
```

### 2. Zero-Downtime Deployment

```bash
# Blue-green deployment script
#!/bin/bash
# deploy-zero-downtime.sh

CURRENT_DIR="/var/www/brolab"
NEW_DIR="/var/www/brolab-new"
BACKUP_DIR="/var/www/brolab-backup"

# Build new version
npm run build

# Deploy to new directory
cp -r dist/* $NEW_DIR/

# Health check new deployment
curl -f http://localhost:3002/api/health || exit 1

# Switch directories atomically
mv $CURRENT_DIR $BACKUP_DIR
mv $NEW_DIR $CURRENT_DIR

# Update nginx configuration
sudo nginx -s reload

# Cleanup
rm -rf $BACKUP_DIR
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors: `npm run type-check`
   - Verify dependencies: `npm audit`
   - Clear cache: `npm run clean:all`

2. **Performance Issues**
   - Analyze bundle: `ANALYZE=true npm run build`
   - Check lazy loading: `node scripts/validate-lazy-loading.mjs`
   - Monitor metrics: Check `/api/health/metrics`

3. **Memory Issues**
   - Increase Node.js memory: `--max-old-space-size=2048`
   - Monitor PM2: `pm2 monit`
   - Check for memory leaks: `node --inspect`

### Debug Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs brolab-api

# Monitor performance
pm2 monit

# Check disk usage
df -h

# Check memory usage
free -h

# Check network connections
netstat -tulpn
```

## Post-Deployment Verification

### 1. Functional Tests

```bash
# Test critical paths
curl -f https://brolab.com/api/health
curl -f https://brolab.com/api/beats
curl -f https://brolab.com/

# Test lazy loading
node scripts/test-lazy-loading.js
```

### 2. Performance Tests

```bash
# Load testing
npx lighthouse https://brolab.com --output=json

# Bundle analysis
node scripts/test-production-build.js

# Monitor initial metrics
curl https://brolab.com/api/metrics
```

### 3. Security Verification

```bash
# SSL check
openssl s_client -connect brolab.com:443

# Security headers
curl -I https://brolab.com

# Vulnerability scan
npm audit --production
```
