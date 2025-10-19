---
inclusion: always
---

---

## inclusion: always

# BroLab Entertainment - Product Domain

Professional beats marketplace for music producers. Use this document for domain terminology, business rules, and implementation patterns.

## Domain Terminology

Use these exact terms consistently:

- **Beat** - Music file with metadata (BPM, key, genre, mood, tags), license tiers, audio preview
- **License** - Purchase tier with fixed pricing: Basic ($29.99), Premium ($49.99), Unlimited ($149.99)
- **Order** - Payment transaction containing beats, licenses, and payment intent (Stripe/PayPal)
- **Reservation** - Service booking (mixing, mastering, recording, consultation) with status workflow
- **User** - Clerk-authenticated entity with subscription tier, download quotas, purchase history, favorites
- **Subscription** - Recurring plan with download quotas managed via Clerk Billing

Never use: Track/Song (use Beat), Plan/Package (use License), Purchase/Transaction (use Order), Appointment (use Reservation), Customer/Account (use User).

## Critical Business Rules

Enforce these rules in all implementations:

1. **Download Quotas** - Validate subscription limits before granting downloads
2. **Reservation Status Flow** - Draft → Pending → Confirmed → Completed/Cancelled (payment only when Confirmed)
3. **Payment Validation** - Always verify webhook signatures before granting access or updating order status
4. **File Security** - Antivirus scan all uploads, reject infected files immediately
5. **Data Access Control** - Users access only their own data (enforce in queries and mutations)
6. **License Pricing** - Hardcoded values only ($29.99, $49.99, $149.99), never fetch from external source

## Data Layer Strategy

### Database Selection

- **Convex** (preferred) - New features requiring real-time updates (dashboard, notifications, cart sync)
- **Supabase** (legacy) - Maintain only, do not extend, migrate to Convex when refactoring
- **WordPress/WooCommerce** - External catalog, read-only sync, never write back

### State Management

- **Zustand** - Client UI state (filters, toggles, cart) in `client/src/stores/`
- **TanStack Query** - Server state caching with stale-while-revalidate
- **Convex Subscriptions** - Real-time data with automatic reconnection
- **Avoid** - Redux, Context API for global state, prop drilling

## API Patterns

### REST Endpoints

- **Structure** - `/api/beats`, `/api/orders/:id`, `/api/reservations`
- **Error Format** - `{ error: string, code: string, details?: object }`
- **Authentication** - Validate Clerk session on protected routes
- **Rate Limiting** - Apply to payment endpoints and downloads

### Convex Functions

- **Mutations** - Data writes, validate user owns resource before modification
- **Queries** - Data reads, filter to user-accessible data only
- **Actions** - External API calls (Stripe, PayPal, WordPress, file uploads)

### Payment Flow (Critical)

1. Create payment intent with order metadata
2. Redirect to payment provider
3. Receive webhook and verify signature
4. Update order status only after successful verification
5. Grant download access only for confirmed payments
6. Return user-friendly error messages

## Feature-Specific Rules

### Audio Player (WaveSurfer.js)

- Individual instance per beat card (not singleton)
- Render waveform visualization for all beats
- Preload audio on hover for instant playback
- Cleanup on unmount to prevent memory leaks

### Shopping Cart

- **Guest** - localStorage with 7-day expiration
- **Authenticated** - Sync to Convex for cross-device access
- **Validation** - Check license availability before checkout
- **Clearing** - Only after payment confirmation webhook

### Dashboard

- **Data Source** - Convex subscriptions for real-time sync
- **Display** - Downloads, purchases, subscription status, favorites
- **Updates** - Optimistic UI with rollback on error
- **Caching** - TanStack Query with 5-minute stale time

### Reservations

- **Availability** - Validate time slots before booking
- **Notifications** - Email confirmations via Resend
- **Payment** - Stripe only (PayPal not supported)
- **Cancellation** - Only before Confirmed status

## Security Requirements

- **Authentication** - Clerk only, never custom auth
- **Authorization** - Check permissions in client and server
- **File Uploads** - Antivirus scan, validate MIME types and sizes
- **Webhooks** - Verify signatures before processing
- **Database** - Enforce Row-Level Security
- **Input Validation** - Zod schemas for all user inputs

## Performance Standards

- **Code Splitting** - Lazy load routes and heavy components
- **List Rendering** - Virtual scrolling for 100+ items
- **Images** - WebP format with responsive sizes and lazy loading
- **Bundles** - Separate vendor chunks, tree-shake unused code
- **Caching** - TanStack Query with appropriate stale times
- **User Input** - Debounce search/filter (300ms minimum)

## Internationalization

- **Detection** - IP geolocation, store in Clerk metadata
- **Languages** - English, French, Spanish, German, Italian, Portuguese
- **Currency** - Auto-convert based on location
- **Implementation** - i18n keys only, no hardcoded strings
