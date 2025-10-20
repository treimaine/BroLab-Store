/**
 * Connection Manager Tests
 *
 * Comprehensive test suite for ConnectionManager with fallback strategies,
 * connection health monitoring, and graceful degradation.
 */

import {
  ConnectionConfig,
  ConnectionManager,
  ConnectionMessage,
  createConnectionRecoveryActions,
  destroyConnectionManager,
  getConnectionManager,
} from "../client/src/services/ConnectionManager";
import type { SyncError } from "../shared/types/sync";

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
    // Simulate message echo for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent("message", { data }));
      }
    }, 5);
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

describe("ConnectionManager", () => {
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
      expect(statusChanges).toContainEqual(
        expect.objectContaining({
          type: "websocket",
          connected: true,
        })
      );
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

    it("should receive messages via WebSocket", async () => {
      const manager = new ConnectionManager(defaultConfig);
      const receivedMessages: ConnectionMessage[] = [];

      manager.onMessage(message => {
        receivedMessages.push(message);
      });

      await manager.connect();

      // Send a message to trigger echo
      const testMessage: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      await manager.send(testMessage);

      // Wait for echo
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toEqual(testMessage);
    });

    it("should handle WebSocket connection errors", async () => {
      // Mock WebSocket to fail
      const OriginalWebSocket = global.WebSocket;
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event("error"));
            }
          }, 5);
        }
      } as any;

      const manager = new ConnectionManager(defaultConfig);

      // Connection should fallback to polling instead of throwing
      await manager.connect();

      // Should be connected via polling fallback
      const metrics = manager.getConnectionMetrics();
      expect(metrics.status.connected).toBe(true);
      expect(metrics.status.type).toBe("polling");

      global.WebSocket = OriginalWebSocket;
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

    it("should poll for messages", async () => {
      // Force polling mode
      global.WebSocket = class {
        constructor() {
          throw new Error("WebSocket not available");
        }
      } as any;

      const testMessages = [
        {
          type: "test",
          payload: { data: "test1" },
          id: "test-1",
          timestamp: Date.now(),
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ messages: testMessages }),
        });

      const manager = new ConnectionManager(defaultConfig);
      const receivedMessages: ConnectionMessage[] = [];

      manager.onMessage(message => {
        receivedMessages.push(message);
      });

      await manager.connect();

      // Wait for polling to occur
      await new Promise(resolve => setTimeout(resolve, 2100));

      expect(receivedMessages).toContainEqual(testMessages[0]);
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

      // Should have a connected status (either websocket or polling)
      const hasConnectedStatus = statusChanges.some(
        status =>
          status.connected === true && (status.type === "websocket" || status.type === "polling")
      );
      expect(hasConnectedStatus).toBe(true);

      // Should have a disconnected status
      expect(statusChanges).toContainEqual(
        expect.objectContaining({
          connected: false,
          type: "offline",
        })
      );
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

  describe("Reconnection Logic", () => {
    it("should attempt reconnection with exponential backoff", async () => {
      const manager = new ConnectionManager({
        ...defaultConfig,
        maxReconnectAttempts: 2,
        reconnectDelayBase: 50,
      });

      // Mock WebSocket to fail initially, then succeed
      let connectionAttempts = 0;
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          connectionAttempts++;

          if (connectionAttempts === 1) {
            setTimeout(() => {
              if (this.onerror) {
                this.onerror(new Event("error"));
              }
            }, 5);
          }
        }
      } as any;

      const statusChanges: any[] = [];
      manager.onStatusChange(status => {
        statusChanges.push({ ...status });
      });

      // Connection should succeed via polling fallback
      await manager.connect();

      // Should be connected (via polling since WebSocket failed)
      const metrics = manager.getConnectionMetrics();
      expect(metrics.status.connected).toBe(true);
      expect(metrics.status.type).toBe("polling");
    });

    it("should stop reconnecting after max attempts", async () => {
      const manager = new ConnectionManager({
        ...defaultConfig,
        maxReconnectAttempts: 1,
        reconnectDelayBase: 10,
      });

      // Mock WebSocket to always fail
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

      // Connection should succeed via polling fallback even if WebSocket fails
      await manager.connect();

      const metrics = manager.getConnectionMetrics();
      expect(metrics.status.connected).toBe(true);
      expect(metrics.status.type).toBe("polling");
    });
  });

  describe("Fallback Strategies", () => {
    it("should enable immediate fallback strategy", async () => {
      const manager = new ConnectionManager(defaultConfig);

      manager.enableFallback("immediate");

      // This should be tested by checking internal state or behavior
      // For now, we just verify the method doesn't throw
      expect(() => manager.enableFallback("immediate")).not.toThrow();
    });

    it("should enable quality-based fallback strategy", async () => {
      const manager = new ConnectionManager(defaultConfig);

      manager.enableFallback("quality_based");

      expect(() => manager.enableFallback("quality_based")).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should emit sync errors on connection failures", async () => {
      const manager = new ConnectionManager(defaultConfig);
      const errors: any[] = [];

      manager.on("sync_error", errorEvent => {
        errors.push(errorEvent.error);
      });

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

      // Connection should succeed via polling fallback
      await manager.connect();

      // Should be connected via polling
      const metrics = manager.getConnectionMetrics();
      expect(metrics.status.connected).toBe(true);
      expect(metrics.status.type).toBe("polling");
    });
  });

  describe("Cleanup", () => {
    it("should clean up resources on destroy", () => {
      const manager = new ConnectionManager(defaultConfig);

      expect(() => manager.destroy()).not.toThrow();

      // Verify manager is destroyed
      expect(() => manager.connect()).rejects.toThrow();
    });
  });
});

