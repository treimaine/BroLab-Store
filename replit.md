# BroLab Entertainment - Beats Marketplace

## Overview

BroLab Entertainment is a professional beats marketplace platform for music producers and artists. It provides audio preview, licensing, payments, and service booking (mixing, mastering, recording, consultation). The platform syncs product catalogs from WordPress/WooCommerce and uses Convex as the real-time database with Clerk for authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **State Management**: Zustand for client state, TanStack Query for server state
- **UI Components**: shadcn/ui with Tailwind CSS
- **Audio Player**: WaveSurfer.js for waveform visualization
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express and TypeScript
- **Entry Point**: `server/index.ts`
- **Build**: esbuild for server bundling, Vite for client
- **Development**: `npm run dev` starts the server with tsx

### Database Layer
- **Primary Database**: Convex (real-time serverless database)
- **Schema Location**: `convex/schema.ts`
- **Functions**: `convex/` directory contains queries, mutations, and actions
- **Note**: Supabase was previously used but has been fully migrated to Convex

### Authentication
- **Provider**: Clerk (replaces previous custom auth)
- **Client**: `@clerk/clerk-react`
- **Server**: `@clerk/express`
- **User Sync**: Clerk users are synced to Convex via webhooks

### Payments
- **Stripe**: Primary payment processor with webhook handling
- **PayPal**: Secondary payment option
- **Subscriptions**: Clerk Billing integration for subscription management

## External Dependencies

### Third-Party Services
- **Convex**: Real-time database (`VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`)
- **Clerk**: Authentication (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
- **Stripe**: Payments (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- **PayPal**: Payments (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`)
- **WordPress/WooCommerce**: Product catalog sync via REST API

### Key NPM Packages
- `convex`: Database client and functions
- `@clerk/clerk-react`, `@clerk/express`: Authentication
- `stripe`: Payment processing
- `@paypal/paypal-server-sdk`: PayPal integration
- `@woocommerce/woocommerce-rest-api`: WooCommerce sync
- `wavesurfer.js`: Audio waveform display
- `nodemailer`: Email sending