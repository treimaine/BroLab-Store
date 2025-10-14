# BroLab Entertainment - Professional Beats Marketplace

A cutting-edge beats marketplace platform revolutionizing music production and licensing through intelligent technology and seamless user experience.

## 🎵 Overview

BroLab Entertainment is a modern full-stack TypeScript application that provides a professional marketplace for music producers and artists. Built with React 18, Express, and Convex real-time database, the platform offers advanced features like professional audio preview with waveform visualization, comprehensive reservation system, multi-currency support, and seamless payment processing through Stripe and PayPal.

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

- **React 18** with TypeScript strict mode and Vite 5.4+ build system
- **Tailwind CSS** with shadcn/ui + Radix UI component library
- **Wouter** for lightweight client-side routing (preferred over React Router)
- **TanStack Query** for advanced server state management and caching
- **Zustand** for client-side state management (preferred over Redux/Context)
- **WaveSurfer.js** for professional audio waveform visualization

### Backend Stack

- **Node.js 20+** with Express and TypeScript strict mode
- **Convex** real-time database for new features and live updates
- **Supabase** PostgreSQL database for legacy support (maintain, don't extend)
- **Clerk** authentication and user management with billing integration
- **Stripe + PayPal** payment processing with comprehensive error handling

### Development Tools

- **npm 9+** package management (no yarn/pnpm)
- **ESLint** with React and TypeScript rules
- **Jest + React Testing Library** for unit and integration testing
- **Supertest** for API endpoint testing

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
├── client/                 # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/     # Feature-based UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── stores/        # Zustand state management
│   │   └── lib/           # Utilities and configurations
├── server/                # Express backend API
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   └── lib/               # Core libraries and utilities
├── convex/                # Convex real-time database
│   ├── schema.ts          # Database schema definition
│   ├── reservations/      # Reservation system functions
│   ├── users/             # User management functions
│   └── _generated/        # Auto-generated Convex files
├── shared/                # Shared TypeScript definitions
│   ├── types/             # Cross-platform interfaces
│   ├── validation.ts      # Zod schemas
│   └── constants/         # API endpoints and enums
├── components/            # Shared UI components (shadcn/ui)
├── __tests__/             # Test files and utilities
├── scripts/               # Build, deployment, maintenance scripts
└── docs/                  # Documentation and reports
```

## 🔧 Development Commands

```bash
# Development
npm run dev                # Start full-stack development server
npm run client             # Frontend-only development
npm run server             # Backend-only development

# Convex Database
npx convex dev             # Start Convex development server
npx convex dashboard       # Open Convex dashboard
npx convex deploy          # Deploy Convex functions

# Legacy Database (Supabase)
npm run db:push            # Push schema changes
npm run db:studio          # Open database GUI
npm run db:generate        # Generate migration files

# Build & Production
npm run build              # Build for production (client + server)
npm run start              # Start production server
npm run type-check         # TypeScript validation
npm run test               # Run Jest test suite
npm run test:watch         # Watch mode for development
npm run lint               # ESLint code checking
npm run lint:fix           # Auto-fix linting issues
npm run verify             # Pre-commit validation
npm run pre-check          # Type-check + lint validation
```

## 🌐 Environment Configuration

### Development (.env)

```env
# Convex Configuration (Primary Database)
CONVEX_DEPLOYMENT="your_convex_deployment_name"
VITE_CONVEX_URL="https://your-deployment.convex.cloud"

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_key"
CLERK_SECRET_KEY="sk_test_your_clerk_secret"
CLERK_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Legacy Database Configuration (Supabase - Maintain Only)
DATABASE_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# WordPress/WooCommerce API
WORDPRESS_URL="https://brolabentertainment.com/wp-json/wp/v2"
WOOCOMMERCE_URL="https://brolabentertainment.com/wp-json/wc/v3"
WOOCOMMERCE_CONSUMER_KEY="your_test_key"
WOOCOMMERCE_CONSUMER_SECRET="your_test_secret"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_test_key"
VITE_STRIPE_PUBLIC_KEY="pk_test_your_test_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# PayPal Configuration
VITE_PAYPAL_CLIENT_ID="your_paypal_client_id"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
DEFAULT_FROM="BroLab <contact@brolabentertainment.com>"

# Security
SESSION_SECRET="your_64_character_hex_session_secret"
NODE_ENV="development"
```

### Production

- Use live API keys and production database
- Enable SSL and security headers
- Configure domain and DNS settings
- See DEPLOYMENT_CHECKLIST.md for complete setup

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

### Waveform Audio Player

- **WaveSurfer.js Integration**: Professional waveform visualization with Canvas rendering
- **Individual Audio Controls**: Each product has independent audio preview in table view
- **Click-to-Seek Functionality**: Visual progress tracking with precise seeking
- **Modern UI Design**: Cyan-themed interface matching industry music platforms
- **Mobile-Optimized**: Touch-friendly controls with backdrop blur effects
- **Performance Optimized**: Lazy loading and efficient rendering for large catalogs

### Table View Layout

- **Professional Design**: Layout matching industry standards (Beatstars, Airbit)
- **Comprehensive Information**: Thumbnails, waveforms, genre, duration, BPM, and actions per row
- **Independent Audio Preview**: Each beat has its own audio player and waveform
- **Responsive Design**: Mobile scroll optimization with touch-friendly interactions
- **Real-time Updates**: Live status updates for availability and pricing

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

- **LOCAL_DEVELOPMENT_GUIDE.md**: Complete setup and development guide
- **DEPLOYMENT_CHECKLIST.md**: Production deployment steps
- **TESTING_GUIDE.md**: Testing procedures and workflows
- **replit.md**: Technical architecture and project context
- **SUPABASE_MIGRATION_GUIDE.md**: Database migration guide
- **PHASE_6_RLS_SECURITY_REPORT.md**: Security implementation details

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

## 🤝 Support

For development support and questions:

- **Documentation**: Comprehensive guides in `docs/` directory
- **Development Setup**: `docs/development/LOCAL_DEVELOPMENT_GUIDE.md`
- **Deployment Guide**: `docs/deployment/DEPLOYMENT_CHECKLIST.md`
- **Testing Guide**: `docs/testing/TESTING_GUIDE.md`
- **Convex Dashboard**: Real-time database and function management
- **Clerk Dashboard**: User management and authentication settings
- **Supabase Dashboard**: Legacy database and storage management (maintenance only)
- **Troubleshooting**: Review error logs and diagnostic tools in development guides

---

**BroLab Entertainment** - Revolutionizing music production through technology

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

### Changelog

**2025-10-14** - Major Architecture Update

- **Convex Integration**: Added real-time database with live updates and notifications
- **Clerk Authentication**: Implemented enterprise-grade user management and billing
- **Modern State Management**: Zustand + TanStack Query for optimal performance
- **WaveSurfer.js**: Professional audio waveform visualization integration
- **Comprehensive Testing**: Jest + React Testing Library + Supertest coverage
- **TypeScript Strict Mode**: Full type safety with shared schemas
- **Real-time Reservation System**: Live booking with status updates and reminders
- **Advanced Security**: Multi-layer security with Clerk + RLS + comprehensive validation
- **Performance Optimization**: Code splitting, lazy loading, and efficient data fetching
- **Production Deployment**: Automated workflows with comprehensive error handling
