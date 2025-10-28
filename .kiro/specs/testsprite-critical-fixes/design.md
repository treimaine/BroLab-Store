# Design Document

## Overview

This design document outlines the technical approach to fix 9 critical issues identified by TestSprite AI testing that resulted in a 40% pass rate. The fixes address authentication, data persistence, dependency management, subscription billing, payment processing, file uploads, and performance optimization. The solution prioritizes minimal code changes while ensuring production readiness and maintaining backward compatibility with existing features.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Clerk      │  │   Vite       │  │  Error       │      │
│  │   Auth       │  │   Build      │  │  Boundaries  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │   Rate       │  │   Error      │      │
│  │   Validator  │  │   Limiter    │  │   Handler    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Convex)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Cart       │  │   Subscr.    │  │   Orders     │      │
│  │   Sync       │  │   Quotas     │  │   Payments   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Clerk      │  │   Stripe     │  │   Resend     │      │
│  │   Billing    │  │   Payments   │  │   Email      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

1. **Authentication Flow**: Client → Clerk → Convex (user sync)
2. **Cart Persistence**: Client → Zustand → Convex (debounced sync)
3. **Subscription Management**: Clerk Billing → Webhook → Convex (quota updates)
4. **Payment Processing**: Client → Stripe → Webhook → Convex (order confirmation)
5. **File Upload**: Client → Validation → Antivirus → Storage → Convex

## Components and Interfaces

### 1. Clerk Authentication Configuration

#### Component: `ClerkAuthProvider`

**Location**: `client/src/providers/ClerkAuthProvider.tsx` (to be created)

**Purpose**: Centralize Clerk configuration and handle authentication errors

**Interface**:

```typescript
interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

interface ClerkErrorHandler {
  handleAuthError: (error: ClerkError) => void;
  retryWithBackoff: (fn: () => Promise<void>, maxRetries: number) => Promise<void>;
}
```

**Implementation Details**:

- Replace deprecated `redirectUrl` with `fallbackRedirectUrl` in `client/src/pages/login.tsx` (lines 42 and 62)
- Maintain existing `telemetry: false` setting in ClerkProvider at `client/src/main.tsx` (line 60)
- Implement exponential backoff retry logic (3 attempts: 1s, 2s, 4s delays)
- Add error boundary specifically for Clerk authentication errors
- Display user-friendly error messages for 400 errors using toast notifications
- Log authentication failures to `convex/audit.ts` with context (endpoint, status code, user action)
- Verify Clerk publishable key format matches `pk_test_*` or `pk_live_*` pattern before initialization

**Configuration Changes**:

```typescript
// .env updates needed - use production keys or request increased development limits
CLERK_PUBLISHABLE_KEY=<production_key>
CLERK_SECRET_KEY=<production_key>
CLERK_WEBHOOK_SECRET=<webhook_secret>
```

**Design Rationale**: Centralizing Clerk configuration prevents scattered error handling and ensures consistent retry behavior across the application. The exponential backoff prevents overwhelming the Clerk API during transient failures.

#### Component: `AuthErrorBoundary`

**Location**: `client/src/components/auth/AuthErrorBoundary.tsx`

**Purpose**: Catch and handle Clerk-specific errors

**Interface**:

```typescript
interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}
```

### 2. Vite Dependency Optimization

#### Configuration: `vite.config.ts`

**Current Issue**: @radix-ui/react-progress version 1.1.3 is installed but not in optimizeDeps.include, causing 504 (Outdated Optimize Dep) errors

**Changes Required** (line 89):

```typescript
export default defineConfig({
  optimizeDeps: {
    include: [
      "@radix-ui/react-progress", // ADD THIS - currently missing
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      // ... other existing Radix UI components
    ],
    exclude: ["@convex-dev/react"],
    force: false, // Change from true to false to prevent constant rebuilds
  },
  server: {
    fs: {
      strict: true,
      allow: [".."], // Allow parent directory access for shared modules
    },
  },
});
```

**Required Cleanup Steps**:

1. Run `npm run clean:all` to clear stale Vite cache before testing
2. Verify @radix-ui/react-progress is properly optimized after restart

**Design Rationale**: Explicitly including all Radix UI components in optimizeDeps prevents Vite from attempting to re-optimize them during runtime, which causes the 504 errors. Setting `force: false` prevents unnecessary rebuilds on every dev server start.

#### Component: `ProductCatalogErrorBoundary`

**Location**: `client/src/pages/Products.tsx`

**Purpose**: Wrap product catalog with error boundary to prevent full page crashes

**Implementation**:

- Catch lazy loading errors for product components
- Display fallback UI with retry button
- Log errors with component stack trace
- Implement layout skeleton to prevent CLS

### 3. Shopping Cart Persistence

