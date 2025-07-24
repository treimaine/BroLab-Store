# BroLab Beats Store - Comprehensive Testing Guide

## Overview
This guide covers testing procedures for the BroLab beats marketplace, including local testing, production testing, and automated testing strategies for the current application state with professional waveform audio system and table view layout.

## Current Application State

### Core Features to Test
- **Professional Waveform Audio Player**: Canvas-based visualization with individual controls per product
- **Table View Layout**: Professional table with thumbnails, waveforms, genre, duration, and actions
- **WooCommerce Integration**: Live product catalog from brolabentertainment.com
- **Multi-Payment Processing**: Stripe and PayPal with enhanced error handling
- **Responsive Design**: Mobile-first approach with comprehensive breakpoint support
- **License Management**: Three-tier pricing (Basic $29.99, Premium $49.99, Unlimited $149.99)

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

# Database (Needed for user accounts)
DATABASE_URL=your_postgresql_connection_string
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

### 3. Premium Member Journey
1. **Login**: Access member-only features
2. **Exclusive Content**: Browse premium beat library
3. **Downloads**: Access unlimited downloads
4. **License Management**: Track license usage

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

## Performance Testing

### Load Testing
```bash
# Test API performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/woocommerce/products
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
- [ ] Rate limiting
- [ ] Input validation
- [ ] Authentication tokens

### Frontend Security
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Secure API calls
- [ ] Environment variable handling

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

## Support and Troubleshooting

If you encounter issues during testing:

1. **Check Console**: Browser developer tools for frontend errors
2. **Check Server Logs**: Terminal output for backend errors
3. **Check Network**: Network tab for API call failures
4. **Check Environment**: Verify all required environment variables are set

For specific issues, refer to the error messages in the console and match them with the debugging sections above.