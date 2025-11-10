import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../../_generated/server";

/**
 * Script de migration pour nettoyer les références Supabase obsolètes
 * et s'assurer que toutes les données sont correctement migrées vers Convex
 */

interface SupabaseMetadata {
  supabaseId?: string;
  supabase_id?: string;
  [key: string]: unknown;
}

interface AnalysisResult {
  users: {
    total: number;
    withSupabaseIds: number;
    missingClerkIds: number;
    inactive: number;
  };
  orders: {
    total: number;
    withWooCommerceIds: number;
    orphaned: number;
    missingUserIds: number;
  };
  downloads: {
    total: number;
    orphaned: number;
    missingUserIds: number;
  };
  reservations: {
    total: number;
    orphaned: number;
    missingUserIds: number;
  };
  favorites: {
    total: number;
    orphaned: number;
    missingUserIds: number;
  };
}

// Helper: Check if user has Supabase references
function hasSupabaseReferences(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  const meta = metadata as SupabaseMetadata;
  return Boolean(meta.supabaseId || meta.supabase_id);
}

// Helper: Check if user exists
async function userExists(ctx: QueryCtx, userId: Id<"users"> | undefined): Promise<boolean> {
  if (!userId) {
    return false;
  }
  const user = await ctx.db.get(userId);
  return user !== null;
}

/**
 * Analyser les données existantes pour identifier les références Supabase
 */
export const analyzeSupabaseReferences = query({
  args: {},
  handler: async (ctx: QueryCtx): Promise<AnalysisResult> => {
    try {
      console.log("🔍 Analyzing Supabase references...");

      const analysis: AnalysisResult = {
        users: { total: 0, withSupabaseIds: 0, missingClerkIds: 0, inactive: 0 },
        orders: { total: 0, withWooCommerceIds: 0, orphaned: 0, missingUserIds: 0 },
        downloads: { total: 0, orphaned: 0, missingUserIds: 0 },
        reservations: { total: 0, orphaned: 0, missingUserIds: 0 },
        favorites: { total: 0, orphaned: 0, missingUserIds: 0 },
      };

      await analyzeUsers(ctx, analysis);
      await analyzeOrders(ctx, analysis);
      await analyzeDownloads(ctx, analysis);
      await analyzeReservations(ctx, analysis);
      await analyzeFavorites(ctx, analysis);

      console.log("✅ Analysis completed:", analysis);
      return analysis;
    } catch (error) {
      console.error("❌ Error analyzing Supabase references:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to analyze: ${errorMessage}`);
    }
  },
});

async function analyzeUsers(ctx: QueryCtx, analysis: AnalysisResult): Promise<void> {
  const users = await ctx.db.query("users").collect();
  analysis.users.total = users.length;

  for (const user of users) {
    if (!user.clerkId) {
      analysis.users.missingClerkIds++;
    }
    if (user.isActive === false) {
      analysis.users.inactive++;
    }
    if (hasSupabaseReferences(user.metadata)) {
      analysis.users.withSupabaseIds++;
    }
  }
}

async function analyzeOrders(ctx: QueryCtx, analysis: AnalysisResult): Promise<void> {
  const orders = await ctx.db.query("orders").collect();
  analysis.orders.total = orders.length;

  for (const order of orders) {
    if (order.woocommerceId) {
      analysis.orders.withWooCommerceIds++;
    }
    if (!order.userId) {
      analysis.orders.missingUserIds++;
    } else if (!(await userExists(ctx, order.userId))) {
      analysis.orders.orphaned++;
    }
  }
}

async function analyzeDownloads(ctx: QueryCtx, analysis: AnalysisResult): Promise<void> {
  const downloads = await ctx.db.query("downloads").collect();
  analysis.downloads.total = downloads.length;

  for (const download of downloads) {
    if (!download.userId) {
      analysis.downloads.missingUserIds++;
    } else if (!(await userExists(ctx, download.userId))) {
      analysis.downloads.orphaned++;
    }
  }
}

async function analyzeReservations(ctx: QueryCtx, analysis: AnalysisResult): Promise<void> {
  const reservations = await ctx.db.query("reservations").collect();
  analysis.reservations.total = reservations.length;

  for (const reservation of reservations) {
    if (!reservation.userId) {
      analysis.reservations.missingUserIds++;
    } else if (!(await userExists(ctx, reservation.userId))) {
      analysis.reservations.orphaned++;
    }
  }
}

async function analyzeFavorites(ctx: QueryCtx, analysis: AnalysisResult): Promise<void> {
  const favorites = await ctx.db.query("favorites").collect();
  analysis.favorites.total = favorites.length;

  for (const favorite of favorites) {
    if (!favorite.userId) {
      analysis.favorites.missingUserIds++;
    } else if (!(await userExists(ctx, favorite.userId))) {
      analysis.favorites.orphaned++;
    }
  }
}

interface CleanupResults {
  usersUpdated: number;
  ordersUpdated: number;
  orphanedRecordsRemoved: number;
  errors: string[];
}

interface UserUpdates {
  metadata?: Record<string, unknown>;
  role?: string;
  isActive?: boolean;
  updatedAt?: number;
}

// Helper: Clean Supabase metadata from user
function cleanSupabaseMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }
  const cleaned = { ...metadata } as Record<string, unknown>;
  delete cleaned.supabaseId;
  delete cleaned.supabase_id;
  return cleaned;
}

