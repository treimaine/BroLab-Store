import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

  return {
    useProducts,
    useProduct,
    useCategories,
    useCreateOrder,
    useCreateCustomer,
  };
}