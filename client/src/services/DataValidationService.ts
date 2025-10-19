/**
 * Data Validation Service
 *
 * Comprehensive data validation system that ensures all displayed data comes from
 * actual database records, validates data integrity across dashboard sections,
 * and provides real-time validation to prevent display of stale or mock data.
 */

import { getErrorLoggingService } from "@/services/ErrorLoggingService";
import type { DashboardData } from "@shared/types/dashboard";
import type {
  ConsistentUserStats,
  CrossValidationResult,
  Inconsistency,
  ValidationResult,
} from "@shared/types/sync";
import { generateDataHash, validateDashboardData } from "@shared/validation/sync";
import { SyncErrorType } from ".";
import { UserStats } from "../hooks/useDashboardDataOptimized";

// ================================
// VALIDATION INTERFACES
// ================================

/**
 * Data source validation result
 */
export interface DataSourceValidation {
  /** Whether data comes from actual database records */
  isRealData: boolean;
  /** Whether any mock/placeholder data was detected */
  hasMockData: boolean;
  /** Whether data is fresh (not stale/cached) */
  isFresh: boolean;
  /** Data age in milliseconds */
  dataAge: number;
  /** Source of the data */
  source: "database" | "cache" | "mock" | "placeholder" | "unknown";
  /** Validation timestamp */
  validatedAt: number;
  /** Mock data indicators found */
  mockIndicators: MockDataIndicator[];
  /** Freshness warnings */
  freshnessWarnings: FreshnessWarning[];
}

/**
 * Mock data indicator
 */
export interface MockDataIndicator {
  /** Field containing mock data */
  field: string;
  /** Type of mock data detected */
  type: "placeholder_text" | "generic_value" | "test_data" | "hardcoded_value" | "lorem_ipsum";
  /** Mock value detected */
  value: unknown;
  /** Confidence level (0-1) */
  confidence: number;
  /** Description of why this is considered mock data */
  reason: string;
}

/**
 * Data freshness warning
 */
export interface FreshnessWarning {
  /** Field with freshness issue */
  field: string;
  /** Type of freshness issue */
  type: "stale_data" | "cached_data" | "outdated_timestamp" | "missing_timestamp";
  /** Age of the data in milliseconds */
  age: number;
  /** Maximum acceptable age for this field */
  maxAge: number;
  /** Severity of the freshness issue */
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Integrity check configuration
 */
export interface IntegrityCheckConfig {
  /** Maximum acceptable data age in milliseconds */
  maxDataAge: number;
  /** Whether to check for mock data indicators */
  checkMockData: boolean;
  /** Whether to validate cross-section consistency */
  checkCrossSection: boolean;
  /** Whether to validate data source authenticity */
  checkDataSource: boolean;
  /** Freshness thresholds for different data types */
  freshnessThresholds: {
    stats: number;
    favorites: number;
    orders: number;
    downloads: number;
    reservations: number;
    activity: number;
  };
  /** Mock data detection patterns */
  mockDataPatterns: {
    placeholderTexts: string[];
    genericValues: (string | number)[];
    testPatterns: RegExp[];
  };
}

/**
 * Data integrity report
 */
export interface DataIntegrityReport {
  /** Overall integrity status */
  status: "valid" | "warning" | "error" | "critical";
  /** Data source validation results */
  sourceValidation: DataSourceValidation;
  /** Cross-section validation results */
  crossValidation: CrossValidationResult;
  /** Data validation results */
  dataValidation: ValidationResult;
  /** Inconsistencies found */
  inconsistencies: Inconsistency[];
  /** Recommendations for fixing issues */
  recommendations: IntegrityRecommendation[];
  /** Report generation timestamp */
  generatedAt: number;
  /** Report ID for tracking */
  reportId: string;
}

/**
 * Integrity recommendation
 */
export interface IntegrityRecommendation {
  /** Recommendation type */
  type: "refresh_data" | "clear_cache" | "force_sync" | "reload_page" | "contact_support";
  /** Priority level */
  priority: "low" | "medium" | "high" | "critical";
  /** Recommendation description */
  description: string;
  /** Automatic action available */
  autoAction?: () => Promise<void>;
  /** Manual steps required */
  manualSteps?: string[];
}

// ================================
// DATA VALIDATION SERVICE
// ================================

export class DataValidationService {
  private config: IntegrityCheckConfig;
  private logger = getErrorLoggingService();
  private validationCache = new Map<string, DataIntegrityReport>();
  private isDestroyed = false;

