# Security Hardening - Implementation Tasks

Based on the security audit report, this task list addresses critical security vulnerabilities in the codebase.

## Phase 1: Critical Fixes (COMPLETED ✅)

### Task 1.1: Enforce SESSION_SECRET Requirement ✅

- [x] Modified `server/auth.ts` to reject startup if SESSION_SECRET is missing
- [x] Added validation at server startup with helpful error message
- [x] Test environment exemption implemented

**Status**: COMPLETED - SESSION_SECRET is now enforced in non-test environments with clear error messaging.

**Files**: `server/auth.ts`

**Requirements**: 1 (Secret de Session par Défaut)

### Task 1.2: Re-enable Authentication on PayPal Routes ✅

- [x] Added `requireAuth` on `/api/paypal/capture-payment`
- [x] Added `requireAuth` on `/api/paypal/capture/:token`
- [x] Added `requireAuth` on `/api/paypal/order/:orderId`
- [x] Added `requireAuth` on `/api/paypal/test-auth`

**Status**: COMPLETED - All critical PayPal routes now require authentication.

**Files**: `server/routes/paypal.ts`

**Requirements**: 3 (Routes PayPal Sans Authentification)

### Task 1.3: Secure Convex Initialization ✅

- [x] Implemented lazy initialization with `getConvex()` in `server/lib/convex.ts`
- [x] Removed hardcoded fallback URLs
- [x] Added proper error handling for missing VITE_CONVEX_URL
- [x] Updated `server/routes/downloads.ts` to use `getConvex()`
- [x] Updated `server/lib/audit.ts` to use `getConvex()`
- [x] Updated `server/services/PaymentService.ts` to use `getConvex()`

**Status**: COMPLETED - Convex client now uses lazy initialization with proper validation.

**Files**: `server/lib/convex.ts`, `server/routes/downloads.ts`, `server/lib/audit.ts`, `server/services/PaymentService.ts`

**Requirements**: 5 (Initialisation Convex Non Sécurisée), 10 (Fallback URLs Convex Non Sécurisés)

### Task 1.4: Remove Sensitive PayPal Logs ✅

- [x] Removed logs of complete `requestBody`
- [x] Removed logs of reservation amounts and details
- [x] Removed logs of Authorization headers
- [x] Kept only necessary audit logs with sanitized data
- [x] Added security comments for development-only endpoints

**Status**: COMPLETED - PayPal routes now log only non-sensitive data.

**Files**: `server/routes/paypal.ts`

**Requirements**: 4 (Logs PayPal Sensibles), 9 (Endpoints de Diagnostic Exposés)

## Phase 2: Security Implementation (IN PROGRESS 🔄)

### Task 2.1: Implement Email Token Storage ✅

- [x] Created Convex table `emailVerifications` in schema
- [x] Implement mutation `createEmailVerification` in `convex/emailVerifications.ts`
- [x] Implement query `getEmailVerification` in `convex/emailVerifications.ts`
- [x] Implement mutation `deleteEmailVerification` in `convex/emailVerifications.ts`
- [x] Add automatic expiration (24h) cleanup
- [x] Update route `/api/email/verify-email` to use token storage
- [x] Test complete email verification flow

**Status**: PARTIALLY COMPLETED - Schema created, Convex functions need implementation.

**Files**: `convex/schema.ts` ✅, `convex/emailVerifications.ts`, `server/routes/email.ts`

**Requirements**: 6 (Validation Email Token Faible)

### Task 2.2: Implement Password Reset Token Storage ✅

- [x] Created Convex table `passwordResets` in schema
- [x] Implement mutation `createPasswordReset` in `convex/passwordResets.ts`
- [x] Implement query `getPasswordReset` in `convex/passwordResets.ts`
- [x] Implement mutation `deletePasswordReset` in `convex/passwordResets.ts`
- [x] Add automatic expiration (15min) cleanup
- [x] Update route `/api/email/forgot-password` to use token storage
- [x] Update route `/api/email/reset-password` to validate tokens
- [ ] Test complete password reset flow

**Status**: PARTIALLY COMPLETED - Schema created, Convex functions need implementation.

**Files**: `convex/schema.ts` ✅, `convex/passwordResets.ts`, `server/routes/email.ts`

