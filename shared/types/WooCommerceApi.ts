/**
 * WooCommerce API Type Definitions
 *
 * Comprehensive type definitions for WooCommerce REST API responses
 * to replace all 'any' and 'unknown' types in API boundaries.
 */

// ================================
// WOOCOMMERCE PRODUCT TYPES
// ================================

export interface WooCommerceMetaData {
  id: number;
  key: string;
  value: string | number | boolean | string[] | null;
}

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

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooCommerceDefaultAttribute {
  id: number;
  name: string;
  option: string;
}

export interface WooCommerceDimensions {
  length: string;
  width: string;
  height: string;
}

export interface WooCommerceDownload {
  id: string;
  name: string;
  file: string;
}

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

export interface WooCommerceShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  instance_id: string;
  total: string;
  total_tax: string;
  taxes: WooCommerceTaxLine[];
  meta_data: WooCommerceMetaData[];
}

export interface WooCommerceFeeLine {
  id: number;
  name: string;
  tax_class: string;
  tax_status: string;
  amount: string;
  total: string;
  total_tax: string;
  taxes: WooCommerceTaxLine[];
  meta_data: WooCommerceMetaData[];
}

export interface WooCommerceCouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data: WooCommerceMetaData[];
}

export interface WooCommerceRefund {
  id: number;
  date_created: string;
  date_created_gmt: string;
  amount: string;
  reason: string;
  refunded_by: number;
  refunded_payment: boolean;
  meta_data: WooCommerceMetaData[];
  line_items: WooCommerceOrderLineItem[];
}

// ================================
// WOOCOMMERCE PRODUCT INTERFACE
// ================================

export interface WooCommerceProduct {
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
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: WooCommerceDownload[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
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
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
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
  meta_data: WooCommerceMetaData[];
  stock_status: "instock" | "outofstock" | "onbackorder";
  has_options: boolean;
  post_password: string;
  global_unique_id: string;
}

// ================================
// WOOCOMMERCE ORDER TYPES
// ================================

export interface WooCommerceOrderLineItem {
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
  taxes: WooCommerceTaxLine[];
  meta_data: WooCommerceMetaData[];
  sku: string;
  price: number;
  image: WooCommerceImage;
  parent_name: string | null;
}

export interface WooCommerceOrder {
  id: number;
  parent_id: number;
  status: string;
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key: string;
  billing: WooCommerceBillingAddress;
  shipping: WooCommerceShippingAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_ip_address: string;
  customer_user_agent: string;
  created_via: string;
  customer_note: string;
  date_completed: string | null;
  date_paid: string | null;
  cart_hash: string;
  number: string;
  meta_data: WooCommerceMetaData[];
  line_items: WooCommerceOrderLineItem[];
  tax_lines: WooCommerceTaxLine[];
  shipping_lines: WooCommerceShippingLine[];
  fee_lines: WooCommerceFeeLine[];
  coupon_lines: WooCommerceCouponLine[];
  refunds: WooCommerceRefund[];
  payment_url: string;
  is_editable: boolean;
  needs_payment: boolean;
  needs_processing: boolean;
  date_created_gmt: string;
  date_modified_gmt: string;
  date_completed_gmt: string | null;
  date_paid_gmt: string | null;
  currency_symbol: string;
}

export interface WooCommerceBillingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

export interface WooCommerceShippingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

// ================================
// WOOCOMMERCE CUSTOMER TYPES
// ================================

export interface WooCommerceCustomer {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: WooCommerceBillingAddress;
  shipping: WooCommerceShippingAddress;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: WooCommerceMetaData[];
}

// ================================
// WOOCOMMERCE ERROR TYPES
// ================================

export interface WooCommerceError {
  code: string;
  message: string;
  data?: {
    status?: number;
    params?: Record<string, unknown>;
    details?: Record<string, unknown>;
  };
}

export interface WooCommerceErrorResponse {
  code: string;
  message: string;
  data: {
    status: number;
  };
}

// ================================
// BROLAB SPECIFIC EXTENSIONS
// ================================

/**
 * BroLab-specific product extensions for beats marketplace
 */
export interface BroLabProductExtensions {
  // Audio-specific metadata
  audio_url?: string | null;
  hasVocals?: boolean;
  stems?: boolean;
  bpm?: string;
  key?: string;
  mood?: string;
  instruments?: string;
  duration?: string;
  is_free?: boolean;

