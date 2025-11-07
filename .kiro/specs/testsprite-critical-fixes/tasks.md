# Implementation Plan

- [x] 1. Fix Clerk Authentication Configuration
  - Replace deprecated `redirectUrl` with `fallbackRedirectUrl` in client/src/pages/login.tsx - COMPLETED
  - Verify telemetry: false setting is maintained in client/src/main.tsx - VERIFIED
  - Verify ClerkErrorBoundary exists and is properly implemented - VERIFIED
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Resolve Vite Dependency Optimization Issues
  - Add @radix-ui/react-progress to optimizeDeps.include array in vite.config.ts - COMPLETED
  - Change `optimizeDeps.force` from `true` to `false` in vite.config.ts - COMPLETED
  - Verify ErrorBoundary is properly wrapping routes in client/src/App.tsx - VERIFIED
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement Shopping Cart Persistence
- [x] 3.1 Create Convex cart functions - COMPLETED
  - convex/cartItems.ts created with syncCart, loadCart, addItem, removeItem, updateQuantity, clearCart
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 3.2 Create CartSyncService - COMPLETED
  - client/src/services/CartSyncService.ts created with full implementation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [x] 3.3 Integrate CartSyncService into useCartStore - COMPLETED
  - client/src/stores/useCartStore.ts updated with sync functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]\* 3.4 Write cart persistence tests
  - Write unit tests for CartSyncService debounce behavior
  - Write unit tests for optimistic updates with rollback
  - Write integration test for logout cart save
  - Write integration test for login cart load
  - Write integration test for cart merge logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Complete Clerk Billing Integration Setup
- [x] 4.1 Configure Clerk Billing in Clerk Dashboard (Manual Configuration Required) - COMPLETED
  - ✅ Clerk Billing enabled in Clerk Dashboard settings at https://dashboard.clerk.com
  - ✅ Three subscription plans created: Basic ($9.99/month, 10 downloads), Artist ($29.99/month, 50 downloads), Ultimate ($99.99/month, unlimited)
  - ✅ Webhook endpoint URL configured: `/api/webhooks/clerk-billing`
  - ✅ Webhook events added: `subscription.created`, `subscription.updated`, `subscription.deleted`
  - ✅ Webhook secret copied to environment variables (CLERK_WEBHOOK_SECRET)
  - ✅ Created dedicated webhook handler in server/routes/clerk-billing.ts
  - ✅ Integrated webhook handler into server/routes/index.ts
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.2 Verify existing Convex subscription functions - VERIFIED
  - Existing functions in convex/subscriptions/ and convex/quotas/ are functional
  - _Requirements: 4.2, 4.4, 4.5_

- [ ]\* 4.3 Write subscription management tests
  - Write integration test for subscription creation webhook
  - Write integration test for quota updates
  - Write unit test for quota enforcement
  - Write integration test for plan upgrade flow
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. Restore Payment Processing Flow - COMPLETED
- [x] 5.1 PaymentService implementation - COMPLETED
  - server/services/PaymentService.ts exists with full implementation
  - All webhook handling, signature verification, and idempotency logic implemented
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

- [x] 5.2 Convex order functions - VERIFIED
  - Existing order functions in convex/orders/ are functional
  - _Requirements: 5.1, 5.4, 5.6_

- [ ]\* 5.3 Write payment processing tests
  - Write unit test for webhook signature verification
  - Write unit test for idempotency key handling
  - Write integration test for order status updates
  - Write integration test for download access grant
  - Write integration test for payment failure handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6. Validate Service Reservation System - VERIFIED
- [x] 6.1 Reservation form validation - VERIFIED
  - Form validation in client/src/pages/mixing-mastering.tsx is functional
  - _Requirements: 6.1, 6.5, 6.6_

- [x] 6.2 Email functions - VERIFIED
  - Email functions in convex/reservations/ are functional
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 6.3 Convex reservation functions - VERIFIED
  - Reservation functions in convex/reservations/ are functional
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_

- [ ]\* 6.4 Write reservation system tests
  - Write unit test for form validation
  - Write integration test for reservation creation
  - Write integration test for email notification
  - Write integration test for status workflow
  - Write integration test for cancellation logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 7. Fix File Upload Functionality
