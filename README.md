# BroLab Entertainment - Professional Beats Marketplace

A modern beats marketplace platform for music producers and artists, built with React, TypeScript, Convex, and Express.

## 🎵 Overview

BroLab Entertainment is a full-stack TypeScript application providing a professional marketplace for beats licensing. The platform features real-time updates, professional audio previews, multi-payment processing, and comprehensive service booking.

**Live Site**: [brolabentertainment.com](https://brolabentertainment.com)

## ✨ Key Features

### E-Commerce

- **Beats Catalog**: WooCommerce-synced product catalog with advanced filtering
- **License Tiers**: Basic ($29.99), Premium ($49.99), Unlimited ($149.99)
- **Shopping Cart**: Persistent cart with license selection
- **Multi-Payment**: Stripe Checkout + PayPal with webhook validation
- **Order Management**: Complete order history in user dashboard

### Audio System

- **WaveSurfer.js**: Professional waveform visualization
- **Individual Previews**: Each beat has independent audio controls
- **Global Player**: Persistent player with queue management
- **Preload on Hover**: Instant playback experience

### User Features

- **Clerk Authentication**: Enterprise-grade auth with billing integration
- **Real-time Dashboard**: Orders, downloads, favorites, activity tracking
- **Recently Viewed**: Automatic beat history tracking
- **Favorites System**: Save beats for later (UI complete)
- **Download Management**: License-based download quotas

### Services

- **Reservation System**: Mixing, mastering, recording, consultation booking
- **Calendar Integration**: ICS file generation for appointments
- **Email Notifications**: Automated confirmations and reminders

### Technical

- **Real-time Database**: Convex for live updates and sync
- **Multi-language**: 6 languages with IP-based detection
- **Multi-currency**: Automatic currency conversion
- **SEO Optimized**: Sitemap, Schema markup, Open Graph
- **Responsive Design**: Mobile-first (320px - 1920px+)

## 🏗️ Tech Stack

### Frontend

| Technology        | Version | Purpose         |
| ----------------- | ------- | --------------- |
| React             | 18.3.1  | UI Framework    |
| TypeScript        | 5.6.3   | Type Safety     |
| Vite              | 6.3.5   | Build Tool      |
| Tailwind CSS      | 3.4.17  | Styling         |
| shadcn/ui + Radix | Latest  | UI Components   |
| Wouter            | 3.3.5   | Routing         |
| TanStack Query    | 5.60.5  | Server State    |
| Zustand           | 5.0.6   | Client State    |
| WaveSurfer.js     | 7.10.0  | Audio Waveforms |
| Framer Motion     | 11.18.2 | Animations      |
| React Hook Form   | 7.55.0  | Forms           |

### Backend

| Technology | Version | Purpose            |
| ---------- | ------- | ------------------ |
| Node.js    | 24.x    | Runtime            |
| Express    | 4.21.2  | API Server         |
| Convex     | 1.31.2  | Real-time Database |
| Clerk      | 5.59.2  | Authentication     |
| Stripe     | 18.4.0  | Payments           |
| PayPal SDK | 1.1.0   | Payments           |
| Nodemailer | 7.0.5   | Email              |
| Zod        | 3.24.2  | Validation         |

### Database (Convex)

19 tables including: `users`, `beats`, `orders`, `orderItems`, `payments`, `downloads`, `reservations`, `subscriptions`, `invoices`, `quotas`, `favorites`, `activityLog`, `auditLogs`, `files`, `rateLimits`, `emailVerifications`, `passwordResets`, `cartItems`, `processedEvents`

## 📁 Project Structure

```
brolab-beats/
├── client/src/           # React Frontend
│   ├── components/       # 26 feature folders, 80+ components
│   │   ├── audio/        # WaveSurfer players
│   │   ├── beats/        # Beat cards, grids, filters
│   │   ├── cart/         # Shopping cart
│   │   ├── dashboard/    # User dashboard
│   │   ├── orders/       # Order management
│   │   ├── reservations/ # Booking UI
│   │   └── ui/           # shadcn/ui primitives
│   ├── hooks/            # 55+ custom hooks
│   ├── pages/            # 35+ route pages
│   ├── stores/           # Zustand stores
│   ├── services/         # Client services
│   └── i18n/             # Translations (6 languages)
├── server/               # Express Backend
│   ├── routes/           # 30 API route files
│   ├── middleware/       # Auth, rate limiting, validation
│   ├── services/         # Business logic
│   └── lib/              # Utilities
├── convex/               # Real-time Database
│   ├── schema.ts         # 19 tables defined
│   ├── orders/           # Order mutations/queries
│   ├── users/            # User management
│   ├── reservations/     # Booking system
│   └── subscriptions/    # Subscription management
├── shared/               # Cross-platform Code
│   ├── types/            # TypeScript interfaces
│   └── validation.ts     # Zod schemas
├── __tests__/            # 50+ test files
└── docs/                 # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 24.x
- npm 9+
- Convex account
- Clerk account

### Installation

```bash
# Clone repository
git clone https://github.com/treimaine/BroLab-Store.git
cd brolab-beats

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Start Convex dev server (terminal 1)
npx convex dev

# Start development server (terminal 2)
npm run dev
```

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# WooCommerce
WOOCOMMERCE_API_URL=https://your-site.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=production

# Email (Resend or SMTP)
RESEND_API_KEY=re_...
```

## 🔧 Commands

```bash
# Development
npm run dev              # Full-stack dev server
npm run client           # Frontend only (Vite)
npx convex dev           # Convex dev server

# Quality
npm run type-check       # TypeScript validation
npm run lint:fix         # ESLint auto-fix
npm run pre-check        # Type-check + lint
npm test                 # Jest test suite

# Build
npm run build            # Production build
npm run start            # Start production server

# Utilities
npm run clean:all        # Full cleanup
npx convex dashboard     # Open Convex dashboard
```

## 📡 API Endpoints

### Public

- `GET /api/woocommerce/products` - Product catalog
- `GET /api/woocommerce/categories` - Categories
- `GET /api/sitemap.xml` - XML Sitemap
- `GET /api/health` - Health check

### Authenticated

- `GET /api/wishlist` - User wishlist
- `POST /api/wishlist` - Add to wishlist
- `GET /api/downloads` - User downloads
- `GET /api/reservations/me` - User reservations
- `POST /api/reservations` - Create reservation

### Payments

- `POST /api/payment/stripe/checkout` - Stripe checkout
- `POST /api/payment/paypal/*` - PayPal endpoints
- `POST /api/webhooks/stripe` - Stripe webhook
- `POST /api/webhooks/paypal` - PayPal webhook

## 🔒 Security

- **Authentication**: Clerk with Convex integration
- **Rate Limiting**: 1000 req/15min per IP
- **Input Validation**: Zod schemas everywhere
- **Webhook Verification**: Stripe/PayPal signatures
- **File Security**: MIME validation, size limits
- **HTTPS**: SSL active on production

## 📊 Project Status

### ✅ Complete (92%)

- E-commerce core (catalog, cart, checkout, payments)
- User authentication and dashboard
- Order management (backend + frontend)
- Audio system with WaveSurfer.js
- Reservation system with email notifications
- SEO (sitemap, schema markup, Open Graph)
- Recently viewed beats (hook + UI)
- Multi-language and multi-currency
- Real-time updates via Convex

### ⏳ In Progress

- Wishlist persistence (UI complete, Convex backend needed)

### 📋 Planned

- Producer portal for beat submissions
- Content moderation system
- Revenue sharing for producers

## 📚 Documentation

- `docs/development/` - Setup guides
- `docs/deployment/` - Production deployment
- `docs/testing/` - Testing guides
- `docs/specs/` - Feature specifications
- `docs/SECURITY_FIXES_SUMMARY.md` - Security status

## 🧪 Testing

```bash
npm test                 # Run all tests
npm test -- --coverage   # With coverage report
```

**Test Coverage**: 50+ test files covering:

- API endpoints (auth, payments, downloads)
- Convex functions
- React components and hooks
- Validation schemas
- Webhook security

## 📝 Changelog

### v1.1.0 (December 2025)

- ✅ Orders UI integrated in dashboard
- ✅ RecentlyViewedBeats component complete
- ✅ Documentation synchronized with codebase
- ✅ Security status updated (9/10 issues fixed)

### v1.0.0 (October 2025)

- ✅ Convex real-time database integration
- ✅ Clerk authentication with billing
- ✅ WaveSurfer.js audio system
- ✅ Complete reservation system
- ✅ Multi-payment processing (Stripe + PayPal)
- ✅ SEO optimization (sitemap, schema, OG)

## 🤝 Support

- **Website**: [brolabentertainment.com](https://brolabentertainment.com)
- **Email**: contact@brolabentertainment.com
- **GitHub**: [treimaine/BroLab-Store](https://github.com/treimaine/BroLab-Store)

---

**BroLab Entertainment** - Professional Beats Marketplace

_Built with React, TypeScript, Convex, and ❤️_
