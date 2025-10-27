/**
 * Data Validation Service
 *
 * Comprehensive data validation system that ensures all displayed data comes from
 * actual database records, validates data integrity across dashboard sections,
 * and provides real-time validation to prevent display of stale or mock data.
 */

import { getErrorLoggingService } from "@/services/ErrorLoggingService";
import type { DashboardData, UserStats } from "@shared/types/dashboard";
import type {
  ConsistentUserStats,
  CrossValidationResult,
  Inconsistency,
  ValidationResult,
} from "@shared/types/sync";
import { generateDataHash, validateDashboardData } from "@shared/validation/sync";
import { SyncErrorType } from ".";
import {
  getCurrentEnvironment,
  getValidationConfig,
  type EnvironmentValidationConfig,
  type ValidationBehaviorConfig,
} from "./config/ValidationConfig";

// ================================
// TYPE ALIASES
// ================================

/** Data source type */
export type DataSource = "database" | "cache" | "mock" | "placeholder" | "unknown";

/** Final data source type */
export type FinalDataSource = "database" | "cache" | "mock" | "placeholder" | "unknown";

/** Severity level */
export type SeverityLevel = "low" | "medium" | "high" | "critical";

/** Environment type */
export type Environment = "development" | "staging" | "production";

/** Integrity status */
export type IntegrityStatus = "valid" | "warning" | "error" | "critical";

/** Source type for validation */
export type SourceType = "database" | "cache" | "unknown";

/** Validation decision type */
export type ValidationDecision = "real_data" | "mock_data" | "uncertain";

// ================================
// VALIDATION INTERFACES
// ================================

/**
 * Source validation configuration
 */
export interface SourceValidationConfig {
  /** Whether to trust authenticated database sources */
  trustDatabaseSource: boolean;
  /** Whether to validate Convex document IDs */
  validateConvexIds: boolean;
  /** Whether to check timestamp authenticity */
  validateTimestamps: boolean;
  /** Minimum confidence required to flag as mock */
  minConfidenceThreshold: number;
  /** Whether to use strict pattern matching */
  useStrictPatterns: boolean;
}

/**
 * Source validation result
 */
export interface SourceValidationResult {
  /** Data source type */
  source: SourceType;
  /** Whether source is authenticated */
  isAuthenticated: boolean;
  /** Source confidence score (0-1) */
  confidence: number;
  /** Validation details */
  details: {
    hasValidIds: boolean;
    hasValidTimestamps: boolean;
    idValidations: ConvexIdValidation[];
    timestampCount: number;
  };
}

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
  source: DataSource;
  /** Validation timestamp */
  validatedAt: number;
  /** Mock data indicators found */
  mockIndicators: MockDataIndicator[];
  /** Freshness warnings */
  freshnessWarnings: FreshnessWarning[];
  /** ID validation results */
  idValidations?: {
    /** Whether valid Convex IDs were found */
    hasValidIds: boolean;
    /** Number of valid IDs found */
    validIdCount: number;
    /** Overall ID confidence score */
    confidence: number;
    /** Individual ID validation results */
    results: ConvexIdValidation[];
  };
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
  severity: SeverityLevel;
}

/**
 * Convex ID validation result
 */
export interface ConvexIdValidation {
  /** Whether ID matches Convex format */
  isValidFormat: boolean;
  /** ID pattern type */
  pattern: "convex" | "unknown";
  /** Confidence that this is a real Convex ID (0-1) */
  confidence: number;
  /** Reason for validation result */
  reason?: string;
}

/**
 * Timestamp validation result
 */
export interface TimestampValidation {
  /** Whether timestamp is valid */
  isValid: boolean;
  /** Whether timestamp is fresh (recent) */
  isFresh: boolean;
  /** Age of timestamp in milliseconds */
  age: number;
  /** Confidence in timestamp authenticity (0-1) */
  confidence: number;
  /** Reason for validation result */
  reason: string;
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
  /** Excluded common legitimate values (NOT mock data) */
  excludedCommonValues: {
    names: string[];
    numbers: number[];
    emails: string[];
  };
}

/**
 * Data integrity report
 */
export interface DataIntegrityReport {
  /** Overall integrity status */
  status: IntegrityStatus;
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
  /** Detailed validation report (development mode only) */
  detailedReport?: DetailedValidationReport;
}

/**
 * Detailed validation report for debugging and development
 */
export interface DetailedValidationReport {
  /** Confidence breakdown with component scores */
  confidenceBreakdown: ConfidenceBreakdown;
  /** Detailed mock indicator analysis */
  mockIndicatorAnalysis: MockIndicatorAnalysis;
  /** Validation reasoning and decision process */
  validationReasoning: ValidationReasoning;
  /** Performance metrics */
  performanceMetrics: ValidationPerformanceMetrics;
  /** Environment context */
  environmentContext: ValidationEnvironmentContext;
}

/**
 * Mock indicator analysis with detailed field information
 */
export interface MockIndicatorAnalysis {
  /** Total indicators found */
  totalIndicators: number;
  /** Indicators grouped by type */
  byType: Record<string, MockDataIndicator[]>;
  /** Indicators grouped by field */
  byField: Record<string, MockDataIndicator[]>;
  /** High confidence indicators (>= 0.8) */
  highConfidenceIndicators: MockDataIndicator[];
  /** Medium confidence indicators (0.5-0.8) */
  mediumConfidenceIndicators: MockDataIndicator[];
  /** Low confidence indicators (< 0.5) */
  lowConfidenceIndicators: MockDataIndicator[];
  /** Average confidence score */
  averageConfidence: number;
  /** Fields affected by mock data */
  affectedFields: string[];
  /** Summary of findings */
  summary: string;
}

/**
 * Validation reasoning explaining the decision process
 */
export interface ValidationReasoning {
  /** Final decision (real data vs mock data) */
  decision: ValidationDecision;
  /** Overall confidence in decision (0-1) */
  confidence: number;
  /** Key factors that influenced the decision */
  keyFactors: ValidationFactor[];
  /** Decision rationale in plain language */
  rationale: string;
  /** Validation steps performed */
  stepsPerformed: ValidationStep[];
  /** Why certain checks were skipped */
  skippedChecks: SkippedCheck[];
}

/**
 * Validation factor that influenced the decision
 */
export interface ValidationFactor {
  /** Factor name */
  name: string;
  /** Factor type */
  type: "positive" | "negative" | "neutral";
  /** Impact on confidence (-1 to 1) */
  impact: number;
  /** Weight in final decision (0-1) */
  weight: number;
  /** Description of the factor */
  description: string;
  /** Evidence supporting this factor */
  evidence?: string;
}

/**
 * Validation step performed during analysis
 */
export interface ValidationStep {
  /** Step name */
  name: string;
  /** Step order */
  order: number;
  /** Step result */
  result: "passed" | "failed" | "skipped" | "warning";
  /** Duration in milliseconds */
  duration: number;
  /** Details about the step */
  details: string;
  /** Data collected during step */
  data?: Record<string, unknown>;
}

/**
 * Skipped validation check
 */
export interface SkippedCheck {
  /** Check name */
  name: string;
  /** Reason for skipping */
  reason: string;
  /** Whether this was intentional */
  intentional: boolean;
}

/**
 * Validation performance metrics
 */
export interface ValidationPerformanceMetrics {
  /** Total validation duration (ms) */
  totalDuration: number;
  /** Source validation duration (ms) */
  sourceValidationDuration: number;
  /** Content validation duration (ms) */
  contentValidationDuration: number;
  /** Confidence calculation duration (ms) */
  confidenceCalculationDuration: number;
  /** Number of IDs validated */
  idsValidated: number;
  /** Number of timestamps validated */
  timestampsValidated: number;
  /** Number of fields checked */
  fieldsChecked: number;
  /** Cache hit */
  cacheHit: boolean;
}

/**
 * Validation environment context
 */
export interface ValidationEnvironmentContext {
  /** Environment type */
  environment: Environment;
  /** Validation configuration used */
  config: {
    trustAuthenticatedSources: boolean;
    failSilently: boolean;
    enableDetailedLogging: boolean;
    showMockDataBanners: boolean;
    mockDataThreshold: number;
  };
  /** User context */
  userContext: {
    userId: string;
    hasData: boolean;
    dataAge: number;
  };
  /** Timestamp of validation */
  validatedAt: number;
}

/**
 * Integrity recommendation
 */
export interface IntegrityRecommendation {
  /** Recommendation type */
  type: "refresh_data" | "clear_cache" | "force_sync" | "reload_page" | "contact_support";
  /** Priority level */
  priority: SeverityLevel;
  /** Recommendation description */
  description: string;
  /** Automatic action available */
  autoAction?: () => Promise<void>;
  /** Manual steps required */
  manualSteps?: string[];
}

// ================================
// SOURCE VALIDATOR
// ================================

/**
 * Source Validator Class
 * Implements priority-based validation with source authentication checks
 */
export class SourceValidator {
  private readonly config: SourceValidationConfig;
  private readonly logger = getErrorLoggingService();

  constructor(config: Partial<SourceValidationConfig> = {}) {
    this.config = {
      trustDatabaseSource: true,
      validateConvexIds: true,
      validateTimestamps: true,
      minConfidenceThreshold: 0.95,
      useStrictPatterns: true,
      ...config,
    };
  }

  /**
   * Validate data source authenticity with priority-based approach
   * Priority: Database Source > ID Validation > Timestamp Validation > Content
   */
  public async validateSource(data: DashboardData): Promise<SourceValidationResult> {
    // Priority 1: Check if data comes from Convex database
    if (this.isConvexData(data) && this.config.trustDatabaseSource) {
      return this.createConvexDatabaseResult(data);
    }

    // Priority 2-4: Validate IDs, timestamps, and calculate final result
    return this.validateSourceWithFallbacks(data);
  }

  private validateSourceWithFallbacks(data: DashboardData): SourceValidationResult {
    const idValidations = this.config.validateConvexIds ? this.validateAllIds(data) : [];

    const idResult = this.checkIdConfidence(data, idValidations);
    if (idResult) {
      return idResult;
    }

    const timestampResult = this.checkTimestampConfidence(data, idValidations);
    if (timestampResult) {
      return timestampResult;
    }

    return this.calculateFinalSourceResult(data, idValidations);
  }

  private createConvexDatabaseResult(data: DashboardData): SourceValidationResult {
    const idValidations = this.config.validateConvexIds ? this.validateAllIds(data) : [];
    const timestampValidation = this.config.validateTimestamps
      ? this.validateAllTimestamps(data)
      : null;

    return {
      source: "database",
      isAuthenticated: true,
      confidence: 0.98,
      details: {
        hasValidIds: idValidations.some(v => v.isValidFormat),
        hasValidTimestamps: timestampValidation
          ? timestampValidation.validTimestamps > 0
          : this.hasValidTimestamps(data),
        idValidations,
        timestampCount: timestampValidation
          ? timestampValidation.totalTimestamps
          : this.countTimestamps(data),
      },
    };
  }

  private checkIdConfidence(
    data: DashboardData,
    idValidations: ConvexIdValidation[]
  ): SourceValidationResult | null {
    const validIdCount = idValidations.filter(v => v.isValidFormat).length;
    const totalIds = idValidations.length;
    const idConfidence = totalIds > 0 ? validIdCount / totalIds : 0;

    if (idConfidence <= 0.7 || validIdCount === 0) {
      return null;
    }

    const timestampValidation = this.config.validateTimestamps
      ? this.validateAllTimestamps(data)
      : null;

    return {
      source: "database",
      isAuthenticated: true,
      confidence: idConfidence,
      details: {
        hasValidIds: true,
        hasValidTimestamps: timestampValidation
          ? timestampValidation.validTimestamps > 0
          : this.hasValidTimestamps(data),
        idValidations,
        timestampCount: timestampValidation
          ? timestampValidation.totalTimestamps
          : this.countTimestamps(data),
      },
    };
  }

  private checkTimestampConfidence(
    data: DashboardData,
    idValidations: ConvexIdValidation[]
  ): SourceValidationResult | null {
    const timestampValidation = this.config.validateTimestamps
      ? this.validateAllTimestamps(data)
      : null;

    const hasValidTimestamps = timestampValidation
      ? timestampValidation.validTimestamps > 0
      : this.hasValidTimestamps(data);

    const timestampCount = timestampValidation
      ? timestampValidation.totalTimestamps
      : this.countTimestamps(data);

    const TIMESTAMP_BASE_CONFIDENCE = 0.7;
    let timestampConfidence = 0;
    if (timestampValidation) {
      timestampConfidence = timestampValidation.overallConfidence;
    } else if (hasValidTimestamps) {
      timestampConfidence = TIMESTAMP_BASE_CONFIDENCE;
    }

    const meetsThreshold =
      timestampConfidence > 0.8 && timestampValidation && timestampValidation.validTimestamps > 3;

    if (!meetsThreshold) {
      return null;
    }

    const validIdCount = idValidations.filter(v => v.isValidFormat).length;

    return {
      source: "database",
      isAuthenticated: true,
      confidence: timestampConfidence,
      details: {
        hasValidIds: validIdCount > 0,
        hasValidTimestamps: true,
        idValidations,
        timestampCount,
      },
    };
  }

  private calculateFinalSourceResult(
    data: DashboardData,
    idValidations: ConvexIdValidation[]
  ): SourceValidationResult {
    const validIdCount = idValidations.filter(v => v.isValidFormat).length;
    const totalIds = idValidations.length;
    const idConfidence = totalIds > 0 ? validIdCount / totalIds : 0;

    const timestampValidation = this.config.validateTimestamps
      ? this.validateAllTimestamps(data)
      : null;

    const hasValidTimestamps = timestampValidation
      ? timestampValidation.validTimestamps > 0
      : this.hasValidTimestamps(data);

    const timestampCount = timestampValidation
      ? timestampValidation.totalTimestamps
      : this.countTimestamps(data);

    const TIMESTAMP_BASE_CONFIDENCE = 0.7;
    let timestampConfidence = 0;
    if (timestampValidation) {
      timestampConfidence = timestampValidation.overallConfidence;
    } else if (hasValidTimestamps) {
      timestampConfidence = TIMESTAMP_BASE_CONFIDENCE;
    }

    const sourceConfidence = this.calculateSourceConfidence(
      idConfidence,
      hasValidTimestamps,
      timestampCount,
      totalIds,
      timestampConfidence
    );

    const { source, isAuthenticated } = this.determineSourceType(sourceConfidence);

    return {
      source,
      isAuthenticated,
      confidence: sourceConfidence,
      details: {
        hasValidIds: validIdCount > 0,
        hasValidTimestamps,
        idValidations,
        timestampCount,
      },
    };
  }