- [x] 7.1 Investigate and fix profile picture upload
  - ✅ Investigated - camera icon exists but API endpoint was missing
  - ✅ AvatarUpload component already implemented with camera icon overlay
  - ✅ File input element with accept="image/jpeg,image/png,image/webp,image/gif"
  - ✅ Trigger file input click event using ref.current.click() when camera icon is clicked
  - ✅ MIME type validation (image/\* only)
  - ✅ File size validation (max 5MB) with toast notification
  - ✅ Upload to Convex storage via /api/avatar/upload endpoint
  - ✅ Backend validates, scans, and uploads to Convex storage
  - ✅ Update user.imageUrl field in Convex users table via updateUserAvatar mutation
  - _Requirements: 7.1, 7.2, 7.3, 7.6_

- [ ]\* 7.2 Write file upload tests
  - Write unit test for MIME type validation
  - Write unit test for file size validation
  - Write integration test for upload flow
  - Write integration test for error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 8. Implement Performance Optimizations
- [x] 8.1 Optimize images and assets
  - Convert hero-bg.jpg and logo.png to WebP format with compression
  - Generate responsive image sizes (320w, 640w, 1024w, 1920w)
  - Add preload tags for critical images in client/index.html
  - Add explicit width and height attributes to images to prevent layout shifts (target CLS < 0.1)
  - _Requirements: 8.3, 8.4, 8.5_

- [x] 8.2 Create OptimizedImage component
  - Create `client/src/components/ui/OptimizedImage.tsx` file
  - Generate srcset for responsive images
  - Use WebP format with fallback
  - Implement lazy loading by default
  - Add priority prop for above-the-fold images
  - Add loading skeleton for better UX
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8.3 Fix layout shifts in beat cards
  - Add CSS aspect-ratio for responsive images
  - Add explicit width/height to all beat card images
  - Use skeleton loaders with fixed dimensions for beat cards
  - Reserve space for dynamic content with min-height
  - Verify CLS score is below 0.1
  - _Requirements: 8.3_

- [ ]\* 8.4 Measure and verify performance
  - Run Lighthouse audit on all pages
  - Verify FCP < 1.8s on all pages
  - Verify LCP < 2.5s on all pages
  - Verify CLS < 0.1 on all pages
  - Document performance improvements
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 9. Add Audio Playback Testing Infrastructure
- [x] 9.1 Investigate and fix audio player timeout issues
  - Investigate why TC012 test timed out after 15 minutes
  - Check if product catalog crash (TC011) is preventing navigation to audio player
  - Review EnhancedGlobalAudioPlayer.tsx for blocking operations
  - Add timeout handling for WaveSurfer.js initialization (2-second timeout)
  - Add timeout for audio file loading (10 seconds) using Promise.race
  - Implement loading state with progress indicator
  - Cleanup audio instances on unmount by calling wavesurfer.destroy()
  - Handle loading errors gracefully with ErrorBoundary
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]\* 9.2 Write audio playback tests
  - Write unit test for WaveSurfer initialization timeout
  - Write unit test for audio loading timeout
  - Write unit test for cleanup on unmount
  - Write integration test for audio playback flow
  - Write integration test for error handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10. Verify and Enhance Error Boundaries - VERIFIED
- [x] 10.1 Existing ErrorBoundary implementation - VERIFIED
  - ErrorBoundary exists and is properly wrapped around Router
  - TC023 confirms error boundaries are working correctly
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]\* 10.2 Write error boundary tests
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
  - Use getDiagnostics tool to check for issues in modified files
  - _Requirements: All_

- [ ] 11.2 Re-run TestSprite tests
  - Run all 15 TestSprite tests
  - Verify improved pass rate (target: 13/15 or better, up from 6/15)
  - Document any remaining issues
  - Verify performance metrics meet targets (FCP < 1.8s, LCP < 2.5s, CLS < 0.1)
  - Priority fixes: TC010 (Auth), TC011 (Product Catalog), TC013 (Cart), TC016 (Subscriptions)
  - _Requirements: All_

- [ ] 11.3 Prepare deployment
  - Update environment variables for production (Clerk keys, webhook secrets)
  - Verify CLERK_BILLING_ENABLED=true is set
  - Verify RESEND_API_KEY is configured
  - Verify STRIPE_WEBHOOK_SECRET and PAYPAL_WEBHOOK_ID are set
  - Create deployment checklist
  - Document rollback procedures
  - _Requirements: All_
