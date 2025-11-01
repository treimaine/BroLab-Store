# Implementation Plan

- [x] 1. Fix Clerk Authentication Configuration
  - Replace deprecated `redirectUrl` with `fallbackRedirectUrl` in client/src/pages/login.tsx (lines 42 and 62)
  - Verify telemetry: false setting is maintained in client/src/main.tsx (line 60) - ALREADY DONE
  - Verify ClerkErrorBoundary exists and is properly implemented - ALREADY EXISTS at client/src/components/auth/ClerkErrorBoundary.tsx
  - Add exponential backoff retry logic to ClerkErrorBoundary for Clerk API calls (3 attempts: 1s, 2s, 4s delays)
  - Add user-friendly error messages for 400 errors using toast notifications
  - Log authentication failures to convex/audit.ts with context (endpoint, status code, user action)
  - Verify Clerk publishable key format matches pk*test*_ or pk*live*_ pattern before initialization
  - Update environment variables to use production Clerk keys or increase development limits
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Resolve Vite Dependency Optimization Issues
  - Run `npm run clean:all` to clear Vite cache and node_modules
  - Add @radix-ui/react-progress to optimizeDeps.include array in vite.config.ts (currently missing)
  - Change `optimizeDeps.force` from `true` to `false` in vite.config.ts to prevent constant rebuilds
  - Add explicit width and height attributes to beat card images to prevent layout shifts (target CLS < 0.1)
  - Verify ErrorBoundary is properly wrapping routes in client/src/App.tsx - ALREADY DONE
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement Shopping Cart Persistence
- [x] 3.1 Create Convex cart functions
  - Create `convex/cartItems.ts` file (does not exist yet)
  - Create `syncCart` mutation for batch cart updates with authentication check
  - Create `loadCart` query to fetch user cart items using by_user index
  - Implement cart merge logic to prefer Convex data over local data
  - Add proper error handling and logging to convex/audit.ts
  - Follow the pattern from convex/favorites/ (add.ts, remove.ts, getFavorites.ts) which is working
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 3.2 Create CartSyncService
  - Create `client/src/services/CartSyncService.ts` file
  - Implement `syncToConvex` method with 300ms debounce using lodash or custom implementation
  - Implement `loadFromConvex` method with 2-second timeout
  - Implement `handleLogout` method to save cart before logout (blocking operation using beforeunload event)
  - Implement `handleLogin` method to load and merge cart data
  - Add optimistic updates with automatic rollback on failure (retry up to 3 times)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [x] 3.3 Integrate CartSyncService into useCartStore
  - Update client/src/stores/useCartStore.ts (file exists)
  - Add `syncStatus` state ('idle' | 'syncing' | 'error')
  - Add `lastSyncedAt` timestamp
  - Integrate CartSyncService into addItem, removeItem, and updateQuantity actions
  - Add `syncToServer` action for manual sync
  - Add `loadFromServer` action for login
  - Hook into Clerk auth events to trigger cart sync on login/logout
  - Implement beforeunload event listener to save cart before logout
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]\* 3.4 Write cart persistence tests
  - Write unit tests for CartSyncService debounce behavior
  - Write unit tests for optimistic updates with rollback
  - Write integration test for logout cart save
  - Write integration test for login cart load
  - Write integration test for cart merge logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Complete Clerk Billing Integration Setup
- [ ] 4.1 Configure Clerk Billing in Clerk Dashboard
  - Enable Clerk Billing in Clerk Dashboard settings at https://dashboard.clerk.com
  - Create three subscription plans: Basic ($9.99/month, 10 downloads), Artist ($29.99/month, 50 downloads), Ultimate ($99.99/month, unlimited)
  - Configure webhook endpoint URL: `/api/webhooks/clerk-billing`
  - Add webhook events: `subscription.created`, `subscription.updated`, `subscription.deleted`
  - Copy webhook secret to environment variables
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.2 Verify and enhance existing Convex subscription functions
  - Verify convex/subscriptions/upsertSubscription.ts exists and works correctly
  - Verify convex/subscriptions/createOrUpdateFromClerk.ts handles webhook events
  - Verify convex/subscriptions/updateSubscription.ts updates status correctly
  - Create `checkDownloadQuota` query in convex/subscriptions/ if not exists
  - Create `incrementDownloadUsage` mutation if not exists
  - Verify convex/quotas/getUserQuotas.ts and updateQuota.ts work correctly
  - _Requirements: 4.2, 4.4, 4.5_

