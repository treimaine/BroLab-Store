// __tests__/jest.setup.ts
import "@jest/globals";
import "@testing-library/jest-dom";

// Polyfills for Node test environment
import { TextDecoder, TextEncoder } from "util";
// @ts-ignore
global.TextEncoder = TextEncoder as any;
// @ts-ignore
global.TextDecoder = TextDecoder as any;

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
  const originalModule = jest.requireActual("../server/routes/schema");
  return {
    ...originalModule,
    // Mock the wcApiRequest function to avoid real WooCommerce calls
    wcApiRequest: jest.fn(),
  };
});

// Exemple : reset tous les mocks avant chaque test
beforeEach(() => {
  jest.clearAllMocks();
});
