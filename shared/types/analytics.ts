/**
 * User Behavior Analytics Type Definitions for BroLab Entertainment
 *
 * This module contains all type definitions related to user behavior tracking,
 * analytics, conversion funnels, and insights for the BroLab Entertainment
 * marketplace platform.
 */

// ================================
// CORE INTERFACES
// ================================

/**
 * User interaction event for analytics tracking
 */
export interface UserInteraction {
  /** Unique interaction identifier */
  id: string;
  /** User ID if authenticated */
  userId?: string;
  /** Session identifier */
  sessionId: string;
  /** Timestamp when interaction occurred */
  timestamp: number;
  /** Type of interaction */
  type: InteractionType;
  /** Component where interaction occurred */
  component: string;
  /** Action performed */
  action: string;
  /** Target element or identifier */
  target?: string;
  /** Additional interaction metadata */
  metadata: Record<string, unknown>;
  /** URL where interaction occurred */
  url: string;
  /** User agent string */
  userAgent?: string;
  /** Device type */
  deviceType?: DeviceType;
  /** Screen resolution */
  screenResolution?: string;
  /** Duration of interaction in milliseconds */
  duration?: number;
  /** Monetary value associated with interaction */
  value?: number;
}

/**
 * Types of user interactions that can be tracked
 */
export type InteractionType =
  | "click"
  | "view"
  | "scroll"
  | "search"
  | "filter"
  | "play"
  | "pause"
  | "download"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout"
  | "purchase"
  | "favorite"
  | "unfavorite"
  | "share"
  | "navigation"
  | "form_submit"
  | "error"
  | "page_load"
  | "page_unload";

/**
 * Device types for analytics categorization
 */
export type DeviceType = "desktop" | "tablet" | "mobile" | "unknown";

/**
 * User session information for analytics tracking
 */
export interface UserSession {
  /** Unique session identifier */
  id: string;
  /** User ID if authenticated */
  userId?: string;
  /** Session start timestamp */
  startTime: number;
  /** Session end timestamp */
  endTime?: number;
  /** Total session duration in milliseconds */
  duration?: number;
  /** Number of page views in session */
  pageViews: number;
  /** Number of interactions in session */
  interactions: number;
  /** Whether this was a bounce session */
  bounceRate: boolean;
  /** Referrer URL */
  referrer?: string;
  /** UTM source parameter */
  utmSource?: string;
  /** UTM medium parameter */
  utmMedium?: string;
  /** UTM campaign parameter */
  utmCampaign?: string;
  /** Device type used */
  deviceType: DeviceType;
  /** Browser name */
  browser?: string;
  /** Operating system */
  os?: string;
  /** User's country */
  country?: string;
  /** User's city */
  city?: string;
}

/**
 * Conversion funnel configuration for tracking user journeys
 */
export interface ConversionFunnel {
  /** Unique funnel identifier */
  id: string;
  /** Funnel name */
  name: string;
  /** Ordered list of funnel steps */
  steps: FunnelStep[];
  /** When funnel was created */
  createdAt: number;
  /** When funnel was last updated */
  updatedAt: number;
  /** Whether funnel is currently active */
  isActive: boolean;
}

/**
 * Individual step within a conversion funnel
 */
export interface FunnelStep {
  /** Unique step identifier */
  id: string;
  /** Step name */
  name: string;
  /** Step description */
  description: string;
  /** Step order in funnel */
  order: number;
  /** Conditions that must be met for this step */
  conditions: FunnelCondition[];
  /** Required interaction types for step completion */
  requiredInteractions: InteractionType[];
  /** Time limit for completing step in milliseconds */
  timeLimit?: number;
}

export interface FunnelCondition {
  field: string;
  operator: "equals" | "contains" | "starts_with" | "ends_with" | "greater_than" | "less_than";
  value: string | number | boolean;
}

export interface FunnelAnalysis {
  funnelId: string;
  timeRange: TimeRange;
  totalUsers: number;
  stepAnalysis: FunnelStepAnalysis[];
  conversionRate: number;
  dropOffPoints: DropOffPoint[];
  averageTimeToConvert: number;
  topExitPages: Array<{ page: string; exitRate: number }>;
}

export interface FunnelStepAnalysis {
  stepId: string;
  stepName: string;
  usersEntered: number;
  usersCompleted: number;
  conversionRate: number;
  averageTimeSpent: number;
  dropOffRate: number;
  topExitReasons: Array<{ reason: string; count: number }>;
}

export interface DropOffPoint {
  stepId: string;
  stepName: string;
  dropOffRate: number;
  commonExitPages: string[];
  suggestedOptimizations: string[];
}

