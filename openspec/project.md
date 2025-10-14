# BroLab Entertainment - Project Context

## Purpose

BroLab Entertainment is a professional beats marketplace platform that revolutionizes music production and licensing. It's a modern React-based web application providing a comprehensive marketplace for music producers and artists, featuring professional audio preview systems, multi-payment processing, and advanced security with Row-Level Security (RLS).

**Core Business Goals:**

- Professional beats marketplace with waveform audio preview
- Seamless WordPress/WooCommerce integration for content management
- Multi-currency and multi-language support (6 languages)
- Subscription-based download quotas with Clerk Billing integration
- Service booking system (mixing, mastering, recording, consultation)
- Enterprise-grade security and performance optimization

## Tech Stack

### Frontend (client/)

- **React 18** with TypeScript - Component-based UI with strict typing
- **Vite 5.4+** - Fast development server and optimized builds
- **Wouter** - Lightweight client-side routing (prefer over React Router)
- **Zustand** - Client-side state management (prefer over Redux/Context)
- **TanStack Query** - Server state management and caching
- **Tailwind CSS** - Utility-first styling with custom design tokens
- **shadcn/ui + Radix UI** - Accessible component primitives
- **WaveSurfer.js** - Audio waveform visualization (core business feature)

### Backend (server/)

- **Node.js 20+** with Express - RESTful API server
- **TypeScript strict mode** - No `any` types, full type safety
- **Convex** - Real-time database for new features (preferred)
- **Supabase** - Legacy PostgreSQL support (maintain, don't extend)
- **Clerk** - Authentication and user management
- **Stripe + PayPal** - Payment processing with error handling

### Database Strategy

- **New features**: Use Convex mutations/queries for real-time capabilities
- **Legacy features**: Maintain Supabase integration, don't extend
- **Data flow**: Client → Convex (real-time) or Client → Express → External APIs

### Development Tools

- **npm 9+** - Package management (no yarn/pnpm)
- **ESLint** - Code linting with React and TypeScript rules
- **Jest + React Testing Library** - Unit and integration testing
- **Supertest** - API endpoint testing

## Project Conventions

### Code Style

- **TypeScript Strict Mode**: No `any` types allowed, explicit return types for functions
- **Import Aliases**: Use `@/` for client/src, `@shared/` for shared, `@convex/` for convex
- **Component Patterns**: Functional components with hooks only, props interfaces with descriptive names
- **File Naming**: PascalCase for components, camelCase for hooks/utils, UPPER_SNAKE_CASE for constants

### Architecture Patterns

- **Feature-Based Organization**: Group by feature, not by file type
- **Component Composition**: Prefer composition over inheritance for UI components
- **State Management Rules**:
  - Client state: Zustand stores in `client/src/stores/`
  - Server state: TanStack Query for caching and synchronization
  - Form state: React Hook Form with Zod validation
  - Global state: Minimize usage, prefer component composition
- **Error Boundaries**: Implement comprehensive error handling at component boundaries
- **Lazy Loading**: Use React.lazy() for performance optimization

### Testing Strategy

- **Unit Tests**: Business logic functions with Jest
- **Integration Tests**: API endpoints with Supertest
- **Component Tests**: React Testing Library for UI components
- **Mock Strategy**: Mock external dependencies (Stripe, WordPress, Clerk)
- **Coverage Requirements**: Focus on business logic and critical paths
- **Test Organization**: Adjacent to source files or in `__tests__/` directory

### Git Workflow

- **Branch Strategy**: Feature branches from main, no direct commits to main
- **Commit Conventions**: Conventional commits (feat:, fix:, docs:, etc.)
- **Pre-commit Hooks**: Type checking, linting, and test validation
- **Deployment**: Automated scripts for production deployment

## Domain Context

### Music Industry Knowledge

- **Licensing Tiers**: Basic ($29.99), Premium ($49.99), Unlimited ($149.99)
- **Audio Formats**: MP3, WAV, FLAC with quality preferences
- **Beat Metadata**: BPM, key signature, genre, mood, duration
- **Professional Workflow**: Mixing, mastering, recording services
- **Industry Standards**: Professional waveform visualization, table view layouts

### Business Rules

- **Download Quotas**: Enforce subscription-based download limits
- **File Security**: All uploads must pass antivirus scanning
- **User Permissions**: Implement Row-Level Security for data access
- **Currency Detection**: Auto-detect user location for currency/language preferences
- **License Management**: Track usage and enforce licensing terms

### User Personas

- **Music Producers**: Creating and selling beats
- **Artists**: Purchasing beats and licenses
- **Studio Clients**: Booking services (mixing, mastering, recording)
- **Administrators**: Managing content, users, and analytics

## Important Constraints

### Technical Constraints

- **TypeScript Strict Mode**: No `any` types, full type safety required
- **Performance Requirements**: Page load < 3s, audio preview < 1s
- **Mobile-First Design**: Responsive 320px-1920px+ with touch-friendly interactions
- **Accessibility**: WCAG AA compliance with reduced motion support
- **Security**: Row-Level Security (RLS), input validation, rate limiting

### Business Constraints

- **Payment Processing**: PCI compliance for Stripe/PayPal integration
- **File Management**: Secure uploads with antivirus scanning and quota enforcement
- **Multi-Currency**: Real-time currency conversion and localization
- **WordPress Integration**: Maintain compatibility with existing WooCommerce catalog
- **Subscription Billing**: Clerk Billing integration for quota management

### Regulatory Constraints

- **Data Protection**: GDPR compliance for EU users
- **Audio Licensing**: Proper license tracking and enforcement
- **Financial Compliance**: Invoice generation and tax calculation
- **Content Security**: File scanning and validation for uploads

## External Dependencies

### Core Services

- **Clerk**: Authentication, user management, and billing
- **Convex**: Real-time database and serverless functions
- **Supabase**: Legacy PostgreSQL database with RLS
- **Stripe**: Primary payment processing
- **PayPal**: Alternative payment method
- **WordPress/WooCommerce**: Content management and product catalog

### Development Services

- **Vite**: Build tool and development server
- **Vercel**: Deployment and hosting platform
- **GitHub**: Version control and CI/CD
- **npm**: Package management

### Monitoring & Analytics

- **Sentry**: Error tracking and performance monitoring
- **Google Analytics**: User behavior and conversion tracking
- **Stripe Dashboard**: Payment analytics and reporting

### File & Media Services

- **Supabase Storage**: Secure file uploads and management
- **CDN**: Asset delivery and optimization
- **Antivirus API**: File scanning for security

### Communication Services

- **SMTP**: Email delivery for notifications
- **Nodemailer**: Email template system
- **Webhook Endpoints**: Real-time event processing

## Development Environment Setup

### Required Tools

- Node.js 20+
- npm 9+
- Git
- Docker (for local PostgreSQL)
- VS Code with TypeScript extensions

### Environment Variables

- Database: Supabase/Convex connection strings
- Authentication: Clerk API keys
- Payments: Stripe/PayPal credentials
- Email: SMTP configuration
- Security: Session secrets and encryption keys

### Local Development Commands

```bash
npm run dev              # Full-stack development server
npm run client           # Frontend-only development
npm run type-check       # TypeScript validation
npm run lint:fix         # Auto-fix linting issues
npm run test             # Run Jest test suite
npm run build            # Production build
```