- [ ] 4.3 Create or update ClerkBillingService
  - Create `server/services/ClerkBillingService.ts` file (does not exist yet)
  - Implement `handleSubscriptionCreated` method using existing convex/subscriptions/createOrUpdateFromClerk.ts
  - Implement `handleSubscriptionUpdated` method using existing convex/subscriptions/updateSubscription.ts
  - Implement `handleSubscriptionDeleted` method to cancel subscription
  - Implement `syncQuotas` method using convex/quotas/updateQuota.ts
  - Add webhook signature verification using Svix library
  - Process subscription through Clerk Billing within 5 seconds
  - _Requirements: 4.2, 4.3, 4.4, 4.6_

- [ ] 4.4 Create SubscriptionManagement component
  - Create `client/src/components/subscription/SubscriptionManagement.tsx` file
  - Display available subscription plans with pricing
  - Show current plan and quota usage with progress bar using Radix UI Progress
  - Implement plan upgrade/downgrade via Clerk Billing
  - Display billing history and next billing date
  - Add quota enforcement to download actions
  - Verify PricingTable component in client/src/pages/MembershipPageFixed.tsx renders correctly
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ]\* 4.5 Write subscription management tests
  - Write integration test for subscription creation webhook
  - Write integration test for quota updates
  - Write unit test for quota enforcement
  - Write integration test for plan upgrade flow
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. Restore Payment Processing Flow (Dependent on Task 3 - Cart Persistence)
- [x] 5.1 Create PaymentService
  - Create `server/services/PaymentService.ts` file (does not exist yet)
  - Implement `createPaymentIntent` method with order metadata (complete within 3 seconds)
  - Implement `handleStripeWebhook` method with signature verification using STRIPE_WEBHOOK_SECRET
  - Implement `handlePayPalWebhook` method with signature verification using PAYPAL_WEBHOOK_ID
  - Implement `verifyWebhookSignature` method - reject failed verification with 400 status and log to convex/audit.ts
  - Generate idempotency keys using order.idempotencyKey field to prevent duplicate processing
  - Implement retry logic for failed webhook processing (3 attempts with exponential backoff)
  - Handle payment failures gracefully with user-friendly error messages via toast notification
  - Preserve cart contents in Zustand store on payment failure
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

- [x] 5.2 Update Convex order functions
  - Verify convex/orders/createOrder.ts exists and creates payment intent with metadata
  - Verify convex/orders/updateOrder.ts exists and updates order status
  - Create `confirmPayment` mutation in convex/orders/ if not exists
  - Update order status to 'paid' only after successful payment verification
  - Grant download access by creating download records within 5 seconds after payment_intent.succeeded
  - Trigger confirmation email after successful payment
  - Add idempotency check using order.idempotencyKey to prevent duplicate processing
  - Verify webhook processing at convex/http.ts
  - _Requirements: 5.1, 5.4, 5.6_

- [ ]\* 5.3 Write payment processing tests
  - Write unit test for webhook signature verification
  - Write unit test for idempotency key handling
  - Write integration test for order status updates
  - Write integration test for download access grant
  - Write integration test for payment failure handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6. Validate Service Reservation System
- [x] 6.1 Verify and enhance reservation form in mixing-mastering page
  - Verify form validation in client/src/pages/mixing-mastering.tsx (file exists with extensive form handling)
  - Verify Zod schema validation using mixingMasteringSubmissionSchema from @shared/validation
  - Verify email format validation is working
  - Verify phone number format validation is working
  - Verify date validation (must be in future) is working
  - Add time slot availability check before submission by querying convex/reservations by preferredDate and serviceType
  - Test form submission in isolation to identify if timeout is from form validation or email notification
  - _Requirements: 6.1, 6.5, 6.6_

- [x] 6.2 Verify and enhance existing email functions
  - Verify convex/reservations/sendAdminNotification.ts exists and works
  - Verify convex/reservations/sendStatusUpdateEmail.ts exists and works
  - Verify convex/reservations/sendReminderEmail.ts exists and works
  - Verify Resend API integration using RESEND_API_KEY from .env
  - Verify retry logic (3 attempts with exponential backoff) in sendAdminNotification.ts
  - Verify email failures are logged to convex/audit.ts
  - Verify confirmation email is sent within 10 seconds of reservation creation
  - Create email templates for consistency if not exists
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 6.3 Verify and update Convex reservation functions
  - Verify convex/reservations/createReservation.ts exists and creates reservations
  - Add time slot availability validation by querying reservations by preferredDate and serviceType
  - Verify email notification is triggered after reservation creation via sendAdminNotification.ts
  - Verify convex/reservations/updateReservationStatus.ts implements status workflow (Draft → Pending → Confirmed → Completed/Cancelled)
  - Verify status update triggers notification email via sendStatusUpdateEmail.ts
  - Add cancellation logic that prevents payment for non-confirmed reservations (only pending or draft status)
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_

