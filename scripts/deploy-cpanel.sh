#!/bin/bash

# BroLab Beats Store - cPanel Deployment Script

echo "🚀 Deploying BroLab Beats Store to cPanel..."

# Configuration
DOMAIN="your-domain.com"
CPANEL_USER="your_cpanel_user"
APP_NAME="brolab-beats"

echo "📦 Preparing production build..."

# Clean previous builds
rm -rf dist/
rm -rf node_modules/

# Install production dependencies
npm ci --production

# Build the application
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf ${APP_NAME}-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.env.example' \
  --exclude='docker-compose*.yml' \
  --exclude='scripts' \
  --exclude='README*.md' \
  --exclude='LOCAL_DEVELOPMENT_GUIDE.md' \
  .

echo "✅ Deployment package created: ${APP_NAME}-deploy.tar.gz"
echo ""
echo "📋 cPanel Deployment Steps:"
echo ""
echo "1. Upload ${APP_NAME}-deploy.tar.gz to your cPanel File Manager"
echo "2. Extract the archive in your Node.js app directory"
echo "3. Configure Node.js App in cPanel:"
echo "   - App Root: public_html/${APP_NAME}"
echo "   - Startup File: server/index.js"
echo "   - Node.js Version: 18.x or higher"
echo ""
echo "4. Install dependencies in cPanel terminal:"
echo "   cd \$HOME/public_html/${APP_NAME}"
echo "   npm install --production"
echo ""
echo "5. Set environment variables in cPanel Node.js interface:"
echo "   - DATABASE_URL (PostgreSQL connection string)"
echo "   - STRIPE_SECRET_KEY (Live Stripe key)"
echo "   - VITE_STRIPE_PUBLIC_KEY (Live Stripe public key)"
echo "   - VITE_PAYPAL_CLIENT_ID (Live PayPal client ID)"
echo "   - SESSION_SECRET (Strong random string)"
echo "   - NODE_ENV=production"
echo ""
echo "6. Create PostgreSQL database in cPanel and update DATABASE_URL"
echo ""
echo "7. Push database schema:"
echo "   npm run db:push"
echo ""
echo "8. Start the application in cPanel Node.js interface"
echo ""
echo "🔗 Your app will be available at: https://${DOMAIN}"
echo ""
echo "🔧 For custom domain setup:"
echo "   - Point domain to your cPanel server"
echo "   - Configure DNS records"
echo "   - Enable SSL certificate"
echo ""