  private determineSourceType(confidence: number): {
    source: SourceType;
    isAuthenticated: boolean;
  } {
    const HIGH_CONFIDENCE_THRESHOLD = 0.8;
    const MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

    if (confidence > HIGH_CONFIDENCE_THRESHOLD) {
      return { source: "database", isAuthenticated: true };
    }
    if (confidence > MEDIUM_CONFIDENCE_THRESHOLD) {
      return { source: "cache", isAuthenticated: false };
    }
    return { source: "unknown", isAuthenticated: false };
  }

  /**
   * Check if data comes from Convex database
   * Looks for Convex-specific patterns and metadata
   */
  public isConvexData(data: DashboardData): boolean {
    // Check for Convex-specific indicators

    // 1. Check if user has a valid Convex ID
    if (data.user.id && this.isValidConvexIdFormat(data.user.id)) {
      return true;
    }

    // 2. Check if any data items have Convex IDs
    const hasConvexIds =
      data.favorites.some(f => f.id && this.isValidConvexIdFormat(f.id)) ||
      data.orders.some(o => o.id && this.isValidConvexIdFormat(o.id)) ||
      data.downloads.some(d => d.id && this.isValidConvexIdFormat(d.id)) ||
      data.reservations.some(r => r.id && this.isValidConvexIdFormat(r.id)) ||
      data.activity.some(a => a.id && this.isValidConvexIdFormat(a.id));

    if (hasConvexIds) {
      return true;
    }

    // 3. Check for database source in stats
    const stats = data.stats as ConsistentUserStats;
    if (stats.source === "database") {
      return true;
    }

    return false;
  }

  /**
   * Validate Convex document ID format
   */
  public validateConvexId(id: string): ConvexIdValidation {
    if (!id || typeof id !== "string") {
      return {
        isValidFormat: false,
        pattern: "unknown",
        confidence: 0,
        reason: "ID is empty or not a string",
      };
    }

    // Convex IDs are typically 16-32 character alphanumeric strings
    const convexIdPattern = /^[a-z0-9]{16,32}$/;
    const isValidFormat = convexIdPattern.test(id);

    if (isValidFormat) {
      return {
        isValidFormat: true,
        pattern: "convex",
        confidence: 0.95,
        reason: "ID matches Convex document ID format",
      };
    }

    // Check if it looks like a Convex ID but with slight variations
    const relaxedPattern = /^[a-z0-9_-]{16,40}$/i;
    if (relaxedPattern.test(id)) {
      return {
        isValidFormat: false,
        pattern: "unknown",
        confidence: 0.3,
        reason: "ID has similar structure but doesn't match exact Convex format",
      };
    }

    return {
      isValidFormat: false,
      pattern: "unknown",
      confidence: 0,
      reason: "ID does not match Convex document ID format",
    };
  }

  /**
   * Calculate source confidence score
   * Enhanced to include timestamp confidence as a weighted factor
   */
  public calculateSourceConfidence(
    idConfidence: number,
    hasValidTimestamps: boolean,
    timestampCount: number,
    totalIds: number,
    timestampConfidence = 0
  ): number {
    const weights = {
      ids: 0.5,
      timestamps: 0.35,
      volume: 0.15,
    };

    const idScore = idConfidence * weights.ids;
    const timestampScore = this.calculateTimestampScore(
      hasValidTimestamps,
      timestampConfidence,
      weights.timestamps
    );
    const volumeScore = this.calculateVolumeScore(totalIds, timestampCount, weights.volume);

    return Math.min(idScore + timestampScore + volumeScore, 1);
  }

  private calculateTimestampScore(
    hasValidTimestamps: boolean,
    timestampConfidence: number,
    weight: number
  ): number {
    const TIMESTAMP_FALLBACK_CONFIDENCE = 0.7;
    if (timestampConfidence > 0) {
      return timestampConfidence * weight;
    }
    if (hasValidTimestamps) {
      return TIMESTAMP_FALLBACK_CONFIDENCE * weight;
    }
    return 0;
  }

  private calculateVolumeScore(totalIds: number, timestampCount: number, weight: number): number {
    const totalDataPoints = totalIds + timestampCount;
    return Math.min(totalDataPoints / 15, 1) * weight;
  }

  /**
   * Validate all IDs in dashboard data
   */
  private validateAllIds(data: DashboardData): ConvexIdValidation[] {
    const validations: ConvexIdValidation[] = [];

    this.validateUserId(data, validations);
    this.validateCollectionIds(data.favorites, validations);
    this.validateCollectionIds(data.orders, validations);
    this.validateCollectionIds(data.downloads, validations);
    this.validateCollectionIds(data.reservations, validations);
    this.validateCollectionIds(data.activity, validations);

    return validations;
  }

  private validateUserId(data: DashboardData, validations: ConvexIdValidation[]): void {
    if (data.user.id) {
      validations.push(this.validateConvexId(data.user.id));
    }
  }

  private validateCollectionIds(
    collection: Array<{ id?: string }>,
    validations: ConvexIdValidation[]
  ): void {
    for (const item of collection) {
      if (item.id) {
        validations.push(this.validateConvexId(item.id));
      }
    }
  }

  /**
   * Check if ID matches Convex format (quick check)
   */
  private isValidConvexIdFormat(id: string): boolean {
    if (!id || typeof id !== "string") {
      return false;
    }
    const convexIdPattern = /^[a-z0-9]{16,32}$/;
    return convexIdPattern.test(id);
  }

  /**
   * Validate a single timestamp for Convex authenticity
   * Checks if timestamp is valid, not in the future, and reasonably recent
   */
  public validateTimestamp(
    timestamp: number | string | undefined,
    _context?: string
  ): TimestampValidation {
    if (!timestamp) {
      return this.createInvalidTimestampResult("Timestamp is missing or undefined");
    }

    const timestampMs = this.convertToMilliseconds(timestamp);
    if (Number.isNaN(timestampMs) || timestampMs <= 0) {
      return this.createInvalidTimestampResult("Timestamp is not a valid number");
    }

    const now = Date.now();
    const futureCheck = this.checkFutureTimestamp(timestampMs, now);
    if (!futureCheck.isValid) {
      return futureCheck;
    }

    const age = now - timestampMs;
    const ageCheck = this.checkTimestampAge(timestampMs, age);
    if (!ageCheck.isValid) {
      return ageCheck;
    }

    return this.createValidTimestampResult(age);
  }

  private createInvalidTimestampResult(reason: string): TimestampValidation {
    return {
      isValid: false,
      isFresh: false,
      age: 0,
      confidence: 0,
      reason,
    };
  }

  private convertToMilliseconds(timestamp: number | string): number {
    return typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  }

  private checkFutureTimestamp(timestampMs: number, now: number): TimestampValidation {
    const maxFutureSkew = 60000; // 1 minute
    if (timestampMs > now + maxFutureSkew) {
      const futureSeconds = Math.round((timestampMs - now) / 1000);
      return {
        isValid: false,
        isFresh: false,
        age: timestampMs - now,
        confidence: 0,
        reason: `Timestamp is in the future by ${futureSeconds}s`,
      };
    }
    return { isValid: true, isFresh: false, age: 0, confidence: 0, reason: "" };
  }

  private checkTimestampAge(timestampMs: number, age: number): TimestampValidation {
    const maxReasonableAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    const YEAR_2000_TIMESTAMP = 946684800000;

    if (age > maxReasonableAge) {
      const days = Math.round(age / (24 * 60 * 60 * 1000));
      return {
        isValid: false,
        isFresh: false,
        age,
        confidence: 0.2,
        reason: `Timestamp is unreasonably old (${days} days)`,
      };
    }

    if (timestampMs >= YEAR_2000_TIMESTAMP) {
      return { isValid: true, isFresh: false, age, confidence: 0, reason: "" };
    }

    return {
      isValid: false,
      isFresh: false,
      age,
      confidence: 0,
      reason: "Timestamp is before year 2000, likely invalid",
    };
  }

  private createValidTimestampResult(age: number): TimestampValidation {
    const freshThreshold = 5 * 60 * 1000; // 5 minutes
    const isFresh = age < freshThreshold;
    const confidence = this.calculateTimestampConfidenceByAge(age);
    const reason = isFresh
      ? "Timestamp is valid and fresh"
      : `Timestamp is valid but ${Math.round(age / 60000)} minutes old`;

    return {
      isValid: true,
      isFresh,
      age,
      confidence,
      reason,
    };
  }

  private calculateTimestampConfidenceByAge(age: number): number {
    const DAY = 24 * 60 * 60 * 1000;
    const THIRTY_DAYS = 30 * DAY;
    const SEVEN_DAYS = 7 * DAY;

    if (age > THIRTY_DAYS) {
      return 0.7;
    }
    if (age > SEVEN_DAYS) {
      return 0.8;
    }
    if (age > DAY) {
      return 0.85;
    }
    return 0.9;
  }

  /**
   * Check if data has valid timestamps
   * Enhanced to use the new validateTimestamp function
   */
  private hasValidTimestamps(data: DashboardData): boolean {
    return (
      this.hasValidStatsTimestamp(data) ||
      this.hasValidActivityTimestamps(data) ||
      this.hasValidOrderTimestamps(data) ||
      this.hasValidDownloadTimestamps(data) ||
      this.hasValidReservationTimestamps(data)
    );
  }

  private hasValidStatsTimestamp(data: DashboardData): boolean {
    const stats = data.stats as ConsistentUserStats;
    if (stats.calculatedAt) {
      const validation = this.validateTimestamp(stats.calculatedAt, "stats.calculatedAt");
      return validation.isValid;
    }
    return false;
  }

  private hasValidActivityTimestamps(data: DashboardData): boolean {
    return data.activity.some(activity => {
      if (activity.timestamp) {
        const validation = this.validateTimestamp(activity.timestamp, "activity.timestamp");
        return validation.isValid;
      }
      return false;
    });
  }

  private hasValidOrderTimestamps(data: DashboardData): boolean {
    return data.orders.some(order => {
      const createdValid =
        order.createdAt && this.validateTimestamp(order.createdAt, "order.createdAt").isValid;
      const updatedValid =
        order.updatedAt && this.validateTimestamp(order.updatedAt, "order.updatedAt").isValid;
      return createdValid || updatedValid;
    });
  }

  private hasValidDownloadTimestamps(data: DashboardData): boolean {
    return data.downloads.some(download => {
      if (download.downloadedAt) {
        const validation = this.validateTimestamp(download.downloadedAt, "download.downloadedAt");
        return validation.isValid;
      }
      return false;
    });
  }

  private hasValidReservationTimestamps(data: DashboardData): boolean {
    return data.reservations.some(reservation => {
      if (reservation.createdAt) {
        const validation = this.validateTimestamp(reservation.createdAt, "reservation.createdAt");
        return validation.isValid;
      }
      return false;
    });
  }

  /**
   * Count total timestamps in data
   * Enhanced to count all timestamp fields
   */
  public countTimestamps(data: DashboardData): number {
    const stats = data.stats as ConsistentUserStats;
    const statsCount = stats.calculatedAt ? 1 : 0;
    const activityCount = data.activity.filter(a => a.timestamp).length;
    const orderCount = this.countOrderTimestamps(data.orders);
    const downloadCount = data.downloads.filter(d => d.downloadedAt).length;
    const reservationCount = this.countReservationTimestamps(data.reservations);
    const favoriteCount = data.favorites.filter(f => f.createdAt).length;

    return (
      statsCount + activityCount + orderCount + downloadCount + reservationCount + favoriteCount
    );
  }

  private countOrderTimestamps(orders: DashboardData["orders"]): number {
    return orders.reduce((count, order) => {
      return count + (order.createdAt ? 1 : 0) + (order.updatedAt ? 1 : 0);
    }, 0);
  }

  private countReservationTimestamps(reservations: DashboardData["reservations"]): number {
    return reservations.reduce((count, reservation) => {
      return count + (reservation.createdAt ? 1 : 0) + (reservation.updatedAt ? 1 : 0);
    }, 0);
  }

  /**
   * Validate timestamp authenticity across all data
   * Returns detailed validation results for all timestamps
   */
  public validateAllTimestamps(data: DashboardData): {
    totalTimestamps: number;
    validTimestamps: number;
    freshTimestamps: number;
    invalidTimestamps: number;
    averageAge: number;
    overallConfidence: number;
    details: Array<{
      field: string;
      timestamp: number | string;
      validation: TimestampValidation;
    }>;
  } {
    const details = this.collectAllTimestampValidations(data);
    const summary = this.calculateTimestampSummary(details);

    return {
      ...summary,
      details,
    };
  }

  private collectAllTimestampValidations(
    data: DashboardData
  ): Array<{ field: string; timestamp: number | string; validation: TimestampValidation }> {
    const details: Array<{
      field: string;
      timestamp: number | string;
      validation: TimestampValidation;
    }> = [];

    this.addStatsTimestampValidation(data, details);
    this.addActivityTimestampValidations(data, details);
    this.addOrderTimestampValidations(data, details);
    this.addDownloadTimestampValidations(data, details);
    this.addReservationTimestampValidations(data, details);
    this.addFavoriteTimestampValidations(data, details);

    return details;
  }

  private addStatsTimestampValidation(
    data: DashboardData,
    details: Array<{ field: string; timestamp: number | string; validation: TimestampValidation }>
  ): void {
    const stats = data.stats as ConsistentUserStats;
    if (stats.calculatedAt) {
      details.push({
        field: "stats.calculatedAt",
        timestamp: stats.calculatedAt,
        validation: this.validateTimestamp(stats.calculatedAt, "stats.calculatedAt"),
      });
    }
  }

  private addActivityTimestampValidations(
    data: DashboardData,
    details: Array<{ field: string; timestamp: number | string; validation: TimestampValidation }>
  ): void {
    for (const [index, activity] of data.activity.entries()) {
      if (activity.timestamp) {
        details.push({
          field: `activity[${index}].timestamp`,
          timestamp: activity.timestamp,
          validation: this.validateTimestamp(activity.timestamp, `activity[${index}].timestamp`),
        });
      }
    }
  }