#### Service: `CartSyncService`

**Location**: `client/src/services/CartSyncService.ts` (to be created)

**Purpose**: Manage cart synchronization between Zustand and Convex

**Current State**: Cart uses Zustand with localStorage persistence only in `client/src/stores/useCartStore.ts`. No Convex synchronization exists for authenticated users.

**Reference Implementation**: Follow the Favorites feature pattern (`convex/favorites/add.ts`, `remove.ts`, `getFavorites.ts`) which demonstrates working Convex sync (TC017 ✅ Passed).

**Interface**:

```typescript
interface CartSyncService {
  syncToConvex: (items: CartItem[]) => Promise<void>;
  loadFromConvex: (userId: string) => Promise<CartItem[]>;
  handleLogout: () => Promise<void>;
  handleLogin: (userId: string) => Promise<void>;
}

interface CartSyncOptions {
  debounceMs: 300;
  maxRetries: 3;
  retryDelayMs: 1000;
}
```

**Implementation Details**:

- Debounce cart updates with 300ms delay using lodash debounce or custom implementation to prevent excessive writes
- Implement optimistic updates with automatic rollback on failure (retry up to 3 times)
- Save cart to Convex before logout using `beforeunload` event (blocking operation to ensure data persistence)
- Load cart from Convex on login within 2 seconds using `by_user` index
- Merge local cart with Convex cart on login using conflict resolution (prefer Convex data as source of truth)
- Migrate guest cart to Convex when user logs in (single transaction)
- Add cart recovery mechanism for failed syncs
- Sync must complete within 500 milliseconds for add/update operations

**Design Rationale**: The debounce prevents excessive database writes during rapid cart modifications. The beforeunload event ensures cart data is saved even if the user closes the browser. Following the Favorites pattern ensures consistency with proven working code.

#### Convex Functions

**Location**: `convex/cartItems.ts` (to be created)

**Current State**: Convex cartItems table exists in schema but no mutations/queries have been created yet.

**New Mutations**:

```typescript
// Batch update cart items for a user
export const syncCart = mutation({
  args: {
    userId: v.id("users"),
    items: v.array(
      v.object({
        beatId: v.number(),
        licenseType: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Delete existing cart items for this user
    // Insert new cart items in a single transaction
    // Return success status
  },
});

// Load cart items for a user
export const loadCart = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Query cart items by userId using by_user index
    // Return cart items with beat details
    // Must complete within 2 seconds
  },
});
```

**Design Rationale**: Using batch operations reduces the number of database round-trips. The by_user index ensures fast queries even with large datasets. Authentication checks prevent unauthorized access to cart data.

#### Store Updates

**Location**: `client/src/stores/useCartStore.ts` (existing file to be updated)

**Current State**: Currently uses Zustand with localStorage persistence only. No Convex integration.

**Changes**:

- Add `syncStatus` state: 'idle' | 'syncing' | 'error'
- Add `lastSyncedAt` timestamp for tracking sync state
- Integrate CartSyncService into store actions (addItem, removeItem, updateQuantity)
- Add `syncToServer` action for manual sync
- Add `loadFromServer` action for login
- Hook into Clerk auth events to trigger cart sync on login/logout
- Implement beforeunload event listener to save cart before logout

**Design Rationale**: Keeping the sync logic in a separate service maintains separation of concerns while the store manages UI state. The sync status allows the UI to show loading indicators during synchronization.

### 4. Clerk Billing Integration

#### Configuration: Clerk Dashboard Setup

**Current State**:

- CLERK_BILLING_ENABLED=true in .env but integration not properly configured
- PricingTable component renders in `client/src/pages/MembershipPageFixed.tsx` line 119
- Webhook handlers exist in `convex/clerk/webhooks.ts` and `convex/subscriptions/createOrUpdateFromClerk.ts`
- Convex subscriptions table exists with proper schema

