import "@jest/globals";
import "@testing-library/jest-dom";
import express from "express";
import { TextDecoder, TextEncoder } from "util";

// Polyfills for Node test environment
// @ts-expect-error - Global polyfill for Node.js compatibility
global.TextEncoder = TextEncoder;
// @ts-expect-error - Global polyfill for Node.js compatibility
global.TextDecoder = TextDecoder;

// Add setImmediate polyfill for Node.js compatibility
// @ts-expect-error - Global polyfill for Node.js compatibility
global.setImmediate =
  global.setImmediate ||
  ((fn: (...args: unknown[]) => void, ...args: unknown[]) => setTimeout(fn, 0, ...args));

// Enhanced jsdom environment setup
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for client-side components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for lazy loading components
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

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

// Enhanced fetch mock for better test compatibility
// @ts-expect-error - Global fetch mock for testing
global.fetch = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => "",
  blob: async () => new Blob(),
  headers: new Headers(),
}));

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
  const express = jest.requireActual("express");
  const router = express.Router();

  router.get("/beat/:id", (req: express.Request, res: express.Response) => {
    res.json({ schema: "mock beat schema" });
  });

  router.get("/shop", (req: express.Request, res: express.Response) => {
    res.json({ schema: "mock shop schema" });
  });

  return router;
});

jest.mock("../server/routes/openGraph", () => {
  const express = jest.requireActual("express");
  const router = express.Router();

  router.get("/beat/:id", (req: express.Request, res: express.Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Beat</title></head><body>Mock Beat Page</body></html>");
  });

  router.get("/shop", (req: express.Request, res: express.Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Shop</title></head><body>Mock Shop Page</body></html>");
  });

  router.get("/home", (req: express.Request, res: express.Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Home</title></head><body>Mock Home Page</body></html>");
  });

  router.get("/page/:pageName", (req: express.Request, res: express.Response) => {
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
