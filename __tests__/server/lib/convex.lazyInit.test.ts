import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

describe("Convex Lazy Initialization", () => {
  const originalEnv = process.env.VITE_CONVEX_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Clear module cache to reset lazy initialization state
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.VITE_CONVEX_URL = originalEnv;
    } else {
      delete process.env.VITE_CONVEX_URL;
    }
    process.env.NODE_ENV = originalNodeEnv;

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

  it("should return mock client in test environment without VITE_CONVEX_URL", async () => {
    // Remove the environment variable but keep NODE_ENV=test
    delete process.env.VITE_CONVEX_URL;
    process.env.NODE_ENV = "test";

    // Import the module (should succeed)
    const { getConvex } = await import("../../../server/lib/convex");

    // In test environment, should return mock client instead of throwing
    const client = getConvex();
    expect(client).toBeDefined();
    expect(typeof client.query).toBe("function");
    expect(typeof client.mutation).toBe("function");
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

  it("should cache mock client and return same instance on subsequent calls in test environment", async () => {
    // Remove the environment variable but keep NODE_ENV=test
    delete process.env.VITE_CONVEX_URL;
    process.env.NODE_ENV = "test";

    const { getConvex } = await import("../../../server/lib/convex");

    // First call should return mock client
    const firstClient = getConvex();
    expect(firstClient).toBeDefined();

    // Second call should return the same cached client
    const secondClient = getConvex();
    expect(secondClient).toBeDefined();
    expect(firstClient).toBe(secondClient); // Same instance (cached)
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