// Helper: Get user updates needed
function getUserUpdates(user: { metadata?: unknown; role?: string; isActive?: boolean }): {
  updates: UserUpdates;
  needsUpdate: boolean;
} {
  const updates: UserUpdates = {};
  let needsUpdate = false;

  // Clean up Supabase metadata
  if (hasSupabaseReferences(user.metadata)) {
    const cleaned = cleanSupabaseMetadata(user.metadata);
    if (cleaned) {
      updates.metadata = cleaned;
      needsUpdate = true;
    }
  }

  // Ensure required fields
  if (!user.role) {
    updates.role = "user";
    needsUpdate = true;
  }

  if (user.isActive === undefined) {
    updates.isActive = true;
    needsUpdate = true;
  }

  return { updates, needsUpdate };
}

/**
 * Nettoyer les références Supabase obsolètes
 */
export const cleanupSupabaseReferences = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx: MutationCtx, args): Promise<CleanupResults> => {
    try {
      const dryRun = args.dryRun ?? true;
      console.log(`🧹 ${dryRun ? "DRY RUN:" : ""} Cleaning up Supabase references...`);

      const results: CleanupResults = {
        usersUpdated: 0,
        ordersUpdated: 0,
        orphanedRecordsRemoved: 0,
        errors: [],
      };

      await cleanupUsers(ctx, dryRun, results);
      await cleanupOrphanedOrders(ctx, dryRun, results);
      await cleanupOrphanedDownloads(ctx, dryRun, results);
      await cleanupOrphanedReservations(ctx, dryRun, results);
      await cleanupOrphanedFavorites(ctx, dryRun, results);

      console.log(`✅ Cleanup ${dryRun ? "simulation" : "execution"} completed:`, results);
      return results;
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cleanup: ${errorMessage}`);
    }
  },
});

async function cleanupUsers(
  ctx: MutationCtx,
  dryRun: boolean,
  results: CleanupResults
): Promise<void> {
  const users = await ctx.db.query("users").collect();

  for (const user of users) {
    try {
      const { updates, needsUpdate } = getUserUpdates(user);

      if (needsUpdate) {
        if (!dryRun) {
          await ctx.db.patch(user._id, { ...updates, updatedAt: Date.now() });
        }
        results.usersUpdated++;
      }
    } catch (error) {
      const errorMsg = `Error updating user ${user._id}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }
  }
}

async function cleanupOrphanedOrders(
  ctx: MutationCtx,
  dryRun: boolean,
  results: CleanupResults
): Promise<void> {
  const orders = await ctx.db.query("orders").collect();

  for (const order of orders) {
    try {
      if (order.userId && !(await userExists(ctx, order.userId))) {
        console.log(`🗑️ Found orphaned order: ${order._id}`);
        if (!dryRun) {
          await ctx.db.delete(order._id);
        }
        results.orphanedRecordsRemoved++;
      }
    } catch (error) {
      const errorMsg = `Error checking order ${order._id}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }
  }
}

async function cleanupOrphanedDownloads(
  ctx: MutationCtx,
  dryRun: boolean,
  results: CleanupResults
): Promise<void> {
  const downloads = await ctx.db.query("downloads").collect();

  for (const download of downloads) {
    try {
      if (download.userId && !(await userExists(ctx, download.userId))) {
        console.log(`🗑️ Found orphaned download: ${download._id}`);
        if (!dryRun) {
          await ctx.db.delete(download._id);
        }
        results.orphanedRecordsRemoved++;
      }
    } catch (error) {
      const errorMsg = `Error checking download ${download._id}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }
  }
}

async function cleanupOrphanedReservations(
  ctx: MutationCtx,
  dryRun: boolean,
  results: CleanupResults
): Promise<void> {
  const reservations = await ctx.db.query("reservations").collect();

  for (const reservation of reservations) {
    try {
      if (reservation.userId && !(await userExists(ctx, reservation.userId))) {
        console.log(`🗑️ Found orphaned reservation: ${reservation._id}`);
        if (!dryRun) {
          await ctx.db.delete(reservation._id);
        }
        results.orphanedRecordsRemoved++;
      }
    } catch (error) {
      const errorMsg = `Error checking reservation ${reservation._id}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }
  }
}

async function cleanupOrphanedFavorites(
  ctx: MutationCtx,
  dryRun: boolean,
  results: CleanupResults
): Promise<void> {
  const favorites = await ctx.db.query("favorites").collect();

  for (const favorite of favorites) {
    try {
      if (favorite.userId && !(await userExists(ctx, favorite.userId))) {
        console.log(`🗑️ Found orphaned favorite: ${favorite._id}`);
        if (!dryRun) {
          await ctx.db.delete(favorite._id);
        }
        results.orphanedRecordsRemoved++;
      }
    } catch (error) {
      const errorMsg = `Error checking favorite ${favorite._id}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
    }
  }
}