  private addOrderTimestampValidations(
    data: DashboardData,
    details: Array<{ field: string; timestamp: number | string; validation: TimestampValidation }>
  ): void {
    for (const [index, order] of data.orders.entries()) {
      if (order.createdAt) {
        details.push({
          field: `orders[${index}].createdAt`,
          timestamp: order.createdAt,
          validation: this.validateTimestamp(order.createdAt, `orders[${index}].createdAt`),
        });
      }
      if (order.updatedAt) {
        details.push({
          field: `orders[${index}].updatedAt`,
          timestamp: order.updatedAt,
          validation: this.validateTimestamp(order.updatedAt, `orders[${index}].updatedAt`),
        });
      }
    }
  }

  private addDownloadTimestampValidations(
    data: DashboardData,
    details: Array<{ field: string; timestamp: number | string; validation: TimestampValidation }>
  ): void {
    for (const [index, download] of data.downloads.entries()) {
      if (download.downloadedAt) {
        details.push({
          field: `downloads[${index}].downloadedAt`,
          timestamp: download.downloadedAt,
          validation: this.validateTimestamp(
            download.downloadedAt,
            `downloads[${index}].downloadedAt`
          ),
        });
      }
    }
  }

  private addReservationTimestampValidations(
    data: DashboardData,
    details: Array<{ field: string; timestamp: number | string; validation: TimestampValidation }>
  ): void {
    for (const [index, reservation] of data.reservations.entries()) {
      if (reservation.createdAt) {
        details.push({
          field: `reservations[${index}].createdAt`,
          timestamp: reservation.createdAt,
          validation: this.validateTimestamp(
            reservation.createdAt,
            `reservations[${index}].createdAt`
          ),
        });
      }
      if (reservation.updatedAt) {
        details.push({
          field: `reservations[${index}].updatedAt`,
          timestamp: reservation.updatedAt,
          validation: this.validateTimestamp(
            reservation.updatedAt,
            `reservations[${index}].updatedAt`
          ),
        });
      }
    }
  }

  private addFavoriteTimestampValidations(
    data: DashboardData,
    details: Array<{ field: string; timestamp: number | string; validation: TimestampValidation }>
  ): void {
    for (const [index, favorite] of data.favorites.entries()) {
      if (favorite.createdAt) {
        details.push({
          field: `favorites[${index}].createdAt`,
          timestamp: favorite.createdAt,
          validation: this.validateTimestamp(favorite.createdAt, `favorites[${index}].createdAt`),
        });
      }
    }
  }

  private calculateTimestampSummary(
    details: Array<{ field: string; timestamp: number | string; validation: TimestampValidation }>
  ): {
    totalTimestamps: number;
    validTimestamps: number;
    freshTimestamps: number;
    invalidTimestamps: number;
    averageAge: number;
    overallConfidence: number;
  } {
    const totalTimestamps = details.length;
    const validTimestamps = details.filter(d => d.validation.isValid).length;
    const freshTimestamps = details.filter(d => d.validation.isFresh).length;
    const invalidTimestamps = totalTimestamps - validTimestamps;

    const validAges = details.filter(d => d.validation.isValid).map(d => d.validation.age);
    const averageAge =
      validAges.length > 0 ? validAges.reduce((a, b) => a + b, 0) / validAges.length : 0;

    const confidences = details.map(d => d.validation.confidence);
    const overallConfidence =
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

    return {
      totalTimestamps,
      validTimestamps,
      freshTimestamps,
      invalidTimestamps,
      averageAge,
      overallConfidence,
    };
  }
}

// ================================
// CONFIDENCE CALCULATOR
// ================================

/**
 * Confidence weights for different validation components
 */
export interface ConfidenceWeights {
  /** Weight for source validation (highest priority) */
  sourceWeight: number;
  /** Weight for ID validation */
  idWeight: number;
  /** Weight for timestamp validation */
  timestampWeight: number;
  /** Weight for content validation (lowest priority) */
  contentWeight: number;
}

/**
 * Confidence score with breakdown
 */
export interface ConfidenceScore {
  /** Overall confidence (0-1) */
  overall: number;
  /** Source confidence component */
  source: number;
  /** Content confidence component */
  content: number;
  /** Combined weighted score */
  weighted: number;
  /** Whether data should be flagged as mock */
  shouldFlag: boolean;
}

/**
 * Detailed confidence breakdown for debugging
 */
export interface ConfidenceBreakdown {
  /** Individual component scores */
  components: {
    source: { score: number; weight: number; contribution: number };
    ids: { score: number; weight: number; contribution: number };
    timestamps: { score: number; weight: number; contribution: number };
    content: { score: number; weight: number; contribution: number };
  };
  /** Factors that increased confidence */
  positiveFactors: string[];
  /** Factors that decreased confidence */
  negativeFactors: string[];
  /** Final decision reasoning */
  reasoning: string;
}

/**
 * Content validation result
 */
export interface ContentValidationResult {
  /** Mock indicators found */
  indicators: MockDataIndicator[];
  /** Overall content confidence (0-1) */
  confidence: number;
  /** Whether content appears real */
  appearsReal: boolean;
}

/**
 * Environment-specific confidence thresholds
 */
export interface ConfidenceThresholds {
  /** Minimum confidence to consider data real */
  realDataThreshold: number;
  /** Maximum confidence to flag as mock (>= this value = mock) */
  mockDataThreshold: number;
  /** Threshold for uncertain data */
  uncertaintyThreshold: number;
}

/**
 * Confidence Calculator Class
 * Implements weighted scoring with source-priority confidence calculation
 */
export class ConfidenceCalculator {
  private weights: ConfidenceWeights;
  private thresholds: ConfidenceThresholds;
  private readonly environment: Environment;
  private readonly logger = getErrorLoggingService();

  constructor(
    environment: Environment = "production",
    customWeights?: Partial<ConfidenceWeights>,
    customThresholds?: Partial<ConfidenceThresholds>
  ) {
    this.environment = environment;

    // Default weights: Source validation is highest priority
    this.weights = {
      sourceWeight: 0.5, // 50% - Source is most important
      idWeight: 0.25, // 25% - IDs are strong indicators
      timestampWeight: 0.15, // 15% - Timestamps provide authenticity
      contentWeight: 0.1, // 10% - Content is lowest priority
      ...customWeights,
    };

    // Environment-specific thresholds
    this.thresholds = this.getEnvironmentThresholds(environment, customThresholds);
  }

  /**
   * Get environment-specific confidence thresholds
   */
  private getEnvironmentThresholds(
    environment: Environment,
    customThresholds?: Partial<ConfidenceThresholds>
  ): ConfidenceThresholds {
    const baseThresholds: Record<string, ConfidenceThresholds> = {
      development: {
        realDataThreshold: 0.5, // More lenient in development
        mockDataThreshold: 0.85, // Lower threshold to catch more issues
        uncertaintyThreshold: 0.7,
      },
      staging: {
        realDataThreshold: 0.6,
        mockDataThreshold: 0.9,
        uncertaintyThreshold: 0.75,
      },
      production: {
        realDataThreshold: 0.7, // Stricter in production
        mockDataThreshold: 0.95, // Very high threshold to avoid false positives
        uncertaintyThreshold: 0.8,
      },
    };

    return {
      ...baseThresholds[environment],
      ...customThresholds,
    };
  }

  /**
   * Calculate overall confidence that data is real
   * Uses weighted scoring with source-priority approach
   */
  public calculateOverallConfidence(
    sourceResult: SourceValidationResult,
    contentResult: ContentValidationResult
  ): ConfidenceScore {
    // Calculate individual component scores
    const sourceScore = sourceResult.confidence;
    const idScore = this.calculateIdConfidence(sourceResult.details.idValidations);
    const timestampScore = this.calculateTimestampConfidence(
      sourceResult.details.hasValidTimestamps,
      sourceResult.details.timestampCount
    );
    const contentScore = contentResult.confidence;

    // Calculate weighted contributions
    const sourceContribution = sourceScore * this.weights.sourceWeight;
    const idContribution = idScore * this.weights.idWeight;
    const timestampContribution = timestampScore * this.weights.timestampWeight;
    const contentContribution = contentScore * this.weights.contentWeight;

    // Combined weighted score
    const weighted =
      sourceContribution + idContribution + timestampContribution + contentContribution;

    // Overall confidence (capped at 1)
    const overall = Math.min(weighted, 1);

    // Determine if data should be flagged as mock
    // In production, require very high confidence to flag (>= 0.95)
    // This prevents false positives
    const shouldFlag = overall < this.thresholds.mockDataThreshold;

    return {
      overall,
      source: sourceScore,
      content: contentScore,
      weighted,
      shouldFlag,
    };
  }

  /**
   * Determine if data should be flagged as mock
   * Uses environment-specific thresholds
   */
  public shouldFlagAsMock(confidence: ConfidenceScore): boolean {
    // In production, be very conservative
    if (this.environment === "production") {
      // Only flag if confidence is very low AND we have strong negative indicators
      return confidence.overall < this.thresholds.mockDataThreshold && confidence.content < 0.3;
    }

    // In development/staging, use the threshold directly
    return confidence.overall < this.thresholds.mockDataThreshold;
  }

  /**
   * Get confidence breakdown for debugging
   * Provides detailed information about how confidence was calculated
   */
  public getConfidenceBreakdown(
    sourceResult: SourceValidationResult,
    contentResult: ContentValidationResult,
    confidence: ConfidenceScore
  ): ConfidenceBreakdown {
    const idScore = this.calculateIdConfidence(sourceResult.details.idValidations);
    const timestampScore = this.calculateTimestampConfidence(
      sourceResult.details.hasValidTimestamps,
      sourceResult.details.timestampCount
    );

    const components = this.buildConfidenceComponents(
      sourceResult,
      contentResult,
      idScore,
      timestampScore
    );
    const positiveFactors = this.identifyPositiveFactors(sourceResult, contentResult);
    const negativeFactors = this.identifyNegativeFactors(sourceResult, contentResult);
    const reasoning = this.generateConfidenceReasoning(
      confidence,
      sourceResult,
      positiveFactors,
      negativeFactors
    );

    return {
      components,
      positiveFactors,
      negativeFactors,
      reasoning,
    };
  }

  private buildConfidenceComponents(
    sourceResult: SourceValidationResult,
    contentResult: ContentValidationResult,
    idScore: number,
    timestampScore: number
  ): ConfidenceBreakdown["components"] {
    return {
      source: {
        score: sourceResult.confidence,
        weight: this.weights.sourceWeight,
        contribution: sourceResult.confidence * this.weights.sourceWeight,
      },
      ids: {
        score: idScore,
        weight: this.weights.idWeight,
        contribution: idScore * this.weights.idWeight,
      },
      timestamps: {
        score: timestampScore,
        weight: this.weights.timestampWeight,
        contribution: timestampScore * this.weights.timestampWeight,
      },
      content: {
        score: contentResult.confidence,
        weight: this.weights.contentWeight,
        contribution: contentResult.confidence * this.weights.contentWeight,
      },
    };
  }

  private identifyPositiveFactors(
    sourceResult: SourceValidationResult,
    contentResult: ContentValidationResult
  ): string[] {
    const factors: string[] = [];

    if (sourceResult.isAuthenticated) {
      factors.push("Data from authenticated database source");
    }
    if (sourceResult.details.hasValidIds) {
      const validCount = sourceResult.details.idValidations.filter(v => v.isValidFormat).length;
      factors.push(`Valid Convex IDs found (${validCount})`);
    }
    if (sourceResult.details.hasValidTimestamps) {
      factors.push(`Valid timestamps found (${sourceResult.details.timestampCount})`);
    }
    if (contentResult.appearsReal) {
      factors.push("Content appears to be real data");
    }
    if (sourceResult.confidence > 0.8) {
      factors.push("High source confidence score");
    }

    return factors;
  }

  private identifyNegativeFactors(
    sourceResult: SourceValidationResult,
    contentResult: ContentValidationResult
  ): string[] {
    const factors: string[] = [];

    if (!sourceResult.isAuthenticated) {
      factors.push("Source is not authenticated");
    }
    if (!sourceResult.details.hasValidIds) {
      factors.push("No valid Convex IDs found");
    }
    if (!sourceResult.details.hasValidTimestamps) {
      factors.push("No valid timestamps found");
    }
    if (contentResult.indicators.length > 0) {
      const types = contentResult.indicators.map(i => i.type).join(", ");
      factors.push(`Mock data indicators found (${contentResult.indicators.length}): ${types}`);
    }
    if (sourceResult.confidence < 0.5) {
      factors.push("Low source confidence score");
    }

    return factors;
  }

  private generateConfidenceReasoning(
    confidence: ConfidenceScore,
    sourceResult: SourceValidationResult,
    positiveFactors: string[],
    negativeFactors: string[]
  ): string {
    const confidencePercent = (confidence.overall * 100).toFixed(1);

    if (confidence.overall >= this.thresholds.realDataThreshold) {
      return this.buildRealDataReasoning(confidencePercent, sourceResult, positiveFactors);
    }

    if (confidence.overall >= this.thresholds.uncertaintyThreshold) {
      return this.buildUncertainReasoning(confidencePercent, negativeFactors);
    }

    return this.buildMockDataReasoning(confidencePercent, negativeFactors);
  }

  private buildRealDataReasoning(
    confidencePercent: string,
    sourceResult: SourceValidationResult,
    positiveFactors: string[]
  ): string {
    let reasoning = `Data appears to be real (confidence: ${confidencePercent}%). `;
    if (sourceResult.isAuthenticated) {
      reasoning += "Authenticated database source provides high confidence. ";
    }
    if (positiveFactors.length > 0) {
      reasoning += `Positive indicators: ${positiveFactors.slice(0, 2).join(", ")}.`;
    }
    return reasoning;
  }

  private buildUncertainReasoning(confidencePercent: string, negativeFactors: string[]): string {
    let reasoning = `Data authenticity is uncertain (confidence: ${confidencePercent}%). `;
    reasoning += "Additional validation may be needed. ";
    if (negativeFactors.length > 0) {
      reasoning += `Concerns: ${negativeFactors.slice(0, 2).join(", ")}.`;
    }
    return reasoning;
  }

  private buildMockDataReasoning(confidencePercent: string, negativeFactors: string[]): string {
    let reasoning = `Data may be mock or placeholder (confidence: ${confidencePercent}%). `;
    if (negativeFactors.length > 0) {
      reasoning += `Issues found: ${negativeFactors.slice(0, 3).join(", ")}.`;
    }
    return reasoning;
  }

