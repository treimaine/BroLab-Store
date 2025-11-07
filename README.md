# BroLab Entertainment - Professional Beats Marketplace

A cutting-edge beats marketplace platform revolutionizing music production and licensing through intelligent technology and seamless user experience.

## 🎵 Overview

BroLab Entertainment is a modern full-stack TypeScript application that provides a professional marketplace for music producers and artists. Built with React 18, Express, and Convex real-time database, the platform offers advanced features including:

- **Professional Audio System**: WaveSurfer.js waveform visualization with individual preview controls
- **Real-time Database**: Convex integration for live updates, notifications, and collaborative features
- **WordPress/WooCommerce Integration**: Full product catalog sync with external CMS
- **Multi-Payment Processing**: Stripe and PayPal with comprehensive webhook handling
- **Clerk Authentication**: Enterprise-grade user management with billing integration
- **Service Booking System**: Complete reservation management for mixing, mastering, recording, and consultation
- **Advanced Security**: Multi-layer security with Clerk, rate limiting, and comprehensive validation
- **Responsive Design**: Mobile-first approach with device-specific optimizations (320px-1920px+)

## ✨ Key Features

### Core Functionality

- **Professional Audio Preview System**: WaveSurfer.js waveform visualization with individual preview controls for each beat
- **Real-time Database**: Convex integration for live updates and real-time features
- **WooCommerce Integration**: Full product catalog sync with WordPress backend
- **Multi-Payment Processing**: Stripe and PayPal integration with comprehensive error handling
- **Responsive Design**: Mobile-first approach with device-specific optimizations (320px-1920px+)
- **Advanced Cart System**: Persistent cart with license selection and pricing management
- **Dual Database Strategy**: Convex for new real-time features, Supabase for legacy support
- **File Management System**: Secure file uploads with antivirus scanning and quota management
- **Comprehensive Reservation System**: Studio booking, mixing, mastering, recording, and consultation services
- **Advanced Security**: Clerk authentication, RLS policies, rate limiting, and comprehensive validation

### Advanced Features

- **Real-time Updates**: Convex-powered live data synchronization and notifications
- **Geolocation & Multi-Currency**: Automatic currency detection and conversion based on user location
- **Multi-Language Support**: 6 languages with automatic IP-based language detection
- **Professional Waveform Audio Player**: WaveSurfer.js integration with table view and individual audio previews
- **License Management**: Multiple licensing tiers (Basic $29.99, Premium $49.99, Unlimited $149.99)
- **Enhanced User Experience**: Professional table layout matching industry standards
- **Comprehensive Service Orders**: Mixing, mastering, recording, and consultation booking system
- **Subscription Management**: Clerk Billing integration with license-based download quotas
- **Automated Email System**: Comprehensive email templates with delivery management and scheduling
- **Advanced Reservation System**: Real-time booking with status updates and reminder notifications

### Technical Excellence

- **Type-Safe Development**: Full TypeScript strict mode with shared schemas and validation
- **Modern State Management**: Zustand for client state, TanStack Query for server state
- **Real-time Architecture**: Convex mutations and queries for live data updates
- **Accessibility Compliant**: WCAG AA standards with reduced motion support
- **Performance Optimized**: Lazy loading, code splitting, caching, and CDN integration
- **Security First**: Clerk authentication, Row-Level Security, input validation, and comprehensive error handling
- **Testing Strategy**: Jest, React Testing Library, and Supertest for comprehensive coverage

## 🏗️ Technical Architecture

### Frontend Stack

- **React 18.3.1** with TypeScript strict mode and functional components only
- **Vite 5.4+** for lightning-fast development and optimized production builds
- **Tailwind CSS 3.4+** with shadcn/ui + Radix UI accessible component primitives
- **Wouter 3.3+** for lightweight client-side routing (not React Router)
- **TanStack Query 5.60+** for server state caching with stale-while-revalidate
- **Zustand 5.0+** for client state management (not Redux/Context API)
- **WaveSurfer.js 7.10+** for professional audio waveform visualization
- **Framer Motion 11.18+** for smooth animations and transitions
- **React Hook Form 7.55+** with Zod validation for type-safe forms

### Backend Stack

- **Node.js 20+** with Express 4.21+ and TypeScript strict mode
- **Convex 1.25+** real-time database (primary) for new features and live updates
- **Clerk 5.39+** authentication with enterprise-grade user management and billing
- **Stripe 18.4+** payment processing with webhook validation
- **PayPal Server SDK 1.1+** for alternative payment processing
- **Nodemailer 7.0+** for transactional email delivery
- **Multer 2.0+** for secure file upload handling

### Database Architecture

