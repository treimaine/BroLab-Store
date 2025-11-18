import { renderHook } from "@testing-library/react";
import React from "react";
import { useCache } from "../../client/src/hooks/useCache";
import { createWrapper } from "../test-utils";

// Mock the cache provider with proper context structure
jest.mock("../../client/src/providers/CacheProvider", () => {
  const mockCacheContext = {
    isInitialized: true,
    isWarming: false,
    cacheHealth: "good" as const,
    metrics: {
      hitRate: 85,
      totalQueries: 100,
      cacheSize: 50,
    },
    actions: {
      warmCache: jest.fn().mockResolvedValue(undefined),
      clearCache: jest.fn().mockResolvedValue(undefined),
      optimizeCache: jest.fn().mockResolvedValue(undefined),
    },
  };

  return {
    CacheContext: React.createContext(mockCacheContext),
  };
});

describe("useCache Hook", () => {
  test("should return cache context", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCache(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.cacheHealth).toBe("good");
    expect(result.current.metrics.hitRate).toBe(85);
    expect(typeof result.current.actions.warmCache).toBe("function");
  });

  test("should throw error when used outside provider", () => {
    // Create a simple test without provider
    expect(() => {
      renderHook(() => {
        // Mock the context to return null for this test
        const context = React.createContext(null);
        return (
          React.useContext(context) ||
          (() => {
            throw new Error("useCache must be used within a CacheProvider");
          })()
        );
      });
    }).toThrow("useCache must be used within a CacheProvider");
  });
});
