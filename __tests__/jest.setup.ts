import "@jest/globals";
import "@testing-library/jest-dom";
import type { Request, Response, Router } from "express";
import { TextDecoder, TextEncoder } from "node:util";

// Polyfills for Node test environment
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

// Add setImmediate polyfill for Node.js compatibility
globalThis.setImmediate =
  globalThis.setImmediate ||
  ((fn: (...args: unknown[]) => void, ...args: unknown[]): NodeJS.Immediate =>
    setTimeout(fn, 0, ...args) as unknown as NodeJS.Immediate);

// Enhanced jsdom environment setup
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
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
globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for lazy loading components
globalThis.IntersectionObserver = jest.fn().mockImplementation(() => ({
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
globalThis.fetch = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => "",
  blob: async () => new Blob(),
  headers: new Headers(),
})) as jest.Mock;

// Mock WooCommerce API calls to avoid real HTTP requests
jest.mock("../server/routes/openGraph", () => {
  const originalModule = jest.requireActual("../server/routes/openGraph") as Record<
    string,
    unknown
  >;
  return {
    ...originalModule,
    // Mock the wcApiRequest function to avoid real WooCommerce calls
    wcApiRequest: jest.fn(),
  };
});

jest.mock("../server/routes/schema", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express") as { Router: () => Router };
  const router = express.Router();

  router.get("/beat/:id", (_req: Request, res: Response) => {
    res.json({ schema: "mock beat schema" });
  });

  router.get("/shop", (_req: Request, res: Response) => {
    res.json({ schema: "mock shop schema" });
  });

  return router;
});

jest.mock("../server/routes/openGraph", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express") as { Router: () => Router };
  const router = express.Router();

  router.get("/beat/:id", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Beat</title></head><body>Mock Beat Page</body></html>");
  });

  router.get("/shop", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Shop</title></head><body>Mock Shop Page</body></html>");
  });

  router.get("/home", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send("<html><head><title>Mock Home</title></head><body>Mock Home Page</body></html>");
  });

  router.get("/page/:pageName", (req: Request, res: Response) => {
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