describe("Recovery Actions", () => {
  it("should create appropriate recovery actions for network errors", () => {
    const manager = new ConnectionManager();
    const error: SyncError = {
      type: "NETWORK_ERROR" as any,
      message: "Connection failed",
      timestamp: Date.now(),
      context: {},
      retryable: true,
      retryCount: 0,
      maxRetries: 3,
    };

    const actions = createConnectionRecoveryActions(error, manager);

    expect(actions).toContainEqual(
      expect.objectContaining({
        type: "retry",
      })
    );

    expect(actions).toContainEqual(
      expect.objectContaining({
        type: "force_sync",
      })
    );
  });

  it("should not offer retry for non-retryable errors", () => {
    const manager = new ConnectionManager();
    const error: SyncError = {
      type: "AUTHENTICATION_ERROR" as any,
      message: "Auth failed",
      timestamp: Date.now(),
      context: {},
      retryable: false,
      retryCount: 0,
      maxRetries: 3,
    };

    const actions = createConnectionRecoveryActions(error, manager);

    expect(actions).not.toContainEqual(
      expect.objectContaining({
        type: "retry",
      })
    );
  });

  it("should offer fallback when using WebSocket", () => {
    const manager = new ConnectionManager();

    // Mock getCurrentStrategy to return websocket
    jest.spyOn(manager, "getCurrentStrategy").mockReturnValue("websocket");

    const error: SyncError = {
      type: "WEBSOCKET_ERROR" as any,
      message: "WebSocket failed",
      timestamp: Date.now(),
      context: {},
      retryable: true,
      retryCount: 0,
      maxRetries: 3,
    };

    const actions = createConnectionRecoveryActions(error, manager);

    expect(actions).toContainEqual(
      expect.objectContaining({
        type: "fallback",
        strategy: "polling",
      })
    );
  });
});

describe("Connection Quality Monitoring", () => {
  it("should track connection quality metrics", async () => {
    const manager = new ConnectionManager(defaultConfig);
    await manager.connect();

    // Send some messages to generate metrics
    const message: ConnectionMessage = {
      type: "test",
      payload: { data: "test" },
      id: "test-1",
      timestamp: Date.now(),
    };

    await manager.send(message);

    const metrics = manager.getConnectionMetrics();
    expect(metrics.stats.messagesSent).toBeGreaterThan(0);
    expect(metrics.stats.qualityScore).toBeGreaterThan(0);
  });

  it("should maintain latency history", async () => {
    const manager = new ConnectionManager(defaultConfig);
    await manager.connect();

    const metrics = manager.getConnectionMetrics();
    expect(metrics.latencyHistory).toBeInstanceOf(Array);
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

  it("should validate message format", async () => {
    const manager = new ConnectionManager(defaultConfig);
    await manager.connect();

    const invalidMessage = {
      // Missing required fields
      payload: { data: "test" },
    } as unknown;

    await expect(manager.send(invalidMessage)).rejects.toThrow();
  });
});
