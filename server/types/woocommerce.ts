/**
 * WooCommerce API Type Definitions for BroLab Entertainment
 *
 * This module contains comprehensive type definitions for WooCommerce API responses,
 * replacing all 'any' types with proper TypeScript interfaces.
 */

// ================================
// WOOCOMMERCE PRODUCT TYPES
// ================================

/**
 * WooCommerce product metadata entry
 */
export interface WooCommerceMetaData {
  id: number;
  key: string;
  value: string | number | boolean | string[] | null;
}

/**
 * WooCommerce product image
 */
export interface WooCommerceImage {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  src: string;
  name: string;
  alt: string;
}

/**
 * WooCommerce product category
 */
export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  description?: string;
  display?: string;
  image?: WooCommerceImage | null;
  menu_order?: number;
  count?: number;
}

/**
 * WooCommerce product tag
 */
export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

/**
 * WooCommerce product attribute
 */
export interface WooCommerceAttribute {
  id: number;
  name: string;
  slug?: string;
  type?: string;
  order_by?: string;
  has_archives?: boolean;
  options: string[];
  position: number;
  visible: boolean;
  variation: boolean;
}

/**
 * WooCommerce product dimensions
 */
export interface WooCommerceDimensions {
  length: string;
  width: string;
  height: string;
}

/**
 * WooCommerce product download
 */
export interface WooCommerceDownload {
  id: string;
  name: string;
  file: string;
}

/**
 * WooCommerce default attribute
 */
export interface WooCommerceDefaultAttribute {
  id: number;
  name: string;
  option: string;
}

/**
 * Complete WooCommerce product interface
 */
export interface WooCommerceProduct {
  // Core product fields
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: "simple" | "grouped" | "external" | "variable";
  status: "draft" | "pending" | "private" | "publish";
  featured: boolean;
  catalog_visibility: "visible" | "catalog" | "search" | "hidden";
  description: string;
  short_description: string;
  sku: string;

  // Pricing
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  on_sale: boolean;

  // Inventory
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: WooCommerceDownload[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;

  // Tax and shipping
  tax_status: "taxable" | "shipping" | "none";
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  backorders: "no" | "notify" | "yes";
  backorders_allowed: boolean;
  backordered: boolean;
  low_stock_amount: number | null;
  sold_individually: boolean;
  weight: string;
  dimensions: WooCommerceDimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;

  // Reviews
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;

  // Related products
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;

  // Taxonomies
  categories: WooCommerceCategory[];
  tags: WooCommerceTag[];
  images: WooCommerceImage[];
  attributes: WooCommerceAttribute[];
  default_attributes: WooCommerceDefaultAttribute[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  price_html: string;
  related_ids: number[];

  // Metadata
  meta_data: WooCommerceMetaData[];

  // Stock status
  stock_status: "instock" | "outofstock" | "onbackorder";

  // BroLab Entertainment specific fields (extracted from meta_data)
  audio_url?: string | null;
  hasVocals?: boolean;
  stems?: boolean;
  bpm?: string;
  key?: string;
  mood?: string;
  instruments?: string;
  duration?: string;
  is_free?: boolean;
}

/**
 * WooCommerce product query parameters
 */
export interface WooCommerceProductQuery {
  context?: "view" | "edit";
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: "asc" | "desc";
  orderby?: "date" | "id" | "include" | "title" | "slug" | "price" | "popularity" | "rating";
  parent?: number[];
  parent_exclude?: number[];
  slug?: string;
  status?: "any" | "draft" | "pending" | "private" | "publish";
  type?: "simple" | "grouped" | "external" | "variable";
  sku?: string;
  featured?: boolean;
  category?: string;
  tag?: string;
  shipping_class?: string;
  attribute?: string;
  attribute_term?: string;
  tax_class?: string;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  stock_status?: "instock" | "outofstock" | "onbackorder";
}

/**
 * WooCommerce category query parameters
 */
export interface WooCommerceCategoryQuery {
  context?: "view" | "edit";
  page?: number;
  per_page?: number;
  search?: string;
  exclude?: number[];
  include?: number[];
  order?: "asc" | "desc";
  orderby?: "id" | "include" | "name" | "slug" | "term_group" | "description" | "count";
  hide_empty?: boolean;
  parent?: number;
  product?: number;
  slug?: string;
}

// ================================
// WOOCOMMERCE ORDER TYPES
// ================================

/**
 * WooCommerce billing/shipping address
 */
export interface WooCommerceAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

/**
 * WooCommerce order line item
 */
export interface WooCommerceLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
    subtotal: string;
  }>;
  meta_data: WooCommerceMetaData[];
  sku: string;
  price: number;
  image?: {
    id: string;
    src: string;
  };
  parent_name?: string | null;
}

