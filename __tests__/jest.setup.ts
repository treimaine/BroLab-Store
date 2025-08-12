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

// Exemple : reset tous les mocks avant chaque test
beforeEach(() => {
  jest.clearAllMocks();
});
