// User behavior analytics types and interfaces

export interface UserInteraction {
  id: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  type: InteractionType;
  component: string;
  action: string;
  target?: string;
  metadata: Record<string, unknown>;
  url: string;
  userAgent?: string;
  deviceType?: DeviceType;
  screenResolution?: string;
  duration?: number;
  value?: number;
}

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

export type DeviceType = "desktop" | "tablet" | "mobile" | "unknown";

export interface UserSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  interactions: number;
  bounceRate: boolean;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType: DeviceType;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
}

export interface ConversionFunnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface FunnelStep {
  id: string;
  name: string;
  description: string;
  order: number;
  conditions: FunnelCondition[];
  requiredInteractions: InteractionType[];
  timeLimit?: number; // milliseconds
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
