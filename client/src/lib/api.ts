import { apiRequest } from './queryClient';

// Newsletter API
export const newsletterApi = {
  subscribe: async (email: string) => {
    return apiRequest('POST', '/api/newsletter/subscribe', { email });
  },
};

// Contact API
export const contactApi = {
  submit: async (data: { name: string; email: string; subject: string; message: string }) => {
    return apiRequest('POST', '/api/contact', data);
  },
};

// WordPress API helpers
export const wordpressApi = {
  getPage: async (slug: string) => {
    const response = await fetch(`/api/wordpress/pages/${slug}`);
    if (!response.ok) throw new Error('Failed to fetch page');
    return response.json();
  },
  
  getPosts: async (params?: { per_page?: number; page?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const response = await fetch(`/api/wordpress/posts?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch posts');
    return response.json();
  },
};

// WooCommerce API helpers
export const wooCommerceApi = {
  getProducts: async (filters?: {
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    per_page?: number;
    page?: number;
    orderby?: string;
    order?: string;
  }) => {
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

  getProduct: async (id: string) => {
    const response = await fetch(`/api/woocommerce/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  getCategories: async () => {
    const response = await fetch('/api/woocommerce/categories');
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  createOrder: async (orderData: any) => {
    return apiRequest('POST', '/api/woocommerce/orders', orderData);
  },

  createCustomer: async (customerData: any) => {
    return apiRequest('POST', '/api/woocommerce/customers', customerData);
  },
};