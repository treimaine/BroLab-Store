// User behavior analytics manager implementation

import {
  AnalyticsConfig,
  AnalyticsDashboardData,
  AnalyticsEvent,
  AnalyticsEventHandler,
  AnalyticsManager,
  ConversionFunnel,
  DeviceType,
  FunnelAnalysis,
  PrivacySettings,
  RealTimeMetrics,
  TimeRange,
  UserBehaviorInsight,
  UserInteraction,
  UserSession,
} from "../types/analytics";

interface GlobalWithStorage {
  localStorage?: Storage;
}

class AnalyticsManagerImpl implements AnalyticsManager {
  private config: AnalyticsConfig;
  private currentSession: UserSession | null = null;
  private interactions: UserInteraction[] = [];
  private sessions: UserSession[] = [];
  private funnels: ConversionFunnel[] = [];
  private eventHandlers: AnalyticsEventHandler[] = [];
  private privacySettings: PrivacySettings;
  private realTimeInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = this.getDefaultConfig();
    this.privacySettings = this.getDefaultPrivacySettings();
    this.initializeTracking();
  }

  private getDefaultConfig(): AnalyticsConfig {
    return {
      enabled: true,
      privacy: this.getDefaultPrivacySettings(),
      sampling: {
        enabled: false,
        rate: 1,
      },
      realTime: {
        enabled: true,
        updateInterval: 5000,
      },
      storage: {
        local: true,
        remote: true,
        compression: false,
      },
      debug: process.env.NODE_ENV === "development",
    };
  }

  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      trackingEnabled: true,
      anonymizeIPs: true,
      respectDoNotTrack: true,
      cookieConsent: false,
      dataRetentionDays: 365,
      allowPersonalization: true,
      shareWithThirdParties: false,
      gdprCompliant: true,
    };
  }

  private initializeTracking(): void {
    if (globalThis.window === undefined) {
      return;
    }

    // Check for Do Not Track
    if (this.privacySettings.respectDoNotTrack && navigator.doNotTrack === "1") {
      this.privacySettings.trackingEnabled = false;
      this.config.enabled = false;
      return;
    }

    // Start session automatically
    this.startSession();

    // Track page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.currentSession) {
        this.endSession(this.currentSession.id);
      } else if (!document.hidden && !this.currentSession) {
        this.startSession();
      }
    });

    // Track page unload
    globalThis.window.addEventListener("beforeunload", () => {
      if (this.currentSession) {
        this.endSession(this.currentSession.id);
      }
    });

    // Start real-time updates if enabled
    if (this.config.realTime.enabled) {
      this.startRealTimeUpdates();
    }
  }

  private startRealTimeUpdates(): void {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
    }

    this.realTimeInterval = setInterval(async () => {
      try {
        await this.getRealTimeMetrics();
        // Real-time metrics are available via getRealTimeMetrics() method
        // No event emission needed here as metrics are fetched on demand
      } catch (error) {
        if (this.config.debug) {
          console.error("Failed to update real-time metrics:", error);
        }
      }
    }, this.config.realTime.updateInterval);
  }

  private emitEvent(event: AnalyticsEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        if (this.config.debug) {
          console.error("Analytics event handler error:", error);
        }
      }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateInteractionId(): string {
    return `interaction_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private detectDeviceType(): DeviceType {
    if (globalThis.window === undefined) return "unknown";

    const userAgent = navigator.userAgent.toLowerCase();
    const width = globalThis.window.innerWidth;

    // Mobile device detection pattern
    if (/mobile|android|iphone|ipod|blackberry|opera mini/i.test(userAgent)) {
      return "mobile";
    } else if (/tablet|ipad/i.test(userAgent) || (width >= 768 && width <= 1024)) {
      return "tablet";
    } else {
      return "desktop";
    }
  }

  private shouldTrack(): boolean {
    if (!this.config.enabled || !this.privacySettings.trackingEnabled) {
      return false;
    }

    if (this.config.sampling.enabled && !this.shouldSample()) {
      return false;
    }

    return true;
  }

  // Public API Implementation

  async trackInteraction(interaction: Omit<UserInteraction, "id" | "timestamp">): Promise<void> {
    if (!this.shouldTrack()) return;

    const fullInteraction: UserInteraction = {
      ...interaction,
      id: this.generateInteractionId(),
      timestamp: Date.now(),
      sessionId: this.currentSession?.id || "unknown",
      deviceType: this.detectDeviceType(),
      screenResolution:
        globalThis.window === undefined
          ? undefined
          : `${globalThis.window.screen.width}x${globalThis.window.screen.height}`,
      userAgent: globalThis.navigator === undefined ? undefined : navigator.userAgent,
    };

    this.interactions.push(fullInteraction);

    // Update current session
    if (this.currentSession) {
      this.currentSession.interactions++;
      this.currentSession.endTime = Date.now();
      this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    }

    // Emit event for real-time updates
    this.emitEvent({
      type: "interaction",
      data: fullInteraction,
      timestamp: Date.now(),
    });

    // Store locally if enabled
    if (this.config.storage.local) {
      try {
        const storage =
          globalThis.window === undefined
            ? (globalThis as GlobalWithStorage).localStorage
            : globalThis.window.localStorage;
        if (storage) {
          const stored = storage.getItem("analytics_interactions") || "[]";
          const interactions = JSON.parse(stored) as UserInteraction[];
          interactions.push(fullInteraction);

          // Keep only recent interactions to prevent storage bloat
          const recent = interactions.slice(-1000);
          storage.setItem("analytics_interactions", JSON.stringify(recent));
        }
      } catch (error) {
        if (this.config.debug) {
          console.error("Failed to store interaction locally:", error);
        }
      }
    }

    if (this.config.debug) {
      console.log("Tracked interaction:", fullInteraction);
    }
  }

  async trackPageView(page: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await this.trackInteraction({
      sessionId: this.currentSession?.id || "unknown",
      type: "page_load",
      component: "page",
      action: "view",
      target: page,
      url: globalThis.window === undefined ? page : globalThis.window.location.href,
      metadata: {
        ...metadata,
        referrer: globalThis.document === undefined ? undefined : document.referrer,
      },
    });

    // Update session page views
    if (this.currentSession) {
      this.currentSession.pageViews++;
    }
  }

  async trackConversion(funnelId: string, stepId: string, value?: number): Promise<void> {
    const currentUrl = globalThis.window === undefined ? "" : globalThis.window.location.href;

    await this.trackInteraction({
      sessionId: this.currentSession?.id || "unknown",
      type: "purchase",
      component: "funnel",
      action: "conversion",
      target: stepId,
      url: currentUrl,
      value,
      metadata: {
        funnelId,
        stepId,
        conversionValue: value,
      },
    });

    // Emit conversion event
    this.emitEvent({
      type: "conversion",
      data: {
        id: `conversion_${Date.now()}`,
        sessionId: this.currentSession?.id || "unknown",
        type: "purchase",
        component: "funnel",
        action: "conversion",
        target: stepId,
        url: currentUrl,
        timestamp: Date.now(),
        value,
        metadata: { funnelId, stepId },
      } as UserInteraction,
      timestamp: Date.now(),
    });
  }

  async startSession(userId?: string): Promise<string> {
    const sessionId = this.generateSessionId();

    this.currentSession = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      pageViews: 0,
      interactions: 0,
      bounceRate: false,
      deviceType: this.detectDeviceType(),
      referrer: globalThis.document === undefined ? undefined : document.referrer,
      browser: globalThis.navigator === undefined ? undefined : navigator.userAgent,
      os: globalThis.navigator === undefined ? undefined : navigator.userAgent,
    };

    this.sessions.push(this.currentSession);

    if (this.config.debug) {
      console.log("Started session:", sessionId);
    }

    return sessionId;
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.bounceRate = session.pageViews <= 1 && session.interactions <= 1;

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }

    if (this.config.debug) {
      console.log("Ended session:", sessionId, session);
    }
  }

  async updateSession(sessionId: string, updates: Partial<UserSession>): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  async createFunnel(
    funnel: Omit<ConversionFunnel, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = `funnel_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newFunnel: ConversionFunnel = {
      ...funnel,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.funnels.push(newFunnel);
    return id;
  }

  async updateFunnel(funnelId: string, updates: Partial<ConversionFunnel>): Promise<void> {
    const funnel = this.funnels.find(f => f.id === funnelId);
    if (funnel) {
      Object.assign(funnel, updates, { updatedAt: Date.now() });
    }
  }

  async deleteFunnel(funnelId: string): Promise<void> {
    const index = this.funnels.findIndex(f => f.id === funnelId);
    if (index !== -1) {
      this.funnels.splice(index, 1);
    }
  }

  async getFunnels(): Promise<ConversionFunnel[]> {
    return [...this.funnels];
  }

  async getDashboardData(timeRange: TimeRange): Promise<AnalyticsDashboardData> {
    const filteredInteractions = this.interactions.filter(
      i => i.timestamp >= timeRange.start && i.timestamp <= timeRange.end
    );

    const filteredSessions = this.sessions.filter(
      s => s.startTime >= timeRange.start && s.startTime <= timeRange.end
    );

    const totalUsers = new Set(filteredSessions.map(s => s.userId).filter(Boolean)).size;
    const totalSessions = filteredSessions.length;
    const totalPageViews = filteredSessions.reduce((sum, s) => sum + s.pageViews, 0);

    return {
      overview: {
        totalUsers,
        activeUsers: filteredSessions.filter(s => !s.endTime || Date.now() - s.startTime < 300000)
          .length,
        newUsers: filteredSessions.filter(
          s =>
            s.userId &&
            !this.sessions.some(prev => prev.userId === s.userId && prev.startTime < s.startTime)
        ).length,
        returningUsers:
          totalUsers -
          filteredSessions.filter(
            s =>
              s.userId &&
              !this.sessions.some(prev => prev.userId === s.userId && prev.startTime < s.startTime)
          ).length,
        averageSessionDuration:
          filteredSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / totalSessions || 0,
        bounceRate: filteredSessions.filter(s => s.bounceRate).length / totalSessions || 0,
        pageViews: totalPageViews,
        uniquePageViews: new Set(
          filteredInteractions.filter(i => i.type === "page_load").map(i => i.url)
        ).size,
        conversionRate:
          filteredInteractions.filter(i => i.type === "purchase").length / totalSessions || 0,
        revenue: filteredInteractions
          .filter(i => i.type === "purchase")
          .reduce((sum, i) => sum + (i.value || 0), 0),
      },
      userBehavior: {
        topPages: this.getTopPages(filteredInteractions),
        topActions: this.getTopActions(filteredInteractions),
        userFlows: this.getUserFlows(filteredSessions),
        deviceBreakdown: this.getDeviceBreakdown(filteredSessions),
        browserBreakdown: this.getBrowserBreakdown(filteredSessions),
        geographicBreakdown: this.getGeographicBreakdown(filteredSessions),
        timeOfDayActivity: this.getTimeOfDayActivity(filteredInteractions),
        dayOfWeekActivity: this.getDayOfWeekActivity(filteredInteractions),
      },
      conversionFunnels: await Promise.all(
        this.funnels.map(f => this.getFunnelAnalysis(f.id, timeRange))
      ),
      insights: await this.getUserBehaviorInsights(timeRange),
      realTimeMetrics: await this.getRealTimeMetrics(),
      timeRange,
      lastUpdated: Date.now(),
    };
  }

  private getTopPages(interactions: UserInteraction[]): Array<{
    page: string;
    views: number;
    uniqueViews: number;
  }> {
    const pageViews = interactions.filter(i => i.type === "page_load");
    const pageCounts = pageViews.reduce(
      (acc, i) => {
        acc[i.url] = (acc[i.url] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(pageCounts)
      .map(([page, views]) => ({
        page,
        views,
        uniqueViews: new Set(pageViews.filter(i => i.url === page).map(i => i.sessionId)).size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private getTopActions(interactions: UserInteraction[]): Array<{
    action: string;
    count: number;
    conversionRate: number;
  }> {
    const actionCounts = interactions.reduce(
      (acc, i) => {
        const key = `${i.component}:${i.action}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(actionCounts)
      .map(([action, count]) => ({
        action,
        count,
        conversionRate:
          interactions.filter(i => `${i.component}:${i.action}` === action && i.type === "purchase")
            .length / count || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getUserFlows(sessions: UserSession[]): Array<{
    path: string;
    users: number;
    conversionRate: number;
  }> {
    // Simplified user flow analysis
    return sessions
      .filter(s => s.pageViews > 1)
      .map(s => ({
        path: `${s.pageViews} pages`,
        users: 1,
        conversionRate: s.interactions > 5 ? 0.1 : 0.05,
      }))
      .slice(0, 10);
  }

  private getDeviceBreakdown(sessions: UserSession[]): Record<DeviceType, number> {
    return sessions.reduce(
      (acc, s) => {
        acc[s.deviceType] = (acc[s.deviceType] || 0) + 1;
        return acc;
      },
      {} as Record<DeviceType, number>
    );
  }

  private getBrowserBreakdown(sessions: UserSession[]): Record<string, number> {
    return sessions.reduce(
      (acc, s) => {
        const browser = s.browser?.split(" ")[0] || "Unknown";
        acc[browser] = (acc[browser] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private getGeographicBreakdown(sessions: UserSession[]): Record<string, number> {
    return sessions.reduce(
      (acc, s) => {
        const country = s.country || "Unknown";
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private getTimeOfDayActivity(interactions: UserInteraction[]): Array<{
    hour: number;
    activity: number;
  }> {
    const hourlyActivity = new Array(24).fill(0) as number[];
    interactions.forEach(i => {
      const hour = new Date(i.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    return hourlyActivity.map((activity, hour) => ({ hour, activity }));
  }

  private getDayOfWeekActivity(interactions: UserInteraction[]): Array<{
    day: string;
    activity: number;
  }> {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dailyActivity = new Array(7).fill(0) as number[];

    interactions.forEach(i => {
      const day = new Date(i.timestamp).getDay();
      dailyActivity[day]++;
    });

    return dailyActivity.map((activity, index) => ({ day: days[index], activity }));
  }

  async getFunnelAnalysis(funnelId: string, timeRange: TimeRange): Promise<FunnelAnalysis> {
    const funnel = this.funnels.find(f => f.id === funnelId);
    if (!funnel) {
      throw new Error(`Funnel ${funnelId} not found`);
    }

    const relevantInteractions = this.interactions.filter(
      i => i.timestamp >= timeRange.start && i.timestamp <= timeRange.end
    );

    // Simplified funnel analysis
    const totalUsers = new Set(relevantInteractions.map(i => i.sessionId)).size;

    return {
      funnelId,
      timeRange,
      totalUsers,
      stepAnalysis: funnel.steps.map(step => ({
        stepId: step.id,
        stepName: step.name,
        usersEntered: Math.floor(totalUsers * 0.8), // Simplified
        usersCompleted: Math.floor(totalUsers * 0.6), // Simplified
        conversionRate: 0.75, // Simplified
        averageTimeSpent: 30000, // 30 seconds
        dropOffRate: 0.25,
        topExitReasons: [
          { reason: "Page load timeout", count: 5 },
          { reason: "Form validation error", count: 3 },
        ],
      })),
      conversionRate: 0.6,
      dropOffPoints: [],
      averageTimeToConvert: 120000, // 2 minutes
      topExitPages: [
        { page: "/checkout", exitRate: 0.3 },
        { page: "/cart", exitRate: 0.2 },
      ],
    };
  }

  async getUserBehaviorInsights(timeRange: TimeRange): Promise<UserBehaviorInsight[]> {
    // Generate insights based on interaction patterns
    const insights: UserBehaviorInsight[] = [];

    // Example insight: High bounce rate
    const sessions = this.sessions.filter(
      s => s.startTime >= timeRange.start && s.startTime <= timeRange.end
    );
    const bounceRate = sessions.filter(s => s.bounceRate).length / sessions.length;

    if (bounceRate > 0.7) {
      insights.push({
        id: `insight_${Date.now()}_bounce`,
        type: "user_flow_optimization",
        title: "High Bounce Rate Detected",
        description: `Bounce rate is ${(bounceRate * 100).toFixed(1)}%, which is above the recommended threshold.`,
        impact: "high",
        confidence: 0.9,
        timeRange,
        affectedUsers: sessions.filter(s => s.bounceRate).length,
        metrics: { bounceRate, threshold: 0.5 },
        recommendations: [
          "Improve page load speed",
          "Enhance content relevance",
          "Optimize call-to-action placement",
        ],
        createdAt: Date.now(),
      });
    }

    return insights;
  }

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const recentInteractions = this.interactions.filter(i => i.timestamp >= fiveMinutesAgo);
    const activeSessions = this.sessions.filter(
      s => !s.endTime || now - s.startTime < 300000 // 5 minutes
    );

    return {
      activeUsers: activeSessions.length,
      currentPageViews: recentInteractions
        .filter(i => i.type === "page_load")
        .reduce(
          (acc, i) => {
            acc[i.url] = (acc[i.url] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      recentInteractions: recentInteractions.slice(-10),
      liveConversions: recentInteractions.filter(i => i.type === "purchase").length,
      systemLoad: Math.random() * 100, // Placeholder
      errorRate:
        recentInteractions.filter(i => i.type === "error").length / recentInteractions.length || 0,
    };
  }

  async setPrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    this.privacySettings = { ...this.privacySettings, ...settings };

    if (!settings.trackingEnabled) {
      this.config.enabled = false;
    }
  }

  async getPrivacySettings(): Promise<PrivacySettings> {
    return { ...this.privacySettings };
  }

  async anonymizeUser(userId: string): Promise<void> {
    // Remove user ID from all interactions and sessions
    this.interactions.forEach(i => {
      if (i.userId === userId) {
        i.userId = undefined;
      }
    });

    this.sessions.forEach(s => {
      if (s.userId === userId) {
        s.userId = undefined;
      }
    });
  }

  async exportUserData(userId: string): Promise<UserInteraction[]> {
    return this.interactions.filter(i => i.userId === userId);
  }

  async deleteUserData(userId: string): Promise<void> {
    this.interactions = this.interactions.filter(i => i.userId !== userId);
    this.sessions = this.sessions.filter(s => s.userId !== userId);
  }

  configure(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };

    // Update privacy settings if provided
    if (config.privacy) {
      this.privacySettings = { ...this.privacySettings, ...config.privacy };

      // Re-check Do Not Track if respectDoNotTrack is enabled
      if (
        this.privacySettings.respectDoNotTrack &&
        globalThis.navigator !== undefined &&
        navigator.doNotTrack === "1"
      ) {
        this.privacySettings.trackingEnabled = false;
        this.config.enabled = false;
      }
    }

    if (config.realTime?.enabled !== undefined) {
      if (config.realTime.enabled && !this.realTimeInterval) {
        this.startRealTimeUpdates();
      } else if (!config.realTime.enabled && this.realTimeInterval) {
        clearInterval(this.realTimeInterval);
        this.realTimeInterval = null;
      }
    }
  }

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  isTrackingAllowed(): boolean {
    return this.shouldTrack();
  }

  shouldSample(): boolean {
    if (!this.config.sampling.enabled) return true;
    return Math.random() < this.config.sampling.rate;
  }

  async generateInsights(timeRange: TimeRange): Promise<UserBehaviorInsight[]> {
    return this.getUserBehaviorInsights(timeRange);
  }

  // Event handling
  onEvent(handler: AnalyticsEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index !== -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  // Cleanup
  destroy(): void {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }
    this.eventHandlers = [];
    this.interactions = [];
    this.sessions = [];
    this.funnels = [];
    this.currentSession = null;
  }

  // Test helper method to clear all data
  clearAllData(): void {
    this.interactions = [];
    this.sessions = [];
    this.funnels = [];
    this.currentSession = null;
  }
}

// Export singleton instance
export const analyticsManager = new AnalyticsManagerImpl();
export default analyticsManager;
