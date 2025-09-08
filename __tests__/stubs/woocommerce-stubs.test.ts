// Tests pour vérifier que les stubs WooCommerce fonctionnent correctement
import {
  cleanupWooCommerceStubs,
  mockBeats,
  mockBeatsList,
  setupWooCommerceStubs,
  stubFetch,
  stubWcApiRequest,
} from "./woocommerce-stubs";

describe("WooCommerce Stubs", () => {
  afterEach(() => {
    cleanupWooCommerceStubs();
  });

  describe("mockBeats", () => {
    it("should contain valid beat data", () => {
      expect(mockBeats[123]).toBeDefined();
      expect(mockBeats[123].title).toBe("Test Beat - Hip Hop");
      expect(mockBeats[123].genre).toBe("Hip Hop");
      expect(mockBeats[123].bpm).toBe(140);
    });

    it("should contain multiple beats", () => {
      expect(Object.keys(mockBeats)).toHaveLength(3);
      expect(mockBeats[456]).toBeDefined();
      expect(mockBeats[789]).toBeDefined();
    });
  });

  describe("mockBeatsList", () => {
    it("should contain valid beat list data", () => {
      expect(mockBeatsList).toHaveLength(3);
      expect(mockBeatsList[0].id).toBe(123);
      expect(mockBeatsList[0].name).toBe("Test Beat - Hip Hop");
      expect(mockBeatsList[0].url).toBe("/product/123");
    });
  });

  describe("stubWcApiRequest", () => {
    it("should return product data for valid product ID", async () => {
      const product = await stubWcApiRequest("/products/123");

      expect(product).toBeDefined();
      expect(product.id).toBe(123);
      expect(product.name).toBe("Test Beat - Hip Hop");
      expect(product.categories).toHaveLength(1);
      expect(product.categories[0].name).toBe("Hip Hop");
    });

    it("should return products list for products endpoint", async () => {
      const products = await stubWcApiRequest("/products");

      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      expect(products).toHaveLength(3);
    });

    it("should throw error for invalid product ID", async () => {
      await expect(stubWcApiRequest("/products/999999")).rejects.toThrow("404");
    });

    it("should return empty object for unknown endpoints", async () => {
      const result = await stubWcApiRequest("/unknown");
      expect(result).toEqual({});
    });
  });

  describe("stubFetch", () => {
    it("should handle WooCommerce API URLs", async () => {
      const response = await stubFetch("https://example.com/wp-json/wc/v3/products/123");

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(123);
      expect(data.name).toBe("Test Beat - Hip Hop");
    });

    it("should handle non-WooCommerce URLs", async () => {
      const response = await stubFetch("https://example.com/api/other");

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({});
    });
  });

  describe("setupWooCommerceStubs", () => {
    it("should setup global fetch mock", () => {
      setupWooCommerceStubs();

      expect(global.fetch).toBeDefined();
      expect(jest.isMockFunction(global.fetch)).toBe(true);
    });
  });
});
