import { apiRequest } from "@/lib/queryClient";
import { apiService } from "@/services/ApiService";
import type { BroLabWooCommerceProduct } from "@shared/types/WooCommerceApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// WooCommerce API integration hook
export function useWooCommerce() {
  const queryClient = useQueryClient();

  // Get all products (beats)
  const useProducts = (filters?: {
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    per_page?: number;
    page?: number;
    orderby?: "date" | "title" | "price" | "popularity";
    order?: "asc" | "desc";
  }) => {
    return useQuery({
      queryKey: ["woocommerce", "products", filters],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters?.category) params.append("category", filters.category);
        if (filters?.search) params.append("search", filters.search);
        if (filters?.min_price) params.append("min_price", filters.min_price.toString());
        if (filters?.max_price) params.append("max_price", filters.max_price.toString());
        if (filters?.per_page) params.append("per_page", filters.per_page.toString());
        if (filters?.page) params.append("page", filters.page.toString());
        if (filters?.orderby) params.append("orderby", filters.orderby);
        if (filters?.order) params.append("order", filters.order);

        const response = await apiService.get<BroLabWooCommerceProduct[]>(
          `/woocommerce/products?${params}`
        );
        return response.data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes - avoid refetching on navigation
      gcTime: 30 * 60 * 1000, // 30 minutes cache retention
    });
  };

  // Get single product
  const useProduct = (id: string) => {
    return useQuery({
      queryKey: ["woocommerce", "product", id],
      queryFn: async () => {
        const response = await apiService.get<BroLabWooCommerceProduct>(
          `/woocommerce/products/${id}`
        );
        return response.data;
      },
      // Disable query when id is invalid (0, empty, or NaN)
      enabled: Boolean(id) && id !== "0" && !Number.isNaN(Number(id)),
      staleTime: 10 * 60 * 1000, // 10 minutes - product details change less often
      gcTime: 60 * 60 * 1000, // 1 hour cache retention
    });
  };

  // Get product categories
  const useCategories = () => {
    return useQuery({
      queryKey: ["woocommerce", "categories"],
      queryFn: async () => {
        const response = await apiService.get<unknown[]>("/woocommerce/categories");
        return response.data;
      },
      staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
      gcTime: 60 * 60 * 1000, // 1 hour cache retention
    });
  };

  // Create order
  const useCreateOrder = () => {
    return useMutation({
      mutationFn: async (orderData: Record<string, unknown>) => {
        return apiRequest("POST", "/api/woocommerce/orders", orderData);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      },
    });
  };

  // Create customer
  const useCreateCustomer = () => {
    return useMutation({
      mutationFn: async (customerData: Record<string, unknown>) => {
        return apiRequest("POST", "/api/woocommerce/customers", customerData);
      },
    });
  };

  // Hook to fetch similar product recommendations
  const useSimilarProducts = (productId: string, genre?: string) => {
    const [data, setData] = useState<BroLabWooCommerceProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!productId) return;

      const fetchSimilarProducts = async () => {
        setIsLoading(true);
        setError(null);

        try {
          // Build search parameters
          const params = new URLSearchParams();
          if (genre) {
            params.append("category", genre);
          }
          params.append("exclude", productId);
          params.append("per_page", "6"); // Limit to 6 recommendations

          const response = await apiService.get<BroLabWooCommerceProduct[]>(
            `/woocommerce/products?${params.toString()}`
          );
          setData(response.data);
        } catch (err: unknown) {
          console.error("Error fetching similar products:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          setIsLoading(false);
        }
      };

      fetchSimilarProducts();
    }, [productId, genre]);

    return { data, isLoading, error };
  };

  return {
    useProducts,
    useProduct,
    useCategories,
    useCreateOrder,
    useCreateCustomer,
    useSimilarProducts,
  };
}
