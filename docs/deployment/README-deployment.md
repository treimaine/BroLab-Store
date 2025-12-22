# BroLab Beats Store - Production Deployment Guide

## Quick Deployment Overview

The BroLab beats store is production-ready and can be deployed to o2switch cPanel hosting with the following streamlined process:

### 🚀 One-Command Deployment

```bash
# Create deployment package
./scripts/deploy-cpanel.sh

# This creates: brolab-beats-deploy.tar.gz
```

### 📁 Upload to cPanel

1. **Upload** `brolab-beats-deploy.tar.gz` to cPanel File Manager
2. **Extract** in your Node.js app directory
3. **Configure** Node.js app in cPanel interface

### ⚙️ cPanel Configuration

#### Node.js App Settings

- **App Root**: `public_html/brolab-beats`
- **Startup File**: `server/index.js`
- **Node.js Version**: 18.x or higher

#### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
STRIPE_SECRET_KEY="sk_live_your_live_key"
VITE_STRIPE_PUBLIC_KEY="pk_live_your_live_key"
VITE_PAYPAL_CLIENT_ID="your_live_paypal_client_id"
SESSION_SECRET="your_strong_session_secret"
NODE_ENV="production"
```

### 🗄️ Database Setup

1. **Create PostgreSQL database** in cPanel
2. **Create database user** with full permissions
3. **Update DATABASE_URL** environment variable
4. **Push schema**: `npm run db:push`

### 🔐 SSL & Domain

1. **Enable SSL certificate** (Let's Encrypt recommended)
2. **Configure domain** pointing to cPanel
3. **Force HTTPS** redirects

## Detailed Deployment Steps

### Pre-Deployment Checklist

#### Local Testing

- [ ] Production build successful: `npm run build`
- [ ] Application starts: `npm run start`
- [ ] All features tested locally
- [ ] Environment variables configured

#### Production Preparation

- [ ] Live Stripe keys obtained
- [ ] Live PayPal client ID configured
- [ ] Production database created
- [ ] Domain DNS configured
- [ ] SSL certificate ready

### Step 1: Create Deployment Package

```bash
# Run deployment script
./scripts/deploy-cpanel.sh

# Output: brolab-beats-deploy.tar.gz
```

**Package Contents:**

- Optimized production build
- Server-side compiled TypeScript
- All necessary dependencies
- Configuration files

### Step 2: cPanel Upload & Setup

#### File Upload

1. Login to cPanel
2. Open File Manager
3. Navigate to `public_html`
4. Upload `brolab-beats-deploy.tar.gz`
5. Extract archive

#### Node.js Application Setup

1. Go to **Node.js Selector** or **Node.js App**
2. Click **Create Application**
3. Configure:
   ```
   Node.js Version: 24.x or higher
   App Root: public_html/brolab-beats
   App URL: your-domain.com
   Startup File: server/index.js
   ```

#### Install Dependencies

```bash
# In cPanel terminal or Node.js interface
cd ~/public_html/brolab-beats
npm install --production
```

### Step 3: Database Configuration

#### Create PostgreSQL Database

1. Go to **PostgreSQL Databases** in cPanel
2. Create database: `username_brolab_beats`
3. Create user: `username_brolab_user`
4. Assign user to database with all privileges

#### Environment Variables Setup

In Node.js app interface, add:

```env
# Database (Update with your actual values)
DATABASE_URL=postgresql://username_brolab_user:password@localhost:5432/username_brolab_beats

# WordPress/WooCommerce
WORDPRESS_URL=https://brolabentertainment.com/wp-json/wp/v2
WOOCOMMERCE_URL=https://brolabentertainment.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=your_production_key
WOOCOMMERCE_CONSUMER_SECRET=your_production_secret

# Supabase Storage
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Payment Processing (Live Keys)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
VITE_PAYPAL_CLIENT_ID=your_live_paypal_client_id

