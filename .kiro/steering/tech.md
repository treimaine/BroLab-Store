# Technology Stack

## Build System & Tools

- **Build Tool**: Vite 5.4+ for fast development and optimized production builds
- **Package Manager**: npm (Node.js 20+, npm 9+)
- **TypeScript**: Full TypeScript implementation with strict mode enabled
- **Linting**: ESLint with TypeScript and React plugins
- **Testing**: Jest with React Testing Library and Supertest for API testing

## Frontend Stack

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**:
  - Zustand for client-side state
  - TanStack Query for server state management
- **Styling**:
  - Tailwind CSS with custom design system
  - shadcn/ui component library
  - Radix UI primitives
- **UI Components**: Comprehensive component library with Framer Motion animations
- **Audio**: WaveSurfer.js for professional waveform visualization

## Backend Stack

- **Runtime**: Node.js with Express server
- **Database**:
  - Convex for real-time data and functions
  - PostgreSQL with Supabase (legacy support)
- **Authentication**: Clerk for user management and billing
- **Payments**: Stripe and PayPal integration
- **File Storage**: Supabase Storage with antivirus scanning
- **Email**: Nodemailer with SMTP configuration

## External Integrations

- **CMS**: WordPress/WooCommerce REST API integration
- **Analytics**: Custom analytics system with conversion tracking
- **Security**: Row-Level Security (RLS) policies and rate limiting

## Common Commands

### Development

```bash
npm run dev              # Start development server (full-stack)
npm run client           # Start frontend only (Vite dev server)
npm run type-check       # TypeScript validation without emit
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
```

### Testing

```bash
npm test                 # Run Jest test suite
npm run pre-check        # Type-check + lint (pre-commit validation)
npm run verify           # Full verification (pre-commit check)
```

### Build & Production

```bash
npm run build            # Build for production (frontend + backend)
npm run start            # Start production server
npm run check            # TypeScript compilation check
```

### Database & Cleanup

```bash
npm run clean            # Clean node_modules and reinstall
npm run clean:all        # Run comprehensive cleanup script
npm run clean:logs       # Clear application logs
npm run clean:db         # Clear database (development only)
```

## Development Environment

- **Node.js**: 20.0.0+ required
- **Package Manager**: npm 9.0.0+ required
- **Database**: Convex for new features, Supabase for legacy support
- **Environment Files**: `.env` for development, `.env.production.example` for production template

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no explicit any warnings
- **ESLint**: React hooks rules, TypeScript recommended rules
- **Testing**: Jest with jsdom environment for React components
- **File Structure**: Modular architecture with shared utilities
- **Import Aliases**: `@/` for client, `@shared/` for shared code, `@convex/` for Convex functions