  // Beat-specific attributes
  genre?: string;
  subgenre?: string;
  energy_level?: "low" | "medium" | "high";
  tempo_description?: string;

  // Licensing information
  license_types?: Array<{
    type: "basic" | "premium" | "unlimited";
    price: number;
    features: string[];
  }>;

  // Producer information
  producer_name?: string;
  producer_id?: number;
  collaboration?: boolean;

  // Technical specifications
  sample_rate?: number;
  bit_depth?: number;
  file_formats?: string[];

  // Marketing data
  featured_until?: string | null;
  promotion_price?: string | null;
  promotion_end_date?: string | null;
}

/**
 * Extended WooCommerce product with BroLab-specific fields
 */
export interface BroLabWooCommerceProduct extends WooCommerceProduct, BroLabProductExtensions {}

// ================================
// API QUERY TYPES
// ================================

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
// TYPE GUARDS
// ================================

export function isWooCommerceProduct(data: unknown): data is WooCommerceProduct {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "name" in data &&
    "price" in data &&
    typeof (data as WooCommerceProduct).id === "number" &&
    typeof (data as WooCommerceProduct).name === "string"
  );
}

export function isWooCommerceOrder(data: unknown): data is WooCommerceOrder {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "status" in data &&
    "total" in data &&
    typeof (data as WooCommerceOrder).id === "number" &&
    typeof (data as WooCommerceOrder).status === "string"
  );
}

export function isWooCommerceError(data: unknown): data is WooCommerceError {
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    "message" in data &&
    typeof (data as WooCommerceError).code === "string" &&
    typeof (data as WooCommerceError).message === "string"
  );
}

export function isBroLabProduct(data: unknown): data is BroLabWooCommerceProduct {
  return isWooCommerceProduct(data);
}

// ================================
// VALIDATION HELPERS
// ================================

export function validateWooCommerceMetaData(data: unknown): data is WooCommerceMetaData {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "key" in data &&
    "value" in data &&
    typeof (data as WooCommerceMetaData).id === "number" &&
    typeof (data as WooCommerceMetaData).key === "string"
  );
}

export function extractBeatMetadata(product: WooCommerceProduct): BroLabProductExtensions {
  const metadata: BroLabProductExtensions = {};

  if (product.meta_data) {
    for (const meta of product.meta_data) {
      switch (meta.key) {
        case "audio_url":
          metadata.audio_url = typeof meta.value === "string" ? meta.value : null;
          break;
        case "has_vocals":
          metadata.hasVocals = meta.value === "yes" || meta.value === true;
          break;
        case "stems":
          metadata.stems = meta.value === "yes" || meta.value === true;
          break;
        case "bpm":
          metadata.bpm = typeof meta.value === "string" ? meta.value : String(meta.value);
          break;
        case "key":
          metadata.key = typeof meta.value === "string" ? meta.value : String(meta.value);
          break;
        case "mood":
          metadata.mood = typeof meta.value === "string" ? meta.value : String(meta.value);
          break;
        case "instruments":
          metadata.instruments = typeof meta.value === "string" ? meta.value : String(meta.value);
          break;
        case "duration":
          metadata.duration = typeof meta.value === "string" ? meta.value : String(meta.value);
          break;
      }
    }
  }

  // Check if product is free
  metadata.is_free = product.price === "0" || product.price === "";

  // Extract genre from categories
  if (product.categories && product.categories.length > 0) {
    metadata.genre = product.categories[0].name;
  }

  return metadata;
}