interface ValidationResult {
  users: { total: number; valid: number; issues: string[] };
  orders: { total: number; valid: number; issues: string[] };
  downloads: { total: number; valid: number; issues: string[] };
  reservations: { total: number; valid: number; issues: string[] };
  favorites: { total: number; valid: number; issues: string[] };
}

/**
 * Valider l'intégrité des données après migration
 */
export const validateDataIntegrity = query({
  args: {},
  handler: async (ctx: QueryCtx): Promise<ValidationResult> => {
    try {
      console.log("🔍 Validating data integrity...");

      const validation: ValidationResult = {
        users: { total: 0, valid: 0, issues: [] },
        orders: { total: 0, valid: 0, issues: [] },
        downloads: { total: 0, valid: 0, issues: [] },
        reservations: { total: 0, valid: 0, issues: [] },
        favorites: { total: 0, valid: 0, issues: [] },
      };

      await validateUsers(ctx, validation);
      await validateOrders(ctx, validation);
      await validateDownloads(ctx, validation);
      await validateReservations(ctx, validation);
      await validateFavorites(ctx, validation);

      console.log("✅ Data integrity validation completed:", validation);
      return validation;
    } catch (error) {
      console.error("❌ Error validating data integrity:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to validate: ${errorMessage}`);
    }
  },
});

async function validateUsers(ctx: QueryCtx, validation: ValidationResult): Promise<void> {
  const users = await ctx.db.query("users").collect();
  validation.users.total = users.length;

  for (const user of users) {
    const issues: string[] = [];

    if (!user.clerkId) {
      issues.push(`User ${user._id} missing clerkId`);
    }
    if (!user.email) {
      issues.push(`User ${user._id} missing email`);
    }
    if (!user.role) {
      issues.push(`User ${user._id} missing role`);
    }
    if (user.isActive === undefined) {
      issues.push(`User ${user._id} missing isActive flag`);
    }

    if (issues.length === 0) {
      validation.users.valid++;
    } else {
      validation.users.issues.push(...issues);
    }
  }
}

async function validateOrders(ctx: QueryCtx, validation: ValidationResult): Promise<void> {
  const orders = await ctx.db.query("orders").collect();
  validation.orders.total = orders.length;

  for (const order of orders) {
    const issues: string[] = [];

    if (!order.userId) {
      issues.push(`Order ${order._id} missing userId`);
    } else if (!(await userExists(ctx, order.userId))) {
      issues.push(`Order ${order._id} references non-existent user`);
    }

    if (!order.email) {
      issues.push(`Order ${order._id} missing email`);
    }
    if (!order.status) {
      issues.push(`Order ${order._id} missing status`);
    }
    if (!order.items || order.items.length === 0) {
      issues.push(`Order ${order._id} has no items`);
    }

    if (issues.length === 0) {
      validation.orders.valid++;
    } else {
      validation.orders.issues.push(...issues);
    }
  }
}

async function validateDownloads(ctx: QueryCtx, validation: ValidationResult): Promise<void> {
  const downloads = await ctx.db.query("downloads").collect();
  validation.downloads.total = downloads.length;

  for (const download of downloads) {
    const issues: string[] = [];

    if (!download.userId) {
      issues.push(`Download ${download._id} missing userId`);
    } else if (!(await userExists(ctx, download.userId))) {
      issues.push(`Download ${download._id} references non-existent user`);
    }

    if (!download.beatId) {
      issues.push(`Download ${download._id} missing beatId`);
    }

    if (issues.length === 0) {
      validation.downloads.valid++;
    } else {
      validation.downloads.issues.push(...issues);
    }
  }
}

async function validateReservations(ctx: QueryCtx, validation: ValidationResult): Promise<void> {
  const reservations = await ctx.db.query("reservations").collect();
  validation.reservations.total = reservations.length;

  for (const reservation of reservations) {
    const issues: string[] = [];

    if (!reservation.userId) {
      issues.push(`Reservation ${reservation._id} missing userId`);
    } else if (!(await userExists(ctx, reservation.userId))) {
      issues.push(`Reservation ${reservation._id} references non-existent user`);
    }

    if (!reservation.serviceType) {
      issues.push(`Reservation ${reservation._id} missing serviceType`);
    }

    if (issues.length === 0) {
      validation.reservations.valid++;
    } else {
      validation.reservations.issues.push(...issues);
    }
  }
}

async function validateFavorites(ctx: QueryCtx, validation: ValidationResult): Promise<void> {
  const favorites = await ctx.db.query("favorites").collect();
  validation.favorites.total = favorites.length;

  for (const favorite of favorites) {
    const issues: string[] = [];

    if (!favorite.userId) {
      issues.push(`Favorite ${favorite._id} missing userId`);
    } else if (!(await userExists(ctx, favorite.userId))) {
      issues.push(`Favorite ${favorite._id} references non-existent user`);
    }

    if (!favorite.beatId) {
      issues.push(`Favorite ${favorite._id} missing beatId`);
    }

    if (issues.length === 0) {
      validation.favorites.valid++;
    } else {
      validation.favorites.issues.push(...issues);
    }
  }
}
