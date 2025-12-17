/**
 * WooCommerce API Service with Type Safety
 *
 * This service provides type-safe interactions with the WooCommerce REST API,
 * replacing any types with proper TypeScript interfaces.
 */

import { ServiceResult } from "../types";
import {
  WooCommerceCategory,
  WooCommerceCategoryQuery,
  WooCommerceOrder,
  WooCommerceOrderQuery,
  WooCommerceProduct,
  WooCommerceProductQuery,
} from "../types/woocommerce";
import {
  extractBroLabMetadata,
  validateWooCommerceOrder,
  validateWooCommerceProduct,
  validateWooCommerceQuery,
} from "./woo-validation";

/**
 * WooCommerce API configuration
 */
interface WooCommerceConfig {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Get WooCommerce configuration from environment variables
 * @returns Configuration object or null if missing required values
 */
function getWooCommerceConfig(): WooCommerceConfig | null {
  const apiUrl = process.env.WOOCOMMERCE_API_URL;
  const apiKey = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.VITE_WC_KEY;
  const apiSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!apiUrl || !apiKey || !apiSecret) {
    console.error(
      "❌ Missing WooCommerce configuration. Set WOOCOMMERCE_API_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET in .env"
    );
    return null;
  }

  return { apiUrl, apiKey, apiSecret };
}

/**
 * Create Basic Auth header value from credentials
 * @param apiKey - WooCommerce consumer key
 * @param apiSecret - WooCommerce consumer secret
 * @returns Base64 encoded Basic Auth string
 */
