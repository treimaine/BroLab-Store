import { afterEach, describe, expect, it } from "@jest/globals";

describe("Convex Lazy Initialization", () => {
  const originalEnv = process.env.VITE_CONVEX_URL;

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.VITE_CONVEX_URL = originalEnv;
    } else {
      delete process.env.VITE_CONVEX_URL;
    }

    // Clear module cache to reset lazy initialization state
    jest.resetModules();
  });

  it("should load module successfully without VITE_CONVEX_URL", async () => {
    // Remove the environment variable
    delete process.env.VITE_CONVEX_URL;

    // This should not throw an error during import
    await expect(async () => {
      await import("../../../server/lib/convex");
    }).resolves.not.toThrow();
  });

  it("should throw descriptive error on first use without VITE_CONVEX_URL", async () => {
    // Remove the environment variable
    delete process.env.VITE_CONVEX_URL;

    // Import the module (should succeed)
    const { getConvex } = await import("../../../server/lib/convex");

    // Calling the getter should throw
    expect(() => {
      getConvex();
    }).toThrow(/VITE_CONVEX_URL environment variable is required/);
  });

  it("should initialize client successfully with valid VITE_CONVEX_URL", async () => {
    // Set a valid-looking URL
    process.env.VITE_CONVEX_URL = "https://test-deployment.convex.cloud";

    // Import and get client
    const { getConvex } = await import("../../../server/lib/convex");

    // This should not throw
    expect(() => {
      getConvex();
    }).not.toThrow();
  });

  it("should cache initialization error and throw same error on subsequent calls", async () => {
    // Remove the environment variable
    delete process.env.VITE_CONVEX_URL;

    const { getConvex } = await import("../../../server/lib/convex");

    // First call should throw
    let firstError: Error | undefined;
    try {
      getConvex();
    } catch (error) {
      firstError = error as Error;
    }

    // Second call should throw the same cached error
    let secondError: Error | undefined;
    try {
      getConvex();
    } catch (error) {
      secondError = error as Error;
    }

    expect(firstError).toBeDefined();
    expect(secondError).toBeDefined();
    expect(firstError).toBe(secondError); // Same error instance
  });

  it("should provide backward compatible convex export via Proxy", async () => {
    // Set a valid-looking URL
    process.env.VITE_CONVEX_URL = "https://test-deployment.convex.cloud";

    const { convex } = await import("../../../server/lib/convex");

    // The proxy should allow accessing properties
    expect(convex).toBeDefined();
    expect(typeof convex.query).toBe("function");
    expect(typeof convex.mutation).toBe("function");
  });
});