**Required Steps** (to be completed in Clerk Dashboard at https://dashboard.clerk.com):

1. Enable Clerk Billing in Clerk Dashboard settings
2. Configure subscription plans with exact pricing:
   - **Basic**: $9.99/month, 10 downloads/month quota
   - **Artist**: $29.99/month, 50 downloads/month quota
   - **Ultimate**: $99.99/month, unlimited downloads quota
3. Set up webhook endpoint URL: `/api/webhooks/clerk-billing`
4. Configure webhook events: `subscription.created`, `subscription.updated`, `subscription.deleted`
5. Copy webhook secret to environment variables

**Design Rationale**: Using Clerk Billing eliminates the need for custom subscription management code. The existing webhook handlers can be leveraged with minimal modifications.

#### Service: `ClerkBillingService`

**Location**: `server/services/ClerkBillingService.ts` (to be created)

**Purpose**: Handle Clerk Billing webhooks and sync subscription data

**Current State**: Webhook handlers already exist in `convex/clerk/webhooks.ts` and `convex/subscriptions/createOrUpdateFromClerk.ts` - leverage these existing implementations.

**Interface**:

```typescript
interface ClerkBillingService {
  handleSubscriptionCreated: (event: ClerkWebhookEvent) => Promise<void>;
  handleSubscriptionUpdated: (event: ClerkWebhookEvent) => Promise<void>;
  handleSubscriptionDeleted: (event: ClerkWebhookEvent) => Promise<void>;
  syncQuotas: (userId: string, planId: string) => Promise<void>;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  downloadQuota: number;
  features: string[];
}
```

**Implementation Details**:

- Verify webhook signatures using Svix library
- Use existing `createOrUpdateFromClerk` mutation to create/update subscription records in Convex (must complete within 1 second)
- Use existing `updateSubscription` mutation for status updates
- Update user quotas based on plan using `convex/quotas/getUserQuotas.ts`
- Handle subscription cancellations gracefully
- Implement quota enforcement in download mutations (prevent downloads when quota exceeded)
- Process subscription through Clerk Billing within 5 seconds

**Design Rationale**: Leveraging existing webhook handlers reduces implementation time and maintains consistency with current patterns. Svix provides robust webhook signature verification out of the box.

#### Convex Functions

**Location**: `convex/subscriptions.ts`

**New Mutations**:

```typescript
// Create or update subscription from Clerk webhook
export const upsertSubscription = mutation({
  args: {
    userId: v.id("users"),
    clerkSubscriptionId: v.string(),
    planId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Upsert subscription record
    // Update user quotas
    // Return subscription ID
  },
});

// Check if user has available download quota
export const checkDownloadQuota = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user's active subscription
    // Get user's quota usage
    // Return available quota
  },
});
```

#### Component: `SubscriptionManagement`

**Location**: `client/src/components/subscription/SubscriptionManagement.tsx`

**Purpose**: Display subscription plans and manage upgrades/downgrades

**Interface**:

```typescript
interface SubscriptionManagementProps {
  userId: string;
  currentPlan?: string;
}
```

**Implementation**:

- Display available subscription plans
- Show current plan and quota usage
- Handle plan upgrades/downgrades via Clerk Billing
- Display billing history
- Show next billing date

### 5. Payment Processing Flow

#### Service: `PaymentService`

**Location**: `server/services/PaymentService.ts` (existing file to be updated)

**Purpose**: Handle payment processing with Stripe and PayPal

**Current State**:

- Stripe configuration exists in .env (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- PayPal configuration exists in .env (PAYPAL_CLIENT_ID, PAYPAL_WEBHOOK_ID)
- Order creation and update functions exist in `convex/orders/`
- Dependent on cart functionality (Requirement 3) being fixed first

**Interface**:

```typescript
interface PaymentService {
  createPaymentIntent: (order: Order) => Promise<PaymentIntent>;
  handleStripeWebhook: (event: StripeEvent) => Promise<void>;
  handlePayPalWebhook: (event: PayPalEvent) => Promise<void>;
  verifyWebhookSignature: (payload: string, signature: string) => boolean;
}
```

**Implementation Details**:

- Generate idempotency keys using `order.idempotencyKey` field in Convex orders table to prevent duplicate processing
- Verify webhook signatures using STRIPE_WEBHOOK_SECRET and PAYPAL_WEBHOOK_ID before processing
- Reject failed signature verification with 400 status and log security event to `convex/audit.ts`
- Create payment intent with order metadata in `convex/orders/createOrder.ts` within 3 seconds
- Update order status to 'paid' in `convex/orders/updateOrder.ts` only after successful payment verification
- Grant download access within 5 seconds after payment_intent.succeeded event
- Handle payment failures gracefully with user-friendly error messages via toast notification
- Preserve cart contents in Zustand store on payment failure
- Implement retry logic for failed webhooks
- Webhook processing at `convex/http.ts`

**Design Rationale**: Idempotency keys prevent duplicate charges if webhooks are retried. Signature verification prevents fraudulent payment confirmations. Preserving cart on failure improves user experience.

#### Convex Functions

**Location**: `convex/orders.ts`

**Updated Mutations**:

```typescript
// Update order status after payment confirmation
export const confirmPayment = mutation({
  args: {
    orderId: v.id("orders"),
    paymentIntentId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify order exists
    // Update order status
    // Grant download access
    // Send confirmation email
  },
});
```

### 6. Service Reservation System

#### Component: `ReservationForm`

**Location**: `client/src/components/reservations/ReservationForm.tsx` (existing file to be updated)

**Purpose**: Handle service reservation bookings on /mixing-mastering page

**Current State**:

- Complete reservation system exists in `convex/reservations/` directory
- Email functions exist: `sendAdminNotification.ts`, `sendStatusUpdateEmail.ts`, `sendReminderEmail.ts`
- Resend API key configured in .env (RESEND_API_KEY=re_6P4CuZhX_Ymtk9DvRdb3XSrk8Uwem4Ztv)
- Test execution timed out - need to identify if timeout is from form validation or email notification

**Interface**:

```typescript
interface ReservationFormProps {
  serviceType: "mixing" | "mastering" | "recording" | "consultation";
  onSuccess: (reservationId: string) => void;
}

interface ReservationFormData {
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  requirements: string;
}
```

**Validation** (using Zod schema):

- All fields required before submission
- Email format validation
- Phone number format validation
- Date must be in the future
- Time slot availability check by querying Convex reservations table by preferredDate and serviceType
- Validate before calling `convex/reservations/createReservation.ts`

**Design Rationale**: Using Zod schemas ensures type-safe validation that matches the Convex schema. Time slot validation prevents double-booking. Testing in isolation helps identify whether timeouts are from validation or email sending.

#### Service: `EmailService`

**Location**: `server/services/EmailService.ts` (to be created or updated)

**Purpose**: Send reservation confirmation emails via Resend

**Current State**: Email functions already exist in `convex/reservations/sendAdminNotification.ts`, `sendStatusUpdateEmail.ts`, `sendReminderEmail.ts` - leverage these implementations.

**Interface**:

```typescript
interface EmailService {
  sendReservationConfirmation: (reservation: Reservation) => Promise<void>;
  sendReservationStatusUpdate: (reservation: Reservation) => Promise<void>;
  retryFailedEmail: (emailId: string) => Promise<void>;
}
```

**Implementation**:

- Use Resend API with RESEND_API_KEY for email delivery
- Send confirmation email within 10 seconds of reservation creation
- Implement retry logic (3 attempts with exponential backoff) in `convex/reservations/sendAdminNotification.ts`
- Log email failures to `convex/audit.ts` with context
- Queue failed emails for manual retry
- Use email templates for consistency
- Send notification email via `convex/reservations/sendStatusUpdateEmail.ts` when status changes via `convex/reservations/updateReservationStatus.ts`

**Design Rationale**: Exponential backoff prevents overwhelming the email service during transient failures. Logging failures enables debugging and manual intervention when needed. The 10-second timeout ensures users receive timely confirmation.

#### Convex Functions

**Location**: `convex/reservations/createReservation.ts` (existing file to be updated)

**Current State**: Complete reservation system exists in `convex/reservations/` directory with existing functions.

**Updated Mutations**:

```typescript
// Create reservation with validation
export const createReservation = mutation({
  args: {
    userId: v.optional(v.id("users")),
    serviceType: v.string(),
    details: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      requirements: v.optional(v.string()),
    }),
    preferredDate: v.string(),
    durationMinutes: v.number(),
    totalPrice: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate time slot availability by querying reservations by preferredDate and serviceType
    // Create reservation record with status workflow: Draft → Pending → Confirmed → Completed/Cancelled
    // Trigger email notification via sendAdminNotification.ts
    // Return reservation ID
  },
});

// Update reservation status (existing function to be verified)
export const updateReservationStatus = mutation({
  args: {
    reservationId: v.id("reservations"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // Update status field
    // Send notification email via sendStatusUpdateEmail.ts
    // Only process payment when status is Confirmed
    // Allow cancellation only for pending or draft status
  },
});
```

**Design Rationale**: Status workflow prevents premature payment processing. Time slot validation prevents double-booking. Separating status updates from creation allows for flexible workflow management.

### 7. File Upload Functionality

#### Component: `AvatarUpload`

**Location**: `client/src/components/profile/AvatarUpload.tsx` (to be created or updated)

**Purpose**: Handle profile picture uploads on Profile tab in /dashboard

**Current State**:

- Camera icon on Profile tab does not open file upload dialog
- File input element not properly triggered by camera icon click
- Clerk UserProfile component may be overriding custom upload functionality
- file-type library version 21.0.0 is installed
- `convex/files.ts` exists for file storage operations

**Interface**:

```typescript
interface AvatarUploadProps {
  userId: string;
  currentAvatar?: string;
  onUploadSuccess: (url: string) => void;
}
```

**Implementation**:

- Trigger file input element click event within 500 milliseconds using `ref.current.click()` when camera icon is clicked
- Implement file input element with accept attribute set to "image/jpeg,image/png,image/webp" for browser-level validation
- Validate MIME type (image/jpeg, image/png, image/webp) using file-type library
- Validate file size (max 5MB) - reject with toast notification if exceeded
- Display upload progress indicator
- Show preview before upload
- Upload to Convex storage using `convex/files.ts` action before updating user record
- Update user.imageUrl field in Convex users table and refresh Clerk user metadata within 10 seconds
- Handle upload errors gracefully with user-friendly messages and log to `convex/audit.ts`
- Verify camera icon click handler is properly attached and not overridden by Clerk UserProfile component

**Design Rationale**: Using refs ensures the file input is triggered programmatically. Browser-level validation provides immediate feedback. Server-side validation with file-type prevents MIME type spoofing.

#### Service: `FileUploadService`

**Location**: `server/services/FileUploadService.ts` (to be created)

**Purpose**: Handle file uploads with validation and antivirus scanning

**Current State**: `convex/files.ts` exists for file storage operations. file-type library version 21.0.0 is installed.

**Interface**:

```typescript
interface FileUploadService {
  validateFile: (file: File) => Promise<ValidationResult>;
  scanFile: (file: File) => Promise<ScanResult>;
  uploadToStorage: (file: File, userId: string) => Promise<string>;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface ScanResult {
  clean: boolean;
  threats?: string[];
}
```

**Implementation**:

- Validate MIME type using file-type library (image/jpeg, image/png, image/webp only)
- Check file size limits (max 5MB) - reject with error message if exceeded
- Scan files with ClamAV or VirusTotal API for antivirus checking
- Reject infected files immediately with security error message
- Upload to Convex storage using `convex/files.ts` action
- Return storage URL after successful upload
- Log upload failures to `convex/audit.ts`

**Design Rationale**: Server-side validation prevents malicious file uploads. Antivirus scanning protects against malware. Using Convex storage simplifies file management and ensures files are accessible across the application.

### 8. Performance Optimization

#### Strategy: Critical Resource Optimization

**Current State**:

- Code splitting and lazy loading already in place in `client/src/App.tsx`
- Performance utilities exist in `client/src/utils/performance.ts`
- FCP >3s, LCP >4s, and CLS 0.216-0.376 exceed targets
- Need to optimize existing implementations

**Images**:

- Convert hero-bg.jpg and logo.png to WebP format with compression (reduce size by 30-50%)
- Generate responsive image sizes (320w, 640w, 1024w, 1920w)
- Implement lazy loading for below-the-fold images
- Add `loading="eager"` for hero images
- Preload critical resources using link rel="preload" in `client/index.html` for hero-bg.webp, logo.webp, and critical CSS
- Add explicit width and height attributes to all images to prevent layout shifts
- Serve images with srcset attribute for responsive sizes

**Code Splitting**:

- Verify existing React.lazy() implementation in `client/src/App.tsx` maintains initial bundle size below 200KB
- Split vendor chunks (React, Radix UI, WaveSurfer) in vite.config.ts
- Implement route-based code splitting (already in place, verify effectiveness)
- Use dynamic imports for heavy components

**Layout Stability**:

- Add explicit width/height to all images (target CLS < 0.1)
- Use skeleton loaders with fixed dimensions (aspect-ratio CSS) for beat cards to prevent layout shifts
- Reserve space for dynamic content with min-height
- Use CSS aspect-ratio for responsive images
- Avoid layout shifts during font loading

**Build Optimization**:

- Verify tree shaking and minification in vite.config.ts are enabled with preset: "smallest"
- Optimize `preloadCriticalResources()` function in `client/src/utils/performance.ts` to achieve FCP < 1.8s

**Design Rationale**: WebP format provides superior compression while maintaining quality. Preloading critical resources reduces perceived load time. Explicit dimensions prevent layout shifts which improve user experience and SEO rankings.

#### Component: `OptimizedImage`

**Location**: `client/src/components/ui/OptimizedImage.tsx`

**Purpose**: Render optimized images with responsive sizes

**Interface**:

```typescript
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
}
```

**Implementation**:

- Generate srcset for responsive images
- Use WebP format with fallback
- Implement lazy loading by default
- Preload priority images
- Add loading skeleton

#### Build Configuration

**Vite Config Updates**:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          "audio-vendor": ["wavesurfer.js"],
        },
      },
    },
  },
});
```

### 9. Audio Playback Testing

#### Component: `AudioPlayer`

**Location**: `client/src/components/audio/AudioPlayer.tsx` or `client/src/components/audio/EnhancedGlobalAudioPlayer.tsx` (existing file to be updated)

**Purpose**: Handle audio playback with WaveSurfer.js

**Current State**:

- EnhancedGlobalAudioPlayer component exists in `client/src/components/audio/EnhancedGlobalAudioPlayer.tsx`
- Component is lazy loaded in `client/src/App.tsx` with 2 second preload delay
- Test execution timed out after 15 minutes
- Likely related to product catalog page crash (TC011) preventing navigation to audio player
- WaveSurfer.js initialization may be blocking

**Interface**:

```typescript
interface AudioPlayerProps {
  audioUrl: string;
  beatId: number;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: Error) => void;
}
```

**Implementation**:

- Initialize WaveSurfer.js with async/await pattern and 2-second timeout
- Implement loading state with progress indicator using Radix UI Progress component
- Add timeout for audio file loading (10 seconds) using Promise.race with setTimeout
- Display loading error message via toast notification if timeout exceeded
- Cleanup audio instances on unmount by calling `wavesurfer.destroy()` to prevent memory leaks
- Handle loading errors gracefully with ErrorBoundary
- Display user-friendly error messages without crashing the page
- Fix product catalog issues (Requirement 2) first to enable navigation to audio player for testing

**Design Rationale**: Timeouts prevent indefinite hangs during audio loading. Proper cleanup prevents memory leaks in single-page applications. Error boundaries isolate failures to prevent full app crashes.

#### Service: `AudioLoadingService`

**Location**: `client/src/services/AudioLoadingService.ts` (to be created)

**Purpose**: Manage audio file loading with timeouts to prevent indefinite hangs

**Interface**:

```typescript
interface AudioLoadingService {
  loadAudio: (url: string, timeout: number) => Promise<AudioBuffer>;
  preloadAudio: (url: string) => Promise<void>;
  cancelLoading: (url: string) => void;
}
```

**Implementation**:

- Implement timeout wrapper for audio loading using Promise.race with setTimeout (10 second limit)
- Cache loaded audio buffers to prevent redundant loads
- Preload audio on hover for instant playback
- Cancel loading on component unmount to prevent memory leaks
- Handle network errors gracefully with user-friendly messages

**Design Rationale**: Caching prevents redundant network requests. Preloading on hover improves perceived performance. Timeout handling prevents the application from hanging indefinitely on slow connections.

### 10. Error Boundary Enhancement

#### Component: `GlobalErrorBoundary`

**Location**: `client/src/components/error/GlobalErrorBoundary.tsx` (to be created or enhanced)

**Purpose**: Catch and handle all component errors

**Current State**:

- ✅ Functional - TestSprite TC023 confirmed error boundaries handle component errors correctly
- ErrorBoundary component exists in `client/src/components/errors/ErrorBoundary.tsx`
- Properly wrapped around Router in `client/src/App.tsx`
- Need to preserve existing functionality while enhancing

**Interface**:

```typescript
interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  retry: () => void;
}
```

**Implementation**:

- Catch all component errors with componentDidCatch
- Log errors with component stack trace to `convex/audit.ts` using logActivity mutation
- Display user-friendly error message with retry button using ErrorBoundary fallback UI
- Provide retry mechanism to reset error boundary state and reload failed component
- Report errors to monitoring service (optional)
- Prevent error propagation to parent components
- Maintain ErrorBoundary wrapper around Router component in `client/src/App.tsx` to catch all route-level errors
- Display RouteLoadingFallback component from `client/src/components/loading/OptimizedLoadingFallback.tsx` for Suspense boundary errors
- Preserve existing error boundary functionality to maintain TC023 pass status

**Design Rationale**: Error boundaries prevent cascading failures. Logging provides debugging context. Retry functionality allows users to recover from transient errors without refreshing the page.

#### Component: `LazyLoadErrorBoundary`

**Location**: `client/src/components/error/LazyLoadErrorBoundary.tsx` (to be created)

**Purpose**: Handle lazy loading errors specifically for React.lazy() components

**Implementation**:

- Catch lazy loading failures specifically
- Display loading skeleton during retry
- Implement automatic retry (3 attempts with exponential backoff)
- Show error message after max retries exceeded
- Log lazy loading failures to `convex/audit.ts`
- Display error within ErrorBoundary component without crashing the entire page

**Design Rationale**: Lazy loading failures are often transient network issues. Automatic retry with exponential backoff increases the likelihood of successful recovery without user intervention.

## Data Models

### Updated Convex Schema

**Location**: `convex/schema.ts`

**Cart Items** (table exists, add indexes):

```typescript
cartItems: defineTable({
  userId: v.optional(v.id("users")),
  sessionId: v.optional(v.string()),
  beatId: v.number(),
  licenseType: v.string(),
  price: v.number(),
  quantity: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(), // Add for sync tracking
  syncedAt: v.optional(v.number()), // Add for sync status
})
  .index("by_user", ["userId"]) // ADD THIS INDEX for fast user queries
  .index("by_session", ["sessionId"]); // ADD THIS INDEX for guest carts