- [ ]\* 6.4 Write reservation system tests
  - Write unit test for form validation
  - Write integration test for reservation creation
  - Write integration test for email notification
  - Write integration test for status workflow
  - Write integration test for cancellation logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 7. Fix File Upload Functionality
- [ ] 7.1 Create or update AvatarUpload component
  - Create `client/src/components/profile/AvatarUpload.tsx` file (does not exist yet)
  - Implement file input element with accept="image/jpeg,image/png,image/webp" for browser-level validation
  - Trigger file input click event within 500ms using ref.current.click() when camera icon is clicked
  - Add MIME type validation using file-type library (version 21.0.0 is installed)
  - Add file size validation (max 5MB) - reject with toast notification if exceeded
  - Display upload progress indicator
  - Show image preview before upload
  - Upload to Convex storage using convex/files.ts action
  - Update user.imageUrl field in Convex users table and refresh Clerk user metadata within 10 seconds
  - Handle upload errors with user-friendly messages and log to convex/audit.ts
  - Verify camera icon click handler is properly attached and not overridden by Clerk UserProfile component
  - _Requirements: 7.1, 7.2, 7.3, 7.6_

- [ ] 7.2 Create FileUploadService
  - Create `server/services/FileUploadService.ts` file (does not exist yet)
  - Implement `validateFile` method for MIME type (image/jpeg, image/png, image/webp) and size validation (max 5MB)
  - Implement `scanFile` method for antivirus scanning (ClamAV or VirusTotal API)
  - Implement `uploadToStorage` method to upload to Convex storage using convex/files.ts
  - Reject infected files immediately with security error message
  - Return storage URL after successful upload
  - Log upload failures to convex/audit.ts
  - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]\* 7.3 Write file upload tests
  - Write unit test for MIME type validation
  - Write unit test for file size validation
  - Write unit test for antivirus scanning
  - Write integration test for upload flow
  - Write integration test for error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 8. Implement Performance Optimizations
- [ ] 8.1 Optimize images and assets
  - Convert hero-bg.jpg and logo.png to WebP format with compression (reduce size by 30-50%)
  - Generate responsive image sizes (320w, 640w, 1024w, 1920w)
  - Add preload tags for critical images in client/index.html (hero-bg.webp, logo.webp, critical CSS)
  - Implement lazy loading for below-the-fold images
  - Add explicit width and height attributes to all images to prevent layout shifts
  - Serve images with srcset attribute for responsive sizes
  - _Requirements: 8.3, 8.4, 8.5_

- [ ] 8.2 Verify and enhance code splitting
  - Verify React.lazy() is used for route components in client/src/App.tsx - ALREADY DONE
  - Verify route-based code splitting is implemented - ALREADY DONE
  - Configure manual chunks in vite.config.ts for vendor splitting (react-vendor, ui-vendor, audio-vendor)
  - Verify initial bundle size is below 200KB
  - Verify tree shaking and minification are enabled with preset: "smallest" in vite.config.ts
  - _Requirements: 8.6_

- [ ] 8.3 Create OptimizedImage component
  - Create `client/src/components/ui/OptimizedImage.tsx` file (does not exist yet)
  - Generate srcset for responsive images
  - Use WebP format with fallback to original format
  - Implement lazy loading by default
  - Add priority prop for above-the-fold images (use loading="eager")
  - Add loading skeleton for better UX
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 8.4 Fix layout shifts in beat cards and images
  - Add CSS aspect-ratio for responsive images
  - Add explicit width/height to all beat card images to prevent layout shifts (target CLS < 0.1)
  - Use skeleton loaders with fixed dimensions for beat cards
  - Reserve space for dynamic content with min-height
  - Use font-display: swap for web fonts
  - Verify CLS score is below 0.1
  - _Requirements: 8.3_

- [ ] 8.5 Optimize critical resource loading
  - Optimize preloadCriticalResources() function in client/src/utils/performance.ts to achieve FCP < 1.8s
  - Verify performance utilities in client/src/utils/performance.ts are working correctly
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]\* 8.6 Measure and verify performance
  - Run Lighthouse audit on all pages
  - Verify FCP < 1.8s on all pages
  - Verify LCP < 2.5s on all pages
  - Verify CLS < 0.1 on all pages
  - Document performance improvements
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 9. Add Audio Playback Testing Infrastructure (Dependent on Task 2 - Product Catalog Fix)
- [ ] 9.1 Update EnhancedGlobalAudioPlayer component
  - Update `client/src/components/audio/EnhancedGlobalAudioPlayer.tsx` (file exists and is lazy loaded)
  - Initialize WaveSurfer.js with async/await pattern and 2-second timeout
  - Implement loading state with progress indicator using Radix UI Progress component
  - Add 10-second timeout for audio file loading using Promise.race with setTimeout
  - Display loading error message via toast notification if timeout exceeded
  - Cleanup audio instances on unmount by calling wavesurfer.destroy() to prevent memory leaks
  - Handle loading errors gracefully with ErrorBoundary
  - Display user-friendly error messages without crashing the page
  - Fix product catalog issues (Task 2) first to enable navigation to audio player for testing
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 9.2 Create AudioLoadingService
  - Create `client/src/services/AudioLoadingService.ts` file (does not exist yet)
  - Implement `loadAudio` method with configurable timeout (default 10 seconds)
  - Implement `preloadAudio` method for hover preloading
  - Implement `cancelLoading` method for cleanup
  - Add audio buffer caching to prevent redundant loads
  - Handle network errors gracefully
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]\* 9.3 Write audio playback tests
  - Write unit test for WaveSurfer initialization timeout
  - Write unit test for audio loading timeout
  - Write unit test for cleanup on unmount
  - Write integration test for audio playback flow
  - Write integration test for error handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Verify and Enhance Error Boundaries