  constructor(config: Partial<IntegrityCheckConfig> = {}) {
    this.config = {
      maxDataAge: 5 * 60 * 1000, // 5 minutes
      checkMockData: true,
      checkCrossSection: true,
      checkDataSource: true,
      freshnessThresholds: {
        stats: 2 * 60 * 1000, // 2 minutes
        favorites: 5 * 60 * 1000, // 5 minutes
        orders: 1 * 60 * 1000, // 1 minute
        downloads: 3 * 60 * 1000, // 3 minutes
        reservations: 2 * 60 * 1000, // 2 minutes
        activity: 30 * 1000, // 30 seconds
      },
      mockDataPatterns: {
        placeholderTexts: [
          "Lorem ipsum",
          "placeholder",
          "example",
          "test",
          "mock",
          "fake",
          "dummy",
          "sample",
          "demo",
          "TODO",
          "TBD",
          "N/A",
          "undefined",
          "null",
        ],
        genericValues: [
          "user@example.com",
          "test@test.com",
          "john.doe@example.com",
          "Jane Doe",
          "John Smith",
          "Test User",
          "Sample Beat",
          "Example Order",
          123456,
          999999,
          0,
          -1,
        ],
        testPatterns: [
          /test.*\d+/i,
          /mock.*data/i,
          /placeholder.*\d+/i,
          /example.*\d+/i,
          /lorem.*ipsum/i,
          /fake.*\w+/i,
          /dummy.*\w+/i,
          /sample.*\w+/i,
        ],
      },
      ...config,
    };
  }

  // ================================
  // PUBLIC VALIDATION METHODS
  // ================================

