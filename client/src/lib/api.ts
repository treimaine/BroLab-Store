import { apiService } from "@/services/ApiService";
import { apiRequest } from "./queryClient";

// Newsletter API
export const newsletterApi = {
  subscribe: async (email: string): Promise<Response> => {
    return apiRequest("POST", "/api/newsletter/subscribe", { email });
  },
};

// Contact API
export const contactApi = {
  submit: async (data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<Response> => {
    return apiRequest("POST", "/api/contact", data);
  },
};

// WordPress API helpers
export const wordpressApi = {
  getPage: async (slug: string): Promise<unknown> => {
    const response = await apiService.get(`/wordpress/pages/${slug}`);
    return response.data;
  },

  getPosts: async (params?: {
    per_page?: number;
    page?: number;
    search?: string;
  }): Promise<unknown> => {
    const searchParams = new URLSearchParams();
    if (params?.per_page) searchParams.append("per_page", params.per_page.toString());
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.search) searchParams.append("search", params.search);

    const response = await apiService.get(`/wordpress/posts?${searchParams}`);
    return response.data;
  },
};

// WooCommerce order data interface
export interface WooCommerceOrderData {
  payment_method?: string;
  payment_method_title?: string;
  set_paid?: boolean;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  line_items?: Array<{
    product_id: number;
    quantity: number;
    meta_data?: Array<{ key: string; value: string }>;
  }>;
  meta_data?: Array<{ key: string; value: string }>;
}

// WooCommerce customer data interface
export interface WooCommerceCustomerData {
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

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
  }): Promise<unknown> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.min_price) params.append("min_price", filters.min_price.toString());
    if (filters?.max_price) params.append("max_price", filters.max_price.toString());
    if (filters?.per_page) params.append("per_page", filters.per_page.toString());
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.orderby) params.append("orderby", filters.orderby);
    if (filters?.order) params.append("order", filters.order);

    const response = await apiService.get(`/woocommerce/products?${params}`);
    return response.data;
  },

  getProduct: async (id: string): Promise<unknown> => {
    const response = await apiService.get(`/woocommerce/products/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<unknown> => {
    const response = await apiService.get("/woocommerce/categories");
    return response.data;
  },

  createOrder: async (orderData: WooCommerceOrderData): Promise<Response> => {
    return apiRequest("POST", "/api/woocommerce/orders", orderData);
  },

  createCustomer: async (customerData: WooCommerceCustomerData): Promise<Response> => {
    return apiRequest("POST", "/api/woocommerce/customers", customerData);
  },
};