  /**
   * Calculate confidence from ID validations
   */
  private calculateIdConfidence(idValidations: ConvexIdValidation[]): number {
    if (idValidations.length === 0) {
      return 0;
    }

    const validIds = idValidations.filter(v => v.isValidFormat).length;
    const totalIds = idValidations.length;

    // Calculate ratio of valid IDs
    const ratio = validIds / totalIds;

    // Apply confidence boost for having multiple valid IDs
    const LARGE_ID_BOOST = 0.1;
    const MEDIUM_ID_BOOST = 0.05;

    let confidence = ratio;
    if (validIds >= 5) {
      confidence = Math.min(ratio + LARGE_ID_BOOST, 1); // Boost for 5+ valid IDs
    } else if (validIds >= 3) {
      confidence = Math.min(ratio + MEDIUM_ID_BOOST, 1); // Small boost for 3+ valid IDs
    }

    return confidence;
  }

  /**
   * Calculate confidence from timestamp validation
   */
  private calculateTimestampConfidence(
    hasValidTimestamps: boolean,
    timestampCount: number
  ): number {
    if (!hasValidTimestamps || timestampCount === 0) {
      return 0;
    }

    // Base confidence for having valid timestamps
    let confidence = 0.7;

    // Increase confidence based on number of timestamps
    if (timestampCount >= 10) {
      confidence = 0.95;
    } else if (timestampCount >= 5) {
      confidence = 0.85;
    } else if (timestampCount >= 3) {
      confidence = 0.8;
    }

    return confidence;
  }

  /**
   * Calculate content confidence from mock indicators
   * Lower confidence = more likely to be mock data
   */
  public calculateContentConfidence(indicators: MockDataIndicator[]): number {
    if (indicators.length === 0) {
      return 1; // No indicators = high confidence it's real
    }

    // Calculate average confidence of indicators
    const avgIndicatorConfidence =
      indicators.reduce((sum, ind) => sum + ind.confidence, 0) / indicators.length;

    // More indicators = lower confidence in data being real
    const indicatorPenalty = Math.min(indicators.length * 0.15, 0.6);

    // Content confidence is inverse of indicator confidence
    const contentConfidence = Math.max(1 - avgIndicatorConfidence - indicatorPenalty, 0);

    return contentConfidence;
  }

  /**
   * Get current environment thresholds
   */
  public getThresholds(): ConfidenceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get current weights
   */
  public getWeights(): ConfidenceWeights {
    return { ...this.weights };
  }

  /**
   * Update weights (useful for testing or tuning)
   */
  public updateWeights(newWeights: Partial<ConfidenceWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
  }

  /**
   * Update thresholds (useful for testing or tuning)
   */
  public updateThresholds(newThresholds: Partial<ConfidenceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
}

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Get browser environment information safely
 */
function getBrowserEnvironment(): {
  userAgent: string;
  url: string;
  onlineStatus: boolean;
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
} {
  const hasNavigator = globalThis.navigator !== undefined;
  const hasWindow = globalThis.window !== undefined;

  return {
    userAgent: hasNavigator ? globalThis.navigator.userAgent : "unknown",
    url: hasWindow ? globalThis.window.location.href : "unknown",
    onlineStatus: hasNavigator ? globalThis.navigator.onLine : true,
    viewport: {
      width: hasWindow ? globalThis.window.innerWidth : 0,
      height: hasWindow ? globalThis.window.innerHeight : 0,
    },
    screen: {
      width: hasWindow ? globalThis.window.screen.width : 0,
      height: hasWindow ? globalThis.window.screen.height : 0,
    },
  };
}

// ================================
// DATA VALIDATION SERVICE
// ================================

export class DataValidationService {
  private readonly config: IntegrityCheckConfig;
  private readonly logger = getErrorLoggingService();
  private readonly validationCache = new Map<string, DataIntegrityReport>();
  private isDestroyed = false;
  private readonly sourceValidator: SourceValidator;
  private readonly confidenceCalculator: ConfidenceCalculator;
  private readonly environment: Environment;
  private readonly envConfig: EnvironmentValidationConfig;
  private readonly behaviorConfig: ValidationBehaviorConfig;

  constructor(config: Partial<IntegrityCheckConfig> = {}, environment?: Environment) {
    // Get environment-specific configuration
    this.environment = environment || getCurrentEnvironment();
    this.envConfig = getValidationConfig(this.environment);
    this.behaviorConfig = this.envConfig.behavior;

    // Merge environment config with custom overrides
    this.config = {
      maxDataAge: this.envConfig.integrityCheck.maxDataAge || 5 * 60 * 1000,
      checkMockData: this.envConfig.integrityCheck.checkMockData ?? true,
      checkCrossSection: this.envConfig.integrityCheck.checkCrossSection ?? true,
      checkDataSource: this.envConfig.integrityCheck.checkDataSource ?? true,
      freshnessThresholds: {
        stats: 2 * 60 * 1000, // 2 minutes
        favorites: 5 * 60 * 1000, // 5 minutes
        orders: 1 * 60 * 1000, // 1 minute
        downloads: 3 * 60 * 1000, // 3 minutes
        reservations: 2 * 60 * 1000, // 2 minutes
        activity: 30 * 1000, // 30 seconds
      },
      mockDataPatterns: {
        // Strict placeholder texts - exact matches only
        placeholderTexts: [
          "Lorem ipsum",
          "PLACEHOLDER",
          "TODO",
          "TBD",
          "FIXME",
          "XXX",
          "N/A",
          "undefined",
          "null",
        ],
        // Generic test values - only obvious test data
        // Removed common legitimate values like "John Smith"
        genericValues: [
          "user@example.com",
          "test@test.com",
          "admin@example.com",
          "noreply@example.com",
          "example@example.com",
          "Test User",
          "Sample Beat",
          "Example Order",
          "Mock Data",
          "Placeholder",
          123456789,
          999999999,
          -1,
        ],
        // Strict regex patterns with word boundaries
        testPatterns: [
          /\btest\d{3,}\b/i, // test123, test1234 (3+ digits)
          /\bmock_data_\d+\b/i, // mock_data_123
          /\bplaceholder_\d+\b/i, // placeholder_123
          /\bexample_\d{3,}\b/i, // example_123 (3+ digits)
          /^lorem\s+ipsum$/i, // Exact "lorem ipsum"
          /\bfake_\w+_\d+\b/i, // fake_user_123
          /\bdummy_\w+_\d+\b/i, // dummy_order_123
        ],
      },
      // Excluded common legitimate values (NOT mock data)
      // These values should NEVER be flagged as mock data
      excludedCommonValues: {
        names: [
          "John Smith",
          "Jane Doe",
          "John Doe",
          "Jane Smith",
          "Michael Johnson",
          "Sarah Williams",
          "David Brown",
          "Emily Davis",
          "James Wilson",
          "Maria Garcia",
          "Robert Jones",
          "Jennifer Taylor",
          "William Anderson",
          "Elizabeth Thomas",
          "Christopher Jackson",
          "Jessica White",
          "Matthew Harris",
          "Ashley Martin",
          "Daniel Thompson",
          "Amanda Garcia",
        ],
        // Common legitimate numbers that should NOT be flagged
        // Includes zero (new users), small numbers, and common round numbers
        numbers: [0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500, 1000],
        emails: [],
      },
      ...config,
    };

    // Initialize source validator with environment-specific config
    this.sourceValidator = new SourceValidator({
      ...this.envConfig.sourceValidation,
      trustDatabaseSource: this.behaviorConfig.trustAuthenticatedSources,
    });

    // Initialize confidence calculator with environment-specific settings
    this.confidenceCalculator = new ConfidenceCalculator(
      this.environment,
      this.envConfig.confidenceWeights,
      this.envConfig.confidenceThresholds
    );

    // Log initialization in development only
    if (this.behaviorConfig.enableDetailedLogging) {
      this.logger.logSystemEvent(
        `DataValidationService initialized for ${this.environment} environment (trustAuth: ${this.behaviorConfig.trustAuthenticatedSources}, failSilently: ${this.behaviorConfig.failSilently})`,
        "info",
        {
          component: "DataValidationService",
        }
      );
    }
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
      const cachedReport = this.checkValidationCache(cacheResults, data);
      if (cachedReport) {
        return cachedReport;
      }

      // Perform validations
      const validations = await this.performAllValidations(
        data,
        includeSourceValidation,
        includeCrossValidation,
        includeDataValidation
      );

      // Build and cache report
      const report = this.buildIntegrityReport(data, validations, reportId, startTime);

      if (cacheResults) {
        this.cacheValidationReport(data, report);
      }

      this.logValidationResult(report.status);

      return report;
    } catch (error) {
      return this.handleIntegrityValidationError(error, data, reportId, startTime);
    }
  }

  /**
   * Validate data source authenticity with priority-based approach
   * Priority: Source Validation > ID Validation > Content Validation
   * Uses ConfidenceCalculator for weighted scoring
   */
  public async validateDataSource(data: DashboardData): Promise<DataSourceValidation> {
    const startTime = Date.now();

    try {
      const sourceResult = await this.sourceValidator.validateSource(data);

      // Early exit for high-confidence authenticated sources
      if (sourceResult.isAuthenticated && sourceResult.confidence > 0.9) {
        return this.createHighConfidenceValidation(data, sourceResult, startTime);
      }

      // Perform detailed validation
      return this.performDetailedValidation(data, sourceResult, startTime);
    } catch (error) {
      this.handleValidationError(error, data.user.id);
      return this.createFallbackSourceValidation(data, startTime);
    }
  }

  /**
   * Validates a single Convex ID format
   *
   * Delegates to SourceValidator to check if the provided ID matches the expected
   * Convex document ID format (16-32 character alphanumeric string).
   *
   * @param id - The ID string to validate
   * @returns ConvexIdValidation result with format validity, pattern type, confidence score, and reason
   *
   * @example
   * ```typescript
   * const result = service.validateConvexId("jx7abc123def456789");
   * if (result.isValidFormat) {
   *   console.log("Valid Convex ID with confidence:", result.confidence);
   * }
   * ```
   */
  public validateConvexId(id: string): ConvexIdValidation {
    return this.sourceValidator.validateConvexId(id);
  }

  /**
   * Validates all Convex IDs in a data structure
   *
   * Recursively searches through the provided data object and validates any fields
   * that appear to be Convex IDs. Returns aggregated validation results including
   * the count of valid IDs and overall confidence score.
   *
   * @param data - Object containing ID fields to validate
   * @returns Validation result with hasValidIds flag, valid ID count, confidence score, and individual results
   *
   * @example
   * ```typescript
   * const data = {
   *   userId: "jx7abc123def456789",
   *   items: [
   *     { id: "jx7def456ghi789012" },
   *     { id: "invalid-id" }
   *   ]
   * };
   * const result = service.validateAllIds(data);
   * console.log(`Found ${result.validIdCount} valid IDs with ${result.confidence} confidence`);
   * ```
   */
  public validateAllIds(data: Record<string, unknown>): {
    hasValidIds: boolean;
    validIdCount: number;
    confidence: number;
    results: ConvexIdValidation[];
  } {
    // Extract all potential ID fields from the data structure
    const ids: string[] = [];
    this.extractIds(data, ids);

    // Validate each ID
    const results = ids.map(id => this.sourceValidator.validateConvexId(id));

    // Calculate aggregated metrics
    const validIdCount = results.filter(r => r.isValidFormat).length;
    const hasValidIds = validIdCount > 0;
    const confidence = results.length > 0 ? validIdCount / results.length : 0;

    return {
      hasValidIds,
      validIdCount,
      confidence,
      results,
    };
  }

  /**
   * Validates data structure integrity including all IDs
   *
   * Performs comprehensive validation of a data object, checking for valid Convex IDs
   * across all nested fields. This is useful for validating entire dashboard data
   * structures or API responses.
   *
   * @param data - Data object to validate (typically DashboardData or similar structure)
   * @returns Validation result with hasValidIds flag, valid ID count, confidence score, and individual results
   *
   * @example
   * ```typescript
   * const dashboardData = await fetchDashboardData();
   * const validation = service.validateDataIds(dashboardData);
   *
   * if (!validation.hasValidIds) {
   *   console.warn("No valid Convex IDs found - data may be mock or invalid");
   * }
   * ```
   */
  public validateDataIds(data: unknown): {
    hasValidIds: boolean;
    validIdCount: number;
    confidence: number;
    results: ConvexIdValidation[];
  } {
    // Type guard: ensure data is an object
    if (!data || typeof data !== "object") {
      return {
        hasValidIds: false,
        validIdCount: 0,
        confidence: 0,
        results: [],
      };
    }

    // Reuse validateAllIds implementation
    return this.validateAllIds(data as Record<string, unknown>);
  }

