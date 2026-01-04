# Convex Migrations Archive

This document catalogs the Convex migration files that were created for one-time data fixes and schema updates. These migrations have been applied and are preserved for historical reference and potential rollback scenarios.

## Migration Files

### 1. cleanOrders.ts

**Purpose**: Clean orders documents to match current schema
**Applied**: Yes (historical data cleanup)
**Status**: Safe to archive

**What it does**:

- Moves `taxAmount` → `tax` field
- Removes deprecated `discountAmount` and `taxAmount` fields
- Normalizes currency to uppercase (defaults to USD)
- Converts dollar amounts to cents where appropriate
- Maps string `userId` (Clerk ID) to Convex `users._id`

**Recommendation**: Archive - This was a one-time schema migration that has been applied.

---

### 2. cleanupGenericDownloads.ts

**Purpose**: Clean up generic downloads and create proper downloads from paid orders
**Applied**: Yes (downloads system refactor)
**Status**: Safe to archive

**What it does**:

- Deletes all existing generic downloads
- Recreates proper download records from paid orders
- Links downloads to specific beats and licenses
- Creates activity log entries for granted downloads

**Recommendation**: Archive - This was a one-time migration for the downloads system refactor.

---

### 3. cleanupSupabase.ts

**Purpose**: Remove Supabase references and migrate to Convex-only architecture
**Applied**: Yes (Supabase → Convex migration)
**Status**: Safe to archive

**What it does**:

- Analyzes and removes Supabase ID references from user metadata
- Cleans up orphaned records (orders, downloads, reservations, favorites)
- Validates data integrity after migration
- Ensures all users have required fields (role, isActive, clerkId)

**Recommendation**: Archive - This was part of the Supabase to Convex migration.

---

### 4. fixOrderPrices.ts

**Purpose**: Fix incorrect order item prices
**Applied**: Yes (price calculation bug fix)
**Status**: Safe to archive

**What it does**:

- Identifies orders with suspiciously low prices (< $10 in cents)
- Recalculates prices based on standard license tiers:
  - Basic: $29.99 (2999 cents)
  - Premium: $49.99 (4999 cents)
  - Unlimited: $149.99 (14999 cents)
- Marks free beats with $0 price

**Recommendation**: Archive - This fixed a historical pricing bug.

---

### 5. fixReservationPrices.ts

**Purpose**: Correct reservation prices based on standard service rates
**Applied**: Yes (reservation pricing standardization)
**Status**: Safe to archive

**What it does**:

- Applies standard hourly rates for services:
  - Recording: $30/hour
  - Mixing: $70/hour
  - Mastering: $50/hour
  - Consultation: $50/hour
  - Custom Beat: $150 flat rate
  - Beat Remake: $250/hour
  - Full Production: $150/hour
- Recalculates prices based on duration
- Provides price analysis and listing functions

**Recommendation**: Archive - This standardized historical reservation pricing.

---

### 6. markSpecificFreeBeats.ts

**Purpose**: Mark specific beats as free based on store data
**Applied**: Yes (free beats identification)
**Status**: Safe to archive

**What it does**:

- Identifies free beats by name: ELEVATE, TRULY YOURS, SERIAL Vol.1
- Sets price to $0 for these beats in orders
- Recalculates order totals after marking beats as free
- Provides utility to list all unique beat names

**Recommendation**: Archive - This was a one-time data correction.

---

## Archive Strategy

### Option 1: Keep in Repository (Current)

**Pros**:

- Easy access for reference
- Available for potential rollback scenarios
- Documented in version control

**Cons**:

- Clutters the active codebase
- May confuse developers about which migrations are active
- Increases bundle size slightly (though not deployed to client)

### Option 2: Move to Archive Directory

**Pros**:

- Cleaner active codebase
- Still available in repository
- Clear separation of historical vs. active code

**Cons**:

- Requires creating archive structure
- May need to update import paths if ever needed

### Option 3: Remove from Repository

**Pros**:

- Cleanest codebase
- Reduces maintenance burden

**Cons**:

- Harder to reference for debugging
- Lost context for historical data issues
- Would need to restore from git history if needed

---

## Recommendation

**Keep migrations in repository but move to archive directory**: `convex/migrations/archive/`

This preserves the migrations for reference and potential emergency rollback while keeping the active codebase clean. The migrations are:

1. Already applied to production data
2. Not actively used in the application
3. Valuable for understanding historical data issues
4. Potentially useful for data recovery scenarios

---

## Migration Execution History

| Migration               | Date Applied | Applied By | Notes                     |
| ----------------------- | ------------ | ---------- | ------------------------- |
| cleanOrders             | Unknown      | System     | Schema normalization      |
| cleanupGenericDownloads | Unknown      | System     | Downloads refactor        |
| cleanupSupabase         | Unknown      | System     | Supabase migration        |
| fixOrderPrices          | Unknown      | System     | Price bug fix             |
| fixReservationPrices    | Unknown      | System     | Pricing standardization   |
| markSpecificFreeBeats   | Unknown      | System     | Free beats identification |

---

## Future Migration Strategy

For future migrations:

1. Create migration with timestamp prefix: `YYYYMMDD_description.ts`
2. Document purpose, expected impact, and rollback strategy
3. Test in development environment first
4. Apply to production with monitoring
5. Archive after successful application
6. Update this document with execution details

---

## Data Recovery Notes

If data recovery is needed:

1. These migrations can be re-run with `dryRun: true` to analyze impact
2. Most migrations are idempotent and safe to re-run
3. Always backup data before running migrations
4. Test in development environment first
5. Monitor Convex dashboard during execution

---

_Last Updated: 2025-01-08_
_Cleanup Task: 10.3 - Convex Functions Cleanup_
