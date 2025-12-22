# BroLab Beats Store - Production Deployment Checklist

## Pre-Deployment Checklist

### Code & Build

- [ ] All features tested locally
- [ ] Production build successful (`npm run build`)
- [ ] No TypeScript errors (`npm run check`)
- [ ] All environment variables configured
- [ ] Database schema up to date (`npm run db:push`)
- [ ] File upload system tested
- [ ] Download quota system verified
- [ ] Email system functional

### Security

- [ ] Production API keys configured (Stripe Live, PayPal Live)
- [ ] Strong session secret generated
- [ ] Database user has minimal required permissions
- [ ] No sensitive data in code or logs
- [ ] HTTPS enabled and enforced
- [ ] Row-Level Security (RLS) policies configured
- [ ] File upload validation and scanning enabled
- [ ] Rate limiting configured for all endpoints

### Performance

- [ ] Static assets optimized
- [ ] Database indexes in place
- [ ] Gzip compression enabled
- [ ] CDN configured (if applicable)
- [ ] Supabase connection optimized
- [ ] File storage performance verified

## cPanel Deployment Steps

### 1. Server Requirements

- [ ] Node.js 24+ supported
- [ ] PostgreSQL database available
- [ ] SSL certificate available
- [ ] Sufficient storage and bandwidth
- [ ] Supabase account configured (if using Supabase)

### 2. File Upload

- [ ] Production build uploaded to cPanel
- [ ] Files extracted in correct directory
- [ ] File permissions set correctly
- [ ] .env file created with production values
- [ ] Supabase configuration files included

### 3. Database Setup

- [ ] PostgreSQL database created
- [ ] Database user created with appropriate permissions
- [ ] DATABASE_URL environment variable configured
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Supabase project configured (if using Supabase)
- [ ] RLS policies applied to database

### 4. Node.js App Configuration

- [ ] Node.js app created in cPanel
- [ ] Startup file set to `server/index.js`
- [ ] App URL configured correctly
- [ ] Environment variables added
- [ ] Supabase environment variables configured

### 5. Dependencies & Build

- [ ] Production dependencies installed (`npm install --production`)
- [ ] Application builds successfully
- [ ] No build errors in logs
- [ ] Supabase client libraries installed

### 6. Testing

- [ ] Application starts without errors
- [ ] Homepage loads correctly
- [ ] Database connection successful
- [ ] API endpoints responding
- [ ] Payment processing functional
- [ ] WooCommerce integration working
- [ ] File upload system operational
- [ ] Download quota system functional
- [ ] Email system sending messages
- [ ] RLS security policies working

### 7. Domain & SSL

- [ ] Domain pointed to cPanel server
- [ ] DNS records configured
- [ ] SSL certificate installed and active
- [ ] HTTPS redirects working

### 8. Monitoring Setup

- [ ] Error logging configured
- [ ] Performance monitoring enabled
- [ ] Backup schedule configured
- [ ] Uptime monitoring set up
- [ ] Supabase monitoring enabled

## Post-Deployment Verification

### Functionality Tests

- [ ] User registration/login works
- [ ] Product catalog loads from WooCommerce
- [ ] Audio previews play correctly
- [ ] Cart functionality works
- [ ] Checkout process completes
- [ ] Payment processing successful
- [ ] Email notifications sent
- [ ] File uploads work correctly
- [ ] Download quota enforcement active
- [ ] Service orders can be created
- [ ] Reservation system functional
- [ ] Admin file management accessible

### Performance Tests

- [ ] Page load times acceptable (<3 seconds)
- [ ] Database queries optimized
- [ ] Static assets load quickly
- [ ] Mobile responsiveness verified
- [ ] File upload performance acceptable
- [ ] Supabase connection stable

### Security Tests

- [ ] HTTPS enforced on all pages
- [ ] Sensitive data not exposed
- [ ] API endpoints properly secured
- [ ] Rate limiting functional
- [ ] RLS policies working correctly
- [ ] File upload validation active
- [ ] Download quota limits enforced

## Maintenance Tasks

### Regular Monitoring

- [ ] Check application logs weekly
- [ ] Monitor database performance
- [ ] Review security logs
- [ ] Check SSL certificate expiry
- [ ] Monitor Supabase usage and limits
- [ ] Check file storage usage

### Updates

- [ ] Keep dependencies updated
- [ ] Apply security patches promptly
- [ ] Update Node.js version as needed
- [ ] Backup before major updates
- [ ] Update Supabase client libraries

### Performance Optimization

- [ ] Monitor and optimize slow queries
- [ ] Review and compress large assets
- [ ] Cache frequently accessed data
- [ ] Scale resources as needed
- [ ] Optimize Supabase queries

## Rollback Plan

### In Case of Issues

1. **Stop the application** in cPanel Node.js interface
2. **Restore previous version** from backup
3. **Rollback database** if schema changes were made
4. **Verify functionality** before making live again
5. **Investigate and fix issues** in development environment

### Backup Strategy

- [ ] Automated daily database backups
- [ ] Code repository with version tags
- [ ] Environment variables backed up securely
- [ ] Regular full server backups
- [ ] Supabase data backups configured
- [ ] File storage backups scheduled

## Contact Information

### Support Contacts

- **Hosting Provider**: o2switch support
- **Domain Provider**: [Your domain registrar]
- **Developer**: [Your contact information]
- **Supabase Support**: [Supabase support portal]

### Emergency Procedures

1. Contact hosting provider for server issues
2. Check status pages for third-party services
3. Monitor error logs for application issues
4. Have rollback plan ready to execute
5. Contact Supabase support for database issues

## Success Metrics

### Technical Metrics

- [ ] Uptime > 99.5%
- [ ] Page load time < 3 seconds
- [ ] Error rate < 1%
- [ ] Database response time < 100ms
- [ ] File upload success rate > 99%
- [ ] Email delivery rate > 95%

### Business Metrics

- [ ] User registration rate
- [ ] Successful payment rate
- [ ] Cart abandonment rate
- [ ] User engagement metrics
- [ ] File upload/download statistics
- [ ] Service order completion rate

## Environment Variables Checklist

### Required for Production

- [ ] `DATABASE_URL` - Database connection string
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `WORDPRESS_URL` - WordPress API URL
- [ ] `WOOCOMMERCE_URL` - WooCommerce API URL
- [ ] `WOOCOMMERCE_CONSUMER_KEY` - WooCommerce consumer key
- [ ] `WOOCOMMERCE_CONSUMER_SECRET` - WooCommerce consumer secret
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key
- [ ] `VITE_STRIPE_PUBLIC_KEY` - Stripe public key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- [ ] `VITE_PAYPAL_CLIENT_ID` - PayPal client ID
- [ ] `SMTP_HOST` - SMTP server host
- [ ] `SMTP_PORT` - SMTP server port
- [ ] `SMTP_USER` - SMTP username
- [ ] `SMTP_PASS` - SMTP password
- [ ] `DEFAULT_FROM` - Default email sender
- [ ] `SESSION_SECRET` - Session encryption secret
- [ ] `NODE_ENV` - Environment (production)
- [ ] `PORT` - Application port

This checklist ensures a smooth deployment and ongoing maintenance of your BroLab Beats Store in production with all new features and security measures.

### Changelog

**2025-01-23** - Deployment Checklist Update

- Added Supabase database configuration requirements
- Included Row-Level Security (RLS) setup and testing
- Added file upload system deployment steps
- Included download quota system verification
- Added email system configuration and testing
- Updated environment variables checklist
- Added service orders and reservation system testing
- Included new security measures and monitoring
