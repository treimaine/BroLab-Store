# BroLab Beats Store - Production Deployment Checklist

## Pre-Deployment Checklist

### Code & Build
- [ ] All features tested locally
- [ ] Production build successful (`npm run build`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] All environment variables configured
- [ ] Database schema up to date (`npm run db:push`)

### Security
- [ ] Production API keys configured (Stripe Live, PayPal Live)
- [ ] Strong session secret generated
- [ ] Database user has minimal required permissions
- [ ] No sensitive data in code or logs
- [ ] HTTPS enabled and enforced

### Performance
- [ ] Static assets optimized
- [ ] Database indexes in place
- [ ] Gzip compression enabled
- [ ] CDN configured (if applicable)

## cPanel Deployment Steps

### 1. Server Requirements
- [ ] Node.js 18+ supported
- [ ] PostgreSQL database available
- [ ] SSL certificate available
- [ ] Sufficient storage and bandwidth

### 2. File Upload
- [ ] Production build uploaded to cPanel
- [ ] Files extracted in correct directory
- [ ] File permissions set correctly
- [ ] .env file created with production values

### 3. Database Setup
- [ ] PostgreSQL database created
- [ ] Database user created with appropriate permissions
- [ ] DATABASE_URL environment variable configured
- [ ] Database schema pushed (`npm run db:push`)

### 4. Node.js App Configuration
- [ ] Node.js app created in cPanel
- [ ] Startup file set to `server/index.js`
- [ ] App URL configured correctly
- [ ] Environment variables added

### 5. Dependencies & Build
- [ ] Production dependencies installed (`npm install --production`)
- [ ] Application builds successfully
- [ ] No build errors in logs

### 6. Testing
- [ ] Application starts without errors
- [ ] Homepage loads correctly
- [ ] Database connection successful
- [ ] API endpoints responding
- [ ] Payment processing functional
- [ ] WooCommerce integration working

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

## Post-Deployment Verification

### Functionality Tests
- [ ] User registration/login works
- [ ] Product catalog loads from WooCommerce
- [ ] Audio previews play correctly
- [ ] Cart functionality works
- [ ] Checkout process completes
- [ ] Payment processing successful
- [ ] Email notifications sent

### Performance Tests
- [ ] Page load times acceptable (<3 seconds)
- [ ] Database queries optimized
- [ ] Static assets load quickly
- [ ] Mobile responsiveness verified

### Security Tests
- [ ] HTTPS enforced on all pages
- [ ] Sensitive data not exposed
- [ ] API endpoints properly secured
- [ ] Rate limiting functional

## Maintenance Tasks

### Regular Monitoring
- [ ] Check application logs weekly
- [ ] Monitor database performance
- [ ] Review security logs
- [ ] Check SSL certificate expiry

### Updates
- [ ] Keep dependencies updated
- [ ] Apply security patches promptly
- [ ] Update Node.js version as needed
- [ ] Backup before major updates

### Performance Optimization
- [ ] Monitor and optimize slow queries
- [ ] Review and compress large assets
- [ ] Cache frequently accessed data
- [ ] Scale resources as needed

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

## Contact Information

### Support Contacts
- **Hosting Provider**: o2switch support
- **Domain Provider**: [Your domain registrar]
- **Developer**: [Your contact information]

### Emergency Procedures
1. Contact hosting provider for server issues
2. Check status pages for third-party services
3. Monitor error logs for application issues
4. Have rollback plan ready to execute

## Success Metrics

### Technical Metrics
- [ ] Uptime > 99.5%
- [ ] Page load time < 3 seconds
- [ ] Error rate < 1%
- [ ] Database response time < 100ms

### Business Metrics
- [ ] User registration rate
- [ ] Successful payment rate
- [ ] Cart abandonment rate
- [ ] User engagement metrics

This checklist ensures a smooth deployment and ongoing maintenance of your BroLab Beats Store in production.