export interface UserBehaviorInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-1
  timeRange: TimeRange;
  affectedUsers: number;
  metrics: Record<string, number>;
  recommendations: string[];
  createdAt: number;
}

export type InsightType =
  | "conversion_drop"
  | "engagement_increase"
  | "performance_issue"
  | "user_flow_optimization"
  | "feature_adoption"
  | "retention_risk"
  | "revenue_opportunity";

export interface AnalyticsDashboardData {
  overview: AnalyticsOverview;
  userBehavior: UserBehaviorMetrics;
  conversionFunnels: FunnelAnalysis[];
  insights: UserBehaviorInsight[];
  realTimeMetrics: RealTimeMetrics;
  timeRange: TimeRange;
  lastUpdated: number;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  pageViews: number;
  uniquePageViews: number;
  conversionRate: number;
  revenue: number;
}

export interface UserBehaviorMetrics {
  topPages: Array<{ page: string; views: number; uniqueViews: number }>;
  topActions: Array<{ action: string; count: number; conversionRate: number }>;
  userFlows: Array<{ path: string; users: number; conversionRate: number }>;
  deviceBreakdown: Record<DeviceType, number>;
  browserBreakdown: Record<string, number>;
  geographicBreakdown: Record<string, number>;
  timeOfDayActivity: Array<{ hour: number; activity: number }>;
  dayOfWeekActivity: Array<{ day: string; activity: number }>;
}

export interface RealTimeMetrics {
  activeUsers: number;
  currentPageViews: Record<string, number>;
  recentInteractions: UserInteraction[];
  liveConversions: number;
  systemLoad: number;
  errorRate: number;
}

export interface PrivacySettings {
  trackingEnabled: boolean;
  anonymizeIPs: boolean;
  respectDoNotTrack: boolean;
  cookieConsent: boolean;
  dataRetentionDays: number;
  allowPersonalization: boolean;
  shareWithThirdParties: boolean;
  gdprCompliant: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  privacy: PrivacySettings;
  sampling: {
    enabled: boolean;
    rate: number; // 0-1
  };
  realTime: {
    enabled: boolean;
    updateInterval: number; // milliseconds
  };
  storage: {
    local: boolean;
    remote: boolean;
    compression: boolean;
  };
  debug: boolean;
}

export interface TimeRange {
  start: number;
  end: number;
}

// Analytics Manager Interface
export interface AnalyticsManager {
  // Core tracking
  trackInteraction(interaction: Omit<UserInteraction, "id" | "timestamp">): Promise<void>;
  trackPageView(page: string, metadata?: Record<string, unknown>): Promise<void>;
  trackConversion(funnelId: string, stepId: string, value?: number): Promise<void>;

  // Session management
  startSession(userId?: string): Promise<string>;
  endSession(sessionId: string): Promise<void>;
  updateSession(sessionId: string, updates: Partial<UserSession>): Promise<void>;

  // Funnel management
  createFunnel(funnel: Omit<ConversionFunnel, "id" | "createdAt" | "updatedAt">): Promise<string>;
  updateFunnel(funnelId: string, updates: Partial<ConversionFunnel>): Promise<void>;
  deleteFunnel(funnelId: string): Promise<void>;
  getFunnels(): Promise<ConversionFunnel[]>;

  // Analytics queries
  getDashboardData(timeRange: TimeRange): Promise<AnalyticsDashboardData>;
  getFunnelAnalysis(funnelId: string, timeRange: TimeRange): Promise<FunnelAnalysis>;
  getUserBehaviorInsights(timeRange: TimeRange): Promise<UserBehaviorInsight[]>;
  getRealTimeMetrics(): Promise<RealTimeMetrics>;

  // Privacy and compliance
  setPrivacySettings(settings: Partial<PrivacySettings>): Promise<void>;
  getPrivacySettings(): Promise<PrivacySettings>;
  anonymizeUser(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<UserInteraction[]>;
  deleteUserData(userId: string): Promise<void>;

  // Configuration
  configure(config: Partial<AnalyticsConfig>): void;
  getConfig(): AnalyticsConfig;

  // Utilities
  isTrackingAllowed(): boolean;
  shouldSample(): boolean;
  generateInsights(timeRange: TimeRange): Promise<UserBehaviorInsight[]>;
}

// Event types for real-time updates
export interface AnalyticsEvent {
  type: "interaction" | "conversion" | "insight" | "error";
  data: UserInteraction | FunnelAnalysis | UserBehaviorInsight | Error;
  timestamp: number;
}

export type AnalyticsEventHandler = (event: AnalyticsEvent) => void;
