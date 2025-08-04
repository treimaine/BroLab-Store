import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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
    orderby?: 'date' | 'title' | 'price' | 'popularity';
    order?: 'asc' | 'desc';
  }) => {
    return useQuery({
      queryKey: ['woocommerce', 'products', filters],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters?.category) params.append('category', filters.category);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.min_price) params.append('min_price', filters.min_price.toString());
        if (filters?.max_price) params.append('max_price', filters.max_price.toString());
        if (filters?.per_page) params.append('per_page', filters.per_page.toString());
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.orderby) params.append('orderby', filters.orderby);
        if (filters?.order) params.append('order', filters.order);
        
        const response = await fetch(`/api/woocommerce/products?${params}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        return response.json();
      },
    });
  };

  // Get single product
  const useProduct = (id: string) => {
    return useQuery({
      queryKey: ['woocommerce', 'product', id],
      queryFn: async () => {
        const response = await fetch(`/api/woocommerce/products/${id}`);
        if (!response.ok) throw new Error('Failed to fetch product');
        return response.json();
      },
    });
  };

  // Get product categories
  const useCategories = () => {
    return useQuery({
      queryKey: ['woocommerce', 'categories'],
      queryFn: async () => {
        const response = await fetch('/api/woocommerce/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        return response.json();
      },
    });
  };

  // Create order
  const useCreateOrder = () => {
    return useMutation({
      mutationFn: async (orderData: any) => {
        return apiRequest('POST', '/api/woocommerce/orders', orderData);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      },
    });
  };

  // Create customer
  const useCreateCustomer = () => {
    return useMutation({
      mutationFn: async (customerData: any) => {
        return apiRequest('POST', '/api/woocommerce/customers', customerData);
      },
    });
  };

  // Hook pour récupérer les recommandations de produits similaires
  const useSimilarProducts = (productId: string, genre?: string) => {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!productId) return;

      const fetchSimilarProducts = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          // Construire les paramètres de recherche
          const params = new URLSearchParams();
          if (genre) {
            params.append('category', genre);
          }
          params.append('exclude', productId);
          params.append('per_page', '6'); // Limiter à 6 recommandations
          
          const response = await fetch(`/api/woocommerce/products?${params.toString()}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch similar products');
          }
          
          const products = await response.json();
          setData(products);
        } catch (err: any) {
          console.error('Error fetching similar products:', err);
          setError(err.message);
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
    useSimilarProducts, // Nouvelle fonction
  };
}