  /**
   * Helper method to recursively extract ID fields from a data structure
   * @private
   */
  private extractIds(obj: unknown, ids: string[]): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractIds(item, ids);
      }
      return;
    }

    // Handle objects
    for (const [key, value] of Object.entries(obj)) {
      // Check if this field looks like an ID field
      if (key === "id" || key.endsWith("Id") || key.endsWith("_id")) {
        if (typeof value === "string" && value.length > 0) {
          ids.push(value);
        }
      }

      // Recursively check nested objects and arrays
      if (typeof value === "object" && value !== null) {
        this.extractIds(value, ids);
      }
    }
  }

  /**
   * Check validation cache with confidence-based TTL
   * Enhanced to use dynamic TTL based on validation confidence
   */
  private checkValidationCache(
    cacheResults: boolean,
    data: DashboardData
  ): DataIntegrityReport | null {
    if (!cacheResults) {
      return null;
    }

    const cacheKey = this.generateCacheKey(data);
    const cachedReport = this.validationCache.get(cacheKey);

    if (cachedReport && this.isCacheValid(cachedReport)) {
      // Log cache hit in development mode
      if (this.behaviorConfig.enableDetailedLogging) {
        const age = Date.now() - cachedReport.generatedAt;
        this.logger.logSystemEvent(
          `Validation cache hit (age: ${Math.round(age / 1000)}s, source: ${cachedReport.sourceValidation.source})`,
          "info",
          { component: "DataValidationService" }
        );
      }

      return cachedReport;
    }

    // Remove stale cache entry
    if (cachedReport) {
      this.validationCache.delete(cacheKey);
    }

    return null;
  }

  private async performAllValidations(
    data: DashboardData,
    includeSource: boolean,
    includeCross: boolean,
    includeData: boolean
  ): Promise<{
    sourceValidation: DataSourceValidation;
    crossValidation: CrossValidationResult;
    dataValidation: ValidationResult;
  }> {
    const sourceValidation = includeSource
      ? await this.validateDataSource(data)
      : this.createEmptySourceValidation();

    const crossValidation = includeCross
      ? this.validateCrossSection(data)
      : this.createEmptyCrossValidation();

    const dataValidation = includeData
      ? validateDashboardData(data)
      : this.createEmptyDataValidation();

    return { sourceValidation, crossValidation, dataValidation };
  }

  private buildIntegrityReport(
    data: DashboardData,
    validations: {
      sourceValidation: DataSourceValidation;
      crossValidation: CrossValidationResult;
      dataValidation: ValidationResult;
    },
    reportId: string,
    startTime: number
  ): DataIntegrityReport {
    const { sourceValidation, crossValidation, dataValidation } = validations;

    const inconsistencies = this.detectAllInconsistencies(
      data,
      sourceValidation,
      crossValidation,
      dataValidation
    );

    const status = this.determineOverallStatus(
      sourceValidation,
      crossValidation,
      dataValidation,
      inconsistencies
    );

    const recommendations = this.generateRecommendations(
      status,
      sourceValidation,
      crossValidation,
      inconsistencies
    );

    // Create detailed report for development/staging environments
    const detailedReport = this.behaviorConfig.enableDetailedLogging
      ? this.createDetailedValidationReport(data, sourceValidation, startTime)
      : undefined;

    // Log validation report based on environment
    this.logValidationReport(
      {
        status,
        sourceValidation,
        crossValidation,
        dataValidation,
        inconsistencies,
        recommendations,
        generatedAt: startTime,
        reportId,
        detailedReport,
      },
      data
    );

    return {
      status,
      sourceValidation,
      crossValidation,
      dataValidation,
      inconsistencies,
      recommendations,
      generatedAt: startTime,
      reportId,
      detailedReport,
    };
  }

  /**
   * Create detailed validation report for development and debugging
   * Includes confidence breakdown, mock indicator analysis, and validation reasoning
   */
  private createDetailedValidationReport(
    data: DashboardData,
    sourceValidation: DataSourceValidation,
    startTime: number
  ): DetailedValidationReport {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Get confidence breakdown from the last validation
    const mockIndicators = sourceValidation.mockIndicators;
    const contentResult: ContentValidationResult = {
      indicators: mockIndicators,
      confidence: this.confidenceCalculator.calculateContentConfidence(mockIndicators),
      appearsReal: mockIndicators.length === 0,
    };

    // Create a source result for breakdown calculation
    const getSourceType = (source: DataSource): SourceType => {
      if (source === "database") return "database";
      if (source === "cache") return "cache";
      return "unknown";
    };

    const sourceResult: SourceValidationResult = {
      source: getSourceType(sourceValidation.source),
      isAuthenticated: sourceValidation.isRealData,
      confidence: sourceValidation.idValidations?.confidence || 0.5,
      details: {
        hasValidIds: sourceValidation.idValidations?.hasValidIds || false,
        hasValidTimestamps: sourceValidation.freshnessWarnings.length === 0,
        idValidations: sourceValidation.idValidations?.results || [],
        timestampCount: this.sourceValidator.countTimestamps(data),
      },
    };

    const confidenceScore = this.confidenceCalculator.calculateOverallConfidence(
      sourceResult,
      contentResult
    );

    const confidenceBreakdown = this.confidenceCalculator.getConfidenceBreakdown(
      sourceResult,
      contentResult,
      confidenceScore
    );

    const mockIndicatorAnalysis = this.analyzeMockIndicators(mockIndicators);
    const validationReasoning = this.generateValidationReasoning(
      sourceValidation,
      confidenceScore,
      confidenceBreakdown
    );

    const performanceMetrics: ValidationPerformanceMetrics = {
      totalDuration,
      sourceValidationDuration: totalDuration * 0.6, // Estimated
      contentValidationDuration: totalDuration * 0.3, // Estimated
      confidenceCalculationDuration: totalDuration * 0.1, // Estimated
      idsValidated: sourceValidation.idValidations?.validIdCount || 0,
      timestampsValidated: this.sourceValidator.countTimestamps(data),
      fieldsChecked: this.countFieldsChecked(data),
      cacheHit: false,
    };

    const environmentContext: ValidationEnvironmentContext = {
      environment: this.environment,
      config: {
        trustAuthenticatedSources: this.behaviorConfig.trustAuthenticatedSources,
        failSilently: this.behaviorConfig.failSilently,
        enableDetailedLogging: this.behaviorConfig.enableDetailedLogging,
        showMockDataBanners: this.behaviorConfig.showMockDataBanners,
        mockDataThreshold: this.confidenceCalculator.getThresholds().mockDataThreshold,
      },
      userContext: {
        userId: data.user.id,
        hasData: this.hasUserData(data),
        dataAge: sourceValidation.dataAge,
      },
      validatedAt: startTime,
    };

    return {
      confidenceBreakdown,
      mockIndicatorAnalysis,
      validationReasoning,
      performanceMetrics,
      environmentContext,
    };
  }

  /**
   * Analyze mock indicators and group them by type and field
   */
  private analyzeMockIndicators(indicators: MockDataIndicator[]): MockIndicatorAnalysis {
    const byType: Record<string, MockDataIndicator[]> = {};
    const byField: Record<string, MockDataIndicator[]> = {};
    const highConfidenceIndicators: MockDataIndicator[] = [];
    const mediumConfidenceIndicators: MockDataIndicator[] = [];
    const lowConfidenceIndicators: MockDataIndicator[] = [];
    const affectedFields = new Set<string>();

    for (const indicator of indicators) {
      // Group by type
      if (!byType[indicator.type]) {
        byType[indicator.type] = [];
      }
      byType[indicator.type].push(indicator);

      // Group by field
      if (!byField[indicator.field]) {
        byField[indicator.field] = [];
      }
      byField[indicator.field].push(indicator);

      // Categorize by confidence
      if (indicator.confidence >= 0.8) {
        highConfidenceIndicators.push(indicator);
      } else if (indicator.confidence >= 0.5) {
        mediumConfidenceIndicators.push(indicator);
      } else {
        lowConfidenceIndicators.push(indicator);
      }

      // Track affected fields
      affectedFields.add(indicator.field);
    }

    const averageConfidence =
      indicators.length > 0
        ? indicators.reduce((sum, ind) => sum + ind.confidence, 0) / indicators.length
        : 0;

    const summary = this.generateMockIndicatorSummary(
      indicators.length,
      highConfidenceIndicators.length,
      affectedFields.size
    );

    return {
      totalIndicators: indicators.length,
      byType,
      byField,
      highConfidenceIndicators,
      mediumConfidenceIndicators,
      lowConfidenceIndicators,
      averageConfidence,
      affectedFields: Array.from(affectedFields),
      summary,
    };
  }

  /**
   * Generate a human-readable summary of mock indicators
   */
  private generateMockIndicatorSummary(
    total: number,
    highConfidence: number,
    affectedFields: number
  ): string {
    if (total === 0) {
      return "No mock data indicators found. Data appears to be real.";
    }

    if (highConfidence === 0) {
      return `Found ${total} low-confidence mock indicator${total > 1 ? "s" : ""} across ${affectedFields} field${affectedFields > 1 ? "s" : ""}. Data is likely real.`;
    }

    if (highConfidence >= 3) {
      return `Found ${highConfidence} high-confidence mock indicators across ${affectedFields} field${affectedFields > 1 ? "s" : ""}. Data is likely mock or placeholder.`;
    }

    return `Found ${total} mock indicator${total > 1 ? "s" : ""} (${highConfidence} high-confidence) across ${affectedFields} field${affectedFields > 1 ? "s" : ""}. Further investigation recommended.`;
  }

  /**
   * Generate validation reasoning explaining the decision process
   */
  private generateValidationReasoning(
    sourceValidation: DataSourceValidation,
    confidenceScore: ConfidenceScore,
    breakdown: ConfidenceBreakdown
  ): ValidationReasoning {
    const decision = this.determineValidationDecision(sourceValidation, confidenceScore);
    const keyFactors = this.extractKeyFactors(breakdown, sourceValidation);
    const rationale = this.generateRationale(decision, confidenceScore, keyFactors);
    const stepsPerformed = this.generateValidationSteps(sourceValidation);
    const skippedChecks = this.identifySkippedChecks(sourceValidation);

    return {
      decision,
      confidence: confidenceScore.overall,
      keyFactors,
      rationale,
      stepsPerformed,
      skippedChecks,
    };
  }

  /**
   * Determine the final validation decision
   */
  private determineValidationDecision(
    sourceValidation: DataSourceValidation,
    confidenceScore: ConfidenceScore
  ): ValidationDecision {
    const thresholds = this.confidenceCalculator.getThresholds();

    if (sourceValidation.isRealData && confidenceScore.overall >= thresholds.realDataThreshold) {
      return "real_data";
    }

    if (sourceValidation.hasMockData && confidenceScore.overall < thresholds.mockDataThreshold) {
      return "mock_data";
    }

    return "uncertain";
  }

  /**
   * Extract key factors from confidence breakdown
   */
  private extractKeyFactors(
    breakdown: ConfidenceBreakdown,
    sourceValidation: DataSourceValidation
  ): ValidationFactor[] {
    const factors: ValidationFactor[] = [];

    // Add positive factors
    for (const factor of breakdown.positiveFactors) {
      factors.push({
        name: factor,
        type: "positive",
        impact: 0.2,
        weight: 0.8,
        description: factor,
        evidence: this.getFactorEvidence(factor, sourceValidation),
      });
    }

    // Add negative factors
    for (const factor of breakdown.negativeFactors) {
      factors.push({
        name: factor,
        type: "negative",
        impact: -0.2,
        weight: 0.8,
        description: factor,
        evidence: this.getFactorEvidence(factor, sourceValidation),
      });
    }

    return factors;
  }

  /**
   * Get evidence for a validation factor
   */
  private getFactorEvidence(factor: string, sourceValidation: DataSourceValidation): string {
    if (factor.includes("Convex IDs")) {
      return `${sourceValidation.idValidations?.validIdCount || 0} valid Convex IDs found`;
    }

    if (factor.includes("timestamps")) {
      return `${sourceValidation.idValidations?.results.length || 0} timestamps validated`;
    }

    if (factor.includes("authenticated")) {
      return `Source: ${sourceValidation.source}`;
    }

    if (factor.includes("Mock data indicators")) {
      return `${sourceValidation.mockIndicators.length} indicators found`;
    }

    return "";
  }

  /**
   * Generate human-readable rationale for the decision
   */
  private generateRationale(
    decision: ValidationDecision,
    confidenceScore: ConfidenceScore,
    keyFactors: ValidationFactor[]
  ): string {
    const confidencePercent = (confidenceScore.overall * 100).toFixed(1);
    const positiveCount = keyFactors.filter(f => f.type === "positive").length;
    const negativeCount = keyFactors.filter(f => f.type === "negative").length;
    const positivePlural = positiveCount === 1 ? "" : "s";
    const negativePlural = negativeCount === 1 ? "" : "s";

    if (decision === "real_data") {
      return `Data is determined to be real with ${confidencePercent}% confidence. Found ${positiveCount} positive indicator${positivePlural} supporting authenticity.`;
    }

    if (decision === "mock_data") {
      return `Data appears to be mock or placeholder with ${confidencePercent}% confidence. Found ${negativeCount} negative indicator${negativePlural} suggesting test data.`;
    }

    return `Data authenticity is uncertain (${confidencePercent}% confidence). Found ${positiveCount} positive and ${negativeCount} negative indicators. Additional validation recommended.`;
  }

  /**
   * Generate list of validation steps performed
   */
  private generateValidationSteps(sourceValidation: DataSourceValidation): ValidationStep[] {
    const steps: ValidationStep[] = [];

    steps.push({
      name: "Source Validation",
      order: 1,
      result: sourceValidation.isRealData ? "passed" : "failed",
      duration: 0,
      details: `Validated data source: ${sourceValidation.source}`,
      data: {
        source: sourceValidation.source,
        isAuthenticated: sourceValidation.isRealData,
      },
    });

    if (sourceValidation.idValidations) {
      steps.push({
        name: "ID Validation",
        order: 2,
        result: sourceValidation.idValidations.hasValidIds ? "passed" : "failed",
        duration: 0,
        details: `Validated ${sourceValidation.idValidations.validIdCount} Convex IDs`,
        data: {
          validIdCount: sourceValidation.idValidations.validIdCount,
          confidence: sourceValidation.idValidations.confidence,
        },
      });
    }

    const freshnessWarningCount = sourceValidation.freshnessWarnings.length;
    const freshnessPlural = freshnessWarningCount === 1 ? "" : "s";
    const timestampStep: ValidationStep = {
      name: "Timestamp Validation",
      order: 3,
      result: freshnessWarningCount === 0 ? "passed" : "warning",
      duration: 0,
      details: `Checked data freshness, found ${freshnessWarningCount} warning${freshnessPlural}`,
      data: {
        warnings: freshnessWarningCount,
      },
    };
    steps.push(timestampStep);

    const mockIndicatorCount = sourceValidation.mockIndicators.length;
    const indicatorPlural = mockIndicatorCount === 1 ? "" : "s";
    const contentStep: ValidationStep = {
      name: "Content Validation",
      order: 4,
      result: mockIndicatorCount === 0 ? "passed" : "warning",
      duration: 0,
      details: `Checked for mock data patterns, found ${mockIndicatorCount} indicator${indicatorPlural}`,
      data: {
        indicators: mockIndicatorCount,
      },
    };
    steps.push(contentStep);

    return steps;
  }

  /**
   * Identify validation checks that were skipped
   */
  private identifySkippedChecks(sourceValidation: DataSourceValidation): SkippedCheck[] {
    const skipped: SkippedCheck[] = [];

    // Check if content validation was skipped due to high source confidence
    if (sourceValidation.isRealData && sourceValidation.mockIndicators.length === 0) {
      const idConfidence = sourceValidation.idValidations?.confidence || 0;
      if (idConfidence > 0.9) {
        skipped.push({
          name: "Detailed Content Validation",
          reason: "Skipped due to high source confidence from authenticated database",
          intentional: true,
        });
      }
    }

    return skipped;
  }

  /**
   * Count total fields checked during validation
   */
  private countFieldsChecked(data: DashboardData): number {
    let count = 0;

    // User fields
    count += Object.keys(data.user).length;

    // Stats fields
    count += Object.keys(data.stats).length;

    // Array items
    count += data.favorites.length;
    count += data.orders.length;
    count += data.downloads.length;
    count += data.reservations.length;
    count += data.activity.length;

    return count;
  }

  /**
   * Check if user has any data
   */
  private hasUserData(data: DashboardData): boolean {
    return (
      data.favorites.length > 0 ||
      data.orders.length > 0 ||
      data.downloads.length > 0 ||
      data.reservations.length > 0 ||
      data.activity.length > 0
    );
  }

  /**
   * Log validation report based on environment configuration
   * Development: Detailed logging with full breakdown
   * Production: Alert logging without user warnings
   */
  private logValidationReport(report: DataIntegrityReport, data: DashboardData): void {
    if (this.environment === "production") {
      this.logProductionValidationReport(report, data);
    } else {
      this.logDevelopmentValidationReport(report, data);
    }
  }

  /**
   * Log validation report in production (alerts only, no user warnings)
   */
  private logProductionValidationReport(report: DataIntegrityReport, data: DashboardData): void {
    // Only log if there are issues
    if (report.status === "valid") {
      return;
    }

    // Log alert without showing to user
    const logMethod = report.status === "critical" ? console.error : console.warn;
    logMethod(
      `[DataValidationService] Data validation alert [${report.reportId}]: ${report.status} status detected for user ${data.user.id}`,
      {
        status: report.status,
        hasMockData: report.sourceValidation.hasMockData,
        inconsistencies: report.inconsistencies.length,
        userId: data.user.id,
      }
    );

    // Log mock data indicators if found (for monitoring)
    if (report.sourceValidation.hasMockData && report.sourceValidation.mockIndicators.length > 0) {
      console.warn(
        `[DataValidationService] Mock data detected in production [${report.reportId}] for user ${data.user.id}: ${report.sourceValidation.mockIndicators.length} indicators`,
        {
          indicators: report.sourceValidation.mockIndicators.map(ind => ({
            field: ind.field,
            type: ind.type,
            confidence: ind.confidence,
          })),
        }
      );
    }
  }

  /**
   * Log validation report in development (detailed logging with full breakdown)
   */
  private logDevelopmentValidationReport(report: DataIntegrityReport, data: DashboardData): void {
    if (!this.behaviorConfig.enableDetailedLogging) {
      return;
    }

    // Log overall validation result
    const logMethod = report.status === "valid" ? console.info : console.warn;
    logMethod(`[DataValidationService] Validation Report [${report.reportId}]: ${report.status}`, {
      userId: data.user.id,
    });

    // Log detailed report if available
    if (report.detailedReport) {
      this.logDetailedReportBreakdown(report.detailedReport, report.reportId);
    }

    // Log mock indicators if found
    if (report.sourceValidation.mockIndicators.length > 0) {
      this.logMockIndicators(report.sourceValidation.mockIndicators, report.reportId);
    }

    // Log confidence breakdown
    if (report.detailedReport?.confidenceBreakdown) {
      this.logConfidenceBreakdownDetails(
        report.detailedReport.confidenceBreakdown,
        report.reportId
      );
    }

    // Log validation reasoning
    if (report.detailedReport?.validationReasoning) {
      this.logValidationReasoning(report.detailedReport.validationReasoning, report.reportId);
    }
  }

  /**
   * Log detailed report breakdown
   */
  private logDetailedReportBreakdown(
    detailedReport: DetailedValidationReport,
    reportId: string
  ): void {
    console.info(
      `[DataValidationService] Detailed Report [${reportId}]: ${detailedReport.mockIndicatorAnalysis.summary}`,
      {
        mockIndicators: detailedReport.mockIndicatorAnalysis.totalIndicators,
        affectedFields: detailedReport.mockIndicatorAnalysis.affectedFields.length,
        averageConfidence: detailedReport.mockIndicatorAnalysis.averageConfidence,
        decision: detailedReport.validationReasoning.decision,
        confidence: detailedReport.validationReasoning.confidence,
      }
    );
  }

  /**
   * Log mock indicators with field names
   */
  private logMockIndicators(indicators: MockDataIndicator[], reportId: string): void {
    for (const indicator of indicators) {
      console.warn(
        `[DataValidationService] Mock Indicator [${reportId}]: ${indicator.field} - ${indicator.reason}`,
        {
          field: indicator.field,
          type: indicator.type,
          confidence: indicator.confidence,
          value: indicator.value,
        }
      );
    }
  }

  /**
   * Log confidence breakdown details
   */
  private logConfidenceBreakdownDetails(breakdown: ConfidenceBreakdown, reportId: string): void {
    const components = breakdown.components;
    console.info(
      `[DataValidationService] Confidence Breakdown [${reportId}]: ${breakdown.reasoning}`,
      {
        source: {
          score: components.source.score,
          contribution: components.source.contribution,
        },
        ids: {
          score: components.ids.score,
          contribution: components.ids.contribution,
        },
        timestamps: {
          score: components.timestamps.score,
          contribution: components.timestamps.contribution,
        },
        content: {
          score: components.content.score,
          contribution: components.content.contribution,
        },
        positiveFactors: breakdown.positiveFactors,
        negativeFactors: breakdown.negativeFactors,
      }
    );
  }

  /**
   * Log validation reasoning
   */
  private logValidationReasoning(reasoning: ValidationReasoning, reportId: string): void {
    console.info(
      `[DataValidationService] Validation Reasoning [${reportId}]: ${reasoning.rationale}`,
      {
        decision: reasoning.decision,
        confidence: reasoning.confidence,
        keyFactors: reasoning.keyFactors.map(f => ({
          name: f.name,
          type: f.type,
          impact: f.impact,
        })),
        stepsPerformed: reasoning.stepsPerformed.map(s => ({
          name: s.name,
          result: s.result,
        })),
      }
    );
  }

  /**
   * Cache validation report with confidence-based TTL
   * Enhanced to log caching activity and perform cleanup
   */
  private cacheValidationReport(data: DashboardData, report: DataIntegrityReport): void {
    const cacheKey = this.generateCacheKey(data);
    this.validationCache.set(cacheKey, report);

    // Log cache write in development mode
    if (this.behaviorConfig.enableDetailedLogging) {
      const confidence = report.sourceValidation.isRealData ? 0.9 : 0.5;
      const ttl = this.getCacheTTL(confidence);
      this.logger.logSystemEvent(
        `Cached validation report (TTL: ${Math.round(ttl / 1000)}s, source: ${report.sourceValidation.source}, key: ${cacheKey.substring(0, 16)}..., confidence: ${confidence})`,
        "info",
        {
          component: "DataValidationService",
        }
      );
    }

    // Cleanup old entries
    this.cleanupValidationCache();
  }

  private logValidationResult(status: IntegrityStatus): void {
    let logLevel: "info" | "warn" | "error" = "error";
    if (status === "valid") {
      logLevel = "info";
    } else if (status === "warning") {
      logLevel = "warn";
    }

    this.logger.logSystemEvent(`Data integrity validation completed: ${status}`, logLevel, {
      component: "DataValidationService",
    });
  }

  private handleIntegrityValidationError(
    error: unknown,
    data: DashboardData,
    reportId: string,
    startTime: number
  ): DataIntegrityReport {
    if (this.behaviorConfig.logValidationErrors) {
      this.logIntegrityValidationError(error, reportId);
    }

    if (this.behaviorConfig.failSilently) {
      return this.createFallbackIntegrityReport(data, reportId, startTime);
    }

    throw error;
  }

  private logIntegrityValidationError(error: unknown, reportId: string): void {
    this.logger.logError(
      {
        type: SyncErrorType.VALIDATION_ERROR,
        message: `Data integrity validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
        context: { reportId, originalError: error instanceof Error ? error : undefined },
        retryable: true,
        retryCount: 0,
        maxRetries: 3,
        severity: "high" as const,
        category: "data" as const,
        recoveryStrategy: "immediate_retry" as const,
        userMessage: this.behaviorConfig.failSilently
          ? ""
          : "Data validation failed. Please refresh the page.",
        userActions: [],
        technicalDetails: {
          stackTrace: error instanceof Error ? error.stack : undefined,
          environment: {
            ...getBrowserEnvironment(),
            timestamp: Date.now(),
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
  }

  private handleValidationError(error: unknown, userId: string): void {
    if (!this.behaviorConfig.logValidationErrors) {
      return;
    }

    this.logger.logError(
      {
        type: SyncErrorType.VALIDATION_ERROR,
        message: `Data source validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
        context: { originalError: error instanceof Error ? error : undefined, userId },
        retryable: true,
        retryCount: 0,
        maxRetries: 3,
        severity: "medium" as const,
        category: "data" as const,
        recoveryStrategy: "immediate_retry" as const,
        userMessage: this.behaviorConfig.failSilently
          ? ""
          : "Unable to validate data source. Using default validation.",
        userActions: [],
        technicalDetails: {
          stackTrace: error instanceof Error ? error.stack : undefined,
          environment: {
            ...getBrowserEnvironment(),
            timestamp: Date.now(),
          },
          additionalContext: {
            component: "DataValidationService",
            action: "validateDataSource",
            userId,
          },
        },
        fingerprint: `source-validation-failed-${userId}`,
      },
      { component: "DataValidationService", action: "validateDataSource" }
    );
  }

  private createHighConfidenceValidation(
    data: DashboardData,
    sourceResult: SourceValidationResult,
    startTime: number
  ): DataSourceValidation {
    return {
      isRealData: true,
      hasMockData: false,
      isFresh: true,
      dataAge: this.calculateDataAge(data),
      source: sourceResult.source,
      validatedAt: startTime,
      mockIndicators: [],
      freshnessWarnings: [],
      idValidations: {
        hasValidIds: sourceResult.details.hasValidIds,
        validIdCount: sourceResult.details.idValidations.filter(v => v.isValidFormat).length,
        confidence: sourceResult.confidence,
        results: sourceResult.details.idValidations,
      },
    };
  }

  private async performDetailedValidation(
    data: DashboardData,
    sourceResult: SourceValidationResult,
    startTime: number
  ): Promise<DataSourceValidation> {
    try {
      const mockIndicators = this.collectMockIndicators(data, sourceResult);
      const freshnessWarnings = this.checkDataFreshness(data);
      const contentResult = this.buildContentResult(mockIndicators);
      const confidenceScore = this.confidenceCalculator.calculateOverallConfidence(
        sourceResult,
        contentResult
      );

      this.logConfidenceBreakdown(sourceResult, contentResult, confidenceScore);

      const shouldFlagAsMock = this.confidenceCalculator.shouldFlagAsMock(confidenceScore);
      const finalSource = this.determineFinalSource(
        sourceResult,
        confidenceScore,
        shouldFlagAsMock,
        mockIndicators
      );
      const thresholds = this.confidenceCalculator.getThresholds();
      const isRealData = confidenceScore.overall >= thresholds.realDataThreshold;
      const isFresh = freshnessWarnings.filter(w => w.severity === "critical").length === 0;

      return {
        isRealData,
        hasMockData: shouldFlagAsMock && mockIndicators.length > 0,
        isFresh,
        dataAge: this.calculateDataAge(data),
        source: finalSource,
        validatedAt: startTime,
        mockIndicators,
        freshnessWarnings,
        idValidations: {
          hasValidIds: sourceResult.details.hasValidIds,
          validIdCount: sourceResult.details.idValidations.filter(v => v.isValidFormat).length,
          confidence: confidenceScore.overall,
          results: sourceResult.details.idValidations,
        },
      };
    } catch (error) {
      // Log error with context
      if (this.behaviorConfig.logValidationErrors) {
        this.logger.logError(
          {
            type: SyncErrorType.VALIDATION_ERROR,
            message: `Detailed validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: Date.now(),
            context: {
              originalError: error instanceof Error ? error : undefined,
              userId: data.user.id,
            },
            retryable: true,
            retryCount: 0,
            maxRetries: 3,
            severity: "medium" as const,
            category: "data" as const,
            recoveryStrategy: "immediate_retry" as const,
            userMessage: "",
            userActions: [],
            technicalDetails: {
              stackTrace: error instanceof Error ? error.stack : undefined,
              environment: {
                ...getBrowserEnvironment(),
                timestamp: Date.now(),
              },
              additionalContext: {
                component: "DataValidationService",
                action: "performDetailedValidation",
                userId: data.user.id,
              },
            },
            fingerprint: `detailed-validation-failed-${data.user.id}`,
          },
          { component: "DataValidationService", action: "performDetailedValidation" }
        );
      }

      // Return fallback result based on source validation
      return this.createHighConfidenceValidation(data, sourceResult, startTime);
    }
  }

  private collectMockIndicators(
    data: DashboardData,
    sourceResult: SourceValidationResult
  ): MockDataIndicator[] {
    try {
      const CONFIDENCE_THRESHOLD = 0.7;
      if (!this.config.checkMockData || sourceResult.confidence >= CONFIDENCE_THRESHOLD) {
        return [];
      }
      return this.detectMockData(data);
    } catch (error) {
      // Log error but don't fail - return empty indicators
      if (this.behaviorConfig.enableDetailedLogging) {
        this.logger.logSystemEvent(
          `Mock indicator collection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "warn",
          {
            component: "DataValidationService",
            action: "collectMockIndicators",
          }
        );
      }
      return [];
    }
  }

  private buildContentResult(mockIndicators: MockDataIndicator[]): ContentValidationResult {
    try {
      const contentConfidence =
        this.confidenceCalculator.calculateContentConfidence(mockIndicators);
      const CONFIDENCE_THRESHOLD = 0.7;
      return {
        indicators: mockIndicators,
        confidence: contentConfidence,
        appearsReal: contentConfidence > CONFIDENCE_THRESHOLD,
      };
    } catch (error) {
      // Log error but don't fail - return safe default
      if (this.behaviorConfig.enableDetailedLogging) {
        this.logger.logSystemEvent(
          `Content result building failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "warn",
          {
            component: "DataValidationService",
            action: "buildContentResult",
          }
        );
      }
      // Default to trusting the data when content validation fails
      return {
        indicators: [],
        confidence: 1,
        appearsReal: true,
      };
    }
  }

  private logConfidenceBreakdown(
    sourceResult: SourceValidationResult,
    contentResult: ContentValidationResult,
    confidenceScore: ConfidenceScore
  ): void {
    // Only log confidence breakdowns if enabled (development/staging)
    if (!this.behaviorConfig.logConfidenceBreakdowns) {
      return;
    }

    const breakdown = this.confidenceCalculator.getConfidenceBreakdown(
      sourceResult,
      contentResult,
      confidenceScore
    );
    const message =
      `Confidence breakdown: ${breakdown.reasoning} | ` +
      `Overall: ${(confidenceScore.overall * 100).toFixed(1)}% | ` +
      `Source: ${(confidenceScore.source * 100).toFixed(1)}% | ` +
      `Content: ${(confidenceScore.content * 100).toFixed(1)}%`;

    this.logger.logSystemEvent(message, "info", {
      component: "DataValidationService",
    });
  }

  private determineFinalSource(
    sourceResult: SourceValidationResult,
    confidenceScore: ConfidenceScore,
    shouldFlagAsMock: boolean,
    mockIndicators: MockDataIndicator[]
  ): FinalDataSource {
    if (!shouldFlagAsMock || confidenceScore.overall >= 0.5) {
      return sourceResult.source;
    }

    const highConfidenceMock = mockIndicators.filter(m => m.confidence > 0.8);
    if (highConfidenceMock.length > 0) {
      return "mock";
    }
    if (mockIndicators.length > 0) {
      return "placeholder";
    }

    return sourceResult.source;
  }

  /**
   * Validate cross-section data consistency
   */
  public validateCrossSection(data: DashboardData): CrossValidationResult {
    try {
      const inconsistencies: Inconsistency[] = [];

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
    } catch (error) {
      // Log error with context
      if (this.behaviorConfig.logValidationErrors) {
        this.logger.logError(
          {
            type: SyncErrorType.VALIDATION_ERROR,
            message: `Cross-section validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: Date.now(),
            context: {
              originalError: error instanceof Error ? error : undefined,
              userId: data.user.id,
            },
            retryable: true,
            retryCount: 0,
            maxRetries: 3,
            severity: "low" as const,
            category: "data" as const,
            recoveryStrategy: "immediate_retry" as const,
            userMessage: "",
            userActions: [],
            technicalDetails: {
              stackTrace: error instanceof Error ? error.stack : undefined,
              environment: {
                ...getBrowserEnvironment(),
                timestamp: Date.now(),
              },
              additionalContext: {
                component: "DataValidationService",
                action: "validateCrossSection",
                userId: data.user.id,
              },
            },
            fingerprint: `cross-validation-failed-${data.user.id}`,
          },
          { component: "DataValidationService", action: "validateCrossSection" }
        );
      }

      // Return empty validation result - assume data is consistent when validation fails
      return this.createEmptyCrossValidation();
    }
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
   * Get confidence calculator instance for testing or external use
   */
  public getConfidenceCalculator(): ConfidenceCalculator {
    return this.confidenceCalculator;
  }

  /**
   * Get current environment
   */
  public getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Get environment configuration
   */
  public getEnvironmentConfig(): EnvironmentValidationConfig {
    return this.envConfig;
  }

  /**
   * Get behavior configuration
   */
  public getBehaviorConfig(): ValidationBehaviorConfig {
    return this.behaviorConfig;
  }

  /**
   * Check if should show mock data banners
   */
  public shouldShowMockDataBanners(): boolean {
    return this.behaviorConfig.showMockDataBanners;
  }

  /**
   * Check if should fail silently
   */
  public shouldFailSilently(): boolean {
    return this.behaviorConfig.failSilently;
  }

  /**
   * Check if detailed logging is enabled
   */
  public isDetailedLoggingEnabled(): boolean {
    return this.behaviorConfig.enableDetailedLogging;
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
      return this.createUnknownFreshnessIndicator();
    }

    if (sourceValidation.isFresh && ageMinutes < 2) {
      return this.createFreshIndicator(ageMinutes);
    }

    if (ageMinutes < 10) {
      return this.createStaleIndicator(ageMinutes);
    }

    return this.createOutdatedIndicator(ageMinutes);
  }

  private createUnknownFreshnessIndicator() {
    return {
      status: "unknown" as const,
      color: "gray" as const,
      message: "Mock or placeholder data detected",
      lastUpdated: "Unknown",
    };
  }

  private createFreshIndicator(ageMinutes: number) {
    let lastUpdated = "Just now";
    if (ageMinutes > 0) {
      const plural = ageMinutes > 1 ? "s" : "";
      lastUpdated = `${ageMinutes} minute${plural} ago`;
    }

    return {
      status: "fresh" as const,
      color: "green" as const,
      message: "Data is up to date",
      lastUpdated,
    };
  }

  private createStaleIndicator(ageMinutes: number) {
    const plural = ageMinutes > 1 ? "s" : "";
    return {
      status: "stale" as const,
      color: "yellow" as const,
      message: "Data may be slightly outdated",
      lastUpdated: `${ageMinutes} minute${plural} ago`,
    };
  }

  private createOutdatedIndicator(ageMinutes: number) {
    const hours = Math.floor(ageMinutes / 60);
    const isMoreThanHour = ageMinutes > 60;
    const hourPlural = hours > 1 ? "s" : "";
    const minutePlural = ageMinutes > 1 ? "s" : "";

    const lastUpdated = isMoreThanHour
      ? `${hours} hour${hourPlural} ago`
      : `${ageMinutes} minute${minutePlural} ago`;

    return {
      status: "outdated" as const,
      color: "red" as const,
      message: "Data is outdated and should be refreshed",
      lastUpdated,
    };
  }

  // ================================
  // PRIVATE VALIDATION METHODS
  // ================================

  private detectMockData(data: DashboardData): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [
      ...this.checkUserMockData(data.user),
      ...this.checkStatsMockData(data.stats),
      ...this.checkArrayMockData("favorites", data.favorites),
      ...this.checkArrayMockData("orders", data.orders),
      ...this.checkArrayMockData("downloads", data.downloads),
      ...this.checkArrayMockData("reservations", data.reservations),
      ...this.checkArrayMockData("activity", data.activity),
    ];

    return indicators;
  }

  /**
   * Check user data for mock indicators with strict pattern matching
   * Enhanced to avoid false positives with common names and legitimate values
   * Only flags obvious test domains and placeholder text patterns
   */
  private checkUserMockData(user: DashboardData["user"]): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    // Only check email for obvious test domains
    this.checkUserEmail(user, indicators);

    // Do NOT check names - common names like "John Smith" are legitimate
    // Only check if the full name is an exact placeholder match
    this.checkUserFullName(user, indicators);

    return indicators;
  }

  private checkUserEmail(user: DashboardData["user"], indicators: MockDataIndicator[]): void {
    // Only flag emails with obvious test domains
    if (user.email === undefined || user.email === "") {
      return;
    }

    // Check if it's a legitimate email (not a test domain)
    if (this.isLegitimateValueForContext(user.email, "email")) {
      return;
    }

    // Only flag if it's in the generic values list (test emails)
    if (this.isGenericValue(user.email)) {
      indicators.push({
        field: "user.email",
        type: "generic_value",
        value: user.email,
        confidence: 0.9,
        reason: "Email matches obvious test email pattern (example.com, test.com)",
      });
    }
  }

  private checkUserFullName(user: DashboardData["user"], indicators: MockDataIndicator[]): void {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    // Don't check if empty
    if (fullName === "") {
      return;
    }

    // Don't check if it's a common legitimate name
    if (this.isExcludedName(fullName)) {
      return;
    }

    // Only flag if it's an EXACT placeholder text match (e.g., "PLACEHOLDER", "TEST_USER")
    // NOT partial matches or common names
    if (this.isStrictPlaceholderText(fullName)) {
      indicators.push({
        field: "user.name",
        type: "placeholder_text",
        value: fullName,
        confidence: 0.8,
        reason: "Name is exact placeholder text match",
      });
    }
  }

  /**
   * Check stats for mock data patterns
   * Enhanced to NOT flag zero values, round numbers, or common statistics
   * Only flags very specific mock data patterns
   *
   * IMPORTANT: Zero values are legitimate for new users
   * Round numbers (10, 20, 50, 100) are legitimate
   * Common small numbers (1, 2, 3, 5) are legitimate
   */
  private checkStatsMockData(stats: UserStats | ConsistentUserStats): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    // We only flag stats if they contain obvious test patterns
    // For example, all stats being exactly 999999999 or 123456789
    // These are clearly test values, not real user data

    const suspiciousTestValues = new Set([999999999, 123456789, -1]);
    const statsValues = [
      stats.totalFavorites,
      stats.totalDownloads,
      stats.totalOrders,
      stats.totalSpent,
    ];

    // Only flag if multiple stats have the exact same suspicious test value
    const suspiciousValueCounts = new Map<number, number>();
    for (const value of statsValues) {
      if (suspiciousTestValues.has(value)) {
        suspiciousValueCounts.set(value, (suspiciousValueCounts.get(value) || 0) + 1);
      }
    }

    // Flag only if we have 2 or more stats with the same suspicious value
    for (const [value, count] of suspiciousValueCounts.entries()) {
      if (count >= 2) {
        indicators.push({
          field: "stats",
          type: "test_data",
          value: value,
          confidence: 0.9,
          reason: `Multiple stats have suspicious test value: ${value}`,
        });
      }
    }

    return indicators;
  }

  /**
   * Check array data for mock patterns
   * Enhanced to handle empty arrays as legitimate (new users, no activity)
   * Uses context-aware validation for array items
   *
   * IMPORTANT: Empty arrays are completely legitimate and should NEVER be flagged
   * New users will have empty favorites, orders, downloads, etc.
   */
  private checkArrayMockData(arrayName: string, array: unknown[]): MockDataIndicator[] {
    // Empty arrays are legitimate for new users - do NOT flag
    if (array.length === 0) {
      return [];
    }

    return this.validateArrayItems(arrayName, array);
  }

  private validateArrayItems(arrayName: string, array: unknown[]): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    for (const [itemIndex, item] of array.entries()) {
      if (typeof item === "object" && item !== null) {
        const itemIndicators = this.checkObjectMockData(item as Record<string, unknown>);
        const highConfidenceIndicators = itemIndicators.filter(
          indicator => indicator.confidence >= 0.7
        );

        for (const indicator of highConfidenceIndicators) {
          indicators.push({
            ...indicator,
            field: `${arrayName}[${itemIndex}].${indicator.field}`,
          });
        }
      }
    }

    return indicators;
  }

  /**
   * Check object for mock data with context-aware validation
   * Enhanced to consider field context and avoid false positives
   */
  private checkObjectMockData(obj: Record<string, unknown>): MockDataIndicator[] {
    const indicators: MockDataIndicator[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        this.validateStringField(key, value, indicators);
      } else if (typeof value === "number") {
        this.validateNumberField(key, value, indicators);
      }
    }

    return indicators;
  }

  private validateStringField(key: string, value: string, indicators: MockDataIndicator[]): void {
    if (this.isExcludedValue(value)) {
      return;
    }

    const context = this.getFieldContext(key);

    if (this.isStrictPlaceholderText(value)) {
      if (this.isLegitimateValueForContext(value, context)) {
        return;
      }
      const placeholderIndicator: MockDataIndicator = {
        field: key,
        type: "placeholder_text",
        value,
        confidence: 0.8,
        reason: `Text matches strict placeholder pattern in ${context} context`,
      };
      indicators.push(placeholderIndicator);
      return;
    }

    if (this.isGenericValue(value)) {
      if (this.isLegitimateValueForContext(value, context)) {
        return;
      }
      const genericIndicator: MockDataIndicator = {
        field: key,
        type: "generic_value",
        value,
        confidence: 0.7,
        reason: `Value matches common test data pattern in ${context} context`,
      };
      indicators.push(genericIndicator);
    }
  }

  private validateNumberField(key: string, value: number, indicators: MockDataIndicator[]): void {
    // Don't flag if it's an excluded number (0, 1, 2, 3, 5, 10, 20, 50, 100, etc.)
    if (this.isExcludedNumber(value)) {
      return;
    }

    // Don't flag if it's not in the generic values list
    if (this.isGenericValue(value) === false) {
      return;
    }

    const context = this.getFieldContext(key);

    // Check if it's legitimate for the context
    if (this.isLegitimateNumberForContext(value, context)) {
      return;
    }

    const numberIndicator: MockDataIndicator = {
      field: key,
      type: "generic_value",
      value,
      confidence: 0.5,
      reason: `Number appears to be a common test value in ${context} context`,
    };
    indicators.push(numberIndicator);
  }

  /**
   * Get field context for context-aware validation
   * Determines what type of data the field should contain
   */
  private getFieldContext(
    fieldName: string
  ): "name" | "email" | "id" | "count" | "price" | "date" | "text" | "unknown" {
    const lowerField = fieldName.toLowerCase();

    if (lowerField.includes("name") || lowerField.includes("title")) {
      return "name";
    }
    if (lowerField.includes("email") || lowerField.includes("mail")) {
      return "email";
    }
    if (lowerField.includes("id") || lowerField === "key") {
      return "id";
    }
    if (
      lowerField.includes("count") ||
      lowerField.includes("total") ||
      lowerField.includes("number")
    ) {
      return "count";
    }
    if (
      lowerField.includes("price") ||
      lowerField.includes("amount") ||
      lowerField.includes("cost")
    ) {
      return "price";
    }
    if (lowerField.includes("date") || lowerField.includes("time") || lowerField.includes("at")) {
      return "date";
    }
    if (
      lowerField.includes("description") ||
      lowerField.includes("message") ||
      lowerField.includes("text")
    ) {
      return "text";
    }

    return "unknown";
  }

  /**
   * Check if a string value is legitimate for its context
   * Prevents false positives by considering what values are normal for each field type
   *
   * IMPORTANT: Common names like "John Smith" are legitimate and should NOT be flagged
   *
   * Future improvements could include:
   * - Machine learning-based pattern detection
   * - Domain-specific validation rules
   * - Integration with external validation services
   */
  private isLegitimateValueForContext(value: string, context: string): boolean {
    if (value === "" || value.trim() === "") {
      return true;
    }

    if (context === "name") {
      return this.isLegitimateNameValue(value);
    }

    if (context === "email") {
      return this.isLegitimateEmailValue(value);
    }

    // IDs, text, dates, and unknown contexts are always legitimate
    return true;
  }

  /**
   * Check if a name value is legitimate
   * Only flags obvious placeholder patterns like "test123", "placeholder_456"
   * Does NOT flag common real names
   */
  private isLegitimateNameValue(value: string): boolean {
    // Pattern for obvious test names with numbers: test123, placeholder_456, etc.
    const placeholderPattern = /^(test|placeholder|example|sample|mock|dummy|fake)(_|\s)?\d+$/i;
    return !placeholderPattern.test(value);
  }

  /**
   * Check if an email value is legitimate
   * Only flags obvious test domains: example.com, test.com, etc.
   * Does NOT flag real email providers
   */
  private isLegitimateEmailValue(value: string): boolean {
    const testDomains = ["example.com", "test.com", "example.org", "test.org"];
    return !testDomains.some(domain => value.toLowerCase().endsWith(`@${domain}`));
  }

  /**
   * Check if a number value is legitimate for its context
   * Prevents false positives by considering what numbers are normal for each field type
   *
   * IMPORTANT: Zero values are legitimate for new users
   * Round numbers (10, 20, 50, 100) are legitimate
   * Common small numbers (1, 2, 3, 5) are legitimate
   */
  private isLegitimateNumberForContext(value: number, context: string): boolean {
    switch (context) {
      case "count":
        // Zero and small numbers are completely legitimate for counts
        // New users will have zero counts
        // Round numbers are normal (10, 20, 50, 100)
        return true;

      case "price":
        // Common price points are legitimate (0, 10, 20, 50, 100, etc.)
        // Round numbers are normal for prices
        // Zero is legitimate for free items
        return true;

      case "id":
        // Any number can be an ID
        return true;

      default:
        // For unknown contexts, be conservative
        // Only flag very specific test values like 999999999 or 123456789
        return value !== 999999999 && value !== 123456789 && value !== -1;
    }
  }

  /**
   * Check for strict placeholder text using exact matches
   * Uses case-insensitive exact matching, not partial matches
   */
  private isStrictPlaceholderText(text: string): boolean {
    const trimmedText = text.trim();
    const lowerText = trimmedText.toLowerCase();

    // Check for exact matches (case-insensitive)
    const hasExactMatch = this.config.mockDataPatterns.placeholderTexts.some(
      pattern => lowerText === pattern.toLowerCase()
    );

    if (hasExactMatch) {
      return true;
    }

    // Check regex patterns with word boundaries
    return this.config.mockDataPatterns.testPatterns.some(pattern => pattern.test(trimmedText));
  }

  /**
   * Check if value is in generic test values list
   */
  private isGenericValue(value: string | number): boolean {
    return this.config.mockDataPatterns.genericValues.includes(value);
  }

  /**
   * Check if name is in excluded common names list
   */
  private isExcludedName(name: string): boolean {
    const trimmedName = name.trim();
    return this.config.excludedCommonValues.names.some(
      excludedName => trimmedName.toLowerCase() === excludedName.toLowerCase()
    );
  }

  /**
   * Check if number is in excluded common numbers list
   */
  private isExcludedNumber(value: number): boolean {
    return this.config.excludedCommonValues.numbers.includes(value);
  }

  /**
   * Check if value (string or number) is excluded
   */
  private isExcludedValue(value: string | number): boolean {
    if (typeof value === "string") {
      return this.isExcludedName(value);
    } else if (typeof value === "number") {
      return this.isExcludedNumber(value);
    }
    return false;
  }

  private checkDataFreshness(data: DashboardData): FreshnessWarning[] {
    try {
      const warnings: FreshnessWarning[] = [];
      const now = Date.now();

      this.checkStatsFreshness(data, now, warnings);
      this.checkActivityFreshness(data, now, warnings);

      return warnings;
    } catch (error) {
      this.logFreshnessCheckError(error);
      return [];
    }
  }

  private checkStatsFreshness(
    data: DashboardData,
    now: number,
    warnings: FreshnessWarning[]
  ): void {
    const consistentStats = data.stats as ConsistentUserStats;
    if (!consistentStats.calculatedAt) {
      return;
    }

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

  private checkActivityFreshness(
    data: DashboardData,
    now: number,
    warnings: FreshnessWarning[]
  ): void {
    if (data.activity.length === 0) {
      return;
    }

    const latestActivity = data.activity[0];
    if (!latestActivity.timestamp) {
      return;
    }

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

  private logFreshnessCheckError(error: unknown): void {
    if (!this.behaviorConfig.enableDetailedLogging) {
      return;
    }

    this.logger.logSystemEvent(
      `Data freshness check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "warn",
      {
        component: "DataValidationService",
        action: "checkDataFreshness",
      }
    );
  }

  private determineDataSource(
    data: DashboardData,
    mockIndicators: MockDataIndicator[],
    sourceResult?: SourceValidationResult
  ): FinalDataSource {
    // Priority 1: Use source validation result if available (highest priority)
    if (sourceResult) {
      if (sourceResult.isAuthenticated && sourceResult.confidence > 0.7) {
        return sourceResult.source;
      }
      if (sourceResult.confidence > 0.5) {
        return sourceResult.source;
      }
    }

    // Priority 2: Check for high-confidence mock indicators
    const highConfidenceMock = mockIndicators.filter(indicator => indicator.confidence > 0.8);
    if (highConfidenceMock.length > 0) {
      return "mock";
    }

    // Priority 3: Check if data has database-like characteristics from stats
    const consistentStats = data.stats as ConsistentUserStats;
    if (consistentStats.source) {
      return consistentStats.source === "database" ? "database" : "cache";
    }

    // Priority 4: Check for lower confidence mock indicators
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
    for (const activity of data.activity) {
      if (activity.timestamp) {
        timestamps.push(new Date(activity.timestamp).getTime());
      }
    }

    // Add order timestamps
    for (const order of data.orders) {
      if (order.updatedAt) {
        timestamps.push(new Date(order.updatedAt).getTime());
      }
    }

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
    for (const activity of data.activity) {
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
    }

    return inconsistencies;
  }

  private validateTimestampConsistency(data: DashboardData): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];
    const now = Date.now();

    // Check for future timestamps
    const checkFutureTimestamp = (timestamp: string, field: string): void => {
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
    for (const [activityIndex, activity] of data.activity.entries()) {
      if (activity.timestamp) {
        checkFutureTimestamp(activity.timestamp, `activity[${activityIndex}]`);
      }
    }

    // Check order timestamps
    for (const [orderIndex, order] of data.orders.entries()) {
      if (order.createdAt) {
        checkFutureTimestamp(order.createdAt, `orders[${orderIndex}]`);
      }
      if (order.updatedAt) {
        checkFutureTimestamp(order.updatedAt, `orders[${orderIndex}]`);
      }
    }

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
      for (const indicator of sourceValidation.mockIndicators) {
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
      }
    }

    // Add validation errors as inconsistencies
    for (const error of dataValidation.errors) {
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
    }

    return inconsistencies;
  }

  private determineOverallStatus(
    sourceValidation: DataSourceValidation,
    crossValidation: CrossValidationResult,
    dataValidation: ValidationResult,
    inconsistencies: Inconsistency[]
  ): IntegrityStatus {
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
    status: IntegrityStatus,
    sourceValidation: DataSourceValidation,
    crossValidation: CrossValidationResult,
    _inconsistencies: Inconsistency[]
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
          if (globalThis.window !== undefined) {
            globalThis.window.location.reload();
          }
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

  /**
   * Create a fallback source validation result when validation fails
   * Defaults to trusting the data to prevent false positives
   */
  private createFallbackSourceValidation(
    data: DashboardData,
    startTime: number
  ): DataSourceValidation {
    return {
      isRealData: true, // Default to trusting data when validation fails
      hasMockData: false,
      isFresh: true,
      dataAge: this.calculateDataAge(data),
      source: "database", // Assume database source
      validatedAt: startTime,
      mockIndicators: [],
      freshnessWarnings: [],
      idValidations: {
        hasValidIds: false,
        validIdCount: 0,
        confidence: 0.5, // Neutral confidence when validation fails
        results: [],
      },
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

  /**
   * Generate cache key that includes source validation metadata
   * Enhanced to include source type and authentication status for better cache granularity
   */
  private generateCacheKey(data: DashboardData): string {
    const baseHash = generateDataHash(data);

    // Include source metadata in cache key
    const stats = data.stats as ConsistentUserStats;
    const sourceType = stats.source || "unknown";

    // Include ID count for better cache differentiation
    const idCount = this.countDataIds(data);

    // Include timestamp count
    const timestampCount = this.sourceValidator.countTimestamps(data);

    // Combine into cache key
    return `${baseHash}_${sourceType}_${idCount}_${timestampCount}`;
  }

  /**
   * Count total IDs in dashboard data for cache key generation
   */
  private countDataIds(data: DashboardData): number {
    let count = 0;

    if (data.user.id) count++;
    count += data.favorites.filter(f => f.id).length;
    count += data.orders.filter(o => o.id).length;
    count += data.downloads.filter(d => d.id).length;
    count += data.reservations.filter(r => r.id).length;
    count += data.activity.filter(a => a.id).length;

    return count;
  }

  /**
   * Get cache TTL based on validation confidence
   * Higher confidence = longer cache duration
   * Lower confidence = shorter cache duration for more frequent revalidation
   */
  private getCacheTTL(confidence: number): number {
    // Base TTL values in milliseconds
    const HIGH_CONFIDENCE_TTL = 5 * 60 * 1000; // 5 minutes
    const MEDIUM_CONFIDENCE_TTL = 2 * 60 * 1000; // 2 minutes
    const LOW_CONFIDENCE_TTL = 30 * 1000; // 30 seconds
    const UNCERTAIN_TTL = 10 * 1000; // 10 seconds

    if (confidence >= 0.9) {
      return HIGH_CONFIDENCE_TTL;
    } else if (confidence >= 0.7) {
      return MEDIUM_CONFIDENCE_TTL;
    } else if (confidence >= 0.5) {
      return LOW_CONFIDENCE_TTL;
    } else {
      return UNCERTAIN_TTL;
    }
  }

  /**
   * Check if cached report is still valid based on confidence-adjusted TTL
   */
  private isCacheValid(report: DataIntegrityReport): boolean {
    const confidence = report.sourceValidation.isRealData ? 0.9 : 0.5;
    const ttl = this.getCacheTTL(confidence);
    const age = Date.now() - report.generatedAt;

    return age < ttl;
  }

  /**
   * Invalidate cache entries when data source changes
   * This ensures fresh validation when data is updated
   */
  public invalidateCacheForSource(sourceType: "database" | "cache" | "unknown"): void {
    const keysToDelete: string[] = [];

    for (const [key, report] of this.validationCache.entries()) {
      // Invalidate if source matches
      if (report.sourceValidation.source === sourceType) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.validationCache.delete(key);
    }

    if (this.behaviorConfig.enableDetailedLogging && keysToDelete.length > 0) {
      this.logger.logSystemEvent(
        `Invalidated ${keysToDelete.length} cache entries for source: ${sourceType}`,
        "info",
        { component: "DataValidationService" }
      );
    }
  }

  /**
   * Invalidate all cache entries (force revalidation)
   */
  public invalidateAllCache(): void {
    const count = this.validationCache.size;
    this.validationCache.clear();

    if (this.behaviorConfig.enableDetailedLogging && count > 0) {
      this.logger.logSystemEvent(`Cleared all ${count} validation cache entries`, "info", {
        component: "DataValidationService",
      });
    }
  }

  /**
   * Cleanup old validation cache entries
   * Enhanced to use confidence-based TTL and remove stale entries more aggressively
   */
  private cleanupValidationCache(): void {
    const keysToDelete: string[] = [];
    const now = Date.now();

    for (const [key, report] of this.validationCache.entries()) {
      // Use confidence-based TTL for cleanup
      if (!this.isCacheValid(report)) {
        keysToDelete.push(key);
      }
    }

    // Also remove entries older than absolute maximum age (10 minutes)
    const absoluteMaxAge = 10 * 60 * 1000;
    for (const [key, report] of this.validationCache.entries()) {
      if (now - report.generatedAt > absoluteMaxAge) {
        if (!keysToDelete.includes(key)) {
          keysToDelete.push(key);
        }
      }
    }

    for (const key of keysToDelete) {
      this.validationCache.delete(key);
    }

    // Log cleanup in development mode
    if (this.behaviorConfig.enableDetailedLogging && keysToDelete.length > 0) {
      this.logger.logSystemEvent(
        `Cleaned up ${keysToDelete.length} stale validation cache entries (remaining: ${this.validationCache.size})`,
        "info",
        { component: "DataValidationService" }
      );
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): {
    size: number;
    entries: Array<{
      key: string;
      age: number;
      confidence: number;
      source: string;
      isValid: boolean;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.validationCache.entries()).map(([key, report]) => ({
      key,
      age: now - report.generatedAt,
      confidence: report.sourceValidation.isRealData ? 0.9 : 0.5,
      source: report.sourceValidation.source,
      isValid: this.isCacheValid(report),
    }));

    return {
      size: this.validationCache.size,
      entries,
    };
  }

  /**
   * Create a fallback integrity report when validation fails
   * Used in production with silent failure mode to prevent crashes
   */
  private createFallbackIntegrityReport(
    data: DashboardData,
    reportId: string,
    startTime: number
  ): DataIntegrityReport {
    // In production, default to trusting the data when validation fails
    // This prevents false positives and user-facing errors
    const sourceValidation: DataSourceValidation = {
      isRealData: true, // Trust the data by default
      hasMockData: false,
      isFresh: true,
      dataAge: this.calculateDataAge(data),
      source: "database", // Assume database source
      validatedAt: startTime,
      mockIndicators: [],
      freshnessWarnings: [],
    };

    const crossValidation: CrossValidationResult = {
      consistent: true,
      inconsistencies: [],
      affectedSections: [],
      recommendedAction: "ignore",
    };

    const dataValidation: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      dataHash: generateDataHash(data),
      validatedAt: startTime,
    };

    return {
      status: "valid",
      sourceValidation,
      crossValidation,
      dataValidation,
      inconsistencies: [],
      recommendations: [],
      generatedAt: startTime,
      reportId,
    };
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
  config?: Partial<IntegrityCheckConfig>,
  environment?: Environment
): DataValidationService => {
  dataValidationServiceInstance ??= new DataValidationService(config, environment);
  return dataValidationServiceInstance;
};

export const destroyDataValidationService = (): void => {
  if (dataValidationServiceInstance !== null) {
    dataValidationServiceInstance.destroy();
    dataValidationServiceInstance = null;
  }
};
