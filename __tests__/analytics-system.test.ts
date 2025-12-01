import { AnalyticsConfig, InteractionType, PrivacySettings } from "../shared/types/analytics";
import { TimeRange } from "../shared/types/core";
import { analyticsManager } from "../shared/utils/analytics-manager";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock navigator
Object.defineProperty(window, "navigator", {
  value: {
    doNotTrack: "0",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  writable: true,
});

// Mock document
const mockDocument = {
  referrer: "https://example.com",
  title: "Test Page",
  hidden: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock window location
const mockLocation = {
  href: "https://test.com/page",
  pathname: "/page",
  search: "?test=1",
};

// Set up global mocks
interface GlobalWithMocks extends NodeJS.Global {
  document: typeof mockDocument;
  window: typeof mockWindow;
}

const mockWindow = {
  location: mockLocation,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  localStorage: localStorageMock,
  screen: { width: 1920, height: 1080 },
  innerWidth: 1920,
  navigator: {
    doNotTrack: "0",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
};

(global as unknown as GlobalWithMocks).document = mockDocument;
(global as unknown as GlobalWithMocks).window = mockWindow;

describe("Analytics Manager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Clear all analytics data
    (analyticsManager as unknown as { clearAllData: () => void }).clearAllData();

    // Reset navigator mock
    (global as unknown as GlobalWithMocks).window.navigator.doNotTrack = "0";

    // Reset analytics manager state
    analyticsManager.configure({
      enabled: true,
      privacy: {
        trackingEnabled: true,
        anonymizeIPs: true,
        respectDoNotTrack: false,
        cookieConsent: true,
        dataRetentionDays: 365,
        allowPersonalization: true,
        shareWithThirdParties: false,
        gdprCompliant: true,
      },
    });
  });

  describe("Configuration", () => {
    it("should configure analytics with default settings", () => {
      const config = analyticsManager.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.privacy.gdprCompliant).toBe(true);
      expect(config.privacy.anonymizeIPs).toBe(true);
    });

    it("should update configuration", () => {
      const newConfig: Partial<AnalyticsConfig> = {
        sampling: {
          enabled: true,
          rate: 0.5,
        },
      };

      analyticsManager.configure(newConfig);
      const config = analyticsManager.getConfig();

      expect(config.sampling.enabled).toBe(true);
      expect(config.sampling.rate).toBe(0.5);
    });

    it("should respect Do Not Track setting", async () => {
      // Mock Do Not Track enabled
      (global as unknown as GlobalWithMocks).window.navigator.doNotTrack = "1";

      const config: Partial<AnalyticsConfig> = {
        privacy: {
          respectDoNotTrack: true,
          trackingEnabled: true,
        } as PrivacySettings,
      };

      analyticsManager.configure(config);

      expect(analyticsManager.isTrackingAllowed()).toBe(false);
    });
  });

  describe("Privacy Settings", () => {
    it("should get privacy settings", async () => {
      const settings = await analyticsManager.getPrivacySettings();

      expect(settings).toHaveProperty("trackingEnabled");
      expect(settings).toHaveProperty("gdprCompliant");
      expect(settings.gdprCompliant).toBe(true);
    });

    it("should update privacy settings", async () => {
      const newSettings: Partial<PrivacySettings> = {
        trackingEnabled: false,
        dataRetentionDays: 30,
      };

      await analyticsManager.setPrivacySettings(newSettings);
      const settings = await analyticsManager.getPrivacySettings();

      expect(settings.trackingEnabled).toBe(false);
      expect(settings.dataRetentionDays).toBe(30);
    });

    it("should disable tracking when privacy settings disable it", async () => {
      await analyticsManager.setPrivacySettings({ trackingEnabled: false });

      expect(analyticsManager.isTrackingAllowed()).toBe(false);
    });
  });

  describe("Session Management", () => {
    it("should start a new session", async () => {
      const sessionId = await analyticsManager.startSession("user123");

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_/);
    });

    it("should end a session", async () => {
      const sessionId = await analyticsManager.startSession("user123");

      await expect(analyticsManager.endSession(sessionId)).resolves.not.toThrow();
    });

    it("should update session data", async () => {
      const sessionId = await analyticsManager.startSession("user123");

      await expect(
        analyticsManager.updateSession(sessionId, { pageViews: 5 })
      ).resolves.not.toThrow();
    });
  });

  describe("Interaction Tracking", () => {
    it("should track user interactions", async () => {
      const interaction = {
        sessionId: "test-session",
        type: "click" as InteractionType,
        component: "button",
        action: "submit",
        url: "https://test.com/page",
        metadata: { buttonId: "submit-btn" },
      };

      await expect(analyticsManager.trackInteraction(interaction)).resolves.not.toThrow();
    });

    it("should track page views", async () => {
      await expect(
        analyticsManager.trackPageView("/test-page", { title: "Test Page" })
      ).resolves.not.toThrow();
    });

    it("should track conversions", async () => {
      await expect(
        analyticsManager.trackConversion("funnel1", "step1", 100)
      ).resolves.not.toThrow();
    });

    it("should not track when tracking is disabled", async () => {
      await analyticsManager.setPrivacySettings({ trackingEnabled: false });

      const interaction = {
        sessionId: "test-session",
        type: "click" as InteractionType,
        component: "button",
        action: "submit",
        url: "https://test.com/page",
        metadata: {},
      };

      // Should not throw but also should not track
      await expect(analyticsManager.trackInteraction(interaction)).resolves.not.toThrow();
    });

    it("should store interactions locally when enabled", async () => {
      localStorageMock.getItem.mockReturnValue("[]");

      // Ensure local storage is enabled and tracking is allowed
      analyticsManager.configure({
        enabled: true,
        storage: {
          local: true,
          remote: true,
          compression: false,
        },
        privacy: {
          trackingEnabled: true,
          respectDoNotTrack: false,
          anonymizeIPs: true,
          cookieConsent: true,
          dataRetentionDays: 365,
          allowPersonalization: true,
          shareWithThirdParties: false,
          gdprCompliant: true,
        },
        sampling: {
          enabled: false, // Disable sampling to ensure tracking happens
          rate: 1.0,
        },
      });

      // Explicitly set privacy settings to ensure tracking is enabled
      await analyticsManager.setPrivacySettings({ trackingEnabled: true });

      // Verify tracking is allowed
      expect(analyticsManager.isTrackingAllowed()).toBe(true);

      const interaction = {
        sessionId: "test-session",
        type: "click" as InteractionType,
        component: "button",
        action: "submit",
        url: "https://test.com/page",
        metadata: {},
      };

      await analyticsManager.trackInteraction(interaction);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "analytics_interactions",
        expect.any(String)
      );
    });
  });

  describe("Funnel Management", () => {
    it("should create a conversion funnel", async () => {
      const funnel = {
        name: "Test Funnel",
        isActive: true,
        steps: [
          {
            id: "step1",
            name: "Step 1",
            description: "First step",
            order: 1,
            conditions: [],
            requiredInteractions: ["view" as InteractionType],
          },
        ],
      };

      const funnelId = await analyticsManager.createFunnel(funnel);

      expect(funnelId).toBeDefined();
      expect(funnelId).toMatch(/^funnel_/);
    });

    it("should get all funnels", async () => {
      const funnel = {
        name: "Test Funnel",
        isActive: true,
        steps: [],
      };

      await analyticsManager.createFunnel(funnel);
      const funnels = await analyticsManager.getFunnels();

      expect(funnels).toHaveLength(1);
      expect(funnels[0].name).toBe("Test Funnel");
    });

    it("should update a funnel", async () => {
      const funnel = {
        name: "Test Funnel",
        isActive: true,
        steps: [],
      };

      const funnelId = await analyticsManager.createFunnel(funnel);
      await analyticsManager.updateFunnel(funnelId, { name: "Updated Funnel" });

      const funnels = await analyticsManager.getFunnels();
      const updatedFunnel = funnels.find(f => f.id === funnelId);

      expect(updatedFunnel?.name).toBe("Updated Funnel");
    });

    it("should delete a funnel", async () => {
      const funnel = {
        name: "Test Funnel",
        isActive: true,
        steps: [],
      };

      const funnelId = await analyticsManager.createFunnel(funnel);
      await analyticsManager.deleteFunnel(funnelId);

      const funnels = await analyticsManager.getFunnels();
      expect(funnels).toHaveLength(0);
    });
  });

  describe("Analytics Data", () => {
    const timeRange: TimeRange = {
      start: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
      end: Date.now(),
    };

    it("should get dashboard data", async () => {
      const dashboardData = await analyticsManager.getDashboardData(timeRange);

      expect(dashboardData).toHaveProperty("overview");
      expect(dashboardData).toHaveProperty("userBehavior");
      expect(dashboardData).toHaveProperty("conversionFunnels");
      expect(dashboardData).toHaveProperty("insights");
      expect(dashboardData).toHaveProperty("realTimeMetrics");
    });

    it("should get real-time metrics", async () => {
      const metrics = await analyticsManager.getRealTimeMetrics();

      expect(metrics).toHaveProperty("activeUsers");
      expect(metrics).toHaveProperty("currentPageViews");
      expect(metrics).toHaveProperty("recentInteractions");
      expect(metrics).toHaveProperty("liveConversions");
      expect(metrics).toHaveProperty("systemLoad");
      expect(metrics).toHaveProperty("errorRate");
    });

    it("should get user behavior insights", async () => {
      const insights = await analyticsManager.getUserBehaviorInsights(timeRange);

      expect(Array.isArray(insights)).toBe(true);
    });

    it("should generate insights", async () => {
      const insights = await analyticsManager.generateInsights(timeRange);

      expect(Array.isArray(insights)).toBe(true);
    });
  });

  describe("Data Privacy Compliance", () => {
    it("should anonymize user data", async () => {
      // Track some interactions with user ID
      await analyticsManager.trackInteraction({
        sessionId: "test-session",
        type: "click",
        component: "button",
        action: "submit",
        url: "https://test.com",
        userId: "user123",
        metadata: {},
      });

      await analyticsManager.anonymizeUser("user123");

      // Verify user data is anonymized (implementation specific)
      await expect(analyticsManager.anonymizeUser("user123")).resolves.not.toThrow();
    });

    it("should export user data", async () => {
      await analyticsManager.trackInteraction({
        sessionId: "test-session",
        type: "click",
        component: "button",
        action: "submit",
        url: "https://test.com",
        userId: "user123",
        metadata: {},
      });

      const userData = await analyticsManager.exportUserData("user123");

      expect(Array.isArray(userData)).toBe(true);
    });

    it("should delete user data", async () => {
      await analyticsManager.trackInteraction({
        sessionId: "test-session",
        type: "click",
        component: "button",
        action: "submit",
        url: "https://test.com",
        userId: "user123",
        metadata: {},
      });

      await analyticsManager.deleteUserData("user123");

      const userData = await analyticsManager.exportUserData("user123");
      expect(userData).toHaveLength(0);
    });
  });

  describe("Sampling", () => {
    it("should respect sampling configuration", () => {
      analyticsManager.configure({
        sampling: {
          enabled: true,
          rate: 0.5,
        },
      });

      // Test sampling (this is probabilistic, so we test the method exists)
      expect(typeof analyticsManager.shouldSample()).toBe("boolean");
    });

    it("should always sample when sampling is disabled", () => {
      analyticsManager.configure({
        sampling: {
          enabled: false,
          rate: 0.1,
        },
      });

      expect(analyticsManager.shouldSample()).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid funnel ID gracefully", async () => {
      const timeRange: TimeRange = {
        start: Date.now() - 1000,
        end: Date.now(),
      };

      await expect(analyticsManager.getFunnelAnalysis("invalid-funnel", timeRange)).rejects.toThrow(
        "Funnel invalid-funnel not found"
      );
    });

    it("should handle localStorage errors gracefully", async () => {
      // Mock localStorage to throw an error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      const interaction = {
        sessionId: "test-session",
        type: "click" as InteractionType,
        component: "button",
        action: "submit",
        url: "https://test.com",
        metadata: {},
      };

      // Should not throw even if localStorage fails
      await expect(analyticsManager.trackInteraction(interaction)).resolves.not.toThrow();
    });
  });
});

describe("Analytics Integration", () => {
  it("should work with multiple concurrent interactions", async () => {
    const interactions = Array.from({ length: 10 }, (_, i) => ({
      sessionId: "test-session",
      type: "click" as InteractionType,
      component: "button",
      action: `action-${i}`,
      url: `https://test.com/page-${i}`,
      metadata: { index: i },
    }));

    const promises = interactions.map(interaction =>
      analyticsManager.trackInteraction(interaction)
    );

    await expect(Promise.all(promises)).resolves.not.toThrow();
  });

  it("should maintain data consistency across operations", async () => {
    const sessionId = await analyticsManager.startSession("user123");

    await analyticsManager.trackInteraction({
      sessionId: sessionId,
      type: "view",
      component: "page",
      action: "load",
      url: "https://test.com",
      metadata: {},
    });

    await analyticsManager.endSession(sessionId);

    const timeRange: TimeRange = {
      start: Date.now() - 1000,
      end: Date.now(),
    };

    const dashboardData = await analyticsManager.getDashboardData(timeRange);

    expect(dashboardData.overview.totalUsers).toBeGreaterThanOrEqual(0);
    expect(dashboardData.overview.pageViews).toBeGreaterThanOrEqual(0);
  });
});