```

**Subscriptions** (already exists in proper schema, no changes needed):

```typescript
subscriptions: defineTable({
  userId: v.id("users"),
  clerkSubscriptionId: v.string(),
  planId: v.string(),
  status: v.string(),
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
  downloadQuota: v.number(),
  downloadUsed: v.number(),
  // ... existing fields
});
```

**Quotas** (already exists in proper schema, no changes needed):

```typescript
quotas: defineTable({
  userId: v.id("users"),
  subscriptionId: v.optional(v.id("subscriptions")),
  quotaType: v.string(),
  limit: v.number(),
  used: v.number(),
  resetAt: v.number(),
  // ... existing fields
});
```

**Design Rationale**: The by_user index is critical for fast cart queries when users log in. The by_session index supports guest cart functionality. These indexes ensure queries complete within the 2-second requirement.

## Error Handling

### Error Types

```typescript
// Authentication Errors
class ClerkAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean
  ) {
    super(message);
  }
}

// Cart Sync Errors
class CartSyncError extends Error {
  constructor(
    message: string,
    public items: CartItem[],
    public retryable: boolean
  ) {
    super(message);
  }
}

// Payment Errors
class PaymentError extends Error {
  constructor(
    message: string,
    public orderId: string,
    public provider: string
  ) {
    super(message);
  }
}

