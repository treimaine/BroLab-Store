import { SyncErrorType, SyncManager, SyncStatus } from "../../client/src/services/SyncManager";

// Mock WebSocket
class MockWebSocket {
  public readyState = 1; // OPEN
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 10);
  }

  send(data: string): void {
    // Simulate message echo for testing
    setTimeout(() => {
      if (this.onmessage) {
        const message = JSON.parse(data);
        if (message.type === "heartbeat") {
          this.onmessage(
            new MessageEvent("message", {
              data: JSON.stringify({
                type: "heartbeat_ack",
                payload: { timestamp: message.timestamp },
                timestamp: Date.now(),
                source: "server",
                id: "test_id",
              }),
            })
          );
        }
      }
    }, 5);
  }

  close(): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code: 1000, reason: "Normal closure" }));
    }
  }

  terminate(): void {
    this.close();
  }
}

// Mock fetch
global.fetch = jest.fn();

// Mock WebSocket globally
(global as any).WebSocket = MockWebSocket;

describe("SyncManager", () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    syncManager = new SyncManager({
      websocketUrl: "ws://localhost:3001/ws",
      pollingUrl: "/api/sync",
      pollingInterval: 1000,
      maxReconnectAttempts: 3,
      reconnectBackoffBase: 100,
      reconnectBackoffMax: 1000,
      heartbeatInterval: 500,
      connectionTimeout: 1000,
    });
  });

  afterEach(() => {
    syncManager.destroy();
  });

  describe("Initialization", () => {
    it("should initialize with default offline status", () => {
      const status = syncManager.getStatus();
      expect(status.connected).toBe(false);
      expect(status.connectionType).toBe("offline");
      expect(status.syncInProgress).toBe(false);
    });

    it("should initialize with empty metrics", () => {
      const metrics = syncManager.getMetrics();
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.reconnectCount).toBe(0);
      expect(metrics.totalSyncs).toBe(0);
      expect(metrics.failedSyncs).toBe(0);
    });
  });

  describe("WebSocket Connection", () => {
    it("should connect via WebSocket successfully", async () => {
      const statusChanges: SyncStatus[] = [];
      syncManager.on("status_changed", status => statusChanges.push(status));

      await syncManager.startSync();

      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 50));

      const finalStatus = syncManager.getStatus();
      expect(finalStatus.connected).toBe(true);
      expect(finalStatus.connectionType).toBe("websocket");
    });

    it("should emit connected event on successful connection", async () => {
      const connectedSpy = jest.fn();
      syncManager.on("connected", connectedSpy);

      await syncManager.startSync();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(connectedSpy).toHaveBeenCalled();
    });

    it("should handle WebSocket close and emit disconnected event", async () => {
      const disconnectedSpy = jest.fn();
      syncManager.on("disconnected", disconnectedSpy);

      await syncManager.startSync();
      await new Promise(resolve => setTimeout(resolve, 50));

      syncManager.stopSync();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(disconnectedSpy).toHaveBeenCalled();
      expect(syncManager.getStatus().connected).toBe(false);
    });
  });

  describe("Polling Fallback", () => {
    beforeEach(() => {
      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { test: "data" },
          timestamp: Date.now(),
        }),
      });
    });

    it("should fallback to polling when WebSocket fails", async () => {
      // Mock WebSocket to fail
      (global as any).WebSocket = class {
        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event("error"));
            }
          }, 10);
        }
        close() {}
      };

      const dataUpdateSpy = jest.fn();
      syncManager.on("data_updated", dataUpdateSpy);

      await syncManager.startSync();
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = syncManager.getStatus();
      expect(status.connected).toBe(true);
      expect(status.connectionType).toBe("polling");
    });

    it("should perform polling sync and emit data updates", async () => {
      // Force polling mode
      (global as any).WebSocket = class {
        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event("error"));
            }
          }, 10);
        }
        close() {}
      };

      const dataUpdateSpy = jest.fn();
      syncManager.on("data_updated", dataUpdateSpy);

      await syncManager.startSync();
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for polling

      expect(dataUpdateSpy).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith("/api/sync", expect.any(Object));
    });
  });

  describe("Force Sync", () => {
    it("should perform force sync via WebSocket", async () => {
      await syncManager.startSync();
      await new Promise(resolve => setTimeout(resolve, 50));

      const dataUpdateSpy = jest.fn();
      syncManager.on("data_updated", dataUpdateSpy);

      await syncManager.forceSyncAll();

      expect(syncManager.getStatus().syncInProgress).toBe(false);
    });

    it("should perform force sync via polling when WebSocket unavailable", async () => {
      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { test: "data" },
          timestamp: Date.now(),
        }),
      });

      // Don't start WebSocket connection
      await syncManager.forceSyncAll();

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("Data Consistency Validation", () => {
    it("should validate data consistency successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          consistent: true,
          inconsistencies: [],
        }),
      });

      const result = await syncManager.validateDataConsistency();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith("/api/sync/validate", expect.any(Object));
    });

    it("should handle data inconsistencies", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          consistent: false,
          inconsistencies: [{ type: "test_inconsistency" }],
        }),
      });

      const inconsistencySpy = jest.fn();
      syncManager.on("data_inconsistency", inconsistencySpy);

      const result = await syncManager.validateDataConsistency();

      expect(result).toBe(false);
      expect(inconsistencySpy).toHaveBeenCalled();
      expect(syncManager.getMetrics().dataInconsistencies).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const errorSpy = jest.fn();
      syncManager.on("sync_error", errorSpy);

      await syncManager.validateDataConsistency();

      expect(errorSpy).toHaveBeenCalled();
      expect(syncManager.getMetrics().errorCount).toBeGreaterThan(0);
    });

    it("should classify errors correctly", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network timeout"));

      const errorSpy = jest.fn();
      syncManager.on("sync_error", errorSpy);

      await syncManager.validateDataConsistency();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SyncErrorType.TIMEOUT_ERROR,
        })
      );
    });

    it("should track error metrics", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Test error"));

      await syncManager.validateDataConsistency();

      const metrics = syncManager.getMetrics();
      expect(metrics.errorCount).toBe(1);
      expect(metrics.totalSyncs).toBe(1);
      expect(metrics.failedSyncs).toBe(1);
      expect(metrics.successRate).toBe(0);
    });
  });

  describe("Metrics Tracking", () => {
    it("should track sync latency", async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ consistent: true, inconsistencies: [] }),
                }),
              100
            )
          )
      );

      await syncManager.validateDataConsistency();

      const metrics = syncManager.getMetrics();
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    it("should calculate success rate correctly", async () => {
      // First successful sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consistent: true, inconsistencies: [] }),
      });

      await syncManager.validateDataConsistency();

      // Then failed sync
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Test error"));
      await syncManager.validateDataConsistency();

      const metrics = syncManager.getMetrics();
      expect(metrics.totalSyncs).toBe(2);
      expect(metrics.failedSyncs).toBe(1);
      expect(metrics.successRate).toBe(50);
    });
  });

  describe("Debug Mode", () => {
    it("should enable and disable debug mode", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      syncManager.enableDebugMode(true);
      // This should trigger a debug log
      syncManager.enableDebugMode(false);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Cleanup", () => {
    it("should clean up resources on destroy", () => {
      const removeListenersSpy = jest.spyOn(syncManager, "removeAllListeners");

      syncManager.destroy();

      expect(removeListenersSpy).toHaveBeenCalled();
      expect(() => syncManager.startSync()).rejects.toThrow("SyncManager has been destroyed");
    });

    it("should stop all timers on destroy", async () => {
      await syncManager.startSync();
      await new Promise(resolve => setTimeout(resolve, 50));

      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      syncManager.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
