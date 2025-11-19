/**
 * Query Helpers Usage Examples
 *
 * This file demonstrates how to use the enhanced query helpers
 * with security improvements for safe API requests.
 */

import { createApiUrl, createSafeQuery, enhancedFetch } from "@/utils/queryHelpers";
import { useMutation, useQuery } from "@tanstack/react-query";

// ============================================================================
// Example 1: Basic Enhanced Fetch
// ============================================================================

async function fetchProduct(id: number) {
  // Enhanced fetch with automatic retry, circuit breaking, and error handling
  const product = await enhancedFetch<Product>(`/api/products/${id}`);
  return product;
}

// ============================================================================
// Example 2: Safe Query with TanStack Query
// ============================================================================

function useProductQuery(id: number) {
  // createSafeQuery validates the query key and adds circuit breaker protection
  const safeQuery = createSafeQuery(["products", id], async () => {
    return enhancedFetch<Product>(`/api/products/${id}`);
  });

  return useQuery(safeQuery);
}

// Usage in component
function ProductDetails({ productId }: { productId: number }) {
  const { data, isLoading, error } = useProductQuery(productId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading product</div>; // User-friendly error already shown via toast

  return <div>{data?.name}</div>;
}

// ============================================================================
// Example 3: Safe Query with Filters
// ============================================================================

interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
}

function useProductsQuery(filters: ProductFilters) {
  // Query key includes all filter parameters for proper caching
  const safeQuery = createSafeQuery(["products", filters], async () => {
    const params = new URLSearchParams();
    if (filters.category) params.append("category", filters.category);
    if (filters.minPrice) params.append("min_price", filters.minPrice.toString());
    if (filters.maxPrice) params.append("max_price", filters.maxPrice.toString());
    if (filters.page) params.append("page", filters.page.toString());

    return enhancedFetch<Product[]>(`/api/products?${params}`);
  });

  return useQuery(safeQuery);
}

// ============================================================================
// Example 4: Type-Safe API URL Builder
// ============================================================================

function useSearchProducts(query: string, page: number) {
  const safeQuery = createSafeQuery(["products", "search", query, page], async () => {
    // createApiUrl validates the URL and prevents path traversal
    const url = createApiUrl(window.location.origin, "/api/products/search", { q: query, page });

    return enhancedFetch<Product[]>(url);
  });

  return useQuery(safeQuery);
}

// ============================================================================
// Example 5: Mutation with Enhanced Fetch
// ============================================================================

interface CreateOrderData {
  productId: number;
  quantity: number;
  licenseType: string;
}

function useCreateOrder() {
  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      // Enhanced fetch handles errors and shows user-friendly messages
      return enhancedFetch<Order>("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
    },
    onSuccess: order => {
      console.log("Order created:", order);
      // User-friendly success message
    },
    onError: error => {
      // Error already shown via toast by enhancedFetch
      console.error("Order creation failed:", error);
    },
  });
}

// Usage in component
function CheckoutButton({ orderData }: { orderData: CreateOrderData }) {
  const createOrder = useCreateOrder();

  const handleCheckout = () => {
    createOrder.mutate(orderData);
  };

  return (
    <button onClick={handleCheckout} disabled={createOrder.isPending}>
      {createOrder.isPending ? "Processing..." : "Checkout"}
    </button>
  );
}

// ============================================================================
// Example 6: External API with Credential Handling
// ============================================================================

function useExternalData() {
  const safeQuery = createSafeQuery(["external", "data"], async () => {
    // Enhanced fetch automatically sets credentials: "omit" for cross-origin
    return enhancedFetch<ExternalData>("https://api.external.com/data");
  });

  return useQuery(safeQuery);
}

// ============================================================================
// Example 7: Handling Authentication Errors
// ============================================================================

function useProtectedResource(id: number) {
  const safeQuery = createSafeQuery(["protected", id], async () => {
    try {
      return await enhancedFetch<ProtectedResource>(`/api/protected/${id}`);
    } catch (error) {
      // Enhanced fetch shows "Authentication Required" toast for 401/403
      // Optionally redirect to login
      if (error instanceof Error && error.message.includes("401")) {
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
      throw error;
    }
  });

  return useQuery(safeQuery);
}

// ============================================================================
// Example 8: Circuit Breaker Behavior
// ============================================================================

function useUnreliableService() {
  const safeQuery = createSafeQuery(["unreliable"], async () => {
    // If service fails 5 times, circuit opens for 30 seconds
    // During this time, requests fail immediately without attempting
    return enhancedFetch<ServiceData>("/api/unreliable-service");
  });

  return useQuery({
    ...safeQuery,
    retry: false, // Disable TanStack Query retry since enhancedFetch handles it
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Example 9: Download with Progress (Advanced)
// ============================================================================

async function downloadFile(fileId: number, onProgress?: (progress: number) => void) {
  // For downloads, use native fetch with progress tracking
  const response = await fetch(`/api/downloads/${fileId}`, {
    credentials: "include", // Same-origin, include credentials
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const contentLength = Number(response.headers.get("Content-Length"));
  let receivedLength = 0;
  const chunks: Uint8Array[] = [];

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    if (onProgress && contentLength) {
      onProgress((receivedLength / contentLength) * 100);
    }
  }

  const blob = new Blob(chunks);
  return blob;
}

// ============================================================================
// Example 10: Prefetching Data
// ============================================================================

import { useQueryClient } from "@tanstack/react-query";

function ProductCard({ productId }: { productId: number }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch product details on hover
    const safeQuery = createSafeQuery(["products", productId], async () => {
      return enhancedFetch<Product>(`/api/products/${productId}`);
    });

    queryClient.prefetchQuery(safeQuery);
  };

  return <div onMouseEnter={handleMouseEnter}>Product {productId}</div>;
}

// ============================================================================
// Type Definitions (for reference)
// ============================================================================

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface Order {
  id: number;
  productId: number;
  quantity: number;
  total: number;
}

interface ExternalData {
  data: unknown;
}

interface ProtectedResource {
  id: number;
  data: string;
}

interface ServiceData {
  status: string;
}
