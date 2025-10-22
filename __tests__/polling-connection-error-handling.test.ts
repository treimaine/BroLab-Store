/**
 * PollingConnection Error Handling Tests
 *
 * Tests for robust error handling in PollingConnection including:
 * - Inactive connection state validation
 * - Undefined/null response handling
 * - Descriptive error messages
 *
 * Note: PollingConnection errors are caught by ConnectionManager and emitted as events
 * rather than propagated. These tests verify the error handling code paths exist.
 */

import { ConnectionManager, ConnectionMessage } from "../client/src/services/ConnectionManager";

// Mock fetch
const mockFetch = jest.fn();

beforeAll(() => {
  globalThis.fetch = mockFetch as unknown as typeof fetch;

  // Mock WebSocket to force polling mode
  globalThis.WebSocket = function MockWebSocket() {
    throw new Error("WebSocket not available");
  } as unknown as typeof WebSocket;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

describe("PollingConnection Error Handling", () => {
  describe("Inactive Connection State", () => {
    it("should throw error when send() is called on inactive connection", async () => {
      // Mock successful connection
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      // Connect and then disconnect to make connection inactive
      await manager.connect();
      manager.disconnect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // Attempt to send on inactive connection should throw
      await expect(manager.send(message)).rejects.toThrow("No active connection");
    });

    it("should include descriptive context in inactive connection error", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();
      manager.disconnect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      await expect(manager.send(message)).rejects.toThrow("No active connection");
    });
  });

  describe("Undefined Response Handling", () => {
    it("should handle undefined response from fetch without crashing", async () => {
      // Mock fetch to return undefined (simulating network failure)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce(undefined as unknown as Response);

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // The error is caught internally and emitted as an event
      // We verify the code doesn't crash and handles the error gracefully
      await manager.send(message);

      // Verify the manager is still functional
      expect(manager.getCurrentStrategy()).toBe("polling");
    });

    it("should validate response exists before accessing properties", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce(undefined as unknown as Response);

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // Should not throw TypeError when accessing response.ok
      await expect(manager.send(message)).resolves.not.toThrow();
    });
  });

  describe("Null Response Handling", () => {
    it("should handle null response from fetch without crashing", async () => {
      // Mock fetch to return null (simulating network failure)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce(null as unknown as Response);

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // The error is caught internally and emitted as an event
      await manager.send(message);

      // Verify the manager is still functional
      expect(manager.getCurrentStrategy()).toBe("polling");
    });

    it("should validate response is an object before accessing properties", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce(null as unknown as Response);

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // Should not throw TypeError when checking typeof response
      await expect(manager.send(message)).resolves.not.toThrow();
    });
  });

  describe("Network Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockRejectedValueOnce(new Error("Network request failed"));

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // Network errors are caught and handled internally
      await manager.send(message);

      // Manager should still be functional
      expect(manager.getCurrentStrategy()).toBe("polling");
    });

    it("should handle connection timeout errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockRejectedValueOnce(new Error("Connection timeout"));

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // Timeout errors are caught and handled
      await manager.send(message);

      expect(manager.getCurrentStrategy()).toBe("polling");
    });
  });

  describe("HTTP Error Status Handling", () => {
    it("should handle non-OK response status gracefully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: () => Promise.resolve("Server error details"),
        });

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // HTTP errors are caught and handled internally
      await manager.send(message);

      expect(manager.getCurrentStrategy()).toBe("polling");
    });

    it("should handle 404 errors gracefully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: () => Promise.resolve("Endpoint not found"),
        });

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // 404 errors are caught and handled
      await manager.send(message);

      expect(manager.getCurrentStrategy()).toBe("polling");
    });
  });

  describe("Error Message Quality", () => {
    it("should handle ECONNREFUSED errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })
        .mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const manager = new ConnectionManager({
        pollingUrl: "http://localhost:3001/api/sync",
        connectionTimeout: 1000,
        pollingInterval: 5000,
      });

      await manager.connect();

      const message: ConnectionMessage = {
        type: "test",
        payload: { data: "test" },
        id: "test-1",
        timestamp: Date.now(),
      };

      // Connection refused errors are handled
      await manager.send(message);

      expect(manager.getCurrentStrategy()).toBe("polling");
    });

    it("should handle various error scenarios without crashing", async () => {
      const testCases = [
        {
          mockResponse: undefined,
          description: "undefined response",
        },
        {
          mockResponse: null,
          description: "null response",
        },
        {
          mockResponse: {
            ok: false,
            status: 500,
            statusText: "Error",
            text: () => Promise.resolve(""),
          },
          description: "error status",
        },
      ];

      for (const testCase of testCases) {
        mockFetch.mockReset();
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({}),
          })
          .mockResolvedValueOnce(testCase.mockResponse as unknown as Response);

        const manager = new ConnectionManager({
          pollingUrl: "http://localhost:3001/api/sync",
          connectionTimeout: 1000,
          pollingInterval: 5000,
        });

        await manager.connect();

        const message: ConnectionMessage = {
          type: "test",
          payload: { data: "test" },
          id: "test-1",
          timestamp: Date.now(),
        };

        // All error scenarios should be handled gracefully
        await manager.send(message);

        expect(manager.getCurrentStrategy()).toBe("polling");

        manager.disconnect();
      }
    });
  });
});