# Security
SESSION_SECRET=your_very_strong_random_session_secret
MAX_FILE_SIZE=52428800 # 50MB in bytes
ALLOWED_FILE_TYPES=audio/*,image/*

# Production Settings
NODE_ENV=production
PORT=3000
```

#### Initialize Database

```bash
# Push database schema
npm run db:push
```

### Step 4: Domain & SSL Configuration

#### Domain Setup

1. Point domain to cPanel server
2. Update DNS A record
3. Wait for DNS propagation (up to 24 hours)

#### SSL Certificate

1. Go to **SSL/TLS** in cPanel
2. Enable **Let's Encrypt** certificate
3. Force HTTPS redirects
4. Verify certificate installation

### Step 5: Application Startup

#### Start Application

1. In Node.js app interface
2. Click **Start App**
3. Monitor logs for startup success
4. Test application at your domain

#### Verify Functionality

- [ ] Homepage loads correctly
- [ ] Shop page displays products
- [ ] Audio preview works
- [ ] Cart functionality operational
- [ ] Payment processing functional
- [ ] Database connections successful

## Production Monitoring

### Application Health Checks

#### Automated Monitoring

```bash
# Check application status
curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/
# Should return 200

# Check API health
curl -s https://yourdomain.com/api/woocommerce/products | jq '.[0].name'
```

#### Log Monitoring

- Check cPanel Error Logs regularly
- Monitor Node.js application logs
- Set up alerting for critical errors

### Performance Optimization

#### cPanel Optimizations

- Enable **Gzip Compression**
- Configure **Browser Caching**
- Optimize **Database Settings**
- Enable **Keep-Alive Connections**

#### Application Optimizations

- **Static Asset Caching**: Configure proper cache headers
- **Database Indexing**: Add indexes for frequently queried data
- **Image Optimization**: Compress and optimize images
- **Audio File CDN**: Use CDN for audio file delivery

## Security Configuration

### Production Security

#### Essential Security Measures

- [ ] SSL certificate installed and active
- [ ] Strong session secrets configured
- [ ] Database user has minimal required permissions
- [ ] API keys use live/production values only
- [ ] CORS properly configured
- [ ] Security headers enabled

#### Regular Security Tasks

- Monitor for security updates
- Regular database backups
- Log security events
- Update dependencies regularly

### Backup Strategy

#### Automated Backups

- **Database**: Daily automated backups
- **Files**: Weekly full site backups
- **Environment Variables**: Secure backup of configuration

#### Disaster Recovery

1. **Data Recovery**: Database restoration procedures
2. **Application Recovery**: Quick redeployment process
3. **DNS Recovery**: Backup DNS configuration
4. **SSL Recovery**: Certificate backup and restoration

## Troubleshooting Common Issues

### Deployment Issues

#### Application Won't Start

```bash
# Check Node.js logs
tail -f ~/logs/yourdomain.com_nodejs.log

# Common fixes:
1. Verify Node.js version (24+)
2. Check file permissions
3. Ensure all environment variables set
4. Verify database connection
```

#### Database Connection Errors

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Common fixes:
1. Check DATABASE_URL format
2. Verify database exists
3. Check user permissions
4. Ensure PostgreSQL is running
```

#### SSL/HTTPS Issues

1. **Certificate not active**: Wait for Let's Encrypt provisioning
2. **Mixed content**: Ensure all resources use HTTPS
3. **Redirect loops**: Check .htaccess configuration
4. **Certificate errors**: Verify domain configuration

### Performance Issues

#### Slow Loading

1. **Enable compression**: Configure Gzip in cPanel
2. **Optimize images**: Compress static assets
3. **Database optimization**: Add necessary indexes
4. **CDN setup**: Configure CDN for static files

#### High Resource Usage

1. **Monitor Node.js processes**: Check for memory leaks
2. **Database optimization**: Optimize queries and indexes
3. **Cache implementation**: Add caching layers
4. **Resource limits**: Upgrade hosting plan if needed

## Support & Maintenance

### Regular Maintenance Tasks

#### Weekly Tasks

- [ ] Monitor application logs
- [ ] Check database performance
- [ ] Verify backup completion
- [ ] Test critical functionality

#### Monthly Tasks

- [ ] Update dependencies (security updates)
- [ ] Database optimization and cleanup
- [ ] Performance analysis and optimization
- [ ] Security audit and review

### Getting Help

#### cPanel Support

- Contact o2switch support for hosting issues
- Use cPanel documentation for configuration
- Check o2switch status page for service issues

#### Application Support

- Review application logs for errors
- Check database connectivity and performance
- Verify WooCommerce API integration
- Test payment processing functionality

The BroLab beats store is designed for reliable production deployment with minimal maintenance requirements. Follow this guide for a smooth deployment to o2switch cPanel hosting.