/**
 * WooCommerce tax line
 */
export interface WooCommerceTaxLine {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  rate_percent: number;
  meta_data: WooCommerceMetaData[];
}

/**
 * WooCommerce shipping line
 */
export interface WooCommerceShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  instance_id: string;
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
  }>;
  meta_data: WooCommerceMetaData[];
}

/**
 * WooCommerce fee line
 */
export interface WooCommerceFeeLine {
  id: number;
  name: string;
  tax_class: string;
  tax_status: "taxable" | "none";
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
    subtotal: string;
  }>;
  meta_data: WooCommerceMetaData[];
}

/**
 * WooCommerce coupon line
 */
export interface WooCommerceCouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data: WooCommerceMetaData[];
}

/**
 * WooCommerce refund
 */
export interface WooCommerceRefund {
  id: number;
  date_created: string;
  date_created_gmt: string;
  amount: string;
  reason: string;
  refunded_by: number;
  refunded_payment?: boolean;
  meta_data: WooCommerceMetaData[];
  line_items: WooCommerceLineItem[];
}

/**
 * Complete WooCommerce order interface
 */
export interface WooCommerceOrder {
  // Core order fields
  id: number;
  parent_id: number;
  status:
    | "pending"
    | "processing"
    | "on-hold"
    | "completed"
    | "cancelled"
    | "refunded"
    | "failed"
    | "trash";
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;

  // Pricing
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;

  // Customer
  customer_id: number;
  order_key: string;
  billing: WooCommerceAddress;
  shipping: WooCommerceAddress;

  // Payment
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;

  // Additional info
  customer_ip_address: string;
  customer_user_agent: string;
  created_via: string;
  customer_note: string;
  date_completed: string | null;
  date_paid: string | null;
  cart_hash: string;
  number: string;

  // Order items
  line_items: WooCommerceLineItem[];
  tax_lines: WooCommerceTaxLine[];
  shipping_lines: WooCommerceShippingLine[];
  fee_lines: WooCommerceFeeLine[];
  coupon_lines: WooCommerceCouponLine[];
  refunds: WooCommerceRefund[];

  // Metadata
  meta_data: WooCommerceMetaData[];

  // Additional fields
  payment_url?: string;
  is_editable?: boolean;
  needs_payment?: boolean;
  needs_processing?: boolean;
}

/**
 * WooCommerce order query parameters
 */
export interface WooCommerceOrderQuery {
  context?: "view" | "edit";
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: "asc" | "desc";
  orderby?: "date" | "id" | "include" | "title" | "slug";
  parent?: number[];
  parent_exclude?: number[];
  status?: string[];
  customer?: number;
  product?: number;
  dp?: number;
}

// ================================
// BROLAB METADATA EXTRACTION TYPES
// ================================

/**
 * BroLab specific metadata extracted from WooCommerce products
 */
export interface BroLabProductMetadata {
  audio_url?: string | null;
  hasVocals?: boolean;
  stems?: boolean;
  bpm?: string;
  key?: string;
  mood?: string;
  instruments?: string;
  duration?: string;
  is_free?: boolean;
}

/**
 * Raw WooCommerce API response (before validation)
 */
export interface RawWooCommerceResponse {
  [key: string]: unknown;
}

/**
 * WooCommerce API error response
 */
export interface WooCommerceApiError {
  code: string;
  message: string;
  data?: {
    status: number;
    params?: Record<string, unknown>;
    details?: Record<string, unknown>;
  };
}

// ================================
// VALIDATION RESULT TYPES
// ================================

/**
 * Product validation result
 */
export interface ProductValidationResult {
  isValid: boolean;
  product?: WooCommerceProduct;
  errors?: string[];
}

/**
 * Order validation result
 */
export interface OrderValidationResult {
  isValid: boolean;
  order?: WooCommerceOrder;
  errors?: string[];
}

// ================================
// API RESPONSE WRAPPER TYPES
// ================================

/**
 * WooCommerce API response wrapper
 */
export interface WooCommerceApiResponse<T> {
  success: boolean;
  data?: T;
  error?: WooCommerceApiError;
  headers?: Record<string, string>;
  statusCode?: number;
}

/**
 * Paginated WooCommerce response
 */
export interface WooCommercePaginatedResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}
