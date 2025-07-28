# BroLab Beats Store - Comprehensive Testing Guide

## Overview
This guide covers testing procedures for the BroLab beats marketplace, including local testing, production testing, and automated testing strategies for the current application state with professional waveform audio system, table view layout, and comprehensive security features.

## Current Application State

### Core Features to Test
- **Professional Waveform Audio Player**: Canvas-based visualization with individual controls per product
- **Table View Layout**: Professional table with thumbnails, waveforms, genre, duration, and actions
- **WooCommerce Integration**: Live product catalog from brolabentertainment.com
- **Multi-Payment Processing**: Stripe and PayPal with enhanced error handling
- **Responsive Design**: Mobile-first approach with comprehensive breakpoint support
- **License Management**: Three-tier pricing (Basic $29.99, Premium $49.99, Unlimited $149.99)
- **Supabase Database**: Modern PostgreSQL with Row-Level Security (RLS)
- **File Management System**: Secure uploads with antivirus scanning and quota management
- **Reservation System**: Studio booking and service order management
- **Email System**: Comprehensive templates and delivery management

## Testing Instructions

### 1. Basic Navigation Testing
```bash
# Start the application
npm run dev

# Test these pages in your browser:
- http://localhost:5000/ (Home page)
- http://localhost:5000/shop (Beats catalog)
- http://localhost:5000/membership (Subscription plans)
- http://localhost:5000/about (About page)
- http://localhost:5000/contact (Contact page)
- http://localhost:5000/mixing-mastering (Service page)
- http://localhost:5000/recording-sessions (Service page)
- http://localhost:5000/custom-beats (Service page)
- http://localhost:5000/production-consultation (Service page)
```

### 2. WordPress Content Testing
The application fetches real content from brolabentertainment.com:
- Legal pages should display content from WordPress
- About page should show company information
- Contact page should display contact details

### 3. WooCommerce Product Testing
Currently debugging the API connection. Expected functionality:
- Shop page should display beats from WooCommerce
- Product details should show price, description, and audio preview
- Categories should filter products by genre

### 4. Cart and Checkout Testing
```bash
# Test cart functionality:
1. Navigate to /shop
2. Click "Add to Cart" on any product
3. Check cart icon in navigation
4. View cart contents
5. Proceed to checkout (placeholder for now)
```

### 5. Subscription Testing
```bash
# Test membership signup:
1. Navigate to /membership
2. Select a subscription tier
3. Click "Get Started"
4. Check browser console for API calls
```

### 6. File Upload System Testing
```bash
# Test file upload functionality:
1. Navigate to admin area (if authenticated as admin)
2. Test file upload with various file types
3. Verify file validation and scanning
4. Check upload quota enforcement
5. Test file deletion and management
```

### 7. Download Quota System Testing
```bash
# Test download quota enforcement:
1. Login with different user types (basic, premium, unlimited)
2. Attempt to download beats
3. Verify quota limits are enforced
4. Check quota reset functionality (admin only)
```

### 8. Email System Testing
```bash
# Test email functionality:
1. Test user registration email verification
2. Test password reset emails
3. Test reservation confirmation emails
4. Test order confirmation emails
5. Verify email templates and delivery
```

## API Endpoints for Testing

### WordPress API
```bash
# Test WordPress pages
curl http://localhost:5000/api/wordpress/pages

# Test specific page
curl http://localhost:5000/api/wordpress/pages/about
```

### WooCommerce API
```bash
# Test products (currently debugging)
curl http://localhost:5000/api/woocommerce/products

# Test categories
curl http://localhost:5000/api/woocommerce/categories
```

### Subscription API
```bash
# Test subscription endpoint
curl -X POST http://localhost:5000/api/create-subscription \
  -H "Content-Type: application/json" \
  -d '{"priceId": "basic", "billingInterval": "monthly"}'
```

### File Management API
```bash
# Test file upload (requires authentication)
curl -X POST http://localhost:5000/api/storage/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-file.mp3" \
  -F "role=upload"

# Test file listing
curl http://localhost:5000/api/storage/files

# Test file deletion
curl -X DELETE http://localhost:5000/api/storage/files/{fileId}
```

### Download API
```bash
# Test download with quota enforcement
curl -X POST http://localhost:5000/api/downloads \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "license": "basic"}'

# Test download history
curl http://localhost:5000/api/downloads
```

### Reservation API
```bash
# Test reservation creation
curl -X POST http://localhost:5000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "mixing",
    "details": {
      "name": "Test User",
      "email": "test@example.com",
      "phone": "1234567890"
    },
    "preferred_date": "2025-02-01T10:00:00Z",
    "duration_minutes": 120,
    "total_price": 5000
  }'

# Test reservation listing
curl http://localhost:5000/api/reservations/me
```

### Email API
```bash
# Test email verification
curl -X GET "http://localhost:5000/api/email/verify-email?token=test-token"

# Test password reset
curl -X POST http://localhost:5000/api/email/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Security API
```bash
# Test security status
curl http://localhost:5000/api/security/status

# Test RLS initialization (admin only)
curl -X POST http://localhost:5000/api/security/admin/rls/initialize
```

### Monitoring API
```bash
# Test health check
curl http://localhost:5000/api/monitoring/health

# Test system status
curl http://localhost:5000/api/monitoring/status

# Test metrics (admin only)
curl http://localhost:5000/api/monitoring/metrics
```

## Environment Setup for Full Testing

### Required Environment Variables
```bash
# WordPress/WooCommerce (Already configured)
WORDPRESS_API_URL=https://brolabentertainment.com/wp-json/wp/v2
WOOCOMMERCE_API_URL=https://brolabentertainment.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret

# Stripe (Needed for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Database (Needed for user accounts)
DATABASE_URL=your_postgresql_connection_string