function createBasicAuthHeader(apiKey: string, apiSecret: string): string {
  const credentials = `${apiKey}:${apiSecret}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

/**
 * Create standard headers for WooCommerce API requests
 */
function createWooCommerceHeaders(config: WooCommerceConfig): HeadersInit {
  return {
    Authorization: createBasicAuthHeader(config.apiKey, config.apiSecret),
    "Content-Type": "application/json",
  };
}

/**
 * Build URL search params from query object
 */
/**
 * Convert unknown value to string for URL params
 */
function valueToString(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

function buildSearchParams(query: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, valueToString(v)));
    } else {
      params.append(key, valueToString(value));
    }
  });
  return params;
}

/**
 * Extract array from WooCommerce API response
 */
function extractArrayFromResponse(rawData: unknown): unknown[] {
  if (Array.isArray(rawData)) {
    return rawData;
  }
  if (rawData && typeof rawData === "object" && "data" in rawData) {
    const dataObj = rawData as { data: unknown };
    if (Array.isArray(dataObj.data)) {
      return dataObj.data;
    }
  }
  return [];
}

/**
 * Fetch WooCommerce products with type safety
 */
export async function fetchWooProducts(
  filters: WooCommerceProductQuery = {}
): Promise<WooCommerceProduct[]> {
  try {
    const validatedFilters = validateWooCommerceQuery(filters as Record<string, unknown>);
    const config = getWooCommerceConfig();

    if (!config) {
      return [];
    }

    // WooCommerce configuration validated (no sensitive data logged)

    const params = buildSearchParams(validatedFilters as Record<string, unknown>);
    const url = `${config.apiUrl}/products?${params}`;
    console.log("🔧 Fetching URL:", url);

    const response = await fetch(url, {
      headers: createWooCommerceHeaders(config),
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    const products = extractArrayFromResponse(rawData);

    if (products.length === 0 && rawData && typeof rawData === "object") {
      console.error("WooCommerce API returned non-array data:", rawData);
      return [];
    }

    return validateAndEnhanceProducts(products);
  } catch (error) {
    console.error("WooCommerce API Error:", error);
    return [];
  }
}

/**
 * Validate and enhance products with BroLab metadata
 */
function validateAndEnhanceProducts(products: unknown[]): WooCommerceProduct[] {
  const validatedProducts: WooCommerceProduct[] = [];

  for (const product of products) {
    try {
      const validatedProduct = validateWooCommerceProduct(product as Record<string, unknown>);
      const broLabMetadata = extractBroLabMetadata(validatedProduct);
      validatedProducts.push({ ...validatedProduct, ...broLabMetadata });
    } catch (validationError) {
      const productId = (product as { id?: unknown })?.id;
      console.error(`Failed to validate product ${productId}:`, validationError);
    }
  }

  return validatedProducts;
}

/**
 * Fetch a single WooCommerce product by ID with type safety
 */
export async function fetchWooProduct(id: string): Promise<WooCommerceProduct | null> {
  try {
    const config = getWooCommerceConfig();

    if (!config) {
      return null;
    }

    const response = await fetch(`${config.apiUrl}/products/${id}`, {
      headers: createWooCommerceHeaders(config),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const rawProduct = await response.json();

    try {
      const validatedProduct = validateWooCommerceProduct(rawProduct);
      const broLabMetadata = extractBroLabMetadata(validatedProduct);
      return { ...validatedProduct, ...broLabMetadata };
    } catch (validationError) {
      console.error(`Failed to validate product ${id}:`, validationError);
      return null;
    }
  } catch (error) {
    console.error("WooCommerce Product API Error:", error);
    return null;
  }
}

/**
 * Fetch WooCommerce product categories with type safety
 */
export async function fetchWooCategories(
  query: WooCommerceCategoryQuery = {}
): Promise<WooCommerceCategory[]> {
  try {
    const config = getWooCommerceConfig();

    if (!config) {
      return [];
    }

    const params = buildSearchParams(query as Record<string, unknown>);
    const url = `${config.apiUrl}/products/categories?${params}`;

    const response = await fetch(url, {
      headers: createWooCommerceHeaders(config),
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    const categories = Array.isArray(rawData) ? rawData : [];

    return validateCategories(categories);
  } catch (error) {
    console.error("WooCommerce Categories API Error:", error);
    return [];
  }
}

/**
 * Validate category objects from API response
 */
function validateCategories(categories: unknown[]): WooCommerceCategory[] {
  return categories.filter((category): category is WooCommerceCategory => {
    if (!category || typeof category !== "object") {
      return false;
    }
    const cat = category as { id?: unknown; name?: unknown };
    return typeof cat.id === "number" && typeof cat.name === "string";
  });
}

/**
 * Fetch WooCommerce orders with type safety
 */
export async function getWooCommerceOrders(
  query: WooCommerceOrderQuery = {}
): Promise<WooCommerceOrder[]> {
  try {
    const config = getWooCommerceConfig();

    if (!config) {
      return [];
    }

    const params = buildSearchParams(query as Record<string, unknown>);
    const url = `${config.apiUrl}/orders?${params}`;
    console.log("🔧 Fetching WooCommerce orders from:", url);

    const response = await fetch(url, {
      headers: createWooCommerceHeaders(config),
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    const orders = extractArrayFromResponse(rawData);

    if (orders.length === 0 && rawData) {
      console.error("WooCommerce Orders API returned unexpected data:", rawData);
      return [];
    }

    return validateOrders(orders);
  } catch (error) {
    console.error("WooCommerce Orders API Error:", error);
    return [];
  }
}

/**
 * Validate orders from API response
 */
function validateOrders(orders: unknown[]): WooCommerceOrder[] {
  const validatedOrders: WooCommerceOrder[] = [];

  for (const order of orders) {
    const validationResult = validateWooCommerceOrder(order as Record<string, unknown>);

    if (validationResult.isValid && validationResult.order) {
      validatedOrders.push(validationResult.order);
    } else {
      const orderId = getOrderId(order);
      console.error(`Failed to validate order ${orderId}:`, validationResult.errors);
    }
  }

  return validatedOrders;
}

/**
 * Extract order ID from unknown order object for logging
 */
function getOrderId(order: unknown): string {
  if (order && typeof order === "object" && "id" in order) {
    return String((order as { id: unknown }).id);
  }
  return "unknown";
}

/**
 * Create a service result wrapper for external API calls
 */
export function createWooCommerceServiceResult<T>(
  success: boolean,
  data?: T,
  error?: Error
): ServiceResult<T> {
  return {
    success,
    data,
    error: error
      ? {
          type: "WOOCOMMERCE_API_ERROR",
          message: error.message,
          code: "WOO_API_ERROR",
          details: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : undefined,
  };
}
