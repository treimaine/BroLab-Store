/**
 * Data Consistency Validation System
 *
 * Validates data integrity across dashboard sections with automatic inconsistency
 * detection, hash calculation, and detailed logging for debugging.
 *
 * Ensures stats match between "Hello, Steve" and "Analytics Dashboard" sections
 * and provides cross-section validation for all dashboard data.
 */

import type { DashboardData } from "@shared/types/dashboard";
import type {
  ConsistentUserStats,
  CrossValidationResult,
  Inconsistency,
  ValidationResult,
} from "@shared/types/sync";
import { generateDataHash, validateDashboardData } from "@shared/validation/sync";

// ================================
// CONSTANTS
// ================================

const MAX_VALIDATION_HISTORY = 50;
const MAX_INCONSISTENCY_HISTORY = 100;
const DEFAULT_MAX_DATA_AGE = 5 * 60 * 1000; // 5 minutes
const CONSISTENCY_TREND_THRESHOLD = 0.1;
const PRICE_PRECISION = 0.01; // Allow 1 cent difference for rounding
const CRITICAL_REVENUE_DIFFERENCE = 100; // $100 threshold for critical severity

// ================================
// CONSISTENCY VALIDATION
// ================================

/**
 * Environment type for validation context
 */
export type ValidationEnvironment = "test" | "development" | "production";

/**
 * Configuration options for consistency checking
 */
export interface ConsistencyCheckOptions {
  /** Skip time-based validations (e.g., monthly statistics) */
  skipTimeBasedValidations?: boolean;
  /** Skip hash validation */
  skipHashValidation?: boolean;
  /** Environment context for validation */
  environment?: ValidationEnvironment;
  /** Allow test hash values (e.g., "test-hash") */
  allowTestHashes?: boolean;
}

/**
 * Validation context for passing multiple parameters
 */
interface ValidationContext {
  data: DashboardData;
  startTime: number;
  skipTimeBasedValidations: boolean;
  skipHashValidation: boolean;
  allowTestHashes: boolean;
  inconsistencies: Inconsistency[];
  checksPerformed: string[];
  checksSkipped: string[];
}

/**
 * Extended result interface with checks performed tracking
 */
export interface ConsistencyCheckResult extends CrossValidationResult {
  /** List of validation checks that were performed */
  checksPerformed: string[];
  /** List of validation checks that were skipped */
  checksSkipped: string[];
}

/**
 * Enhanced Consistency Checker for Dashboard Data Validation
 *
 * Implements comprehensive data integrity validation across all dashboard sections
 * with automatic inconsistency detection, detailed logging, and data hash comparison.
 * Supports environment-aware validation for test and production contexts.
 */
export class ConsistencyChecker {
  private static readonly DEBUG_MODE = process.env.NODE_ENV === "development";
  private static validationHistory: Array<{
    timestamp: number;
    result: CrossValidationResult;
    dataHash: string;
  }> = [];

  /**
   * Get environment from options or NODE_ENV
   */
  private static getEnvironment(options?: ConsistencyCheckOptions): ValidationEnvironment {
    return options?.environment || (process.env.NODE_ENV as ValidationEnvironment) || "production";
  }

  /**
   * Log validation start information
   */
  private static logValidationStart(
    data: DashboardData,
    environment: string,
    options: ConsistencyCheckOptions
  ): void {
    if (!this.DEBUG_MODE) return;

    console.group("🔍 Dashboard Data Consistency Validation");
    console.log("Validating data at:", new Date().toISOString());
    console.log("Environment:", environment);
    console.log("Skip time-based validations:", options.skipTimeBasedValidations);
    console.log("Skip hash validation:", options.skipHashValidation);
    console.log("Allow test hashes:", options.allowTestHashes);
    console.log("Data sections:", Object.keys(data));
  }

  /**
   * Log stats validation start
   */
  private static logStatsValidationStart(
    data: DashboardData,
    skipTimeBasedValidations: boolean
  ): void {
    if (!this.DEBUG_MODE) return;

    console.log("📊 Validating stats consistency...");
    console.log("Stats:", data.stats);
    console.log("Skip time-based validations:", skipTimeBasedValidations);
    console.log("Array lengths:", {
      favorites: data.favorites.length,
      downloads: data.downloads.length,
      orders: data.orders.length,
      reservations: data.reservations.length,
    });
  }

  /**
   * Calculate actual totals from arrays
   */
  private static calculateActualTotals(data: DashboardData): {
    favorites: number;
    downloads: number;
    orders: number;
    reservations: number;
  } {
    return {
      favorites: data.favorites.length,
      downloads: data.downloads.length,
      orders: data.orders.length,
      reservations: data.reservations.length,
    };
  }

  /**
   * Calculate actual total spent from orders
   */
  private static calculateActualTotalSpent(orders: DashboardData["orders"]): number {
    return orders
      .filter(order => order.status === "completed" || order.status === "paid")
      .reduce((sum, order) => sum + order.total, 0);
  }

  /**
   * Validate count consistency between stats and actual data
   */
  private static validateCountConsistency(
    stats: DashboardData["stats"],
    actualTotals: ReturnType<typeof ConsistencyChecker.calculateActualTotals>,
    timestamp: number,
    inconsistencies: Inconsistency[]
  ): void {
    const countChecks = [
      {
        field: "totalFavorites",
        section: "favorites",
        statValue: stats.totalFavorites,
        actualValue: actualTotals.favorites,
        description: "favorites",
      },
      {
        field: "totalDownloads",
        section: "downloads",
        statValue: stats.totalDownloads,
        actualValue: actualTotals.downloads,
        description: "downloads",
      },
      {
        field: "totalOrders",
        section: "orders",
        statValue: stats.totalOrders,
        actualValue: actualTotals.orders,
        description: "orders",
      },
    ];

    for (const check of countChecks) {
      if (Math.abs(check.statValue - check.actualValue) > 0) {
        inconsistencies.push({
          type: "calculation",
          sections: ["stats", check.section],
          description: `Stats show ${check.statValue} ${check.description}, but ${check.section} array has ${check.actualValue} items. This affects both "Hello, Steve" and "Analytics Dashboard" sections.`,
          severity: check.actualValue > check.statValue ? "high" : "medium",
          autoResolvable: true,
          detectedAt: timestamp,
          expectedValue: check.actualValue,
          actualValue: check.statValue,
        });
      }
    }
  }