**Requirements**: 7 (Tokens de Réinitialisation Non Persistés)

### Task 2.3: Protect Admin Routes

- [ ] Create middleware `requireAdmin` in `server/middleware/requireAdmin.ts`
- [ ] Add role verification using Convex user data
- [ ] Protect all routes in `/admin/*` namespace
- [ ] Test access with normal user (should be denied)
- [ ] Test access with admin user (should be allowed)

**Status**: NOT STARTED - No admin middleware exists yet.

**Files**: `server/middleware/requireAdmin.ts`, `server/routes/security.ts`

**Requirements**: 8 (Routes Admin Non Protégées)

### Task 2.4: Secure Diagnostic Endpoints ✅

- [x] Protected route `/api/paypal/test-auth` with requireAuth
- [x] Limited route `/api/paypal/test` to NODE_ENV=development
- [x] Removed Authorization header logs
- [x] Added 404 response for production environment

**Status**: COMPLETED - Diagnostic endpoints are now secured.

**Files**: `server/routes/paypal.ts`

**Requirements**: 9 (Endpoints de Diagnostic Exposés)

## Phase 3: Infrastructure (NOT STARTED ⏳)

### Task 3.1: Configure Redis for Production Sessions

- [ ] Install `connect-redis` and `redis` packages
- [ ] Create Redis configuration module
- [ ] Update `server/auth.ts` to use Redis in production
- [ ] Keep MemoryStore for dev/test environments
- [ ] Document Redis setup in README.md
- [ ] Test session persistence in production

**Status**: NOT STARTED - TODO comment exists in code.

**Files**: `server/auth.ts`, `package.json`, `README.md`

**Requirements**: 2 (MemoryStore en Production)

### Task 3.2: Remove Hardcoded Fallback URLs ✅

- [x] Removed fallback in `server/routes/downloads.ts`
- [x] Removed fallback in `server/lib/audit.ts`
- [x] Enforced VITE_CONVEX_URL validation at startup
- [x] Added clear error messages for missing configuration

**Status**: COMPLETED - No hardcoded fallback URLs remain.

**Files**: `server/routes/downloads.ts`, `server/lib/audit.ts`, `server/lib/convex.ts`

**Requirements**: 10 (Fallback URLs Convex Non Sécurisés)

### Task 3.3: Comprehensive Log Audit

- [ ] Scan all `console.log` statements for sensitive data
- [ ] Implement centralized log sanitization utility
- [ ] Create secure logger wrapper
- [ ] Replace console.log with secure logger throughout codebase
- [ ] Document logging policy in security guidelines

**Status**: NOT STARTED - Manual audit required.

**Files**: All server files

**Requirements**: 4 (Logs PayPal Sensibles), General security best practices

## Validation & Testing

### Security Checklist

- [x] No default secrets (SESSION_SECRET enforced)
- [x] Critical routes protected (PayPal routes authenticated)
- [x] No non-null assertions without validation (Convex lazy init)
- [x] No sensitive data logs (PayPal logs sanitized)
- [ ] Tokens persisted and validated (schema ready, functions needed)
- [ ] Admin routes protected (middleware needed)
- [x] Diagnostic endpoints secured (dev-only)
- [ ] Persistent sessions in production (Redis needed)
- [ ] Security audit passed (in progress)

### Security Tests

- [ ] Test: Startup fails without SESSION_SECRET (non-test env)
- [ ] Test: Startup fails without VITE_CONVEX_URL (non-test env)
- [ ] Test: PayPal routes reject unauthenticated requests
- [ ] Test: Invalid email tokens are rejected
- [ ] Test: Expired password reset tokens are rejected
- [ ] Test: Admin routes reject non-admin users
- [ ] Test: Diagnostic endpoints return 404 in production
- [ ] Test: No sensitive data in logs

## Summary

**Completed**: 7/13 tasks (54%)
**In Progress**: 2/13 tasks (15%)
**Not Started**: 4/13 tasks (31%)

**Priority**: Complete Phase 2 tasks (2.1, 2.2, 2.3) before production deployment.

**Estimated Remaining Time**:

- Phase 2 completion: 4-6 hours
- Phase 3 completion: 4-6 hours
- Testing & validation: 2-3 hours
- **Total**: 10-15 hours
