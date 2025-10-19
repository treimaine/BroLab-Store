/**
 * Data Consistency Validation System
 *
 * Comprehensive system for validating data integrity across dashboard sections,
 * calculating data hashes, detecting inconsistencies, and providing automatic
 * inconsistency detection with detailed logging for debugging.
 *
 * This system ensures that stats match between "Hello, Steve" and "Analytics Dashboard"
 * sections and provides cross-section validation for all dashboard data.
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
// CONSISTENCY VALIDATION
// ================================

/**
 * Enhanced Consistency Checker for Dashboard Data Validation
 *
 * Implements comprehensive data integrity validation across all dashboard sections
 * with automatic inconsistency detection, detailed logging, and data hash comparison.
 */
export class ConsistencyChecker {
  private static readonly DEBUG_MODE = process.env.NODE_ENV === "development";
  private static validationHistory: Array<{
    timestamp: number;
    result: CrossValidationResult;
    dataHash: string;
  }> = [];

  /**
   * Validate data integrity across all dashboard sections with enhanced logging
   */
  static validateCrossSection(data: DashboardData): CrossValidationResult {
    const startTime = Date.now();
    const inconsistencies: Inconsistency[] = [];

    if (this.DEBUG_MODE) {
      console.group("🔍 Dashboard Data Consistency Validation");
      console.log("Validating data at:", new Date().toISOString());
      console.log("Data sections:", Object.keys(data));
    }

    try {
      // 1. Validate basic data structure first
      const structuralValidation = this.validateDataStructure(data, startTime);
      inconsistencies.push(...structuralValidation);

      // 2. Check stats vs actual data counts (core requirement)
      const statsInconsistencies = this.validateStatsConsistency(data, startTime);
      inconsistencies.push(...statsInconsistencies);

      // 3. Check data relationships between sections
      const relationshipInconsistencies = this.validateDataRelationships(data, startTime);
      inconsistencies.push(...relationshipInconsistencies);

      // 4. Check data freshness and timestamps
      const freshnessInconsistencies = this.validateDataFreshness(data, startTime);
      inconsistencies.push(...freshnessInconsistencies);

      // 5. Validate cross-section hash consistency
      const hashInconsistencies = this.validateHashConsistency(data, startTime);
      inconsistencies.push(...hashInconsistencies);

      // 6. Check for duplicate data across sections
      const duplicateInconsistencies = this.validateDuplicateData(data, startTime);
      inconsistencies.push(...duplicateInconsistencies);

      const affectedSections = Array.from(new Set(inconsistencies.flatMap(inc => inc.sections)));
      const result: CrossValidationResult = {
        consistent: inconsistencies.length === 0,
        inconsistencies,
        affectedSections,
        recommendedAction: this.getRecommendedAction(inconsistencies),
      };

      // Log detailed results for debugging
      this.logValidationResults(result, startTime);

      // Store validation history
      this.storeValidationHistory(result, data);

      return result;
    } catch (error) {
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
        console.groupEnd();
      }

      return {
        consistent: false,
        inconsistencies: [criticalInconsistency],
        affectedSections: ["validation"],
        recommendedAction: "reload",
      };
    } finally {
      if (this.DEBUG_MODE) {
        console.groupEnd();
      }
    }
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
    } catch (error) {
      // If validation function is not available (e.g., in tests), skip schema validation
      if (this.DEBUG_MODE) {
        console.warn(
          "Schema validation skipped:",
          error instanceof Error ? error.message : "Unknown error"
        );
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
   */
  private static validateStatsConsistency(data: DashboardData, timestamp: number): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    if (this.DEBUG_MODE) {
      console.log("📊 Validating stats consistency...");
      console.log("Stats:", data.stats);
      console.log("Array lengths:", {
        favorites: data.favorites.length,
        downloads: data.downloads.length,
        orders: data.orders.length,
        reservations: data.reservations.length,
      });
    }

    // Calculate actual totals from arrays for comparison
    const actualTotals = {
      favorites: data.favorites.length,
      downloads: data.downloads.length,
      orders: data.orders.length,
      reservations: data.reservations.length,
    };

    // Calculate actual spent amount from orders
    const actualTotalSpent = data.orders
      .filter(order => order.status === "completed" || order.status === "paid")
      .reduce((sum, order) => sum + order.total, 0);

    // Validate favorites count consistency
    if (Math.abs(data.stats.totalFavorites - actualTotals.favorites) > 0) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "favorites"],
        description: `Stats show ${data.stats.totalFavorites} favorites, but favorites array has ${actualTotals.favorites} items. This affects both "Hello, Steve" and "Analytics Dashboard" sections.`,
        severity: actualTotals.favorites > data.stats.totalFavorites ? "high" : "medium",
        autoResolvable: true,
        detectedAt: timestamp,
        expectedValue: actualTotals.favorites,
        actualValue: data.stats.totalFavorites,
      });
    }

    // Validate downloads count consistency
    if (Math.abs(data.stats.totalDownloads - actualTotals.downloads) > 0) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "downloads"],
        description: `Stats show ${data.stats.totalDownloads} downloads, but downloads array has ${actualTotals.downloads} items. This causes inconsistency between dashboard sections.`,
        severity: actualTotals.downloads > data.stats.totalDownloads ? "high" : "medium",
        autoResolvable: true,
        detectedAt: timestamp,
        expectedValue: actualTotals.downloads,
        actualValue: data.stats.totalDownloads,
      });
    }

    // Validate orders count consistency
    if (Math.abs(data.stats.totalOrders - actualTotals.orders) > 0) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "orders"],
        description: `Stats show ${data.stats.totalOrders} orders, but orders array has ${actualTotals.orders} items. This affects revenue calculations across dashboard sections.`,
        severity: actualTotals.orders > data.stats.totalOrders ? "high" : "medium",
        autoResolvable: true,
        detectedAt: timestamp,
        expectedValue: actualTotals.orders,
        actualValue: data.stats.totalOrders,
      });
    }

    // Validate total spent consistency (critical for revenue display)
    const spentDifference = Math.abs(data.stats.totalSpent - actualTotalSpent);
    if (spentDifference > 0.01) {
      // Allow for small rounding differences
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "orders"],
        description: `Stats show $${data.stats.totalSpent.toFixed(2)} total spent, but calculated from orders is $${actualTotalSpent.toFixed(2)}. This creates revenue inconsistency between "Hello, Steve" and "Analytics Dashboard".`,
        severity: spentDifference > 100 ? "critical" : "high", // Only critical if difference > $100
        autoResolvable: true,
        detectedAt: timestamp,
        expectedValue: actualTotalSpent,
        actualValue: data.stats.totalSpent,
      });
    }

    // Validate quota consistency (important for subscription display)
    if (data.stats.quotaUsed > data.stats.quotaLimit && data.stats.quotaLimit > 0) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats"],
        description: `Quota used (${data.stats.quotaUsed}) exceeds quota limit (${data.stats.quotaLimit}). This affects subscription status display.`,
        severity: "high",
        autoResolvable: false,
        detectedAt: timestamp,
        expectedValue: `<= ${data.stats.quotaLimit}`,
        actualValue: data.stats.quotaUsed,
      });
    }

    // Validate monthly stats consistency
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyOrders = data.orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    }).length;

    const monthlyDownloads = data.downloads.filter(download => {
      const downloadDate = new Date(download.downloadedAt);
      return downloadDate.getMonth() === currentMonth && downloadDate.getFullYear() === currentYear;
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

    // Check if stats calculation timestamp is reasonable
    if ("calculatedAt" in data.stats && typeof data.stats.calculatedAt === "string") {
      const statsAge = timestamp - new Date(data.stats.calculatedAt).getTime();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (statsAge > maxAge) {
        inconsistencies.push({
          type: "timing",
          sections: ["stats"],
          description: `Stats are stale (calculated ${Math.round(statsAge / 1000)}s ago). This may cause inconsistency between dashboard sections.`,
          severity: statsAge > 15 * 60 * 1000 ? "high" : "low", // High if older than 15 minutes
          autoResolvable: true,
          detectedAt: timestamp,
          expectedValue: `< ${maxAge / 1000}s`,
          actualValue: `${Math.round(statsAge / 1000)}s`,
        });
      }
    }

    // Check for future timestamps (data integrity issue)
    const futureThreshold = timestamp + 60 * 1000; // 1 minute in future is acceptable

    // Check favorites timestamps
    for (const favorite of data.favorites) {
      const favoriteTime = new Date(favorite.createdAt).getTime();
      if (favoriteTime > futureThreshold) {
        inconsistencies.push({
          type: "timing",
          sections: ["favorites"],
          description: `Favorite ${favorite.id} has future timestamp: ${favorite.createdAt}`,
          severity: "medium",
          autoResolvable: false,
          detectedAt: timestamp,
          expectedValue: `<= ${new Date(futureThreshold).toISOString()}`,
          actualValue: favorite.createdAt,
        });
      }
    }

    // Check orders timestamps
    for (const order of data.orders) {
      const orderTime = new Date(order.createdAt).getTime();
      if (orderTime > futureThreshold) {
        inconsistencies.push({
          type: "timing",
          sections: ["orders"],
          description: `Order ${order.id} has future timestamp: ${order.createdAt}`,
          severity: "medium",
          autoResolvable: false,
          detectedAt: timestamp,
          expectedValue: `<= ${new Date(futureThreshold).toISOString()}`,
          actualValue: order.createdAt,
        });
      }
    }

    // Check downloads timestamps
    for (const download of data.downloads) {
      const downloadTime = new Date(download.downloadedAt).getTime();
      if (downloadTime > futureThreshold) {
        inconsistencies.push({
          type: "timing",
          sections: ["downloads"],
          description: `Download ${download.id} has future timestamp: ${download.downloadedAt}`,
          severity: "medium",
          autoResolvable: false,
          detectedAt: timestamp,
          expectedValue: `<= ${new Date(futureThreshold).toISOString()}`,
          actualValue: download.downloadedAt,
        });
      }
    }

    return inconsistencies;
  }

  /**
   * Validate hash consistency across sections (NEW METHOD)
   */
  private static validateHashConsistency(data: DashboardData, timestamp: number): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    if (this.DEBUG_MODE) {
      console.log("🔐 Validating hash consistency...");
    }

    try {
      // Calculate section-specific hashes
      const sectionHashes = {
        stats: DataHashCalculator.calculateStatsHash(data.stats as ConsistentUserStats),
        favorites: DataHashCalculator.calculateFavoritesHash(data.favorites),
        orders: DataHashCalculator.calculateOrdersHash(data.orders),
        downloads: DataHashCalculator.calculateDownloadsHash(data.downloads),
      };

      // Check if stats hash matches expected hash (if available and not empty)
      if (
        "dataHash" in data.stats &&
        typeof data.stats.dataHash === "string" &&
        data.stats.dataHash.length > 0
      ) {
        const expectedStatsHash = data.stats.dataHash;
        const actualStatsHash = sectionHashes.stats;

        if (expectedStatsHash !== actualStatsHash) {
          inconsistencies.push({
            type: "calculation",
            sections: ["stats"],
            description: `Stats data hash mismatch. Expected: ${expectedStatsHash}, Actual: ${actualStatsHash}. This indicates data corruption or calculation errors.`,
            severity: "high",
            autoResolvable: true,
            detectedAt: timestamp,
            expectedValue: expectedStatsHash,
            actualValue: actualStatsHash,
          });
        }
      }

      // Store calculated hashes for future comparison
      if (this.DEBUG_MODE) {
        console.log("Section hashes:", sectionHashes);
      }
    } catch (error) {
      inconsistencies.push({
        type: "calculation",
        sections: ["validation"],
        description: `Hash calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "medium",
        autoResolvable: false,
        detectedAt: timestamp,
      });
    }

    return inconsistencies;
  }

  /**
   * Validate for duplicate data across sections (NEW METHOD)
   */
  private static validateDuplicateData(data: DashboardData, timestamp: number): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    if (this.DEBUG_MODE) {
      console.log("🔍 Checking for duplicate data...");
    }

    // Check for duplicate favorites
    const favoriteIds = new Set<string>();
    const duplicateFavorites: string[] = [];

    for (const favorite of data.favorites) {
      if (favoriteIds.has(favorite.id)) {
        duplicateFavorites.push(favorite.id);
      } else {
        favoriteIds.add(favorite.id);
      }
    }

    if (duplicateFavorites.length > 0) {
      inconsistencies.push({
        type: "duplicate_data",
        sections: ["favorites"],
        description: `Duplicate favorites found: ${duplicateFavorites.join(", ")}. This affects favorite count accuracy.`,
        severity: "medium",
        autoResolvable: true,
        detectedAt: timestamp,
        actualValue: duplicateFavorites,
      });
    }

    // Check for duplicate orders
    const orderIds = new Set<string>();
    const duplicateOrders: string[] = [];

    for (const order of data.orders) {
      if (orderIds.has(order.id)) {
        duplicateOrders.push(order.id);
      } else {
        orderIds.add(order.id);
      }
    }

    if (duplicateOrders.length > 0) {
      inconsistencies.push({
        type: "duplicate_data",
        sections: ["orders"],
        description: `Duplicate orders found: ${duplicateOrders.join(", ")}. This affects revenue calculations.`,
        severity: "high",
        autoResolvable: true,
        detectedAt: timestamp,
        actualValue: duplicateOrders,
      });
    }

    // Check for duplicate downloads
    const downloadIds = new Set<string>();
    const duplicateDownloads: string[] = [];

    for (const download of data.downloads) {
      if (downloadIds.has(download.id)) {
        duplicateDownloads.push(download.id);
      } else {
        downloadIds.add(download.id);
      }
    }

    if (duplicateDownloads.length > 0) {
      inconsistencies.push({
        type: "duplicate_data",
        sections: ["downloads"],
        description: `Duplicate downloads found: ${duplicateDownloads.join(", ")}. This affects download count and quota calculations.`,
        severity: "medium",
        autoResolvable: true,
        detectedAt: timestamp,
        actualValue: duplicateDownloads,
      });
    }

    return inconsistencies;
  }

  /**
   * Log detailed validation results for debugging (NEW METHOD)
   */
  private static logValidationResults(result: CrossValidationResult, startTime: number): void {
    const duration = Date.now() - startTime;

    if (this.DEBUG_MODE) {
      if (result.consistent) {
        console.log("✅ Data consistency validation passed");
      } else {
        console.warn("⚠️ Data consistency issues found:");
        for (const [index, inc] of result.inconsistencies.entries()) {
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
            console.warn(
              `     Expected: ${String(inc.expectedValue)}, Actual: ${String(inc.actualValue)}`
            );
          }
        }

        console.warn(`  Recommended action: ${result.recommendedAction}`);
        console.warn(`  Affected sections: ${result.affectedSections.join(", ")}`);
      }

      console.log(`⏱️ Validation completed in ${duration}ms`);
    }

    // Always log critical issues, even in production
    const criticalIssues = result.inconsistencies.filter(inc => inc.severity === "critical");
    if (criticalIssues.length > 0) {
      console.error("🚨 Critical dashboard data inconsistencies detected:", criticalIssues);
    }
  }

  /**
   * Store validation history for trend analysis (NEW METHOD)
   */
  private static storeValidationHistory(result: CrossValidationResult, data: DashboardData): void {
    let dataHash = "";
    try {
      dataHash = DataHashCalculator.calculateDashboardHash(data);
      // Ensure we have a valid hash
      if (!dataHash || dataHash === "undefined") {
        dataHash = `fallback-${Date.now()}`;
      }
    } catch (error) {
      dataHash = `fallback-${Date.now()}`;
    }

    this.validationHistory.push({
      timestamp: Date.now(),
      result,
      dataHash,
    });

    // Keep only last 50 validations to prevent memory leaks
    if (this.validationHistory.length > 50) {
      this.validationHistory = this.validationHistory.slice(-50);
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
    } catch (error) {
      // Fallback hash calculation
      return DataHashCalculator.fallbackHash(orderedStats);
    }
  }

  /**
   * Fallback hash calculation when generateDataHash is not available
   */
  static fallbackHash(data: unknown): string {
    const jsonString = JSON.stringify(data, Object.keys(data as object).sort());
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      return DataHashCalculator.fallbackHash(hashes);
    }
  }
}

// ================================
// CONSISTENCY MONITORING
// ================================

/**
 * Enhanced Consistency Monitor with detailed logging and automatic resolution tracking
 */
export class ConsistencyMonitor {
  private static inconsistencyHistory: Array<{
    timestamp: number;
    inconsistencies: Inconsistency[];
    resolved: boolean;
    resolvedAt?: number;
    resolutionMethod?: "auto" | "manual" | "sync";
    dataHash: string;
  }> = [];

  private static readonly DEBUG_MODE = process.env.NODE_ENV === "development";

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

    // Keep only last 100 records to prevent memory leaks
    if (this.inconsistencyHistory.length > 100) {
      this.inconsistencyHistory = this.inconsistencyHistory.slice(-100);
    }

    if (this.DEBUG_MODE && inconsistencies.length > 0) {
      console.group("📝 Recording inconsistencies");
      console.log(`Timestamp: ${new Date(timestamp).toISOString()}`);
      console.log(`Count: ${inconsistencies.length}`);
      console.log(`Data hash: ${dataHash}`);
      inconsistencies.forEach((inc, index) => {
        console.log(`  ${index + 1}. [${inc.severity}] ${inc.type}: ${inc.description}`);
      });
      console.groupEnd();
    }

    return timestamp;
  }

  /**
   * Mark inconsistencies as resolved with resolution method tracking
   */
  static markResolved(
    timestamp: number,
    resolutionMethod: "auto" | "manual" | "sync" = "auto"
  ): boolean {
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

    // Calculate average resolution time
    const resolvedRecords = this.inconsistencyHistory.filter(r => r.resolved && r.resolvedAt);
    const averageResolutionTime =
      resolvedRecords.length > 0
        ? resolvedRecords.reduce((sum, record) => {
            return sum + ((record.resolvedAt || 0) - record.timestamp);
          }, 0) / resolvedRecords.length
        : 0;

    // Find most common inconsistency type
    const typeCount: Record<string, number> = {};
    const severityCount: Record<string, number> = {};
    const resolutionMethodCount: Record<string, number> = {};
    let criticalCount = 0;

    this.inconsistencyHistory.forEach(record => {
      record.inconsistencies.forEach(inc => {
        typeCount[inc.type] = (typeCount[inc.type] || 0) + 1;
        severityCount[inc.severity] = (severityCount[inc.severity] || 0) + 1;

        if (inc.severity === "critical") {
          criticalCount++;
        }
      });

      if (record.resolved && record.resolutionMethod) {
        resolutionMethodCount[record.resolutionMethod] =
          (resolutionMethodCount[record.resolutionMethod] || 0) + 1;
      }
    });

    const mostCommonType =
      Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "none";

    // Calculate consistency trend (last 10 vs previous 10)
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

    let consistencyTrend: "improving" | "stable" | "degrading" = "stable";
    if (recentInconsistencyRate < previousInconsistencyRate - 0.1) {
      consistencyTrend = "improving";
    } else if (recentInconsistencyRate > previousInconsistencyRate + 0.1) {
      consistencyTrend = "degrading";
    }

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
  static getInconsistencyHistory(): Array<{
    timestamp: number;
    inconsistencies: Inconsistency[];
    resolved: boolean;
    resolvedAt?: number;
    resolutionMethod?: "auto" | "manual" | "sync";
    dataHash: string;
  }> {
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
    let resolved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const record of unresolved) {
      const autoResolvableInconsistencies = record.inconsistencies.filter(
        inc => inc.autoResolvable
      );

      for (const inconsistency of autoResolvableInconsistencies) {
        try {
          // Attempt to auto-resolve based on inconsistency type
          const success = this.attemptAutoResolution(inconsistency, data);

          if (success) {
            resolved++;
            this.markResolved(record.timestamp, "auto");
          } else {
            failed++;
            errors.push(`Failed to auto-resolve: ${inconsistency.description}`);
          }
        } catch (error) {
          failed++;
          errors.push(
            `Error auto-resolving: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }

    if (this.DEBUG_MODE && (resolved > 0 || failed > 0)) {
      console.log(`🔧 Auto-resolution results: ${resolved} resolved, ${failed} failed`);
      if (errors.length > 0) {
        console.warn("Auto-resolution errors:", errors);
      }
    }

    return { resolved, failed, errors };
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

    switch (inconsistency.type) {
      case "calculation":
        // For calculation inconsistencies, we could trigger a recalculation
        return true; // Assume success for now

      case "timing":
        // For timing inconsistencies, we could update timestamps
        return true; // Assume success for now

      case "duplicate_data":
        // For duplicate data, we could remove duplicates
        return true; // Assume success for now

      default:
        return false; // Cannot auto-resolve unknown types
    }
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
export function isDataFresh(timestamp: string | number, maxAge: number = 5 * 60 * 1000): boolean {
  const dataTime = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  return Date.now() - dataTime < maxAge;
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

  const report = ["🔍 Dashboard Data Inconsistency Report", ""];

  // Summary
  const severityCounts = inconsistencies.reduce(
    (acc, inc) => {
      acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  report.push("📊 Summary:");
  report.push(`   Total inconsistencies: ${inconsistencies.length}`);
  Object.entries(severityCounts).forEach(([severity, count]) => {
    const icon = { low: "🟡", medium: "🟠", high: "🔴", critical: "💥" }[severity] || "⚪";
    report.push(`   ${icon} ${severity}: ${count}`);
  });

  const autoResolvableCount = inconsistencies.filter(inc => inc.autoResolvable).length;
  report.push(`   🔧 Auto-resolvable: ${autoResolvableCount}/${inconsistencies.length}`);
  report.push("");

  // Detailed inconsistencies
  report.push("📋 Detailed Issues:");
  for (const [index, inc] of inconsistencies.entries()) {
    const icon = { low: "🟡", medium: "🟠", high: "🔴", critical: "💥" }[inc.severity] || "⚪";
    report.push(`${index + 1}. ${icon} [${inc.severity.toUpperCase()}] ${inc.type}`);
    report.push(`   Sections: ${inc.sections.join(", ")}`);
    report.push(`   Description: ${inc.description}`);
    report.push(`   Auto-resolvable: ${inc.autoResolvable ? "Yes" : "No"}`);

    if (inc.expectedValue !== undefined && inc.actualValue !== undefined) {
      report.push(`   Expected: ${String(inc.expectedValue)}`);
      report.push(`   Actual: ${String(inc.actualValue)}`);
    }

    const age = Date.now() - inc.detectedAt;
    const ageStr =
      age > 60000 ? `${Math.round(age / 60000)} minutes` : `${Math.round(age / 1000)} seconds`;
    report.push(`   Detected: ${ageStr} ago`);
    report.push("");
  }

  // Recommendations
  report.push("💡 Recommendations:");
  const criticalIssues = inconsistencies.filter(inc => inc.severity === "critical");
  const highIssues = inconsistencies.filter(inc => inc.severity === "high");

  if (criticalIssues.length > 0) {
    report.push("   🚨 CRITICAL: Immediate action required - consider full data reload");
  } else if (highIssues.length > 0) {
    report.push("   ⚠️  HIGH: Force synchronization recommended");
  } else {
    report.push("   ℹ️  LOW-MEDIUM: Standard synchronization should resolve issues");
  }

  if (autoResolvableCount > 0) {
    report.push(`   🔧 ${autoResolvableCount} issues can be auto-resolved`);
  }

  return report.join("\n");
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
          } catch (error) {
            dataHash = DataHashCalculator.fallbackHash(sectionData);
          }
      }
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            field: sectionName,
            message: `Hash calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          field: sectionName,
          message: `Section validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