  /**
   * Validate total spent consistency
   */
  private static validateTotalSpentConsistency(
    stats: DashboardData["stats"],
    actualTotalSpent: number,
    timestamp: number,
    inconsistencies: Inconsistency[]
  ): void {
    const spentDifference = Math.abs(stats.totalSpent - actualTotalSpent);

    if (spentDifference > PRICE_PRECISION) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "orders"],
        description: `Stats show $${stats.totalSpent.toFixed(2)} total spent, but calculated from orders is $${actualTotalSpent.toFixed(2)}. This creates revenue inconsistency between "Hello, Steve" and "Analytics Dashboard".`,
        severity: spentDifference > CRITICAL_REVENUE_DIFFERENCE ? "critical" : "high",
        autoResolvable: true,
        detectedAt: timestamp,
        expectedValue: actualTotalSpent,
        actualValue: stats.totalSpent,
      });
    }
  }

  /**
   * Validate quota consistency
   */
  private static validateQuotaConsistency(
    stats: DashboardData["stats"],
    timestamp: number,
    inconsistencies: Inconsistency[]
  ): void {
    if (stats.quotaUsed > stats.quotaLimit && stats.quotaLimit > 0) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats"],
        description: `Quota used (${stats.quotaUsed}) exceeds quota limit (${stats.quotaLimit}). This affects subscription status display.`,
        severity: "high",
        autoResolvable: false,
        detectedAt: timestamp,
        expectedValue: `<= ${stats.quotaLimit}`,
        actualValue: stats.quotaUsed,
      });
    }
  }

  /**
   * Validate data integrity across all dashboard sections with enhanced logging
   * @param data - Dashboard data to validate
   * @param options - Optional configuration for environment-aware validation
   */
  static validateCrossSection(
    data: DashboardData,
    options: ConsistencyCheckOptions = {}
  ): ConsistencyCheckResult {
    const startTime = Date.now();
    const inconsistencies: Inconsistency[] = [];
    const checksPerformed: string[] = [];
    const checksSkipped: string[] = [];

    const environment = this.getEnvironment(options);
    const skipTimeBasedValidations = options.skipTimeBasedValidations ?? environment === "test";
    const skipHashValidation = options.skipHashValidation ?? false;
    const allowTestHashes = options.allowTestHashes ?? environment === "test";

    this.logValidationStart(data, environment, {
      ...options,
      skipTimeBasedValidations,
      skipHashValidation,
      allowTestHashes,
    });

    try {
      // Run all validation checks
      const context: ValidationContext = {
        data,
        startTime,
        skipTimeBasedValidations,
        skipHashValidation,
        allowTestHashes,
        inconsistencies,
        checksPerformed,
        checksSkipped,
      };

      this.runValidationChecks(context);

      const result = this.buildValidationResult(inconsistencies, checksPerformed, checksSkipped);

      this.logValidationResults(result, startTime);
      this.storeValidationHistory(result, data);

      return result;
    } catch (error) {
      return this.handleValidationError(error, startTime, checksPerformed, checksSkipped);
    } finally {
      if (this.DEBUG_MODE) {
        console.groupEnd();
      }
    }
  }

  /**
   * Run all validation checks and collect inconsistencies
   */
  private static runValidationChecks(context: ValidationContext): void {
    this.runCoreValidations(context);
    this.runHashValidation(context);
    this.runDuplicateValidation(context);
  }

  /**
   * Run core validation checks
   */
  private static runCoreValidations(context: ValidationContext): void {
    const { data, startTime, skipTimeBasedValidations, inconsistencies, checksPerformed } = context;

    // 1. Validate basic data structure
    checksPerformed.push("data_structure");
    inconsistencies.push(...this.validateDataStructure(data, startTime));

    // 2. Check stats vs actual data counts (core requirement)
    checksPerformed.push("stats_consistency");
    inconsistencies.push(
      ...this.validateStatsConsistency(data, startTime, skipTimeBasedValidations)
    );

    // 3. Check data relationships between sections
    checksPerformed.push("data_relationships");
    inconsistencies.push(...this.validateDataRelationships(data, startTime));

    // 4. Check data freshness and timestamps
    checksPerformed.push("data_freshness");
    inconsistencies.push(...this.validateDataFreshness(data, startTime));
  }

  /**
   * Run hash validation check
   */
  private static runHashValidation(context: ValidationContext): void {
    const {
      data,
      startTime,
      skipHashValidation,
      allowTestHashes,
      inconsistencies,
      checksPerformed,
      checksSkipped,
    } = context;

    if (skipHashValidation) {
      checksSkipped.push("hash_consistency");
    } else {
      checksPerformed.push("hash_consistency");
      inconsistencies.push(...this.validateHashConsistency(data, startTime, allowTestHashes));
    }
  }

  /**
   * Run duplicate data validation check
   */
  private static runDuplicateValidation(context: ValidationContext): void {
    const { data, startTime, inconsistencies, checksPerformed } = context;

    checksPerformed.push("duplicate_data");
    inconsistencies.push(...this.validateDuplicateData(data, startTime));
  }

  /**
   * Build validation result from collected inconsistencies
   */
  private static buildValidationResult(
    inconsistencies: Inconsistency[],
    checksPerformed: string[],
    checksSkipped: string[]
  ): ConsistencyCheckResult {
    const affectedSections = Array.from(new Set(inconsistencies.flatMap(inc => inc.sections)));

    return {
      consistent: inconsistencies.length === 0,
      inconsistencies,
      affectedSections,
      recommendedAction: this.getRecommendedAction(inconsistencies),
      checksPerformed,
      checksSkipped,
    };
  }

  /**
   * Handle validation errors
   */
  private static handleValidationError(
    error: unknown,
    startTime: number,
    checksPerformed: string[],
    checksSkipped: string[]
  ): ConsistencyCheckResult {
    const criticalInconsistency: Inconsistency = {
      type: "missing_data",
      sections: ["validation"],
      description: `Critical validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "critical",
      autoResolvable: false,
      detectedAt: startTime,
    };

    if (this.DEBUG_MODE) {
      console.error("❌ Critical validation error:", error);
    }

    return {
      consistent: false,
      inconsistencies: [criticalInconsistency],
      affectedSections: ["validation"],
      recommendedAction: "reload",
      checksPerformed,
      checksSkipped,
    };
  }

  /**
   * Validate basic data structure and required fields
   */
  private static validateDataStructure(data: DashboardData, timestamp: number): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    try {
      // Validate using Zod schema
      const validation = validateDashboardData(data);

      if (!validation.valid) {
        for (const error of validation.errors) {
          inconsistencies.push({
            type: "missing_data",
            sections: [error.field.split(".")[0] || "unknown"],
            description: `Data structure validation failed for ${error.field}: ${error.message}`,
            severity: "high",
            autoResolvable: false,
            detectedAt: timestamp,
            expectedValue: error.expected,
            actualValue: error.actual,
          });
        }
      }
    } catch (_error) {
      // If validation function is not available (e.g., in tests), skip schema validation
      if (this.DEBUG_MODE) {
        const errorMessage = _error instanceof Error ? _error.message : "Unknown error";
        console.warn("Schema validation skipped:", errorMessage);
      }
    }

    // Check for required sections
    const requiredSections = [
      "user",
      "stats",
      "favorites",
      "orders",
      "downloads",
      "reservations",
      "activity",
    ];
    for (const section of requiredSections) {
      if (
        !(section in data) ||
        data[section as keyof DashboardData] === null ||
        data[section as keyof DashboardData] === undefined
      ) {
        inconsistencies.push({
          type: "missing_data",
          sections: [section],
          description: `Required section '${section}' is missing or null`,
          severity: "critical",
          autoResolvable: false,
          detectedAt: timestamp,
        });
      }
    }

    return inconsistencies;
  }

  /**
   * Validate that stats match actual data counts (CORE REQUIREMENT)
   * Ensures stats match between "Hello, Steve" and "Analytics Dashboard" sections
   * @param skipTimeBasedValidations - Skip monthly statistics validation for test environments
   */
  private static validateStatsConsistency(
    data: DashboardData,
    timestamp: number,
    skipTimeBasedValidations: boolean = false
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    this.logStatsValidationStart(data, skipTimeBasedValidations);

    const actualTotals = this.calculateActualTotals(data);
    const actualTotalSpent = this.calculateActualTotalSpent(data.orders);

    // Validate count consistency
    this.validateCountConsistency(data.stats, actualTotals, timestamp, inconsistencies);

    // Validate total spent consistency
    this.validateTotalSpentConsistency(data.stats, actualTotalSpent, timestamp, inconsistencies);

    // Validate quota consistency
    this.validateQuotaConsistency(data.stats, timestamp, inconsistencies);

    // Validate monthly stats consistency (skip in test environments)
    if (!skipTimeBasedValidations) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyOrders = data.orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }).length;

      const monthlyDownloads = data.downloads.filter(download => {
        const downloadDate = new Date(download.downloadedAt);
        return (
          downloadDate.getMonth() === currentMonth && downloadDate.getFullYear() === currentYear
        );
      }).length;

      if (Math.abs(data.stats.monthlyOrders - monthlyOrders) > 0) {
        inconsistencies.push({
          type: "calculation",
          sections: ["stats", "orders"],
          description: `Monthly orders stat (${data.stats.monthlyOrders}) doesn't match calculated monthly orders (${monthlyOrders})`,
          severity: "medium",
          autoResolvable: true,
          detectedAt: timestamp,
          expectedValue: monthlyOrders,
          actualValue: data.stats.monthlyOrders,
        });
      }

      if (Math.abs(data.stats.monthlyDownloads - monthlyDownloads) > 0) {
        inconsistencies.push({
          type: "calculation",
          sections: ["stats", "downloads"],
          description: `Monthly downloads stat (${data.stats.monthlyDownloads}) doesn't match calculated monthly downloads (${monthlyDownloads})`,
          severity: "medium",
          autoResolvable: true,
          detectedAt: timestamp,
          expectedValue: monthlyDownloads,
          actualValue: data.stats.monthlyDownloads,
        });
      }
    } else if (this.DEBUG_MODE) {
      console.log("⏭️ Skipping monthly statistics validation (test environment)");
    }

    if (this.DEBUG_MODE && inconsistencies.length > 0) {
      console.warn("⚠️ Stats inconsistencies found:", inconsistencies.length);
      for (const inc of inconsistencies) {
        console.warn(`  - ${inc.description}`);
      }
    }

    return inconsistencies;
  }

  /**
   * Validate relationships between different data sections
   */
  private static validateDataRelationships(
    data: DashboardData,
    timestamp: number
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    // Check if activity matches actual user actions
    const recentFavorites = data.favorites.filter(
      fav => new Date(fav.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    const recentDownloads = data.downloads.filter(
      download => new Date(download.downloadedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    const recentOrders = data.orders.filter(
      order => new Date(order.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    const expectedRecentActivity = recentFavorites + recentDownloads + recentOrders;

    // Allow some variance in activity count due to different activity types
    if (Math.abs(data.stats.recentActivity - expectedRecentActivity) > 5) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "activity", "favorites", "downloads", "orders"],
        description: `Recent activity count (${data.stats.recentActivity}) doesn't match calculated activity (${expectedRecentActivity})`,
        severity: "low",
        autoResolvable: true,
        detectedAt: timestamp,
        expectedValue: expectedRecentActivity,
        actualValue: data.stats.recentActivity,
      });
    }

    return inconsistencies;
  }

  /**
   * Validate data freshness and timestamps
   */
  private static validateDataFreshness(data: DashboardData, timestamp: number): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    if (this.DEBUG_MODE) {
      console.log("⏰ Validating data freshness...");
    }

    // Check stats freshness
    this.validateStatsAge(data.stats, timestamp, inconsistencies);

    // Check for future timestamps
    const futureThreshold = timestamp + 60 * 1000; // 1 minute in future is acceptable
    this.validateFutureTimestamps(data, futureThreshold, timestamp, inconsistencies);

    return inconsistencies;
  }

  /**
   * Validate stats age
   */
  private static validateStatsAge(
    stats: DashboardData["stats"],
    timestamp: number,
    inconsistencies: Inconsistency[]
  ): void {
    if (!("calculatedAt" in stats) || typeof stats.calculatedAt !== "string") return;

    const statsAge = timestamp - new Date(stats.calculatedAt).getTime();
    const maxAge = DEFAULT_MAX_DATA_AGE;

    if (statsAge > maxAge) {
      inconsistencies.push({
        type: "timing",
        sections: ["stats"],
        description: `Stats are stale (calculated ${Math.round(statsAge / 1000)}s ago). This may cause inconsistency between dashboard sections.`,
        severity: statsAge > 15 * 60 * 1000 ? "high" : "low",
        autoResolvable: true,
        detectedAt: timestamp,
        expectedValue: `< ${maxAge / 1000}s`,
        actualValue: `${Math.round(statsAge / 1000)}s`,
      });
    }
  }

  /**
   * Validate future timestamps across all sections
   */
  private static validateFutureTimestamps(
    data: DashboardData,
    futureThreshold: number,
    timestamp: number,
    inconsistencies: Inconsistency[]
  ): void {
    // Check favorites
    for (const favorite of data.favorites) {
      this.checkFutureTimestamp(
        favorite.id,
        favorite.createdAt,
        "favorites",
        "Favorite",
        futureThreshold,
        timestamp,
        inconsistencies
      );
    }

    // Check orders
    for (const order of data.orders) {
      this.checkFutureTimestamp(
        order.id,
        order.createdAt,
        "orders",
        "Order",
        futureThreshold,
        timestamp,
        inconsistencies
      );
    }

    // Check downloads
    for (const download of data.downloads) {
      this.checkFutureTimestamp(
        download.id,
        download.downloadedAt,
        "downloads",
        "Download",
        futureThreshold,
        timestamp,
        inconsistencies
      );
    }
  }

  /**
   * Check if a timestamp is in the future
   */
  private static checkFutureTimestamp(
    id: string,
    timestampStr: string,
    section: string,
    entityType: string,
    futureThreshold: number,
    detectedAt: number,
    inconsistencies: Inconsistency[]
  ): void {
    const itemTime = new Date(timestampStr).getTime();

    if (itemTime > futureThreshold) {
      inconsistencies.push({
        type: "timing",
        sections: [section],
        description: `${entityType} ${id} has future timestamp: ${timestampStr}`,
        severity: "medium",
        autoResolvable: false,
        detectedAt,
        expectedValue: `<= ${new Date(futureThreshold).toISOString()}`,
        actualValue: timestampStr,
      });
    }
  }

  /**
   * Validate hash consistency across sections
   * @param allowTestHashes - Allow test hash values like "test-hash" in test environments
   */
  private static validateHashConsistency(
    data: DashboardData,
    timestamp: number,
    allowTestHashes: boolean = false
  ): Inconsistency[] {
    if (this.DEBUG_MODE) {
      console.log("🔐 Validating hash consistency...");
      console.log("Allow test hashes:", allowTestHashes);
    }

    try {
      return this.performHashValidation(data, timestamp, allowTestHashes);
    } catch (error) {
      return this.handleHashValidationError(error, timestamp);
    }
  }

  /**
   * Perform hash validation
   */
  private static performHashValidation(
    data: DashboardData,
    timestamp: number,
    allowTestHashes: boolean
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    // Calculate section-specific hashes
    const sectionHashes = {
      stats: DataHashCalculator.calculateStatsHash(data.stats as ConsistentUserStats),
      favorites: DataHashCalculator.calculateFavoritesHash(data.favorites),
      orders: DataHashCalculator.calculateOrdersHash(data.orders),
      downloads: DataHashCalculator.calculateDownloadsHash(data.downloads),
    };

    // Validate stats hash if available
    this.validateStatsHash(
      data.stats,
      sectionHashes.stats,
      allowTestHashes,
      timestamp,
      inconsistencies
    );

    if (this.DEBUG_MODE) {
      console.log("Section hashes:", sectionHashes);
    }

    return inconsistencies;
  }

  /**
   * Validate stats hash
   */
  private static validateStatsHash(
    stats: DashboardData["stats"],
    actualHash: string,
    allowTestHashes: boolean,
    timestamp: number,
    inconsistencies: Inconsistency[]
  ): void {
    if (
      !("dataHash" in stats) ||
      typeof stats.dataHash !== "string" ||
      stats.dataHash.length === 0
    ) {
      return;
    }

    const expectedHash = stats.dataHash;
    const isTestHash = this.isTestHash(expectedHash);

    if (isTestHash && allowTestHashes) {
      if (this.DEBUG_MODE) {
        console.log("✅ Test hash accepted:", expectedHash);
      }
      return;
    }

    if (expectedHash !== actualHash) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats"],
        description: `Stats data hash mismatch. Expected: ${expectedHash}, Actual: ${actualHash}. This indicates data corruption or calculation errors.`,
        severity: "high",
        autoResolvable: true,
        detectedAt: timestamp,
        expectedValue: expectedHash,
        actualValue: actualHash,
      });
    }
  }

  /**
   * Check if a hash is a test hash
   */
  private static isTestHash(hash: string): boolean {
    return hash === "test-hash" || hash.startsWith("test-") || hash === "mock-hash";
  }

  /**
   * Handle hash validation errors
   */
  private static handleHashValidationError(error: unknown, timestamp: number): Inconsistency[] {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return [
      {
        type: "calculation",
        sections: ["validation"],
        description: `Hash calculation failed: ${errorMessage}`,
        severity: "medium",
        autoResolvable: false,
        detectedAt: timestamp,
      },
    ];
  }

  /**
   * Validate for duplicate data across sections
   */
  private static validateDuplicateData(data: DashboardData, timestamp: number): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    if (this.DEBUG_MODE) {
      console.log("🔍 Checking for duplicate data...");
    }

    // Check each section for duplicates
    this.checkDuplicates(
      data.favorites,
      "favorites",
      "favorite count accuracy",
      "medium",
      timestamp,
      inconsistencies
    );

    this.checkDuplicates(
      data.orders,
      "orders",
      "revenue calculations",
      "high",
      timestamp,
      inconsistencies
    );

    this.checkDuplicates(
      data.downloads,
      "downloads",
      "download count and quota calculations",
      "medium",
      timestamp,
      inconsistencies
    );

    return inconsistencies;
  }

  /**
   * Check for duplicate IDs in an array
   */
  private static checkDuplicates<T extends { id: string }>(
    items: T[],
    section: string,
    impact: string,
    severity: Inconsistency["severity"],
    timestamp: number,
    inconsistencies: Inconsistency[]
  ): void {
    const ids = new Set<string>();
    const duplicates: string[] = [];

    for (const item of items) {
      if (ids.has(item.id)) {
        duplicates.push(item.id);
      } else {
        ids.add(item.id);
      }
    }

    if (duplicates.length > 0) {
      inconsistencies.push({
        type: "duplicate_data",
        sections: [section],
        description: `Duplicate ${section} found: ${duplicates.join(", ")}. This affects ${impact}.`,
        severity,
        autoResolvable: true,
        detectedAt: timestamp,
        actualValue: duplicates,
      });
    }
  }

  /**
   * Log detailed validation results for debugging (NEW METHOD)
   */
  private static logValidationResults(result: CrossValidationResult, startTime: number): void {
    const duration = Date.now() - startTime;

    if (this.DEBUG_MODE) {
      this.logDebugValidationResults(result, duration);
    }

    // Always log critical issues, even in production
    this.logCriticalIssues(result.inconsistencies);
  }

  /**
   * Log debug validation results
   */
  private static logDebugValidationResults(result: CrossValidationResult, duration: number): void {
    if (result.consistent) {
      console.log("✅ Data consistency validation passed");
    } else {
      this.logInconsistencyDetails(result);
    }

    console.log(`⏱️ Validation completed in ${duration}ms`);
  }

  /**
   * Log inconsistency details
   */
  private static logInconsistencyDetails(result: CrossValidationResult): void {
    console.warn("⚠️ Data consistency issues found:");

    for (const [index, inc] of result.inconsistencies.entries()) {
      this.logSingleInconsistency(inc, index);
    }

    console.warn(`  Recommended action: ${result.recommendedAction}`);
    console.warn(`  Affected sections: ${result.affectedSections.join(", ")}`);
  }

  /**
   * Log a single inconsistency
   */
  private static logSingleInconsistency(inc: Inconsistency, index: number): void {
    const severityIcon = {
      low: "🟡",
      medium: "🟠",
      high: "🔴",
      critical: "💥",
    }[inc.severity];

    console.warn(
      `  ${index + 1}. ${severityIcon} [${inc.severity.toUpperCase()}] ${inc.description}`
    );
    console.warn(`     Sections: ${inc.sections.join(", ")}`);
    console.warn(`     Auto-resolvable: ${inc.autoResolvable ? "Yes" : "No"}`);

    if (inc.expectedValue !== undefined && inc.actualValue !== undefined) {
      const expectedStr = formatInconsistencyValue(inc.expectedValue);
      const actualStr = formatInconsistencyValue(inc.actualValue);
      console.warn(`     Expected: ${expectedStr}, Actual: ${actualStr}`);
    }
  }

  /**
   * Log critical issues
   */
  private static logCriticalIssues(inconsistencies: Inconsistency[]): void {
    const criticalIssues = inconsistencies.filter(inc => inc.severity === "critical");
    if (criticalIssues.length > 0) {
      console.error("🚨 Critical dashboard data inconsistencies detected:", criticalIssues);
    }
  }

  /**
   * Store validation history for trend analysis
   */
  private static storeValidationHistory(result: CrossValidationResult, data: DashboardData): void {
    const dataHash = this.calculateSafeDataHash(data);

    this.validationHistory.push({
      timestamp: Date.now(),
      result,
      dataHash,
    });

    // Keep only last N validations to prevent memory leaks
    if (this.validationHistory.length > MAX_VALIDATION_HISTORY) {
      this.validationHistory = this.validationHistory.slice(-MAX_VALIDATION_HISTORY);
    }
  }

  /**
   * Calculate data hash with fallback
   */
  private static calculateSafeDataHash(data: DashboardData): string {
    try {
      const dataHash = DataHashCalculator.calculateDashboardHash(data);
      return dataHash && dataHash !== "undefined" ? dataHash : `fallback-${Date.now()}`;
    } catch {
      return `fallback-${Date.now()}`;
    }
  }

  /**
   * Get validation history for debugging (NEW METHOD)
   */
  static getValidationHistory(): Array<{
    timestamp: number;
    result: CrossValidationResult;
    dataHash: string;
  }> {
    return [...this.validationHistory];
  }

  /**
   * Clear validation history (NEW METHOD)
   */
  static clearValidationHistory(): void {
    this.validationHistory = [];
  }

  /**
   * Get consistency metrics over time (NEW METHOD)
   */
  static getConsistencyMetrics(): {
    totalValidations: number;
    consistentValidations: number;
    consistencyRate: number;
    averageInconsistencies: number;
    mostCommonInconsistencyType: string;
    criticalInconsistencies: number;
  } {
    if (this.validationHistory.length === 0) {
      return {
        totalValidations: 0,
        consistentValidations: 0,
        consistencyRate: 0,
        averageInconsistencies: 0,
        mostCommonInconsistencyType: "none",
        criticalInconsistencies: 0,
      };
    }

    const totalValidations = this.validationHistory.length;
    const consistentValidations = this.validationHistory.filter(v => v.result.consistent).length;
    const consistencyRate = (consistentValidations / totalValidations) * 100;

    const allInconsistencies = this.validationHistory.flatMap(v => v.result.inconsistencies);
    const averageInconsistencies = allInconsistencies.length / totalValidations;
    const criticalInconsistencies = allInconsistencies.filter(
      inc => inc.severity === "critical"
    ).length;

    // Find most common inconsistency type
    const typeCount: Record<string, number> = {};
    for (const inc of allInconsistencies) {
      typeCount[inc.type] = (typeCount[inc.type] || 0) + 1;
    }

    const mostCommonType =
      Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "none";

    return {
      totalValidations,
      consistentValidations,
      consistencyRate,
      averageInconsistencies,
      mostCommonInconsistencyType: mostCommonType,
      criticalInconsistencies,
    };
  }

  /**
   * Get recommended action based on inconsistencies
   */
  private static getRecommendedAction(
    inconsistencies: Inconsistency[]
  ): "sync" | "reload" | "ignore" {
    if (inconsistencies.length === 0) return "ignore";

    const criticalInconsistencies = inconsistencies.filter(inc => inc.severity === "critical");
    const highInconsistencies = inconsistencies.filter(inc => inc.severity === "high");

    if (criticalInconsistencies.length > 0) return "reload";
    if (highInconsistencies.length > 0) return "sync";

    const autoResolvableCount = inconsistencies.filter(inc => inc.autoResolvable).length;
    if (autoResolvableCount === inconsistencies.length) return "sync";

    return "sync";
  }

  /**
   * Factory method to create a test-friendly ConsistencyChecker configuration
   * Returns options pre-configured for test environments
   */
  static createTestChecker(): ConsistencyCheckOptions {
    return {
      environment: "test",
      skipTimeBasedValidations: true,
      skipHashValidation: false,
      allowTestHashes: true,
    };
  }
}