- **Convex (Primary)**: Real-time database for all new features
  - Users, orders, reservations, subscriptions, downloads
  - Real-time mutations and queries with automatic caching
  - Built-in authentication integration with Clerk
  - Optimistic updates and conflict resolution
- **WordPress/WooCommerce (External)**: Product catalog source
  - Read-only integration via REST API v3
  - OAuth 1.0a authentication
  - Scheduled sync (not real-time) for performance
  - Never write back to WordPress from the app

### Development Tools

- **npm 9+** package management (no yarn/pnpm)
- **ESLint 9.15+** with React and TypeScript rules
- **Jest 30.0+** with React Testing Library 16.3+ for unit and component testing
- **Supertest 7.1+** for API endpoint testing
- **TypeScript 5.6.3** with strict mode and explicit return types

## 📚 Documentation

All project documentation has been organized in the `docs/` directory:

- **Development**: Setup guides, coding standards, and development workflows
- **Deployment**: Production deployment checklists and hosting guides
- **Testing**: Testing strategies, guides, and specifications
- **Specifications**: Feature specs, API documentation, and system requirements
- **Archive**: Historical documentation, completed migrations, and fix summaries

For quick access:

- 🚀 **Getting Started**: `docs/development/LOCAL_DEVELOPMENT_GUIDE.md`
- 🔧 **Deployment**: `docs/deployment/DEPLOYMENT_CHECKLIST.md`
- 🧪 **Testing**: `docs/testing/TESTING_GUIDE.md`
- 📋 **Full Index**: `docs/README.md`
- **WordPress/WooCommerce** REST API integration
- **Stripe + PayPal** payment processing
- **Session-based authentication** with bcrypt
- **Supabase Storage** for secure file management
- **Row-Level Security** for data protection
- **Comprehensive validation** with Zod schemas

### Development & Deployment

- **Local Development**: Docker PostgreSQL setup with automated scripts
- **Production Ready**: Optimized builds for o2switch cPanel hosting
- **CI/CD Ready**: Comprehensive deployment checklist and automation scripts
- **Database Management**: Supabase dashboard and Drizzle Studio integration

## 🚀 Quick Start

### Local Development Setup

```bash
# Clone and setup
git clone <repository-url> brolab-beats
cd brolab-beats

# Run automated setup
./scripts/setup-local.sh

# Start development server
npm run dev
```

### Production Deployment

```bash
# Create deployment package
./scripts/deploy-cpanel.sh

# Follow deployment guide
# See DEPLOYMENT_CHECKLIST.md for complete steps
```

## 📁 Project Structure