# Supabase (Needed for file management and RLS)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (Needed for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
DEFAULT_FROM=BroLab <contact@brolabentertainment.com>

# Security
SESSION_SECRET=your_session_secret
```

## Expected User Workflows

### 1. Guest User Journey
1. **Discovery**: Browse beats on shop page
2. **Preview**: Listen to beat previews with audio player
3. **Selection**: Add beats to cart with license selection
4. **Checkout**: Complete purchase as guest user

### 2. Registered User Journey
1. **Registration**: Create account with email/password
2. **Profile**: Access user dashboard with purchase history
3. **Subscription**: Upgrade to premium membership
4. **Benefits**: Access exclusive content and features
5. **Downloads**: Download purchased beats within quota limits
6. **Services**: Book studio sessions and order services

### 3. Premium Member Journey
1. **Login**: Access member-only features
2. **Exclusive Content**: Browse premium beat library
3. **Downloads**: Access unlimited downloads
4. **License Management**: Track license usage
5. **File Management**: Upload and manage files
6. **Reservations**: Book studio time and services

### 4. Admin User Journey
1. **Login**: Access admin dashboard
2. **File Management**: Manage all uploaded files
3. **User Management**: Monitor user activities
4. **Security**: Configure RLS policies
5. **Monitoring**: View system metrics and health
6. **Quota Management**: Reset user download quotas

## Debugging Common Issues

### WooCommerce API Issues
```bash
# Check if credentials are loaded
curl http://localhost:5000/api/health

# Test direct WooCommerce API
curl "https://brolabentertainment.com/wp-json/wc/v3/products?consumer_key=YOUR_KEY&consumer_secret=YOUR_SECRET"
```

### Stripe Integration Issues
```bash
# Verify Stripe keys are set
echo $STRIPE_SECRET_KEY
echo $VITE_STRIPE_PUBLIC_KEY

# Test Stripe connection
curl -X POST https://api.stripe.com/v1/payment_intents \
  -H "Authorization: Bearer YOUR_STRIPE_SECRET_KEY" \
  -d "amount=1000&currency=usd"
```

### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Run database migrations
npm run db:push
```

### Supabase Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/"

# Check RLS policies
curl -X POST http://localhost:5000/api/security/admin/rls/initialize
```

### File Upload Issues
```bash
# Test file upload endpoint
curl -X POST http://localhost:5000/api/storage/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-file.mp3"

# Check file validation
curl -X POST http://localhost:5000/api/storage/upload \
  -F "file=@invalid-file.exe"
```

### Email System Issues
```bash
# Test email configuration
curl -X POST http://localhost:5000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test", "html": "<p>Test</p>"}'

# Check SMTP settings
echo $SMTP_HOST
echo $SMTP_USER
```

## Browser Testing Checklist

### Desktop Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (Mac)
- [ ] Edge

### Mobile Testing
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] Responsive breakpoints (320px, 768px, 1024px)

### Feature Testing
- [ ] Audio player functionality
- [ ] Cart persistence across page refreshes
- [ ] License preview modal
- [ ] Subscription plan selection
- [ ] Form validation
- [ ] Error handling
- [ ] File upload interface
- [ ] Download quota display
- [ ] Reservation booking form
- [ ] Email verification flow
- [ ] Password reset flow

## Performance Testing

### Load Testing
```bash
# Test API performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/woocommerce/products

# Test file upload performance
curl -w "@curl-format.txt" -o /dev/null -s \
  -X POST http://localhost:5000/api/storage/upload \
  -F "file=@large-file.mp3"
```

### Bundle Size Analysis
```bash
# Analyze frontend bundle
npm run build
npx vite-bundle-analyzer dist
```

## Security Testing

### API Security
- [ ] CORS configuration
- [ ] Rate limiting (20 uploads/h, 100 downloads/h, 10 emails/day)
- [ ] Input validation avec schémas Zod centralisés
- [ ] Authentication tokens et sessions sécurisées
- [ ] Row-Level Security (RLS) policies
- [ ] File upload validation and scanning

### File Upload Security
- [ ] Validation MIME type avec file-type
- [ ] Limite taille fichier (50MB max)
- [ ] Scan antivirus avec ClamAV
- [ ] Validation chemins fichiers
- [ ] Stockage sécurisé Supabase
- [ ] Quota enforcement per user

### Frontend Security
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Secure API calls
- [ ] Environment variable handling
- [ ] Input sanitization

### Database Security
- [ ] Row-Level Security (RLS) policies
- [ ] User isolation
- [ ] Data encryption
- [ ] Access control validation

## Deployment Testing

### Production Build
```bash
# Build for production
npm run build

# Test production build
npm run preview
```

### Environment Variables
Ensure all production environment variables are set:
- WordPress/WooCommerce credentials
- Stripe keys
- Database connection
- Session secrets
- Supabase configuration
- Email settings

## Support and Troubleshooting

If you encounter issues during testing:

1. **Check Console**: Browser developer tools for frontend errors
2. **Check Server Logs**: Terminal output for backend errors
3. **Check Network**: Network tab for API call failures
4. **Check Environment**: Verify all required environment variables are set
5. **Check Database**: Verify database connection and schema
6. **Check Supabase**: Verify Supabase connection and RLS policies
7. **Check Email**: Verify SMTP configuration and delivery

For specific issues, refer to the error messages in the console and match them with the debugging sections above.

### Changelog

**2025-01-23** - Testing Guide Update
- Added comprehensive API endpoint testing for all new services
- Included file upload and download quota system testing
- Added email system testing procedures
- Included reservation and service order testing
- Added security testing for RLS and file validation
- Updated environment variables for all new services
- Added debugging procedures for Supabase and file management
- Included admin user journey and testing scenarios