  /**
   * Perform comprehensive data integrity check
   */
  public async validateDataIntegrity(
    data: DashboardData,
    options: {
      includeSourceValidation?: boolean;
      includeCrossValidation?: boolean;
      includeDataValidation?: boolean;
      cacheResults?: boolean;
    } = {}
  ): Promise<DataIntegrityReport> {
    const {
      includeSourceValidation = true,
      includeCrossValidation = true,
      includeDataValidation = true,
      cacheResults = true,
    } = options;

    const reportId = this.generateReportId();
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(data);
      if (cacheResults && this.validationCache.has(cacheKey)) {
        const cachedReport = this.validationCache.get(cacheKey)!;
        // Return cached result if it's less than 30 seconds old
        if (Date.now() - cachedReport.generatedAt < 30000) {
          return cachedReport;
        }
      }

      // Perform validations
      const sourceValidation = includeSourceValidation
        ? await this.validateDataSource(data)
        : this.createEmptySourceValidation();

      const crossValidation = includeCrossValidation
        ? this.validateCrossSection(data)
        : this.createEmptyCrossValidation();

      const dataValidation = includeDataValidation
        ? validateDashboardData(data)
        : this.createEmptyDataValidation();

      // Detect inconsistencies
      const inconsistencies = this.detectAllInconsistencies(
        data,
        sourceValidation,
        crossValidation,
        dataValidation
      );

      // Determine overall status
      const status = this.determineOverallStatus(
        sourceValidation,
        crossValidation,
        dataValidation,
        inconsistencies
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        status,
        sourceValidation,
        crossValidation,
        inconsistencies
      );

      const report: DataIntegrityReport = {
        status,
        sourceValidation,
        crossValidation,
        dataValidation,
        inconsistencies,
        recommendations,
        generatedAt: startTime,
        reportId,
      };

      // Cache the result
      if (cacheResults) {
        this.validationCache.set(cacheKey, report);
        // Clean up old cache entries
        this.cleanupValidationCache();
      }

      // Log the validation
      this.logger.logSystemEvent(
        `Data integrity validation completed: ${status}`,
        status === "valid" ? "info" : status === "warning" ? "warn" : "error",
        {
          component: "DataValidationService",
        }
      );

      return report;
    } catch (error) {
      this.logger.logError(
        {
          type: SyncErrorType.VALIDATION_ERROR,
          message: `Data integrity validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now(),
          context: { reportId, error },
          retryable: true,
          retryCount: 0,
          maxRetries: 3,
          severity: "high" as const,
          category: "data" as const,
          recoveryStrategy: "immediate_retry" as const,
          userMessage: "Data validation failed. Please refresh the page.",
          userActions: [],
          technicalDetails: {
            stackTrace: error instanceof Error ? error.stack : undefined,
            environment: {
              userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
              url: typeof window !== "undefined" ? window.location.href : "unknown",
              timestamp: Date.now(),
              onlineStatus: typeof navigator !== "undefined" ? navigator.onLine : true,
              viewport: {
                width: typeof window !== "undefined" ? window.innerWidth : 0,
                height: typeof window !== "undefined" ? window.innerHeight : 0,
              },
              screen: {
                width: typeof window !== "undefined" ? window.screen.width : 0,
                height: typeof window !== "undefined" ? window.screen.height : 0,
              },
            },
            additionalContext: {
              component: "DataValidationService",
              action: "validateDataIntegrity",
              reportId,
            },
          },
          fingerprint: `validation-failed-${reportId}`,
        },
        { component: "DataValidationService", action: "validateDataIntegrity" }
      );

      throw error;
    }
  }

  /**
   * Validate data source authenticity
   */
  public async validateDataSource(data: DashboardData): Promise<DataSourceValidation> {
    const startTime = Date.now();
    const mockIndicators: MockDataIndicator[] = [];
    const freshnessWarnings: FreshnessWarning[] = [];

    // Check for mock data indicators
    if (this.config.checkMockData) {
      mockIndicators.push(...this.detectMockData(data));
    }

    // Check data freshness
    freshnessWarnings.push(...this.checkDataFreshness(data));

    // Determine data source
    const source = this.determineDataSource(data, mockIndicators);

    // Check if data is real (not mock/placeholder)
    const isRealData = mockIndicators.length === 0 && source !== "mock" && source !== "placeholder";

    // Check if data is fresh
    const criticalFreshnessIssues = freshnessWarnings.filter(w => w.severity === "critical");
    const isFresh = criticalFreshnessIssues.length === 0;

    // Calculate data age (use oldest timestamp found)
    const dataAge = this.calculateDataAge(data);

    return {
      isRealData,
      hasMockData: mockIndicators.length > 0,
      isFresh,
      dataAge,
      source,
      validatedAt: startTime,
      mockIndicators,
      freshnessWarnings,
    };
  }

  /**
   * Validate cross-section data consistency
   */
  public validateCrossSection(data: DashboardData): CrossValidationResult {
    const inconsistencies: Inconsistency[] = [];
    const now = Date.now();

    // Validate stats consistency with actual data arrays
    const statsInconsistencies = this.validateStatsConsistency(data.stats, data);
    inconsistencies.push(...statsInconsistencies);

    // Validate data relationships
    const relationshipInconsistencies = this.validateDataRelationships(data);
    inconsistencies.push(...relationshipInconsistencies);

    // Validate timestamp consistency
    const timestampInconsistencies = this.validateTimestampConsistency(data);
    inconsistencies.push(...timestampInconsistencies);

    const affectedSections = Array.from(new Set(inconsistencies.flatMap(inc => inc.sections)));

    const recommendedAction = this.getRecommendedAction(inconsistencies);

    return {
      consistent: inconsistencies.length === 0,
      inconsistencies,
      affectedSections,
      recommendedAction,
    };
  }

  /**
   * Check if data needs refresh based on age and inconsistencies
   */
  public shouldRefreshData(report: DataIntegrityReport): boolean {
    // Refresh if data is not real
    if (!report.sourceValidation.isRealData) {
      return true;
    }

    // Refresh if data is not fresh
    if (!report.sourceValidation.isFresh) {
      return true;
    }

    // Refresh if there are critical inconsistencies
    const criticalInconsistencies = report.inconsistencies.filter(
      inc => inc.severity === "critical"
    );
    if (criticalInconsistencies.length > 0) {
      return true;
    }

    // Refresh if data is too old
    if (report.sourceValidation.dataAge > this.config.maxDataAge) {
      return true;
    }

    return false;
  }

  /**
   * Get data freshness indicator for UI display
   */
  public getDataFreshnessIndicator(report: DataIntegrityReport): {
    status: "fresh" | "stale" | "outdated" | "unknown";
    color: "green" | "yellow" | "red" | "gray";
    message: string;
    lastUpdated: string;
  } {
    const { sourceValidation } = report;
    const ageMinutes = Math.floor(sourceValidation.dataAge / (1000 * 60));

    if (!sourceValidation.isRealData) {
      return {
        status: "unknown",
        color: "gray",
        message: "Mock or placeholder data detected",
        lastUpdated: "Unknown",
      };
    }

    if (sourceValidation.isFresh && ageMinutes < 2) {
      return {
        status: "fresh",
        color: "green",
        message: "Data is up to date",
        lastUpdated:
          ageMinutes === 0 ? "Just now" : `${ageMinutes} minute${ageMinutes > 1 ? "s" : ""} ago`,
      };
    }

    if (ageMinutes < 10) {
      return {
        status: "stale",
        color: "yellow",
        message: "Data may be slightly outdated",
        lastUpdated: `${ageMinutes} minute${ageMinutes > 1 ? "s" : ""} ago`,
      };
    }

    return {
      status: "outdated",
      color: "red",
      message: "Data is outdated and should be refreshed",
      lastUpdated:
        ageMinutes > 60
          ? `${Math.floor(ageMinutes / 60)} hour${Math.floor(ageMinutes / 60) > 1 ? "s" : ""} ago`
          : `${ageMinutes} minute${ageMinutes > 1 ? "s" : ""} ago`,
    };
  }

  // ================================
  // PRIVATE VALIDATION METHODS
  // ================================

  private detectMockData(data: DashboardData): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    // Check user data for mock indicators
    indicators.push(...this.checkUserMockData(data.user));

    // Check stats for unrealistic values
    indicators.push(...this.checkStatsMockData(data.stats));

    // Check arrays for mock data patterns
    indicators.push(...this.checkArrayMockData("favorites", data.favorites));
    indicators.push(...this.checkArrayMockData("orders", data.orders));
    indicators.push(...this.checkArrayMockData("downloads", data.downloads));
    indicators.push(...this.checkArrayMockData("reservations", data.reservations));
    indicators.push(...this.checkArrayMockData("activity", data.activity));

    return indicators;
  }

  private checkUserMockData(user: DashboardData["user"]): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    // Check email for test patterns
    if (this.isGenericValue(user.email)) {
      indicators.push({
        field: "user.email",
        type: "generic_value",
        value: user.email,
        confidence: 0.9,
        reason: "Email matches common test email pattern",
      });
    }

    // Check name for placeholder text
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    if (this.isPlaceholderText(fullName)) {
      indicators.push({
        field: "user.name",
        type: "placeholder_text",
        value: fullName,
        confidence: 0.8,
        reason: "Name appears to be placeholder text",
      });
    }

    return indicators;
  }

  private checkStatsMockData(stats: UserStats | ConsistentUserStats): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    // Check for unrealistic round numbers that might indicate mock data
    const suspiciousValues = [
      { field: "totalFavorites", value: stats.totalFavorites },
      { field: "totalDownloads", value: stats.totalDownloads },
      { field: "totalOrders", value: stats.totalOrders },
      { field: "totalSpent", value: stats.totalSpent },
    ];

    for (const { field, value } of suspiciousValues) {
      if (this.isSuspiciousNumber(value)) {
        indicators.push({
          field: `stats.${field}`,
          type: "generic_value",
          value,
          confidence: 0.6,
          reason: "Value appears to be a round number that might indicate mock data",
        });
      }
    }

    return indicators;
  }

  private checkArrayMockData(arrayName: string, array: unknown[]): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    // Check for empty arrays (might indicate no real data)
    if (array.length === 0) {
      indicators.push({
        field: arrayName,
        type: "test_data",
        value: "empty_array",
        confidence: 0.3,
        reason: "Empty array might indicate no real data available",
      });
      return indicators;
    }

    // Check individual items for mock patterns
    array.forEach((item, index) => {
      if (typeof item === "object" && item !== null) {
        const itemIndicators = this.checkObjectMockData(item as Record<string, unknown>);
        itemIndicators.forEach(indicator => {
          indicators.push({
            ...indicator,
            field: `${arrayName}[${index}].${indicator.field}`,
          });
        });
      }
    });

    return indicators;
  }

  private checkObjectMockData(obj: Record<string, unknown>): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        if (this.isPlaceholderText(value)) {
          indicators.push({
            field: key,
            type: "placeholder_text",
            value,
            confidence: 0.8,
            reason: "Text matches placeholder pattern",
          });
        } else if (this.isGenericValue(value)) {
          indicators.push({
            field: key,
            type: "generic_value",
            value,
            confidence: 0.7,
            reason: "Value matches common test data pattern",
          });
        }
      } else if (typeof value === "number" && this.isSuspiciousNumber(value)) {
        indicators.push({
          field: key,
          type: "generic_value",
          value,
          confidence: 0.5,
          reason: "Number appears to be a common test value",
        });
      }
    }

    return indicators;
  }

  private isPlaceholderText(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
      this.config.mockDataPatterns.placeholderTexts.some(pattern =>
        lowerText.includes(pattern.toLowerCase())
      ) || this.config.mockDataPatterns.testPatterns.some(pattern => pattern.test(text))
    );
  }

  private isGenericValue(value: string | number): boolean {
    return this.config.mockDataPatterns.genericValues.includes(value);
  }

  private isSuspiciousNumber(value: number): boolean {
    // Check for common test numbers
    if (this.config.mockDataPatterns.genericValues.includes(value)) {
      return true;
    }

    // Check for suspiciously round numbers
    if (value > 0 && value % 100 === 0 && value <= 10000) {
      return true;
    }

    return false;
  }

  private checkDataFreshness(data: DashboardData): FreshnessWarning[] {
    const warnings: FreshnessWarning[] = [];
    const now = Date.now();

    // Check stats freshness
    const consistentStats = data.stats as ConsistentUserStats;
    if (consistentStats.calculatedAt) {
      const statsAge = now - new Date(consistentStats.calculatedAt).getTime();
      if (statsAge > this.config.freshnessThresholds.stats) {
        warnings.push({
          field: "stats",
          type: "stale_data",
          age: statsAge,
          maxAge: this.config.freshnessThresholds.stats,
          severity: statsAge > this.config.freshnessThresholds.stats * 2 ? "high" : "medium",
        });
      }
    }

    // Check activity freshness
    if (data.activity.length > 0) {
      const latestActivity = data.activity[0];
      if (latestActivity.timestamp) {
        const activityAge = now - new Date(latestActivity.timestamp).getTime();
        if (activityAge > this.config.freshnessThresholds.activity) {
          warnings.push({
            field: "activity",
            type: "stale_data",
            age: activityAge,
            maxAge: this.config.freshnessThresholds.activity,
            severity:
              activityAge > this.config.freshnessThresholds.activity * 3 ? "critical" : "medium",
          });
        }
      }
    }

    return warnings;
  }

  private determineDataSource(
    data: DashboardData,
    mockIndicators: MockDataIndicator[]
  ): "database" | "cache" | "mock" | "placeholder" | "unknown" {
    // If we have high-confidence mock indicators, it's likely mock data
    const highConfidenceMock = mockIndicators.filter(indicator => indicator.confidence > 0.8);
    if (highConfidenceMock.length > 0) {
      return "mock";
    }

    // Check if data has database-like characteristics
    const consistentStats = data.stats as ConsistentUserStats;
    if (consistentStats.source) {
      return consistentStats.source === "database" ? "database" : "cache";
    }

    // If we have some mock indicators but not high confidence, might be placeholder
    if (mockIndicators.length > 0) {
      return "placeholder";
    }

    // Default to unknown if we can't determine
    return "unknown";
  }

  private calculateDataAge(data: DashboardData): number {
    const now = Date.now();
    const timestamps: number[] = [];

    // Collect all available timestamps
    const consistentStats = data.stats as ConsistentUserStats;
    if (consistentStats.calculatedAt) {
      timestamps.push(new Date(consistentStats.calculatedAt).getTime());
    }

    // Add activity timestamps
    data.activity.forEach(activity => {
      if (activity.timestamp) {
        timestamps.push(new Date(activity.timestamp).getTime());
      }
    });

    // Add order timestamps
    data.orders.forEach(order => {
      if (order.updatedAt) {
        timestamps.push(new Date(order.updatedAt).getTime());
      }
    });

    // Return age of oldest data, or 0 if no timestamps found
    if (timestamps.length === 0) {
      return 0;
    }

    const oldestTimestamp = Math.min(...timestamps);
    return now - oldestTimestamp;
  }

  private validateStatsConsistency(
    stats: UserStats | ConsistentUserStats,
    data: DashboardData
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];
    const now = Date.now();

    // Check favorites count consistency
    if (data.favorites.length > stats.totalFavorites) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "favorites"],
        description: `Favorites count mismatch: stats shows ${stats.totalFavorites}, but favorites array has ${data.favorites.length} items`,
        severity: "medium",
        autoResolvable: true,
        detectedAt: now,
        expectedValue: data.favorites.length,
        actualValue: stats.totalFavorites,
      });
    }

    // Check downloads count consistency
    if (data.downloads.length > stats.totalDownloads) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "downloads"],
        description: `Downloads count mismatch: stats shows ${stats.totalDownloads}, but downloads array has ${data.downloads.length} items`,
        severity: "medium",
        autoResolvable: true,
        detectedAt: now,
        expectedValue: data.downloads.length,
        actualValue: stats.totalDownloads,
      });
    }

    // Check orders count consistency
    if (data.orders.length > stats.totalOrders) {
      inconsistencies.push({
        type: "calculation",
        sections: ["stats", "orders"],
        description: `Orders count mismatch: stats shows ${stats.totalOrders}, but orders array has ${data.orders.length} items`,
        severity: "medium",
        autoResolvable: true,
        detectedAt: now,
        expectedValue: data.orders.length,
        actualValue: stats.totalOrders,
      });
    }

    return inconsistencies;
  }

  private validateDataRelationships(data: DashboardData): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];
    const now = Date.now();

    // Validate that activity references existing items
    data.activity.forEach((activity, index) => {
      if (activity.beatId && activity.type.includes("favorite")) {
        const favoriteExists = data.favorites.some(
          fav => fav.beatId.toString() === activity.beatId
        );
        if (!favoriteExists && activity.type === "favorite_added") {
          inconsistencies.push({
            type: "missing_data",
            sections: ["activity", "favorites"],
            description: `Activity references beat ${activity.beatId} as favorited, but beat not found in favorites`,
            severity: "low",
            autoResolvable: false,
            detectedAt: now,
            expectedValue: `Beat ${activity.beatId} in favorites`,
            actualValue: "Beat not found in favorites",
          });
        }
      }
    });

    return inconsistencies;
  }

  private validateTimestampConsistency(data: DashboardData): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];
    const now = Date.now();

    // Check for future timestamps
    const checkFutureTimestamp = (timestamp: string, field: string) => {
      const time = new Date(timestamp).getTime();
      if (time > now + 60000) {
        // Allow 1 minute clock skew
        inconsistencies.push({
          type: "timing",
          sections: [field],
          description: `Timestamp is in the future: ${timestamp}`,
          severity: "medium",
          autoResolvable: false,
          detectedAt: now,
          expectedValue: "Timestamp in the past",
          actualValue: timestamp,
        });
      }
    };

    // Check activity timestamps
    data.activity.forEach((activity, index) => {
      if (activity.timestamp) {
        checkFutureTimestamp(activity.timestamp, `activity[${index}]`);
      }
    });

    // Check order timestamps
    data.orders.forEach((order, index) => {
      if (order.createdAt) {
        checkFutureTimestamp(order.createdAt, `orders[${index}]`);
      }
      if (order.updatedAt) {
        checkFutureTimestamp(order.updatedAt, `orders[${index}]`);
      }
    });

    return inconsistencies;
  }

  private detectAllInconsistencies(
    data: DashboardData,
    sourceValidation: DataSourceValidation,
    crossValidation: CrossValidationResult,
    dataValidation: ValidationResult
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    // Add cross-validation inconsistencies
    inconsistencies.push(...crossValidation.inconsistencies);

    // Add mock data as inconsistencies if in production
    if (process.env.NODE_ENV === "production" && sourceValidation.hasMockData) {
      sourceValidation.mockIndicators.forEach(indicator => {
        inconsistencies.push({
          type: "missing_data",
          sections: [indicator.field.split(".")[0]],
          description: `Mock data detected in production: ${indicator.reason}`,
          severity: "critical",
          autoResolvable: false,
          detectedAt: Date.now(),
          expectedValue: "Real data from database",
          actualValue: indicator.value,
        });
      });
    }

    // Add validation errors as inconsistencies
    dataValidation.errors.forEach(error => {
      inconsistencies.push({
        type: "missing_data",
        sections: [error.field.split(".")[0]],
        description: `Data validation error: ${error.message}`,
        severity: "high",
        autoResolvable: false,
        detectedAt: Date.now(),
        expectedValue: error.expected,
        actualValue: error.actual,
      });
    });

    return inconsistencies;
  }

  private determineOverallStatus(
    sourceValidation: DataSourceValidation,
    crossValidation: CrossValidationResult,
    dataValidation: ValidationResult,
    inconsistencies: Inconsistency[]
  ): "valid" | "warning" | "error" | "critical" {
    // Critical if mock data in production or critical inconsistencies
    const criticalInconsistencies = inconsistencies.filter(inc => inc.severity === "critical");
    if (criticalInconsistencies.length > 0) {
      return "critical";
    }

    // Error if data validation failed or high severity inconsistencies
    if (!dataValidation.valid) {
      return "error";
    }

    const highInconsistencies = inconsistencies.filter(inc => inc.severity === "high");
    if (highInconsistencies.length > 0) {
      return "error";
    }

    // Warning if data is not fresh or has medium inconsistencies
    if (!sourceValidation.isFresh || !crossValidation.consistent) {
      return "warning";
    }

    const mediumInconsistencies = inconsistencies.filter(inc => inc.severity === "medium");
    if (mediumInconsistencies.length > 0) {
      return "warning";
    }

    return "valid";
  }

  private generateRecommendations(
    status: "valid" | "warning" | "error" | "critical",
    sourceValidation: DataSourceValidation,
    crossValidation: CrossValidationResult,
    inconsistencies: Inconsistency[]
  ): IntegrityRecommendation[] {
    const recommendations: IntegrityRecommendation[] = [];

    if (status === "critical") {
      recommendations.push({
        type: "contact_support",
        priority: "critical",
        description: "Critical data integrity issues detected. Contact support immediately.",
        manualSteps: [
          "Take a screenshot of the current dashboard state",
          "Note the time when the issue was detected",
          "Contact technical support with the error details",
        ],
      });
    }

    if (!sourceValidation.isRealData) {
      recommendations.push({
        type: "refresh_data",
        priority: "high",
        description: "Mock or placeholder data detected. Refresh to load real data.",
        autoAction: async () => {
          // This would trigger a data refresh
          window.location.reload();
        },
      });
    }

    if (!sourceValidation.isFresh) {
      recommendations.push({
        type: "force_sync",
        priority: "medium",
        description: "Data appears to be stale. Force synchronization to get latest data.",
      });
    }

    if (!crossValidation.consistent) {
      recommendations.push({
        type: "clear_cache",
        priority: "medium",
        description: "Data inconsistencies detected between sections. Clear cache and refresh.",
      });
    }

    return recommendations;
  }

  private getRecommendedAction(inconsistencies: Inconsistency[]): "sync" | "reload" | "ignore" {
    const criticalCount = inconsistencies.filter(inc => inc.severity === "critical").length;
    const highCount = inconsistencies.filter(inc => inc.severity === "high").length;

    if (criticalCount > 0) {
      return "reload";
    }

    if (highCount > 0 || inconsistencies.length > 3) {
      return "sync";
    }

    return "ignore";
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private createEmptySourceValidation(): DataSourceValidation {
    return {
      isRealData: true,
      hasMockData: false,
      isFresh: true,
      dataAge: 0,
      source: "unknown",
      validatedAt: Date.now(),
      mockIndicators: [],
      freshnessWarnings: [],
    };
  }

  private createEmptyCrossValidation(): CrossValidationResult {
    return {
      consistent: true,
      inconsistencies: [],
      affectedSections: [],
      recommendedAction: "ignore",
    };
  }

  private createEmptyDataValidation(): ValidationResult {
    return {
      valid: true,
      errors: [],
      warnings: [],
      dataHash: "",
      validatedAt: Date.now(),
    };
  }

  private generateReportId(): string {
    return `integrity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateCacheKey(data: DashboardData): string {
    return generateDataHash(data);
  }

  private cleanupValidationCache(): void {
    const cutoffTime = Date.now() - 5 * 60 * 1000; // 5 minutes
    for (const [key, report] of this.validationCache.entries()) {
      if (report.generatedAt < cutoffTime) {
        this.validationCache.delete(key);
      }
    }
  }

  /**
   * Destroy the validation service
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.validationCache.clear();
  }
}

// Singleton instance
let dataValidationServiceInstance: DataValidationService | null = null;

export const getDataValidationService = (
  config?: Partial<IntegrityCheckConfig>
): DataValidationService => {
  if (!dataValidationServiceInstance) {
    dataValidationServiceInstance = new DataValidationService(config);
  }
  return dataValidationServiceInstance;
};

export const destroyDataValidationService = (): void => {
  if (dataValidationServiceInstance) {
    dataValidationServiceInstance.destroy();
    dataValidationServiceInstance = null;
  }
};