```
brolab-beats/
├── client/                      # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/          # Feature-based UI components
│   │   │   ├── audio/           # Audio player and waveform components
│   │   │   ├── beats/           # Beat cards, grids, and filters
│   │   │   ├── cart/            # Shopping cart components
│   │   │   ├── dashboard/       # User dashboard components
│   │   │   ├── reservations/    # Booking and reservation UI
│   │   │   └── ui/              # shadcn/ui primitives
│   │   ├── pages/               # Route components
│   │   │   ├── shop.tsx         # Main beats catalog
│   │   │   ├── dashboard.tsx    # User dashboard
│   │   │   ├── mixing-mastering.tsx
│   │   │   └── ...              # Other pages
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useDashboard.ts  # Dashboard data management
│   │   │   ├── useCart.ts       # Cart state management
│   │   │   └── ...              # 40+ custom hooks
│   │   ├── stores/              # Zustand state stores
│   │   │   ├── useCartStore.ts
│   │   │   ├── useAudioStore.ts
│   │   │   └── useDashboardStore.ts
│   │   ├── services/            # Client-side business logic
│   │   │   ├── CartSyncService.ts
│   │   │   ├── SyncManager.ts
│   │   │   └── ...
│   │   ├── lib/                 # Utilities and configurations
│   │   │   ├── convex.ts        # Convex client setup
│   │   │   ├── queryClient.ts   # TanStack Query config
│   │   │   └── utils.ts         # Helper functions
│   │   └── types/               # Frontend-only types
├── server/                      # Express backend API
│   ├── routes/                  # API route handlers
│   │   ├── woo.ts               # WooCommerce integration
│   │   ├── stripe.ts            # Stripe payment processing
│   │   ├── paypal.ts            # PayPal integration
│   │   ├── reservations.ts      # Booking system
│   │   ├── downloads.ts         # File download management
│   │   └── ...                  # 20+ route files
│   ├── services/                # Business logic layer
│   │   ├── woo.ts               # WooCommerce API service
│   │   ├── PaymentService.ts    # Payment processing
│   │   ├── ReservationEmailService.ts
│   │   └── ...
│   ├── middleware/              # Express middleware
│   │   ├── clerkAuth.ts         # Clerk authentication
│   │   ├── rateLimiter.ts       # Rate limiting
│   │   ├── validation.ts        # Request validation
│   │   └── fileUploadSecurity.ts
│   ├── lib/                     # Core libraries
│   │   ├── convex.ts            # Convex server integration
│   │   ├── logger.ts            # Structured logging
│   │   ├── audit.ts             # Audit logging
│   │   └── ...
│   └── types/                   # Server-only types
├── convex/                      # Convex real-time database
│   ├── schema.ts                # Database schema (single source of truth)
│   ├── users/                   # User management functions
│   │   ├── clerkSync.ts         # Clerk user synchronization
│   │   ├── getUserStats.ts      # User statistics
│   │   └── ...
│   ├── orders/                  # Order management
│   │   ├── createOrder.ts
│   │   ├── confirmPayment.ts
│   │   └── ...
│   ├── reservations/            # Reservation system
│   │   ├── createReservation.ts
│   │   ├── updateReservationStatus.ts
│   │   ├── sendReminderEmail.ts
│   │   └── ...
│   ├── subscriptions/           # Subscription management
│   ├── downloads/               # Download tracking
│   ├── favorites/               # User favorites
│   └── _generated/              # Auto-generated Convex files
├── shared/                      # Cross-platform code
│   ├── types/                   # Shared TypeScript interfaces
│   │   ├── Beat.ts              # Beat/product types
│   │   ├── Order.ts             # Order types
│   │   ├── User.ts              # User types
│   │   ├── Reservation.ts       # Reservation types
│   │   └── index.ts             # Central export
│   ├── validation.ts            # Zod validation schemas
│   ├── constants/               # Enums and constants
│   │   └── ErrorMessages.ts
│   └── schema.ts                # Legacy schema definitions
├── components/                  # shadcn/ui components
│   └── ui/                      # Reusable UI primitives
├── __tests__/                   # Test files and utilities
│   ├── components/              # Component tests
│   ├── server/                  # API tests
│   └── test-utils.tsx           # Testing utilities
├── scripts/                     # Build and deployment scripts
│   ├── setup-local.sh           # Local development setup
│   ├── deploy-cpanel.sh         # Production deployment
│   └── ...
├── docs/                        # Documentation
│   ├── development/             # Development guides
│   ├── deployment/              # Deployment guides
│   ├── testing/                 # Testing documentation
│   └── specifications/          # Feature specifications
└── attached_assets/             # Static assets and uploads
```

## 🔧 Development Commands

```bash
# Development
npm run dev                # Start full-stack development server (Express + Vite)
npm run dev:development    # Explicit development mode
npm run client             # Frontend-only development (Vite on port 5000)

# Convex Database (Primary)
npx convex dev             # Start Convex development server
npx convex dashboard       # Open Convex dashboard in browser
npx convex deploy          # Deploy Convex functions to production
npx convex import          # Import data from file
npx convex export          # Export data to file

# Build & Production
npm run build              # Build for production (Vite + esbuild)
npm run start              # Start production server
npm run clean              # Clean node_modules and reinstall
npm run clean:all          # Full cleanup (node_modules, dist, cache)
npm run clean:logs         # Clear application logs
npm run clean:db           # Clear database (development only)

# Code Quality
npm run type-check         # TypeScript validation (no emit)
npm run lint               # ESLint code checking
npm run lint:fix           # Auto-fix linting issues
npm run pre-check          # Run type-check + lint together
npm run pre-commit         # Pre-commit validation hook
npm run verify             # Comprehensive validation

# Testing
npm test                   # Run Jest test suite
npm run test:email         # Test email delivery system

# Utilities
npm run generate-favicon   # Generate favicon from logo
npm run fix-subscriptions  # Fix subscription data issues
```

## 🌐 Environment Configuration

### Required Environment Variables

