/**
 * Basic Connection Manager Tests
 *
 * Simplified test suite for ConnectionManager functionality
 */

import {
  ConnectionConfig,
  ConnectionManager,
  ConnectionMessage,
  destroyConnectionManager,
  getConnectionManager,
} from "@/services/ConnectionManager";

// Mock WebSocket
class MockWebSocket {
  public readyState = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  }
}

// Mock fetch for polling
const mockFetch = jest.fn();

// Setup mocks
beforeAll(() => {
  global.WebSocket = MockWebSocket as any;
  global.fetch = mockFetch;

  // Mock performance.now
  global.performance = {
    now: jest.fn(() => Date.now()),
  } as any;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  destroyConnectionManager();
});

afterEach(() => {
  destroyConnectionManager();
});

const defaultConfig: Partial<ConnectionConfig> = {
  websocketUrl: "ws://localhost:3001/ws",
  pollingUrl: "http://localhost:3001/api/sync",
  connectionTimeout: 1000,
  heartbeatInterval: 5000,
  pollingInterval: 2000,
  maxReconnectAttempts: 3,
  reconnectDelayBase: 100,
  maxReconnectDelay: 1000,
};

describe("ConnectionManager Basic Tests", () => {
  describe("Initialization", () => {
    it("should create ConnectionManager with default config", () => {
      const manager = new ConnectionManager();
      expect(manager).toBeInstanceOf(ConnectionManager);
      expect(manager.getCurrentStrategy()).toBe("offline");
    });

    it("should create ConnectionManager with custom config", () => {
      const manager = new ConnectionManager(defaultConfig);
      expect(manager).toBeInstanceOf(ConnectionManager);
    });

    it("should provide singleton instance", () => {
      const manager1 = getConnectionManager(defaultConfig);
      const manager2 = getConnectionManager();
      expect(manager1).toBe(manager2);
    });
  });

  describe("WebSocket Connection", () => {
    it("should connect via WebSocket successfully", async () => {
      const manager = new ConnectionManager(defaultConfig);
      const statusChanges: any[] = [];

      manager.onStatusChange(status => {
        statusChanges.push(status);
      });

      await manager.connect();

      expect(manager.getCurrentStrategy()).toBe("websocket");
      expect(statusChanges.some(s => s.connected && s.type === "websocket")).toBe(true);
    });

    it("should send messages via WebSocket", async () => {
      const manager = new ConnectionManager(defaultConfig);
      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      await expect(manager.send(message)).resolves.toBeUndefined();
    });
  });

  describe("HTTP Polling Fallback", () => {
    it("should fallback to polling when WebSocket fails", async () => {
      // Mock WebSocket to fail
      global.WebSocket = class {
        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event("error"));
            }
          }, 5);
        }
        onerror: any = null;
        onopen: any = null;
        onclose: any = null;
        onmessage: any = null;
        close() {}
      } as any;

      // Mock successful polling
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      });

      const manager = new ConnectionManager(defaultConfig);
      await manager.connect();

      expect(manager.getCurrentStrategy()).toBe("polling");
    });

    it("should send messages via polling", async () => {
      // Force polling mode
      global.WebSocket = class {
        constructor() {
          throw new Error("WebSocket not available");
        }
      } as any;

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const manager = new ConnectionManager(defaultConfig);
      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      await manager.send(message);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/send"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(message),
        })
      );
    });
  });

  describe("Connection Status Management", () => {
    it("should track connection status changes", async () => {
      const manager = new ConnectionManager(defaultConfig);
      const statusChanges: any[] = [];

      manager.onStatusChange(status => {
        statusChanges.push({ ...status });
      });

      await manager.connect();
      manager.disconnect();

      expect(statusChanges.some(s => s.connected)).toBe(true);
      expect(statusChanges.some(s => !s.connected && s.type === "offline")).toBe(true);
    });

    it("should provide connection metrics", async () => {
      const manager = new ConnectionManager(defaultConfig);
      await manager.connect();

      const metrics = manager.getConnectionMetrics();

      expect(metrics).toHaveProperty("status");
      expect(metrics).toHaveProperty("stats");
      expect(metrics).toHaveProperty("strategyPerformance");
      expect(metrics.status.connected).toBe(true);
    });
  });

  describe("Fallback Strategies", () => {
    it("should enable immediate fallback strategy", () => {
      const manager = new ConnectionManager(defaultConfig);

      expect(() => manager.enableFallback("immediate")).not.toThrow();
    });

    it("should enable quality-based fallback strategy", () => {
      const manager = new ConnectionManager(defaultConfig);

      expect(() => manager.enableFallback("quality_based")).not.toThrow();
    });
  });

  describe("Cleanup", () => {
    it("should clean up resources on destroy", () => {
      const manager = new ConnectionManager(defaultConfig);

      expect(() => manager.destroy()).not.toThrow();
    });
  });

  describe("Message Handling", () => {
    it("should handle message sending errors gracefully", async () => {
      const manager = new ConnectionManager(defaultConfig);

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // Try to send without connection
      await expect(manager.send(message)).rejects.toThrow("No active connection");
    });
  });

  describe("Connection Quality Monitoring", () => {
    it("should track connection quality metrics", async () => {
      const manager = new ConnectionManager(defaultConfig);
      await manager.connect();

      const metrics = manager.getConnectionMetrics();
      expect(metrics.stats.qualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.stats.qualityScore).toBeLessThanOrEqual(1);
    });

    it("should maintain latency history", async () => {
      const manager = new ConnectionManager(defaultConfig);
      await manager.connect();

      const metrics = manager.getConnectionMetrics();
      expect(metrics.latencyHistory).toBeInstanceOf(Array);
    });
  });
});