// File Upload Errors
class FileUploadError extends Error {
  constructor(
    message: string,
    public reason: "size" | "type" | "virus" | "network"
  ) {
    super(message);
  }
}
```

### Error Handling Strategy

1. **Retry Logic**: Implement exponential backoff for transient errors
2. **User Feedback**: Display user-friendly error messages
3. **Error Logging**: Log all errors to audit logs with context
4. **Error Recovery**: Provide retry mechanisms for recoverable errors
5. **Error Boundaries**: Prevent error propagation with React error boundaries

## Testing Strategy

### Unit Tests

**Cart Sync Service**:

- Test debounced sync behavior
- Test optimistic updates with rollback
- Test logout cart save
- Test login cart load
- Test merge logic

**Clerk Auth Provider**:

- Test retry logic with exponential backoff
- Test error handling for 400 errors
- Test deprecated prop replacement

**Payment Service**:

- Test webhook signature verification
- Test idempotency key handling
- Test order status updates

### Integration Tests

**Cart Persistence Flow**:

1. Add items to cart
2. Logout
3. Login
4. Verify cart contents restored

**Subscription Management Flow**:

1. Create subscription via Clerk Billing
2. Verify webhook received
3. Verify subscription created in Convex
4. Verify quotas updated

**Payment Processing Flow**:

1. Create order
2. Process payment
3. Verify webhook received
4. Verify order status updated
5. Verify download access granted

### E2E Tests (TestSprite)

- Re-run all 15 TestSprite tests after fixes
- Verify 100% pass rate
- Monitor performance metrics (FCP, LCP, CLS)

## Performance Targets

### Metrics

- **First Contentful Paint (FCP)**: < 1.8s (currently >3s)
- **Largest Contentful Paint (LCP)**: < 2.5s (currently >4s)
- **Cumulative Layout Shift (CLS)**: < 0.1 (currently 0.216-0.376)
- **Time to Interactive (TTI)**: < 3.5s
- **Total Bundle Size**: < 200KB (initial load)

### Optimization Techniques

1. **Code Splitting**: Reduce initial bundle by 40%
2. **Image Optimization**: Reduce image sizes by 50%
3. **Lazy Loading**: Defer non-critical resources
4. **Caching**: Implement aggressive caching strategies
5. **Compression**: Enable Brotli compression

## Security Considerations

### Authentication

- Use production Clerk keys in production environment
- Implement rate limiting on authentication endpoints
- Log all authentication failures
- Implement account lockout after failed attempts

### Payment Processing

- Verify all webhook signatures
- Use idempotency keys to prevent duplicate charges
- Implement PCI compliance measures
- Log all payment events for audit

### File Uploads

- Validate MIME types server-side
- Scan all files with antivirus
- Implement file size limits
- Sanitize file names
- Store files in secure location

### Data Access

- Enforce user permissions in all Convex queries
- Implement Row-Level Security
- Validate all user inputs with Zod schemas
- Sanitize user-generated content

## Deployment Strategy

### Implementation Dependencies

**Critical Path** (must be completed in order):

1. **Requirement 2** (Product Catalog) → Blocks **Requirement 9** (Audio Playback) - catalog page must load before audio player can be tested
2. **Requirement 3** (Cart Persistence) → Blocks **Requirement 5** (Payment Processing) - cart must work before payments can be processed
3. **Requirement 1** (Clerk Auth) → Should be fixed early as it affects user experience across all features

**Parallel Tracks** (can be implemented simultaneously):

- **Track A**: Requirements 1, 2, 10 (Auth, Catalog, Error Boundaries)
- **Track B**: Requirements 3, 5 (Cart, Payments)
- **Track C**: Requirements 4, 6 (Subscriptions, Reservations)
- **Track D**: Requirements 7, 8, 9 (File Upload, Performance, Audio)

### Phase 1: Critical Fixes (Week 1)

1. Fix Clerk authentication configuration (Requirement 1)
2. Clear Vite cache and update dependencies (Requirement 2)
3. Implement cart persistence (Requirement 3)
4. Add error boundaries (Requirement 10)

### Phase 2: Subscription & Payments (Week 2)

1. Complete Clerk Billing setup (Requirement 4)
2. Implement subscription management
3. Fix payment processing flow (Requirement 5)
4. Test reservation system (Requirement 6)

### Phase 3: Performance & Polish (Week 3)

1. Optimize images and assets (Requirement 8)
2. Implement code splitting
3. Fix file upload functionality (Requirement 7)
4. Optimize performance metrics
5. Fix audio playback (Requirement 9)

### Phase 4: Testing & Validation (Week 4)

1. Re-run TestSprite tests (target: 15/15 passing)
2. Conduct security audit
3. Perform load testing
4. Deploy to production

## Rollback Plan

### Rollback Triggers

- TestSprite pass rate < 80%
- Critical errors in production
- Performance regression > 20%
- Security vulnerabilities discovered

### Rollback Procedure

1. Revert to previous deployment
2. Restore database backup if needed
3. Notify users of temporary issues
4. Investigate root cause
5. Fix issues in development
6. Re-deploy after validation

## Monitoring and Observability

### Metrics to Track

- Authentication success/failure rates
- Cart sync success rates
- Payment processing success rates
- Subscription creation rates
- File upload success rates
- Performance metrics (FCP, LCP, CLS)
- Error rates by component

### Alerting

- Alert on authentication failure rate > 5%
- Alert on cart sync failure rate > 2%
- Alert on payment processing failure rate > 1%
- Alert on performance regression > 20%
- Alert on error rate > 1%

### Logging

- Log all authentication events
- Log all cart sync operations
- Log all payment events
- Log all file upload events
- Log all errors with stack traces

## Success Criteria

### TestSprite Test Results

**Target**: 100% pass rate (15/15 tests passing)

**Current State**: 40% pass rate (6/15 passing)

**Tests to Fix**:

- ✅ TC010: Clerk Authentication (currently ❌ Failed)
- ✅ TC011: Product Catalog (currently ❌ Failed)
- ✅ TC012: Audio Playback (currently ❌ Timeout)
- ✅ TC013: Shopping Cart Persistence (currently ❌ Failed)
- ✅ TC014: Payment Processing (currently ❌ Timeout)
- ✅ TC015: Service Reservations (currently ❌ Timeout)
- ✅ TC016: Subscription Management (currently ❌ Failed)
- ✅ TC018: File Upload (currently ❌ Failed)

**Tests to Preserve** (already passing):

- ✅ TC017: Favorites & Wishlist Synchronization
- ✅ TC019: Offline Support
- ✅ TC020: SEO Optimization
- ✅ TC021: Admin Panel
- ✅ TC022: Real-time Dashboard Data
- ✅ TC023: Error Handling & Logging
- ✅ TC024: Cross-browser Compatibility

### Performance Metrics

1. **First Contentful Paint (FCP)**: < 1.8s (currently >3s)
2. **Largest Contentful Paint (LCP)**: < 2.5s (currently >4s)
3. **Cumulative Layout Shift (CLS)**: < 0.1 (currently 0.216-0.376)
4. **Time to Interactive (TTI)**: < 3.5s
5. **Total Bundle Size**: < 200KB (initial load)

### Functional Requirements

1. **Cart Persistence**: 100% success rate across logout/login cycles
2. **Authentication**: 0 Clerk 400 errors from environment endpoint
3. **Subscription Management**: Fully functional with quota enforcement (10, 50, unlimited downloads)
4. **Payment Processing**: 100% webhook processing success rate with signature verification
5. **File Upload**: Functional with antivirus scanning and MIME type validation
6. **Error Handling**: All errors caught by error boundaries, preserve TC023 pass status
7. **Reservation System**: Email notifications sent within 10 seconds, time slot validation working

### Code Quality

1. **TypeScript**: 0 errors after running `npm run type-check`
2. **Linting**: 0 errors after running `npm run lint:fix`
3. **Tests**: All unit and integration tests passing
4. **No Regressions**: All currently passing TestSprite tests remain passing

### Production Readiness

1. **Security Audit**: Webhook signatures verified, file uploads scanned, user permissions enforced
2. **Environment Configuration**: Production Clerk keys configured, all API keys validated
3. **Monitoring**: Error logging to `convex/audit.ts` functional
4. **Rollback Plan**: Documented and tested
5. **Deployment Approval**: All stakeholders approve for production deployment
