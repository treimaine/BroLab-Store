/**
 * Jest Environment Configuration Test
 * This test verifies that the Jest environment is properly configured for client-side testing
 */

import { render } from "@testing-library/react";
import { createElement } from "react";

describe("Jest Environment Configuration", () => {
  it("should have jsdom environment available", () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
    expect(global).toBeDefined();
  });

  it("should have DOM APIs available", () => {
    expect(document.createElement).toBeDefined();
    expect(window.location).toBeDefined();
    expect(window.localStorage).toBeDefined();
    expect(window.sessionStorage).toBeDefined();
  });

  it("should have polyfills available", () => {
    expect(global.TextEncoder).toBeDefined();
    expect(global.TextDecoder).toBeDefined();
    expect(global.fetch).toBeDefined();
  });

  it("should have mocked browser APIs", () => {
    expect(window.matchMedia).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();
    expect(global.IntersectionObserver).toBeDefined();
  });

  it("should have import.meta.env available", () => {
    // Test that the global import.meta mock is available
    const importMeta = (globalThis as any).import;
    expect(importMeta).toBeDefined();
    expect(importMeta.meta).toBeDefined();
    expect(importMeta.meta.env).toBeDefined();
    expect(importMeta.meta.env.NODE_ENV).toBe("test");
  });

  it("should handle React Testing Library", () => {
    const TestComponent = () => createElement("div", { "data-testid": "test" }, "Hello Test");
    const { getByTestId } = render(createElement(TestComponent));

    expect(getByTestId("test")).toHaveTextContent("Hello Test");
  });
});