```env
# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
NODE_ENV=development                    # development | production
PORT=5000                               # Server port

# Brand Information
BRAND_NAME="BroLab Entertainment"
BRAND_EMAIL="contact@brolabentertainment.com"
BRAND_ADDRESS="Fr, Lille"
BRAND_LOGO_PATH="attached_assets/Brolab logo trans_1752778608299.png"

# ============================================================================
# CONVEX DATABASE (Primary - Required)
# ============================================================================
CONVEX_DEPLOYMENT="dev:agile-boar-163"  # Convex deployment name
VITE_CONVEX_URL="https://agile-boar-163.convex.cloud"

# ============================================================================
# CLERK AUTHENTICATION (Required)
# ============================================================================
# Development Keys
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
CLERK_FRONTEND_API_URL="https://relieved-crayfish-7.clerk.accounts.dev"

# Production Keys (commented out for development)
# VITE_CLERK_PUBLISHABLE_KEY="pk_live_..."
# CLERK_SECRET_KEY="sk_live_..."
# CLERK_WEBHOOK_SECRET="whsec_..."
# CLERK_FRONTEND_API_URL="https://clerk.brolabentertainment.com"

CLERK_BILLING_ENABLED=true              # Enable Clerk Billing integration

# ============================================================================
# WORDPRESS/WOOCOMMERCE INTEGRATION (Required)
# ============================================================================
# WordPress REST API
WORDPRESS_API_URL="https://brolabentertainment.com/wp-json/wp/v2"
WORDPRESS_USERNAME="your_username"
WORDPRESS_APP_PASSWORD="your_app_password"

# WooCommerce REST API v3
WOOCOMMERCE_API_URL="https://brolabentertainment.com/wp-json/wc/v3"
WOOCOMMERCE_CONSUMER_KEY="ck_..."
WOOCOMMERCE_CONSUMER_SECRET="cs_..."

# Frontend WooCommerce (VITE_ prefix required for client access)
VITE_WC_KEY="ck_..."
VITE_WC_SECRET="cs_..."

# ============================================================================
# STRIPE PAYMENT PROCESSING (Required)
# ============================================================================
VITE_STRIPE_PUBLIC_KEY="pk_live_..."    # Public key for client
STRIPE_SECRET_KEY="sk_live_..."         # Secret key for server
STRIPE_WEBHOOK_SECRET="whsec_..."       # Webhook signature verification

# ============================================================================
# PAYPAL PAYMENT PROCESSING (Required)
# ============================================================================
# Production Configuration
PAYPAL_CLIENT_ID="live_..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_MODE="production"                # production | sandbox
PAYPAL_WEBHOOK_ID="..."
PAYPAL_API_BASE="https://api-m.paypal.com"

# Sandbox Configuration (for testing)
# PAYPAL_CLIENT_ID="sb_..."
# PAYPAL_CLIENT_SECRET="..."
# PAYPAL_MODE="sandbox"
# PAYPAL_WEBHOOK_ID="..."
# PAYPAL_API_BASE="https://api-m.sandbox.paypal.com"

# ============================================================================
# EMAIL CONFIGURATION (Choose one)
# ============================================================================
# Option 1: Resend (Recommended for production)
RESEND_API_KEY="re_..."

# Option 2: Gmail SMTP (For development/testing)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"           # Generate at https://myaccount.google.com/apppasswords

# ============================================================================
# SECURITY
# ============================================================================
SESSION_SECRET="your_64_character_hex_session_secret"
CLIENT_URL="https://brolabentertainment.com"  # For CORS and redirects

# ============================================================================
# FEATURE FLAGS (Optional)
# ============================================================================
VITE_FEATURE_REALTIME_UPDATES=true
VITE_FEATURE_ANALYTICS_CHARTS=true
VITE_FEATURE_ADVANCED_FILTERS=true
VITE_FEATURE_PERFORMANCE_MONITORING=false
VITE_FEATURE_ERROR_TRACKING=false
VITE_FEATURE_OFFLINE_SUPPORT=false

# ============================================================================
# DEVELOPMENT TOOLS (Optional)
# ============================================================================
VITE_DEV_TOOLS=true                     # Enable development tools
VITE_LOG_LEVEL="info"                   # debug | info | warn | error
VITE_USE_MOCK_DATA=false                # Use mock data instead of real API
```

### Production Deployment

For production deployment:

1. **Update all API keys** to production values
2. **Set NODE_ENV** to `production`
3. **Enable SSL/TLS** for all endpoints
4. **Configure domain** and DNS settings
5. **Set up webhook endpoints** for Stripe, PayPal, and Clerk
6. **Review security settings** and rate limits
7. **Test payment flows** thoroughly before going live

See `docs/deployment/DEPLOYMENT_CHECKLIST.md` for complete production setup guide.

## 📱 Responsive Design

### Breakpoint System

- **Mobile**: 320px - 640px (xs, sm)
- **Tablet**: 641px - 1024px (md, lg)
- **Desktop**: 1025px+ (xl, 2xl)

### Key Features

- Touch-friendly interactions (44px+ tap targets)
- Safe-area support for iOS/Android notch devices
- Network-aware loading optimizations
- Reduced motion support for accessibility

## 🎵 Audio System

### WaveSurfer.js Integration

