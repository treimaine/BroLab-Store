import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// WooCommerce REST API client
const woocommerce = new WooCommerceRestApi({
  url: 'https://brolabentertainment.com',
  consumerKey: import.meta.env.VITE_WC_KEY || '',
  consumerSecret: import.meta.env.VITE_WC_SECRET || '',
  version: 'wc/v3',
  queryStringAuth: true
});

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
    position: number;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }>;
  default_attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

export interface WooVariation {
  id: number;
  date_created: string;
  date_modified: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  status: string;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  download_limit: number;
  download_expiry: number;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_class: string;
  shipping_class_id: number;
  image: {
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
    position: number;
  };
  attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

export interface WooOrder {
  id?: number;
  status?: string;
  currency?: string;
  version?: string;
  prices_include_tax?: boolean;
  date_created?: string;
  date_modified?: string;
  discount_total?: string;
  discount_tax?: string;
  shipping_total?: string;
  shipping_tax?: string;
  cart_tax?: string;
  total?: string;
  total_tax?: string;
  customer_id?: number;
  order_key?: string;
  billing: {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone?: string;
  };
  shipping?: {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  payment_method: string;
  payment_method_title?: string;
  transaction_id?: string;
  customer_ip_address?: string;
  customer_user_agent?: string;
  created_via?: string;
  customer_note?: string;
  date_completed?: string | null;
  date_paid?: string | null;
  cart_hash?: string;
  line_items: Array<{
    product_id: number;
    variation_id?: number;
    quantity: number;
    tax_class?: string;
    subtotal?: string;
    subtotal_tax?: string;
    total?: string;
    total_tax?: string;
    taxes?: Array<{
      id: number;
      total: string;
      subtotal: string;
    }>;
    meta_data?: Array<{
      id?: number;
      key: string;
      value: string;
      display_key?: string;
      display_value?: string;
    }>;
  }>;
  tax_lines?: Array<{
    id?: number;
    rate_code?: string;
    rate_id?: number;
    label?: string;
    compound?: boolean;
    tax_total?: string;
    shipping_tax_total?: string;
    rate_percent?: number;
  }>;
  shipping_lines?: Array<{
    id?: number;
    method_title?: string;
    method_id?: string;
    instance_id?: string;
    total?: string;
    total_tax?: string;
    taxes?: Array<{
      id?: number;
      total?: string;
    }>;
  }>;
  fee_lines?: Array<{
    id?: number;
    name?: string;
    tax_class?: string;
    tax_status?: string;
    total?: string;
    total_tax?: string;
    taxes?: Array<{
      id?: number;
      total?: string;
      subtotal?: string;
    }>;
  }>;
  coupon_lines?: Array<{
    id?: number;
    code?: string;
    discount?: string;
    discount_tax?: string;
  }>;
}

// Get all products
export async function listProducts(params: {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  status?: string;
  orderby?: string;
  order?: 'asc' | 'desc';
} = {}): Promise<WooProduct[]> {
  try {
    const response = await woocommerce.get('products', {
      per_page: 20,
      status: 'publish',
      ...params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products from WooCommerce');
  }
}

// Get a specific product by ID
export async function getProduct(id: number): Promise<WooProduct | null> {
  try {
    const response = await woocommerce.get(`products/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return null;
  }
}

// Get product variations
export async function getProductVariations(productId: number): Promise<WooVariation[]> {
  try {
    const response = await woocommerce.get(`products/${productId}/variations`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    return [];
  }
}

// Create an order
export async function createOrder(orderData: WooOrder): Promise<WooOrder> {
  try {
    const response = await woocommerce.post('orders', orderData);
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order in WooCommerce');
  }
}

// Get order by ID
export async function getOrder(id: number): Promise<WooOrder | null> {
  try {
    const response = await woocommerce.get(`orders/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    return null;
  }
}

// Update order status
export async function updateOrderStatus(id: number, status: string): Promise<WooOrder | null> {
  try {
    const response = await woocommerce.put(`orders/${id}`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating order ${id} status:`, error);
    return null;
  }
}

// Helper function to map WooCommerce variations to licenses
export function mapWcVariationsToLicenses(variations: WooVariation[]) {
  return variations.map(variation => {
    const licenseName = variation.attributes.find(attr => 
      attr.name.toLowerCase().includes('license') || 
      attr.name.toLowerCase().includes('type')
    )?.option || 'Standard License';

    return {
      id: variation.id,
      name: licenseName,
      price: parseFloat(variation.price),
      description: variation.description,
      sku: variation.sku,
      downloadable: variation.downloadable,
      downloads: variation.downloads,
      stock_status: variation.stock_status,
      purchasable: variation.purchasable
    };
  });
}

export default woocommerce;