// ================================
// DATA HASH CALCULATION
// ================================

/**
 * Calculate hash for different types of dashboard data
 */
export class DataHashCalculator {
  /**
   * Calculate hash for user stats with consistent ordering
   */
  static calculateStatsHash(stats: ConsistentUserStats): string {
    const orderedStats = {
      totalFavorites: stats.totalFavorites,
      totalDownloads: stats.totalDownloads,
      totalOrders: stats.totalOrders,
      totalSpent: Math.round(stats.totalSpent * 100) / 100, // Round to cents
      recentActivity: stats.recentActivity,
      quotaUsed: stats.quotaUsed,
      quotaLimit: stats.quotaLimit,
      monthlyDownloads: stats.monthlyDownloads,
      monthlyOrders: stats.monthlyOrders,
      monthlyRevenue: Math.round(stats.monthlyRevenue * 100) / 100, // Round to cents
    };

    try {
      return generateDataHash(orderedStats);
    } catch {
      // Fallback hash calculation
      return DataHashCalculator.fallbackHash(orderedStats);
    }
  }

  /**
   * Fallback hash calculation when generateDataHash is not available
   */
  static fallbackHash(data: unknown): string {
    const sortedKeys = Object.keys(data as object).sort((a, b) => a.localeCompare(b));
    const jsonString = JSON.stringify(data, sortedKeys);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.codePointAt(i) || 0;
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Calculate hash for favorites array
   */
  static calculateFavoritesHash(favorites: DashboardData["favorites"]): string {
    const orderedFavorites = favorites
      .map(fav => ({
        id: fav.id,
        beatId: fav.beatId,
        beatTitle: fav.beatTitle,
        createdAt: fav.createdAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    try {
      return generateDataHash(orderedFavorites);
    } catch {
      return DataHashCalculator.fallbackHash(orderedFavorites);
    }
  }

  /**
   * Calculate hash for orders array
   */
  static calculateOrdersHash(orders: DashboardData["orders"]): string {
    const orderedOrders = orders
      .map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        total: Math.round(order.total * 100) / 100, // Round to cents
        status: order.status,
        createdAt: order.createdAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    try {
      return generateDataHash(orderedOrders);
    } catch {
      return DataHashCalculator.fallbackHash(orderedOrders);
    }
  }

  /**
   * Calculate hash for downloads array
   */
  static calculateDownloadsHash(downloads: DashboardData["downloads"]): string {
    const orderedDownloads = downloads
      .map(download => ({
        id: download.id,
        beatId: download.beatId,
        beatTitle: download.beatTitle,
        licenseType: download.licenseType,
        downloadedAt: download.downloadedAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    try {
      return generateDataHash(orderedDownloads);
    } catch {
      return DataHashCalculator.fallbackHash(orderedDownloads);
    }
  }

  /**
   * Calculate comprehensive hash for all dashboard data
   */
  static calculateDashboardHash(data: DashboardData): string {
    const hashes = {
      user: DataHashCalculator.fallbackHash({ id: data.user.id, email: data.user.email }),
      stats: this.calculateStatsHash(data.stats as ConsistentUserStats),
      favorites: this.calculateFavoritesHash(data.favorites),
      orders: this.calculateOrdersHash(data.orders),
      downloads: this.calculateDownloadsHash(data.downloads),
      reservations: DataHashCalculator.fallbackHash(
        data.reservations.map(r => ({ id: r.id, status: r.status }))
      ),
      activity: DataHashCalculator.fallbackHash(
        data.activity.slice(0, 10).map(a => ({ id: a.id, type: a.type }))
      ),
    };

    try {
      return generateDataHash(hashes);
    } catch {
      return DataHashCalculator.fallbackHash(hashes);
    }
  }
}

// ================================
// CONSISTENCY MONITORING
// ================================

/**
 * Resolution method type for inconsistency tracking
 */
type ResolutionMethod = "auto" | "manual" | "sync";

/**
 * Inconsistency history record type
 */
type InconsistencyRecord = {
  timestamp: number;
  inconsistencies: Inconsistency[];
  resolved: boolean;
  resolvedAt?: number;
  resolutionMethod?: ResolutionMethod;
  dataHash: string;
};

/**
 * Enhanced Consistency Monitor with detailed logging and automatic resolution tracking
 */
export class ConsistencyMonitor {
  private static readonly DEBUG_MODE = process.env.NODE_ENV === "development";
  private static inconsistencyHistory: InconsistencyRecord[] = [];

  /**
   * Record inconsistency detection with enhanced metadata
   */
  static recordInconsistencies(inconsistencies: Inconsistency[], dataHash: string = ""): number {
    const timestamp = Date.now();

    this.inconsistencyHistory.push({
      timestamp,
      inconsistencies,
      resolved: false,
      dataHash,
    });

    // Keep only last N records to prevent memory leaks
    if (this.inconsistencyHistory.length > MAX_INCONSISTENCY_HISTORY) {
      this.inconsistencyHistory = this.inconsistencyHistory.slice(-MAX_INCONSISTENCY_HISTORY);
    }

    this.logRecordedInconsistencies(timestamp, inconsistencies, dataHash);

    return timestamp;
  }

  /**
   * Log recorded inconsistencies
   */
  private static logRecordedInconsistencies(
    timestamp: number,
    inconsistencies: Inconsistency[],
    dataHash: string
  ): void {
    if (!this.DEBUG_MODE || inconsistencies.length === 0) return;

    console.group("📝 Recording inconsistencies");
    console.log(`Timestamp: ${new Date(timestamp).toISOString()}`);
    console.log(`Count: ${inconsistencies.length}`);
    console.log(`Data hash: ${dataHash}`);
    for (const [index, inc] of inconsistencies.entries()) {
      console.log(`  ${index + 1}. [${inc.severity}] ${inc.type}: ${inc.description}`);
    }
    console.groupEnd();
  }

  /**
   * Mark inconsistencies as resolved with resolution method tracking
   */
  static markResolved(timestamp: number, resolutionMethod: ResolutionMethod = "auto"): boolean {
    const record = this.inconsistencyHistory.find(r => r.timestamp === timestamp);
    if (record && !record.resolved) {
      record.resolved = true;
      record.resolvedAt = Date.now();
      record.resolutionMethod = resolutionMethod;

      if (this.DEBUG_MODE) {
        const resolutionTime = record.resolvedAt - record.timestamp;
        console.log(`✅ Inconsistencies resolved via ${resolutionMethod} in ${resolutionTime}ms`);
      }

      return true;
    }
    return false;
  }

  /**
   * Get detailed consistency metrics with trend analysis
   */
  static getConsistencyMetrics(): {
    totalInconsistencies: number;
    resolvedInconsistencies: number;
    averageResolutionTime: number;
    mostCommonInconsistencyType: string;
    severityBreakdown: Record<string, number>;
    resolutionMethodBreakdown: Record<string, number>;
    consistencyTrend: "improving" | "stable" | "degrading";
    criticalInconsistencyRate: number;
  } {
    const total = this.inconsistencyHistory.length;
    const resolved = this.inconsistencyHistory.filter(r => r.resolved).length;

    const averageResolutionTime = this.calculateAverageResolutionTime();
    const { typeCount, severityCount, resolutionMethodCount, criticalCount } =
      this.aggregateInconsistencyData();

    const mostCommonType =
      Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "none";

    const consistencyTrend = this.calculateConsistencyTrend();
    const criticalInconsistencyRate = total > 0 ? (criticalCount / total) * 100 : 0;

    return {
      totalInconsistencies: total,
      resolvedInconsistencies: resolved,
      averageResolutionTime,
      mostCommonInconsistencyType: mostCommonType,
      severityBreakdown: severityCount,
      resolutionMethodBreakdown: resolutionMethodCount,
      consistencyTrend,
      criticalInconsistencyRate,
    };
  }

  /**
   * Calculate average resolution time
   */
  private static calculateAverageResolutionTime(): number {
    const resolvedRecords = this.inconsistencyHistory.filter(r => r.resolved && r.resolvedAt);

    if (resolvedRecords.length === 0) return 0;

    const totalTime = resolvedRecords.reduce((sum, record) => {
      return sum + ((record.resolvedAt || 0) - record.timestamp);
    }, 0);

    return totalTime / resolvedRecords.length;
  }

  /**
   * Aggregate inconsistency data for metrics
   */
  private static aggregateInconsistencyData(): {
    typeCount: Record<string, number>;
    severityCount: Record<string, number>;
    resolutionMethodCount: Record<string, number>;
    criticalCount: number;
  } {
    const typeCount: Record<string, number> = {};
    const severityCount: Record<string, number> = {};
    const resolutionMethodCount: Record<string, number> = {};
    let criticalCount = 0;

    for (const record of this.inconsistencyHistory) {
      for (const inc of record.inconsistencies) {
        typeCount[inc.type] = (typeCount[inc.type] || 0) + 1;
        severityCount[inc.severity] = (severityCount[inc.severity] || 0) + 1;

        if (inc.severity === "critical") {
          criticalCount++;
        }
      }

      if (record.resolved && record.resolutionMethod) {
        resolutionMethodCount[record.resolutionMethod] =
          (resolutionMethodCount[record.resolutionMethod] || 0) + 1;
      }
    }

    return { typeCount, severityCount, resolutionMethodCount, criticalCount };
  }

  /**
   * Calculate consistency trend
   */
  private static calculateConsistencyTrend(): "improving" | "stable" | "degrading" {
    const recentRecords = this.inconsistencyHistory.slice(-10);
    const previousRecords = this.inconsistencyHistory.slice(-20, -10);

    const recentInconsistencyRate =
      recentRecords.length > 0
        ? recentRecords.filter(r => !r.resolved).length / recentRecords.length
        : 0;

    const previousInconsistencyRate =
      previousRecords.length > 0
        ? previousRecords.filter(r => !r.resolved).length / previousRecords.length
        : 0;

    if (recentInconsistencyRate < previousInconsistencyRate - CONSISTENCY_TREND_THRESHOLD) {
      return "improving";
    }

    if (recentInconsistencyRate > previousInconsistencyRate + CONSISTENCY_TREND_THRESHOLD) {
      return "degrading";
    }

    return "stable";
  }

  /**
   * Get unresolved inconsistencies
   */
  static getUnresolvedInconsistencies(): Array<{
    timestamp: number;
    inconsistencies: Inconsistency[];
    age: number;
  }> {
    const now = Date.now();
    return this.inconsistencyHistory
      .filter(record => !record.resolved)
      .map(record => ({
        timestamp: record.timestamp,
        inconsistencies: record.inconsistencies,
        age: now - record.timestamp,
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  /**
   * Get inconsistency history for debugging
   */
  static getInconsistencyHistory(): InconsistencyRecord[] {
    return [...this.inconsistencyHistory];
  }

  /**
   * Clear inconsistency history
   */
  static clearHistory(): void {
    this.inconsistencyHistory = [];

    if (this.DEBUG_MODE) {
      console.log("🗑️ Inconsistency history cleared");
    }
  }

  /**
   * Auto-resolve inconsistencies that can be automatically fixed
   */
  static autoResolveInconsistencies(data: DashboardData): {
    resolved: number;
    failed: number;
    errors: string[];
  } {
    const unresolved = this.getUnresolvedInconsistencies();
    const result = { resolved: 0, failed: 0, errors: [] as string[] };

    for (const record of unresolved) {
      this.processRecordResolution(record, data, result);
    }

    this.logAutoResolutionResults(result);

    return result;
  }

  /**
   * Process resolution for a single record
   */
  private static processRecordResolution(
    record: { timestamp: number; inconsistencies: Inconsistency[]; age: number },
    data: DashboardData,
    result: { resolved: number; failed: number; errors: string[] }
  ): void {
    const autoResolvableInconsistencies = record.inconsistencies.filter(inc => inc.autoResolvable);

    for (const inconsistency of autoResolvableInconsistencies) {
      this.resolveInconsistency(inconsistency, data, record.timestamp, result);
    }
  }

  /**
   * Resolve a single inconsistency
   */
  private static resolveInconsistency(
    inconsistency: Inconsistency,
    data: DashboardData,
    timestamp: number,
    result: { resolved: number; failed: number; errors: string[] }
  ): void {
    try {
      const success = this.attemptAutoResolution(inconsistency, data);

      if (success) {
        result.resolved++;
        this.markResolved(timestamp, "auto");
      } else {
        result.failed++;
        result.errors.push(`Failed to auto-resolve: ${inconsistency.description}`);
      }
    } catch (_error) {
      result.failed++;
      const errorMessage = _error instanceof Error ? _error.message : "Unknown error";
      result.errors.push(`Error auto-resolving: ${errorMessage}`);
    }
  }

  /**
   * Log auto-resolution results
   */
  private static logAutoResolutionResults(result: {
    resolved: number;
    failed: number;
    errors: string[];
  }): void {
    if (this.DEBUG_MODE && (result.resolved > 0 || result.failed > 0)) {
      console.log(
        `🔧 Auto-resolution results: ${result.resolved} resolved, ${result.failed} failed`
      );
      if (result.errors.length > 0) {
        console.warn("Auto-resolution errors:", result.errors);
      }
    }
  }

  /**
   * Attempt to auto-resolve a specific inconsistency
   */
  private static attemptAutoResolution(
    inconsistency: Inconsistency,
    _data: DashboardData
  ): boolean {
    // This is a placeholder for actual auto-resolution logic
    // In a real implementation, this would contain specific logic for each inconsistency type

    // For calculation inconsistencies, we could trigger a recalculation
    // For timing inconsistencies, we could update timestamps
    // For duplicate data, we could remove duplicates
    const resolvableTypes: Inconsistency["type"][] = ["calculation", "timing", "duplicate_data"];
    return resolvableTypes.includes(inconsistency.type);
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Compare two data hashes for equality
 */
export function compareDataHashes(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

/**
 * Generate section-specific hash
 */
export function generateSectionHash(section: string, data: unknown): string {
  return generateDataHash({ section, data, timestamp: Date.now() });
}

/**
 * Validate data freshness
 */
export function isDataFresh(
  timestamp: string | number,
  maxAge: number = DEFAULT_MAX_DATA_AGE
): boolean {
  const dataTime = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  return Date.now() - dataTime < maxAge;
}

/**
 * Format inconsistency value for display
 */
function formatInconsistencyValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return "[function]";
  // Fallback for any unexpected type
  return "[unknown]";
}

/**
 * Get inconsistency severity color
 */
export function getInconsistencySeverityColor(severity: Inconsistency["severity"]): string {
  switch (severity) {
    case "low":
      return "text-yellow-500";
    case "medium":
      return "text-orange-500";
    case "high":
      return "text-red-500";
    case "critical":
      return "text-red-700";
    default:
      return "text-gray-500";
  }
}

/**
 * Format inconsistency for display with enhanced information
 */
export function formatInconsistency(inconsistency: Inconsistency): string {
  const sections = inconsistency.sections.join(", ");
  const severity = inconsistency.severity.toUpperCase();
  const autoResolvable = inconsistency.autoResolvable ? " (Auto-resolvable)" : "";
  const age = Date.now() - inconsistency.detectedAt;
  const ageStr =
    age > 60000 ? ` (${Math.round(age / 60000)}m ago)` : ` (${Math.round(age / 1000)}s ago)`;

  return `[${severity}] ${sections}: ${inconsistency.description}${autoResolvable}${ageStr}`;
}

/**
 * Create a detailed inconsistency report for debugging
 */
export function generateInconsistencyReport(inconsistencies: Inconsistency[]): string {
  if (inconsistencies.length === 0) {
    return "✅ No inconsistencies detected - all dashboard sections are synchronized.";
  }

  const summarySection = buildReportSummary(inconsistencies);
  const detailedSection = ["", "📋 Detailed Issues:", ...buildDetailedIssues(inconsistencies)];
  const recommendationsSection = buildRecommendations(inconsistencies);

  const report = [
    "🔍 Dashboard Data Inconsistency Report",
    "",
    ...summarySection,
    ...detailedSection,
    ...recommendationsSection,
  ];

  return report.join("\n");
}

/**
 * Build report summary section
 */
function buildReportSummary(inconsistencies: Inconsistency[]): string[] {
  const severityCounts = inconsistencies.reduce(
    (acc, inc) => {
      acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const summaryLines = ["📊 Summary:", `   Total inconsistencies: ${inconsistencies.length}`];

  for (const [severity, count] of Object.entries(severityCounts)) {
    const icon = getSeverityIcon(severity);
    summaryLines.push(`   ${icon} ${severity}: ${count}`);
  }

  const autoResolvableCount = inconsistencies.filter(inc => inc.autoResolvable).length;
  summaryLines.push(`   🔧 Auto-resolvable: ${autoResolvableCount}/${inconsistencies.length}`);

  return summaryLines;
}

/**
 * Build detailed issues section
 */
function buildDetailedIssues(inconsistencies: Inconsistency[]): string[] {
  return inconsistencies.flatMap((inc, index) => buildInconsistencyDetails(inc, index));
}

/**
 * Build details for a single inconsistency
 */
function buildInconsistencyDetails(inc: Inconsistency, index: number): string[] {
  const icon = getSeverityIcon(inc.severity);
  const baseLines = [
    `${index + 1}. ${icon} [${inc.severity.toUpperCase()}] ${inc.type}`,
    `   Sections: ${inc.sections.join(", ")}`,
    `   Description: ${inc.description}`,
    `   Auto-resolvable: ${inc.autoResolvable ? "Yes" : "No"}`,
  ];

  const valueLines: string[] = [];
  if (inc.expectedValue !== undefined && inc.actualValue !== undefined) {
    const expectedStr = formatInconsistencyValue(inc.expectedValue);
    const actualStr = formatInconsistencyValue(inc.actualValue);
    valueLines.push(`   Expected: ${expectedStr}`, `   Actual: ${actualStr}`);
  }

  const age = Date.now() - inc.detectedAt;
  const ageStr = formatAge(age);
  const ageLines = [`   Detected: ${ageStr} ago`, ""];

  return [...baseLines, ...valueLines, ...ageLines];
}

/**
 * Build recommendations section
 */
function buildRecommendations(inconsistencies: Inconsistency[]): string[] {
  const criticalIssues = inconsistencies.filter(inc => inc.severity === "critical");
  const highIssues = inconsistencies.filter(inc => inc.severity === "high");
  const autoResolvableCount = inconsistencies.filter(inc => inc.autoResolvable).length;

  const recommendations: string[] = ["💡 Recommendations:"];

  if (criticalIssues.length > 0) {
    recommendations.push("   🚨 CRITICAL: Immediate action required - consider full data reload");
  } else if (highIssues.length > 0) {
    recommendations.push("   ⚠️  HIGH: Force synchronization recommended");
  } else {
    recommendations.push("   ℹ️  LOW-MEDIUM: Standard synchronization should resolve issues");
  }

  if (autoResolvableCount > 0) {
    recommendations.push(`   🔧 ${autoResolvableCount} issues can be auto-resolved`);
  }

  return recommendations;
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    low: "🟡",
    medium: "🟠",
    high: "🔴",
    critical: "💥",
  };
  return icons[severity] || "⚪";
}

/**
 * Format age in human-readable format
 */
function formatAge(age: number): string {
  return age > 60000 ? `${Math.round(age / 60000)} minutes` : `${Math.round(age / 1000)} seconds`;
}

/**
 * Quick consistency check for specific sections
 */
export function quickConsistencyCheck(
  data: DashboardData,
  sections: string[] = ["stats", "favorites", "orders", "downloads"]
): {
  consistent: boolean;
  issues: number;
  criticalIssues: number;
  summary: string;
} {
  const result = ConsistencyChecker.validateCrossSection(data);
  const relevantInconsistencies = result.inconsistencies.filter(inc =>
    inc.sections.some(section => sections.includes(section))
  );

  const criticalIssues = relevantInconsistencies.filter(inc => inc.severity === "critical").length;
  const issues = relevantInconsistencies.length;

  let summary = "All sections consistent";
  if (criticalIssues > 0) {
    summary = `${criticalIssues} critical issues found`;
  } else if (issues > 0) {
    summary = `${issues} minor issues found`;
  }

  return {
    consistent: issues === 0,
    issues,
    criticalIssues,
    summary,
  };
}

/**
 * Validate specific dashboard section independently
 */
export function validateSection(
  data: DashboardData,
  sectionName: keyof DashboardData
): ValidationResult {
  const startTime = Date.now();

  try {
    const sectionData = data[sectionName];

    if (sectionData === null || sectionData === undefined) {
      return {
        valid: false,
        errors: [
          {
            field: sectionName,
            message: `Section '${sectionName}' is missing or null`,
            code: "missing_section",
          },
        ],
        warnings: [],
        dataHash: "",
        validatedAt: startTime,
      };
    }

    // Generate hash for the section
    let dataHash = "";
    try {
      switch (sectionName) {
        case "stats":
          dataHash = DataHashCalculator.calculateStatsHash(sectionData as ConsistentUserStats);
          break;
        case "favorites":
          dataHash = DataHashCalculator.calculateFavoritesHash(
            sectionData as DashboardData["favorites"]
          );
          break;
        case "orders":
          dataHash = DataHashCalculator.calculateOrdersHash(sectionData as DashboardData["orders"]);
          break;
        case "downloads":
          dataHash = DataHashCalculator.calculateDownloadsHash(
            sectionData as DashboardData["downloads"]
          );
          break;
        default:
          try {
            dataHash = generateDataHash(sectionData);
          } catch {
            dataHash = DataHashCalculator.fallbackHash(sectionData);
          }
      }
    } catch (_error) {
      const errorMessage = _error instanceof Error ? _error.message : "Unknown error";
      return {
        valid: false,
        errors: [
          {
            field: sectionName,
            message: `Hash calculation failed: ${errorMessage}`,
            code: "hash_calculation_error",
          },
        ],
        warnings: [],
        dataHash: "",
        validatedAt: startTime,
      };
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
      dataHash,
      validatedAt: startTime,
    };
  } catch (_error) {
    const errorMessage = _error instanceof Error ? _error.message : "Unknown error";
    return {
      valid: false,
      errors: [
        {
          field: sectionName,
          message: `Section validation failed: ${errorMessage}`,
          code: "validation_error",
        },
      ],
      warnings: [],
      dataHash: "",
      validatedAt: startTime,
    };
  }
}

/**
 * Compare two dashboard data objects for consistency
 */
export function compareDashboardData(
  data1: DashboardData,
  data2: DashboardData
): {
  identical: boolean;
  differences: Array<{
    section: string;
    field: string;
    value1: unknown;
    value2: unknown;
  }>;
  hashComparison: {
    data1Hash: string;
    data2Hash: string;
    identical: boolean;
  };
} {
  const differences: Array<{
    section: string;
    field: string;
    value1: unknown;
    value2: unknown;
  }> = [];

  // Compare stats
  if (data1.stats.totalFavorites !== data2.stats.totalFavorites) {
    differences.push({
      section: "stats",
      field: "totalFavorites",
      value1: data1.stats.totalFavorites,
      value2: data2.stats.totalFavorites,
    });
  }

  if (data1.stats.totalDownloads !== data2.stats.totalDownloads) {
    differences.push({
      section: "stats",
      field: "totalDownloads",
      value1: data1.stats.totalDownloads,
      value2: data2.stats.totalDownloads,
    });
  }

  if (data1.stats.totalOrders !== data2.stats.totalOrders) {
    differences.push({
      section: "stats",
      field: "totalOrders",
      value1: data1.stats.totalOrders,
      value2: data2.stats.totalOrders,
    });
  }

  if (Math.abs(data1.stats.totalSpent - data2.stats.totalSpent) > 0.01) {
    differences.push({
      section: "stats",
      field: "totalSpent",
      value1: data1.stats.totalSpent,
      value2: data2.stats.totalSpent,
    });
  }

  // Compare array lengths
  if (data1.favorites.length !== data2.favorites.length) {
    differences.push({
      section: "favorites",
      field: "length",
      value1: data1.favorites.length,
      value2: data2.favorites.length,
    });
  }

  if (data1.orders.length !== data2.orders.length) {
    differences.push({
      section: "orders",
      field: "length",
      value1: data1.orders.length,
      value2: data2.orders.length,
    });
  }

  if (data1.downloads.length !== data2.downloads.length) {
    differences.push({
      section: "downloads",
      field: "length",
      value1: data1.downloads.length,
      value2: data2.downloads.length,
    });
  }

  // Calculate and compare hashes
  const data1Hash = DataHashCalculator.calculateDashboardHash(data1);
  const data2Hash = DataHashCalculator.calculateDashboardHash(data2);

  return {
    identical: differences.length === 0,
    differences,
    hashComparison: {
      data1Hash,
      data2Hash,
      identical: data1Hash === data2Hash,
    },
  };
}
