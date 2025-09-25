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
 * Fetch WooCommerce products with type safety
 */
export async function fetchWooProducts(
  filters: WooCommerceProductQuery = {}
): Promise<WooCommerceProduct[]> {
  try {
    // Validate query parameters
    const validatedFilters = validateWooCommerceQuery(filters as Record<string, unknown>);

    // Use environment variables with fallbacks
    const apiUrl =
      process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
    const apiKey = process.env.VITE_WC_KEY || "ck_50c27e051fee70e12439a74af1777cd73b17607c";
    const apiSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_2dd861aba9c673a82f0dbcd6e5254b25952de699";

    console.log("🔧 WooCommerce API URL:", apiUrl);
    console.log("🔧 WooCommerce Key:", apiKey ? `${apiKey.substring(0, 10)}...` : "Not set");

    const params = new URLSearchParams();
    Object.entries(validatedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const url = `${apiUrl}/products?${params}`;
    console.log("🔧 Fetching URL:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Ensure we always return an array and validate each product
    let products: unknown[] = [];
    if (Array.isArray(rawData)) {
      products = rawData;
    } else if (rawData && Array.isArray(rawData.data)) {
      products = rawData.data;
    } else if (rawData && typeof rawData === "object") {
      console.error("WooCommerce API returned non-array data:", rawData);
      return [];
    } else {
      console.error("WooCommerce API returned unexpected data type:", typeof rawData);
      return [];
    }

    // Validate and enhance each product with BroLab metadata
    const validatedProducts: WooCommerceProduct[] = [];
    for (const product of products) {
      try {
        const validatedProduct = validateWooCommerceProduct(product as Record<string, unknown>);
        const broLabMetadata = extractBroLabMetadata(validatedProduct);

        // Merge BroLab metadata into the product
        const enhancedProduct: WooCommerceProduct = {
          ...validatedProduct,
          ...broLabMetadata,
        };

        validatedProducts.push(enhancedProduct);
      } catch (validationError) {
        console.error(
          `Failed to validate product ${(product as { id?: unknown })?.id}:`,
          validationError
        );
        // Skip invalid products rather than failing the entire request
        continue;
      }
    }

    return validatedProducts;
  } catch (error) {
    console.error("WooCommerce API Error:", error);
    return [];
  }
}

/**
 * Fetch a single WooCommerce product by ID with type safety
 */
export async function fetchWooProduct(id: string): Promise<WooCommerceProduct | null> {
  try {
    const apiUrl =
      process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
    const apiKey = process.env.VITE_WC_KEY || "ck_50c27e051fee70e12439a74af1777cd73b17607c";
    const apiSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_2dd861aba9c673a82f0dbcd6e5254b25952de699";

    const response = await fetch(`${apiUrl}/products/${id}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
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

      return {
        ...validatedProduct,
        ...broLabMetadata,
      };
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
    const apiUrl =
      process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
    const apiKey = process.env.VITE_WC_KEY || "ck_50c27e051fee70e12439a74af1777cd73b17607c";
    const apiSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_2dd861aba9c673a82f0dbcd6e5254b25952de699";

    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const url = `${apiUrl}/products/categories?${params}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Ensure we return an array
    const categories = Array.isArray(rawData) ? rawData : [];

    // Validate each category
    const validatedCategories: WooCommerceCategory[] = [];
    for (const category of categories) {
      if (
        category &&
        typeof category === "object" &&
        "id" in category &&
        "name" in category &&
        typeof (category as { id?: unknown; name?: unknown }).id === "number" &&
        typeof (category as { id?: unknown; name?: unknown }).name === "string"
      ) {
        validatedCategories.push(category as WooCommerceCategory);
      }
    }

    return validatedCategories;
  } catch (error) {
    console.error("WooCommerce Categories API Error:", error);
    return [];
  }
}

/**
 * Fetch WooCommerce orders with type safety
 */
export async function getWooCommerceOrders(
  query: WooCommerceOrderQuery = {}
): Promise<WooCommerceOrder[]> {
  try {
    const apiUrl =
      process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
    const apiKey = process.env.VITE_WC_KEY || "ck_50c27e051fee70e12439a74af1777cd73b17607c";
    const apiSecret =
      process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_2dd861aba9c673a82f0dbcd6e5254b25952de699";

    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const url = `${apiUrl}/orders?${params}`;
    console.log("🔧 Fetching WooCommerce orders from:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Validate and sanitize the response data
    let orders: unknown[] = [];
    if (Array.isArray(rawData)) {
      orders = rawData;
    } else if (rawData && Array.isArray(rawData.data)) {
      orders = rawData.data;
    } else {
      console.error("WooCommerce Orders API returned unexpected data:", rawData);
      return [];
    }

    // Validate each order
    const validatedOrders: WooCommerceOrder[] = [];
    for (const order of orders) {
      const validationResult = validateWooCommerceOrder(order as Record<string, unknown>);
      if (validationResult.isValid && validationResult.order) {
        validatedOrders.push(validationResult.order);
      } else {
        console.error(
          `Failed to validate order ${order && typeof order === "object" && "id" in order ? (order as { id: unknown }).id : "unknown"}:`,
          validationResult.errors
        );
      }
    }

    return validatedOrders;
  } catch (error) {
    console.error("WooCommerce Orders API Error:", error);
    return [];
  }
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
