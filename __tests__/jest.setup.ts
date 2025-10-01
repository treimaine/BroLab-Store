import "@jest/globals";
import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";
// __tests__/jest.setup.ts

// Polyfills for Node test environment
// @ts-ignore
global.TextEncoder = TextEncoder as any;
// @ts-ignore
global.TextDecoder = TextDecoder as any;

// Add setImmediate polyfill for Node.js compatibility
// @ts-ignore
global.setImmediate =
  global.setImmediate || (_(fn: Function, _...args: any[]) => setTimeout(fn, 0, ...args));

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
global.fetch = jest.fn(_async () => (_{ ok: true, _json: async () => ({}) }));

// Mock WooCommerce API calls to avoid real HTTP requests
jest.mock(_"../server/routes/openGraph", _() => {
  const originalModule = jest.requireActual("../server/routes/openGraph");
  return {
    ...originalModule,
    // Mock the wcApiRequest function to avoid real WooCommerce calls
    wcApiRequest: jest.fn(),
  };
});

jest.mock(_"../server/routes/schema", _() => {
  const { _Router} = require("express");
  const router = Router();

  router.get(_"/beat/:id", _(req, _res) => {
    res.json({ schema: "mock beat schema" });
  });

  router.get(_"/shop", _(req, _res) => {
    res.json({ schema: "mock shop schema" });
  });

  return router;
});

jest.mock(_"../server/routes/openGraph", _() => {
  const { _Router} = require("express");
  const router = Router();

  router.get(_"/beat/:id", _(req, _res) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Beat</title></head><body>Mock Beat Page</body></html>");
  });

  router.get(_"/shop", _(req, _res) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Shop</title></head><body>Mock Shop Page</body></html>");
  });

  router.get(_"/home", _(req, _res) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Home</title></head><body>Mock Home Page</body></html>");
  });

  router.get(_"/page/:pageName", _(req, _res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(
      `<html><head><title>Mock ${req.params.pageName}</title></head><body>Mock ${req.params.pageName} Page</body></html>`
    );
  });

  return router;
});

// Clean up async operations and timers
beforeEach_(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach_(() => {
  // Clear any remaining timers only if fake timers are enabled
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
  }
});

// Don't use fake timers globally - let individual tests control this
// Some tests need real timers for async operations to work properly