- [ ] 10.1 Verify existing ErrorBoundary implementation
  - Verify client/src/components/errors/ErrorBoundary.tsx exists and works correctly - ALREADY EXISTS
  - Verify ErrorBoundary is wrapped around Router in client/src/App.tsx - ALREADY DONE
  - Verify ErrorBoundary catches component errors with componentDidCatch
  - Verify errors are logged with component stack trace
  - Verify user-friendly error message with retry button is displayed
  - Verify retry mechanism reloads failed component
  - Maintain TC023 pass status (error boundaries working correctly)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10.2 Create LazyLoadErrorBoundary for lazy loading failures
  - Create `client/src/components/errors/LazyLoadErrorBoundary.tsx` file (does not exist yet)
  - Catch lazy loading failures specifically
  - Display loading skeleton during retry using RouteLoadingFallback
  - Implement automatic retry (3 attempts with exponential backoff)
  - Show error message after max retries exceeded
  - Log lazy loading failures to convex/audit.ts
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10.3 Wrap routes with error boundaries
  - Wrap all lazy-loaded routes with `LazyLoadErrorBoundary` in client/src/App.tsx
  - Verify product catalog page has error boundary (ErrorBoundary already wraps all routes)
  - Verify dashboard has error boundary (DashboardErrorBoundary exists at client/src/components/dashboard/DashboardErrorBoundary.tsx)
  - Verify checkout flow has error boundary
  - Verify admin panel has error boundary
  - Verify Suspense boundaries display RouteLoadingFallback instead of crashing
  - _Requirements: 10.1, 10.5_

- [ ]\* 10.4 Write error boundary tests
  - Write unit test for error catching
  - Write unit test for retry mechanism
  - Write integration test for lazy loading error handling
  - Write integration test for error logging
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11. Run Final Validation and Testing
- [ ] 11.1 Run type checking and linting
  - Run `npm run type-check` and fix all TypeScript errors
  - Run `npm run lint:fix` and fix all linting errors
  - Run `npm run pre-check` to verify all checks pass
  - Verify no `any` types introduced
  - Verify import aliases used correctly (@/, @shared/, @convex/)
  - Use getDiagnostics tool to check for issues in modified files
  - _Requirements: All_

- [ ] 11.2 Run test suite
  - Run `npm test` and verify all tests pass
  - Verify test coverage is above 80% for critical paths
  - Fix any failing tests
  - Document test results
  - _Requirements: All_

- [ ] 11.3 Re-run TestSprite tests
  - Run all 15 TestSprite tests
  - Verify improved pass rate (target: 13/15 or better, up from 6/15)
  - Document any remaining issues
  - Verify performance metrics meet targets (FCP < 1.8s, LCP < 2.5s, CLS < 0.1)
  - Priority fixes: TC010 (Auth), TC011 (Product Catalog), TC013 (Cart), TC016 (Subscriptions)
  - _Requirements: All_

- [ ] 11.4 Conduct security audit
  - Verify webhook signature validation for Stripe, PayPal, and Clerk Billing
  - Verify file upload antivirus scanning is implemented
  - Verify user permission checks in Convex functions (ctx.auth.getUserIdentity())
  - Verify input validation with Zod schemas at all entry points
  - Verify Row-Level Security by filtering queries by userId
  - Document security findings
  - _Requirements: All_

- [ ] 11.5 Prepare deployment
  - Update environment variables for production (Clerk keys, webhook secrets)
  - Verify CLERK_BILLING_ENABLED=true is set
  - Verify RESEND_API_KEY is configured
  - Verify STRIPE_WEBHOOK_SECRET and PAYPAL_WEBHOOK_ID are set
  - Create deployment checklist
  - Document rollback procedures
  - Set up monitoring and alerting
  - Schedule deployment window
  - _Requirements: All_
