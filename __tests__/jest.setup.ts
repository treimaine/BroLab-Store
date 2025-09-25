// __tests__/jest.setup.ts
import "@jest/globals";
import "@testing-library/jest-dom";

// Polyfills for Node test environment
import { TextDecoder, TextEncoder } from "util";
// @ts-ignore
global.TextEncoder = TextEncoder as any;
// @ts-ignore
global.TextDecoder = TextDecoder as any;

// Add setImmediate polyfill for Node.js compatibility
// @ts-ignore
global.setImmediate =
  global.setImmediate || ((fn: Function, ...args: any[]) => setTimeout(fn, 0, ...args));

// Mock import.meta for Vite environment variables
Object.defineProperty(globalThis, "import", {
  value: {
    meta: {
      env: {
        NODE_ENV: "test",
        VITE_CONVEX_URL: "https://test.convex.cloud",
        VITE_CLERK_PUBLISHABLE_KEY: "pk_test_mock_key",
        VITE_API_BASE_URL: "http://localhost:3000/api",
        VITE_WORDPRESS_URL: "http://localhost:8080",
        VITE_WOOCOMMERCE_URL: "http://localhost:8080/wp-json/wc/v3",
        VITE_PAYPAL_CLIENT_ID: "test_paypal_client_id",
        VITE_FEATURE_REALTIME_UPDATES: "true",
        VITE_FEATURE_ANALYTICS_CHARTS: "true",
        VITE_FEATURE_ADVANCED_FILTERS: "true",
        VITE_FEATURE_PERFORMANCE_MONITORING: "true",
        VITE_FEATURE_ERROR_TRACKING: "true",
        VITE_FEATURE_OFFLINE_SUPPORT: "true",
        VITE_LOG_LEVEL: "error",
        VITE_SHOW_PERFORMANCE: "false",
        VITE_USE_MOCK_DATA: "true",
        VITE_PERFORMANCE_PROFILER: "false",
        DEV: false,
        PROD: false,
      },
    },
  },
  writable: true,
});

// Lightweight fetch stub for tests (avoid ESM node-fetch)
// @ts-ignore
global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }));

// Mock WooCommerce API calls to avoid real HTTP requests
jest.mock("../server/routes/openGraph", () => {
  const originalModule = jest.requireActual("../server/routes/openGraph");
  return {
    ...originalModule,
    // Mock the wcApiRequest function to avoid real WooCommerce calls
    wcApiRequest: jest.fn(),
  };
});

jest.mock("../server/routes/schema", () => {
  const { Router } = require("express");
  const router = Router();

  router.get("/beat/:id", (req, res) => {
    res.json({ schema: "mock beat schema" });
  });

  router.get("/shop", (req, res) => {
    res.json({ schema: "mock shop schema" });
  });

  return router;
});

jest.mock("../server/routes/openGraph", () => {
  const { Router } = require("express");
  const router = Router();

  router.get("/beat/:id", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Beat</title></head><body>Mock Beat Page</body></html>");
  });

  router.get("/shop", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Shop</title></head><body>Mock Shop Page</body></html>");
  });

  router.get("/home", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Home</title></head><body>Mock Home Page</body></html>");
  });

  router.get("/page/:pageName", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(
      `<html><head><title>Mock ${req.params.pageName}</title></head><body>Mock ${req.params.pageName} Page</body></html>`
    );
  });

  return router;
});

// Clean up async operations and timers
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  // Clear any remaining timers only if fake timers are enabled
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
  }
});

// Don't use fake timers globally - let individual tests control this
// Some tests need real timers for async operations to work properly
