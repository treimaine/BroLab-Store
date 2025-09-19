// WooCommerce API type definitions

// ================================
// WOOCOMMERCE PRODUCT TYPES
// ================================

export interface WooCommerceMetaData {
  key: string;
  value: string | number | boolean | object;
}

export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceCategory {
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

export interface WooCommerceImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface WooCommerceProduct {
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
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: unknown[];
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
  categories: WooCommerceCategory[];
  tags: WooCommerceTag[];
  images: WooCommerceImage[];
  attributes: WooCommerceAttribute[];
  default_attributes: unknown[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: WooCommerceMetaData[];
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
  taxes: unknown[];
  meta_data: WooCommerceMetaData[];
  sku: string;
  price: number;
}

export interface WooCommerceBilling {
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

export interface WooCommerceShipping {
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

export interface WooCommerceOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: WooCommerceBilling;
  shipping: WooCommerceShipping;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string | null;
  date_completed: string | null;
  cart_hash: string;
  meta_data: WooCommerceMetaData[];
  line_items: WooCommerceOrderLineItem[];
  tax_lines: unknown[];
  shipping_lines: unknown[];
  fee_lines: unknown[];
  coupon_lines: unknown[];
  refunds: unknown[];
}

// ================================
// WOOCOMMERCE CUSTOMER TYPES
// ================================

export interface WooCommerceCustomer {
  id: number;
  date_created: string;
  date_modified: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: WooCommerceBilling;
  shipping: WooCommerceShipping;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: WooCommerceMetaData[];
}

// ================================
// METADATA EXTRACTION TYPES
// ================================

export interface ProductMetadata {
  bpm?: string;
  key?: string;
  mood?: string;
  artist?: string;
  genre?: string;
  duration?: string;
  instruments?: string;
  hasVocals?: boolean;
  stems?: boolean;
  timeSignature?: string;
}

// ================================
// QUERY PARAMETER TYPES
// ================================

export interface WooCommerceProductQuery {
  search?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  per_page?: string;
  page?: string;
  orderby?: string;
  order?: string;
  bpm_min?: string;
  bpm_max?: string;
  key?: string;
  mood?: string;
  producer?: string;
  duration_min?: string;
  duration_max?: string;
  has_vocals?: string;
  stems?: string;
  is_free?: string;
  tags?: string;
  keys?: string;
  moods?: string;
  producers?: string;
  instruments?: string;
  time_signature?: string;
}

export interface WooCommerceMetaQuery {
  key: string;
  value?: string | number;
  compare?: string;
  type?: string;
}

// ================================
// TRANSFORMED PRODUCT TYPES
// ================================

export interface TransformedProduct
  extends Omit<WooCommerceProduct, "price" | "regular_price" | "sale_price"> {
  price: number;
  regular_price: number;
  sale_price: number;
  audio_url: string | null;
  bpm: string;
  key: string;
  mood: string;
  artist: string;
  genre: string;
  duration: string;
  instruments: string;
  is_free: boolean;
  hasVocals: boolean;
  stems: boolean;
}

// ================================
// ERROR TYPES
// ================================

export interface WooCommerceError extends Error {
  status?: number;
  code?: string;
  data?: unknown;
}

// ================================
// HELPER FUNCTIONS FOR METADATA EXTRACTION
// ================================

export interface MetadataExtractor {
  extractInstruments(product: WooCommerceProduct): string[] | null;
  extractTags(product: WooCommerceProduct): string[] | null;
  extractTimeSignature(product: WooCommerceProduct): string | null;
  extractDuration(product: WooCommerceProduct): number | null;
  extractHasVocals(product: WooCommerceProduct): boolean;
  extractStems(product: WooCommerceProduct): boolean;
  extractBpm(product: WooCommerceProduct): string;
  extractKey(product: WooCommerceProduct): string;
  extractMood(product: WooCommerceProduct): string;
  extractArtist(product: WooCommerceProduct): string;
  extractGenre(product: WooCommerceProduct): string;
}

// ================================
// AUDIO URL EXTRACTION TYPES
// ================================

export interface SonaarTrackData {
  track_mp3?: string;
  audio_preview?: string;
  src?: string;
  url?: string;
}

export interface AudioUrlExtractor {
  extractAudioUrl(product: WooCommerceProduct): string | null;
  parseAlbTracklist(tracklistValue: string | object): SonaarTrackData | null;
}

// ================================
// PRODUCT TRANSFORMATION TYPES
// ================================

export interface ProductTransformer {
  transformProduct(product: WooCommerceProduct): TransformedProduct;
  transformProducts(products: WooCommerceProduct[]): TransformedProduct[];
}

// ================================
// QUERY BUILDER TYPES
// ================================

export interface QueryBuilder {
  buildMetaQuery(query: WooCommerceProductQuery): WooCommerceMetaQuery[];
  buildAttributeQuery(query: WooCommerceProductQuery): Record<string, unknown>;
  buildTagQuery(query: WooCommerceProductQuery): string;
}
