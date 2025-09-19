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