- **Professional Waveform Visualization**: Canvas-based rendering with customizable colors
- **Individual Audio Controls**: Each beat has independent audio preview in table view
- **Click-to-Seek Functionality**: Visual progress tracking with precise seeking
- **Modern UI Design**: Cyan-themed interface matching industry music platforms (Beatstars, Airbit)
- **Mobile-Optimized**: Touch-friendly controls with backdrop blur effects
- **Performance Optimized**: Lazy loading and efficient rendering for large catalogs
- **Global Audio Player**: Persistent player with queue management and playback controls

### Audio Features

- **Multiple Format Support**: MP3, WAV, FLAC, AIFF, OGG, M4A
- **Preload on Hover**: Instant playback with intelligent preloading
- **Playback Controls**: Play, pause, seek, volume, and speed control
- **Waveform Customization**: Adjustable colors, heights, and responsive sizing
- **Memory Management**: Automatic cleanup on component unmount
- **Error Handling**: Graceful fallbacks for unsupported formats or network issues

## 📡 API Documentation

### REST API Endpoints

#### Authentication & Users

- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signout` - User sign out
- `GET /api/auth/user` - Get current user (authenticated)
- `GET /api/user/sync-status` - Check Clerk/Convex sync status

#### Products & Beats

- `GET /api/woocommerce/products` - List all products with filters
- `GET /api/woocommerce/products/:id` - Get single product details
- `GET /api/woocommerce/categories` - List product categories
- `GET /api/beats` - Compatibility endpoint for beats (maps to products)
- `POST /api/beats` - Create beat (not supported, returns 404)

#### Shopping Cart & Wishlist

- `GET /api/wishlist` - Get user's wishlist (authenticated)
- `POST /api/wishlist` - Add beat to wishlist (authenticated)
- `DELETE /api/wishlist/:beatId` - Remove beat from wishlist (authenticated)
- `DELETE /api/wishlist` - Clear entire wishlist (authenticated)

#### Orders & Payments

- `POST /api/payment/stripe/checkout` - Create Stripe checkout session
- `POST /api/payment/stripe/create-payment-intent` - Create payment intent
- `GET /api/payment/stripe/payment-intent/:id` - Get payment intent status
- `POST /api/payment/paypal/*` - PayPal payment endpoints
- `GET /api/download/:licenseType/:beatName` - Download purchased beat

#### Reservations & Services

- `GET /api/reservations/services` - List available services (public)
- `GET /api/reservations/public` - Get public reservation info
- `POST /api/reservations` - Create new reservation (authenticated)
- `GET /api/reservations/me` - Get user's reservations (authenticated)
- `GET /api/reservations/:id` - Get specific reservation (authenticated)
- `PATCH /api/reservations/:id/status` - Update reservation status (authenticated)
- `GET /api/reservations/:id/calendar` - Get ICS calendar file (authenticated)

#### Downloads & Files

- `GET /api/downloads` - List user downloads (authenticated)
- `POST /api/storage/upload` - Upload file (authenticated, rate limited)
- `GET /api/storage/signed-url/:fileId` - Get signed download URL (authenticated)
- `GET /api/storage/files` - List user files (authenticated)
- `DELETE /api/storage/files/:fileId` - Delete file (authenticated)

#### Webhooks

- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/paypal` - PayPal webhook handler
- `GET /api/webhooks/health` - Webhook health check

#### Monitoring & Health

- `GET /api/health` - Server health check
- `GET /api/monitoring/*` - Performance monitoring endpoints
- `GET /api/security/status` - Security status check

#### SEO & Schema

- `GET /api/sitemap.xml` - XML sitemap
- `GET /api/robots.txt` - Robots.txt file
- `GET /api/schema/beat/:id` - Schema markup for beat
- `GET /api/schema/beats-list` - Schema markup for beats list
- `GET /api/schema/organization` - Organization schema markup

### Convex Real-time Functions

#### User Management

- `getUserByClerkId(clerkId)` - Query user by Clerk ID
- `getUserByEmail(email)` - Query user by email
- `getUserById(id)` - Query user by Convex ID
- `upsertUser(userData)` - Create or update user
- `getUserStats(clerkId)` - Get user statistics
- `syncClerkUser(clerkData)` - Sync user from Clerk webhook

#### Orders

- `createOrder(orderData)` - Create new order
- `confirmPayment(orderId, paymentData)` - Confirm payment for order
- `updateOrder(orderId, updates)` - Update order details
- `recordPayment(paymentData)` - Record payment transaction
- `markProcessedEvent(eventId)` - Mark webhook event as processed

#### Reservations

- `createReservation(reservationData)` - Create new reservation
- `listReservations(userId)` - List user reservations
- `updateReservationStatus(reservationId, status)` - Update status
- `checkAvailability(date, serviceType)` - Check time slot availability
- `sendReminderEmail(reservationId)` - Send reminder notification
- `sendStatusUpdateEmail(reservationId)` - Send status update

#### Subscriptions & Quotas

- `getCurrentSubscription(userId)` - Get active subscription
- `upsertSubscription(subscriptionData)` - Create or update subscription
- `updateSubscription(subscriptionId, updates)` - Update subscription
- `getUserQuotas(userId)` - Get user download quotas
- `checkDownloadQuota(userId)` - Check if user can download
- `incrementDownloadUsage(userId)` - Increment download count

#### Downloads & Favorites

- `listDownloads(userId)` - List user downloads
- `logDownload(downloadData)` - Record download event
- `getFavorites(userId)` - Get user favorites
- `addFavorite(userId, beatId)` - Add beat to favorites
- `removeFavorite(userId, beatId)` - Remove from favorites

#### Activity & Audit

- `logActivity(userId, action, details)` - Log user activity
- `getRecentActivity(userId)` - Get recent activity log

### Rate Limits

- **API Endpoints**: 1000 requests per 15 minutes per IP
- **File Uploads**: 10 uploads per hour per user
- **File Downloads**: 50 downloads per hour per user
- **Webhook Endpoints**: No rate limit (validated by signature)

### Authentication

All authenticated endpoints require one of:

- **Clerk Session Token**: Passed via Clerk middleware
- **Bearer Token**: For API integrations (test mode only)

### Error Responses

All API endpoints return consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error context (development only)
  }
}
```

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🔒 Security Features

- **Clerk Authentication**: Enterprise-grade user management and authentication
- **Environment Variable Protection**: Secure configuration management
- **HTTPS Enforcement**: SSL/TLS encryption in production
- **Rate Limiting**: API endpoint protection and abuse prevention
- **Secure Session Management**: JWT-based authentication with Clerk
- **Payment Data Encryption**: PCI-compliant Stripe and PayPal integration
- **Row-Level Security (RLS)**: Database-level access control (Supabase)
- **File Upload Security**: Antivirus scanning and comprehensive validation
- **Download Quota Enforcement**: License-based limits with real-time tracking
- **Comprehensive Input Validation**: Zod schema validation across all endpoints
- **Real-time Security**: Convex-powered permission validation and access control

## 📈 Performance Optimizations

- **Code Splitting**: Vite-powered lazy loading for components and routes
- **Virtual Scrolling**: Efficient rendering for large product catalogs
- **CDN Integration**: Static asset optimization and delivery
- **Database Query Optimization**: Indexed queries and efficient data fetching
- **Client-side Caching**: TanStack Query for intelligent server state management
- **Real-time Efficiency**: Convex optimized queries and mutations
- **Supabase Edge Functions**: Serverless computing for legacy features
- **Database Indexing**: Optimized query performance across both databases
- **File Compression**: Automatic asset optimization and progressive loading
- **Bundle Optimization**: Tree shaking and dynamic imports for minimal bundle size

## 🛠️ Development Workflow

1. **Local Development**: Convex dev server with Clerk authentication
2. **Feature Development**: Type-safe development with hot reloading and strict TypeScript
3. **Real-time Features**: Use Convex mutations and queries for new functionality
4. **Legacy Maintenance**: Maintain Supabase integration without extending
5. **Testing**: Comprehensive Jest and React Testing Library test suite
6. **Deployment**: Automated scripts for production deployment
7. **Monitoring**: Real-time error tracking and performance monitoring

### Database Strategy

- **New Features**: Use Convex mutations/queries for real-time capabilities
- **Legacy Features**: Maintain Supabase integration, don't extend
- **Data Flow**: Client → Convex (real-time) or Client → Express → External APIs
- **Database Management**: Convex dashboard for real-time data, Drizzle Studio for legacy
- **Security Testing**: Validate Clerk permissions and Convex access controls

## 📚 Documentation

### Quick Links

- 🚀 **Getting Started**: `docs/development/LOCAL_DEVELOPMENT_GUIDE.md`
- 🔧 **Deployment**: `docs/deployment/DEPLOYMENT_CHECKLIST.md`
- 🧪 **Testing**: `docs/testing/TESTING_GUIDE.md`
- 📋 **Full Index**: `docs/README.md`

### Documentation Structure

```
docs/
├── development/              # Development guides
│   ├── LOCAL_DEVELOPMENT_GUIDE.md
│   ├── CODING_STANDARDS.md
│   └── TROUBLESHOOTING.md
├── deployment/               # Deployment guides
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── PRODUCTION_SETUP.md
│   └── HOSTING_GUIDE.md
├── testing/                  # Testing documentation
│   ├── TESTING_GUIDE.md
│   ├── TEST_SPECIFICATIONS.md
│   └── TESTSPRITE_INTEGRATION.md
├── specifications/           # Feature specifications
│   ├── AUDIO_SYSTEM.md
│   ├── RESERVATION_SYSTEM.md
│   ├── PAYMENT_FLOW.md
│   └── DASHBOARD_FEATURES.md
└── archive/                  # Historical documentation
    ├── SUPABASE_MIGRATION_GUIDE.md
    ├── PHASE_6_RLS_SECURITY_REPORT.md
    └── completed_fixes/
```

### Key Documentation Files

- **Architecture**: `replit.md` - Technical architecture and project context
- **Security**: `docs/specifications/SECURITY_IMPLEMENTATION.md`
- **API Reference**: This README (API Documentation section)
- **Database Schema**: `convex/schema.ts` with inline documentation
- **Type Definitions**: `shared/types/index.ts` - Central type exports

## 🏆 Production Ready

This application is production-ready with:

- **Comprehensive Error Handling**: Robust error boundaries and logging across all layers
- **Security Best Practices**: Clerk authentication, RLS policies, and comprehensive validation
- **Performance Optimization**: Code splitting, lazy loading, and efficient data fetching
- **Scalable Architecture**: Convex real-time database with Express API integration
- **Professional Deployment**: Automated workflows with comprehensive testing
- **Real-time Capabilities**: Live updates, notifications, and collaborative features
- **Enterprise Authentication**: Clerk-powered user management with billing integration
- **File Management**: Secure upload, storage, and antivirus scanning system
- **Service Management**: Complete reservation, booking, and order management system
- **Multi-platform Support**: Responsive design with mobile-first approach

## 🎯 Unique Features & Differentiators

### What Makes BroLab Entertainment Special

1. **Real-time Everything**
   - Live dashboard updates without page refresh
   - Instant notification system for orders and reservations
   - Real-time inventory and availability tracking
   - Collaborative features with Convex subscriptions

2. **Professional Audio Experience**
   - Industry-standard waveform visualization
   - Individual audio players per beat (not global only)
   - Preload on hover for instant playback
   - Professional table layout matching Beatstars/Airbit

3. **Comprehensive Service Booking**
   - Unified reservation system for all services
   - Automated email notifications and reminders
   - Calendar integration (ICS file generation)
   - Real-time availability checking

4. **Enterprise-Grade Security**
   - Clerk authentication with billing integration
   - Multi-layer validation (client + server + database)
   - Comprehensive audit logging
   - Rate limiting and abuse prevention
   - Webhook signature verification

5. **Developer-Friendly Architecture**
   - Type-safe from database to UI
   - Shared schemas across all layers
   - Comprehensive error handling
   - Extensive documentation
   - Easy to extend and maintain

6. **Performance Optimized**
   - Code splitting and lazy loading
   - Intelligent caching strategies
   - Optimistic UI updates
   - Bundle size optimization
   - CDN-ready static assets

7. **Production Ready**
   - Comprehensive testing suite
   - Automated deployment workflows
   - Error tracking and monitoring
   - Scalable architecture
   - Docker support for development

## 🤝 Support & Resources

### Development Support

- **Documentation**: Comprehensive guides in `docs/` directory
- **Development Setup**: `docs/development/LOCAL_DEVELOPMENT_GUIDE.md`
- **Deployment Guide**: `docs/deployment/DEPLOYMENT_CHECKLIST.md`
- **Testing Guide**: `docs/testing/TESTING_GUIDE.md`
- **Troubleshooting**: `docs/development/TROUBLESHOOTING.md`

### External Dashboards

- **Convex Dashboard**: Real-time database and function management
  - Access: `npx convex dashboard`
  - URL: https://dashboard.convex.dev

- **Clerk Dashboard**: User management and authentication settings
  - URL: https://dashboard.clerk.com

- **Stripe Dashboard**: Payment processing and webhooks
  - URL: https://dashboard.stripe.com

- **PayPal Dashboard**: Alternative payment processing
  - URL: https://developer.paypal.com/dashboard

### Community & Contact

- **GitHub Repository**: [treimaine/BroLab-Store](https://github.com/treimaine/BroLab-Store)
- **Website**: [brolabentertainment.com](https://brolabentertainment.com)
- **Email**: contact@brolabentertainment.com

### Contributing

This is a private commercial project. For inquiries about collaboration or licensing, please contact the development team.

---

**BroLab Entertainment** - Revolutionizing music production through technology

_Built with ❤️ using React, TypeScript, Convex, and modern web technologies_

## Import Aliases & TypeScript Configuration

This project uses strict TypeScript configuration with import aliases for clean code organization:

```typescript
// Use these exact aliases in imports
import { Component } from "@/components/Component"; // client/src/
import { validateUser } from "@shared/validation"; // shared/
import { getUserById } from "@convex/users"; // convex/
```

### TypeScript Standards

- **Strict Mode Enabled**: No `any` types allowed
- **Explicit Return Types**: Required for all functions
- **Proper Error Handling**: Typed exceptions and Result patterns
- **Zod Validation**: Runtime validation with compile-time type safety

## Custom Type Definitions

- `server/types/json2csv.d.ts`: Custom types for json2csv library (CSV export functionality)
- `__tests__/types/mocks.ts`: Test utilities and mock type definitions
- `shared/types/`: Cross-platform interfaces and type definitions

## 📊 Key Metrics & Statistics

### Codebase Statistics

- **Total Files**: 500+ TypeScript/React files
- **Lines of Code**: ~50,000+ lines
- **Components**: 100+ React components
- **API Endpoints**: 50+ REST endpoints
- **Convex Functions**: 80+ real-time functions
- **Custom Hooks**: 40+ React hooks
- **Test Coverage**: Comprehensive Jest + React Testing Library suite

### Technology Versions

- **React**: 18.3.1
- **TypeScript**: 5.6.3
- **Node.js**: 20+ (required)
- **Vite**: 5.4.19
- **Convex**: 1.25.4
- **Clerk**: 5.39.0
- **Stripe**: 18.4.0
- **TanStack Query**: 5.60.5
- **Zustand**: 5.0.6
- **WaveSurfer.js**: 7.10.0

### Database Schema

**Convex Tables** (Primary Database):

- `users` - User accounts and profiles
- `beats` - Product catalog (synced from WordPress)
- `orders` - Purchase orders and transactions
- `orderItems` - Individual order line items
- `payments` - Payment records (Stripe/PayPal)
- `reservations` - Service bookings and appointments
- `subscriptions` - User subscription plans
- `invoices` - Billing invoices
- `quotas` - Download quotas and limits
- `quotaUsage` - Quota usage tracking
- `downloads` - Download history
- `favorites` - User favorite beats
- `cartItems` - Shopping cart items
- `activityLog` - User activity tracking
- `auditLogs` - Security audit trail
- `rateLimits` - Rate limiting data
- `processedEvents` - Webhook idempotency
- `counters` - Atomic counters
- `invoicesOrders` - Order invoices

### Performance Benchmarks

- **Initial Load**: < 2s (optimized bundle)
- **Time to Interactive**: < 3s
- **Lighthouse Score**: 90+ (Performance, Accessibility, Best Practices)
- **Bundle Size**: ~500KB (gzipped)
- **API Response Time**: < 200ms (average)
- **Real-time Latency**: < 100ms (Convex)

## 📝 Changelog

### Version 1.0.0 (2025-01-14) - Major Architecture Update

#### Core Infrastructure

- ✅ **Convex Integration**: Real-time database with live updates and notifications
- ✅ **Clerk Authentication**: Enterprise-grade user management with billing integration
- ✅ **Modern State Management**: Zustand + TanStack Query for optimal performance
- ✅ **TypeScript Strict Mode**: Full type safety with shared schemas across all layers

#### Features

- ✅ **WaveSurfer.js**: Professional audio waveform visualization integration
- ✅ **Real-time Reservation System**: Live booking with status updates and reminders
- ✅ **Advanced Dashboard**: Real-time analytics with comprehensive user statistics
- ✅ **Multi-Payment Processing**: Stripe + PayPal with webhook validation
- ✅ **File Management**: Secure upload, storage, and download system
- ✅ **Email System**: Transactional emails with templates and scheduling

#### Security & Quality

- ✅ **Advanced Security**: Multi-layer security with Clerk + rate limiting + validation
- ✅ **Comprehensive Testing**: Jest + React Testing Library + Supertest coverage
- ✅ **Performance Optimization**: Code splitting, lazy loading, and efficient data fetching
- ✅ **Production Deployment**: Automated workflows with comprehensive error handling
- ✅ **Audit Logging**: Complete audit trail for security and compliance

#### Developer Experience

- ✅ **Documentation**: Comprehensive guides for development, deployment, and testing
- ✅ **Type Safety**: Strict TypeScript with no `any` types
- ✅ **Code Quality**: ESLint + Prettier with pre-commit hooks
- ✅ **Development Tools**: Hot reload, debugging, and monitoring tools
