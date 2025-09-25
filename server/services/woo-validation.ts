/**
 * WooCommerce API Validation Functions
 *
 * This module provides validation functions for WooCommerce API responses,
 * ensuring type safety and proper data handling.
 */

import {
  BroLabProductMetadata,
  OrderValidationResult,
  RawWooCommerceResponse,
  WooCommerceCategoryQuery,
  WooCommerceMetaData,
  WooCommerceOrder,
  WooCommerceProduct,
  WooCommerceProductQuery,
} from "../types/woocommerce";

// ================================
// VALIDATION FUNCTIONS
// ================================

/**
 * Validate WooCommerce product query parameters
 */
export function validateWooCommerceQuery(query: Record<string, unknown>): WooCommerceProductQuery {
  const validatedQuery: WooCommerceProductQuery = {};

  // Validate and sanitize each query parameter
  if (query.context && typeof query.context === "string") {
    if (["view", "edit"].includes(query.context)) {
      validatedQuery.context = query.context as "view" | "edit";
    }
  }

  if (query.page && typeof query.page === "number" && query.page > 0) {
    validatedQuery.page = Math.floor(query.page);
  }

  if (
    query.per_page &&
    typeof query.per_page === "number" &&
    query.per_page > 0 &&
    query.per_page <= 100
  ) {
    validatedQuery.per_page = Math.floor(query.per_page);
  }

  if (query.search && typeof query.search === "string" && query.search.trim()) {
    validatedQuery.search = query.search.trim();
  }

  if (query.order && typeof query.order === "string") {
    if (["asc", "desc"].includes(query.order)) {
      validatedQuery.order = query.order as "asc" | "desc";
    }
  }

  if (query.orderby && typeof query.orderby === "string") {
    const validOrderBy = [
      "date",
      "id",
      "include",
      "title",
      "slug",
      "price",
      "popularity",
      "rating",
    ];
    if (validOrderBy.includes(query.orderby)) {
      validatedQuery.orderby = query.orderby as typeof validatedQuery.orderby;
    }
  }

  if (query.featured && typeof query.featured === "boolean") {
    validatedQuery.featured = query.featured;
  }

  if (query.category && typeof query.category === "string") {
    validatedQuery.category = query.category;
  }

  if (query.tag && typeof query.tag === "string") {
    validatedQuery.tag = query.tag;
  }

  if (query.on_sale && typeof query.on_sale === "boolean") {
    validatedQuery.on_sale = query.on_sale;
  }

  if (query.min_price && typeof query.min_price === "string") {
    validatedQuery.min_price = query.min_price;
  }

  if (query.max_price && typeof query.max_price === "string") {
    validatedQuery.max_price = query.max_price;
  }

  return validatedQuery;
}

/**
 * Validate WooCommerce category query parameters
 */
export function validateWooCommerceCategoryQuery(
  query: Record<string, unknown>
): WooCommerceCategoryQuery {
  const validatedQuery: WooCommerceCategoryQuery = {};

  if (query.context && typeof query.context === "string") {
    if (["view", "edit"].includes(query.context)) {
      validatedQuery.context = query.context as "view" | "edit";
    }
  }

  if (query.page && typeof query.page === "number" && query.page > 0) {
    validatedQuery.page = Math.floor(query.page);
  }

  if (
    query.per_page &&
    typeof query.per_page === "number" &&
    query.per_page > 0 &&
    query.per_page <= 100
  ) {
    validatedQuery.per_page = Math.floor(query.per_page);
  }

  if (query.search && typeof query.search === "string" && query.search.trim()) {
    validatedQuery.search = query.search.trim();
  }

  if (query.hide_empty && typeof query.hide_empty === "boolean") {
    validatedQuery.hide_empty = query.hide_empty;
  }

  if (query.parent && typeof query.parent === "number") {
    validatedQuery.parent = query.parent;
  }

  return validatedQuery;
}

/**
 * Validate a WooCommerce product object
 */
export function validateWooCommerceProduct(rawProduct: RawWooCommerceResponse): WooCommerceProduct {
  if (!rawProduct || typeof rawProduct !== "object") {
    throw new Error("Invalid product data: not an object");
  }

  // Check required fields
  const requiredFields = ["id", "name", "status", "type"];
  for (const field of requiredFields) {
    if (!(field in rawProduct)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate ID
  const id = rawProduct.id;
  if (typeof id !== "number" || id <= 0) {
    throw new Error("Invalid product ID");
  }

  // Validate name
  const name = rawProduct.name;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Invalid product name");
  }

  // Validate status
  const status = rawProduct.status;
  const validStatuses = ["draft", "pending", "private", "publish"];
  if (typeof status !== "string" || !validStatuses.includes(status)) {
    throw new Error("Invalid product status");
  }

  // Validate type
  const type = rawProduct.type;
  const validTypes = ["simple", "grouped", "external", "variable"];
  if (typeof type !== "string" || !validTypes.includes(type)) {
    throw new Error("Invalid product type");
  }

  // Build validated product with safe defaults
  const validatedProduct: WooCommerceProduct = {
    // Core fields
    id,
    name,
    slug: typeof rawProduct.slug === "string" ? rawProduct.slug : "",
    permalink: typeof rawProduct.permalink === "string" ? rawProduct.permalink : "",
    date_created:
      typeof rawProduct.date_created === "string"
        ? rawProduct.date_created
        : new Date().toISOString(),
    date_created_gmt:
      typeof rawProduct.date_created_gmt === "string"
        ? rawProduct.date_created_gmt
        : new Date().toISOString(),
    date_modified:
      typeof rawProduct.date_modified === "string"
        ? rawProduct.date_modified
        : new Date().toISOString(),
    date_modified_gmt:
      typeof rawProduct.date_modified_gmt === "string"
        ? rawProduct.date_modified_gmt
        : new Date().toISOString(),
    type: type as WooCommerceProduct["type"],
    status: status as WooCommerceProduct["status"],
    featured: typeof rawProduct.featured === "boolean" ? rawProduct.featured : false,
    catalog_visibility:
      typeof rawProduct.catalog_visibility === "string"
        ? (rawProduct.catalog_visibility as WooCommerceProduct["catalog_visibility"])
        : "visible",
    description: typeof rawProduct.description === "string" ? rawProduct.description : "",
    short_description:
      typeof rawProduct.short_description === "string" ? rawProduct.short_description : "",
    sku: typeof rawProduct.sku === "string" ? rawProduct.sku : "",

    // Pricing
    price: typeof rawProduct.price === "string" ? rawProduct.price : "0",
    regular_price: typeof rawProduct.regular_price === "string" ? rawProduct.regular_price : "0",
    sale_price: typeof rawProduct.sale_price === "string" ? rawProduct.sale_price : "",
    date_on_sale_from:
      typeof rawProduct.date_on_sale_from === "string" ? rawProduct.date_on_sale_from : null,
    date_on_sale_from_gmt:
      typeof rawProduct.date_on_sale_from_gmt === "string"
        ? rawProduct.date_on_sale_from_gmt
        : null,
    date_on_sale_to:
      typeof rawProduct.date_on_sale_to === "string" ? rawProduct.date_on_sale_to : null,
    date_on_sale_to_gmt:
      typeof rawProduct.date_on_sale_to_gmt === "string" ? rawProduct.date_on_sale_to_gmt : null,
    on_sale: typeof rawProduct.on_sale === "boolean" ? rawProduct.on_sale : false,

    // Inventory
    purchasable: typeof rawProduct.purchasable === "boolean" ? rawProduct.purchasable : true,
    total_sales: typeof rawProduct.total_sales === "number" ? rawProduct.total_sales : 0,
    virtual: typeof rawProduct.virtual === "boolean" ? rawProduct.virtual : false,
    downloadable: typeof rawProduct.downloadable === "boolean" ? rawProduct.downloadable : false,
    downloads: Array.isArray(rawProduct.downloads) ? rawProduct.downloads : [],
    download_limit: typeof rawProduct.download_limit === "number" ? rawProduct.download_limit : -1,
    download_expiry:
      typeof rawProduct.download_expiry === "number" ? rawProduct.download_expiry : -1,
    external_url: typeof rawProduct.external_url === "string" ? rawProduct.external_url : "",
    button_text: typeof rawProduct.button_text === "string" ? rawProduct.button_text : "",

    // Tax and shipping
    tax_status:
      typeof rawProduct.tax_status === "string"
        ? (rawProduct.tax_status as WooCommerceProduct["tax_status"])
        : "taxable",
    tax_class: typeof rawProduct.tax_class === "string" ? rawProduct.tax_class : "",
    manage_stock: typeof rawProduct.manage_stock === "boolean" ? rawProduct.manage_stock : false,
    stock_quantity:
      typeof rawProduct.stock_quantity === "number" ? rawProduct.stock_quantity : null,
    backorders:
      typeof rawProduct.backorders === "string"
        ? (rawProduct.backorders as WooCommerceProduct["backorders"])
        : "no",
    backorders_allowed:
      typeof rawProduct.backorders_allowed === "boolean" ? rawProduct.backorders_allowed : false,
    backordered: typeof rawProduct.backordered === "boolean" ? rawProduct.backordered : false,
    low_stock_amount:
      typeof rawProduct.low_stock_amount === "number" ? rawProduct.low_stock_amount : null,
    sold_individually:
      typeof rawProduct.sold_individually === "boolean" ? rawProduct.sold_individually : false,
    weight: typeof rawProduct.weight === "string" ? rawProduct.weight : "",
    dimensions:
      rawProduct.dimensions && typeof rawProduct.dimensions === "object"
        ? {
            length:
              typeof (rawProduct.dimensions as Record<string, unknown>).length === "string"
                ? String((rawProduct.dimensions as Record<string, unknown>).length)
                : "",
            width:
              typeof (rawProduct.dimensions as Record<string, unknown>).width === "string"
                ? String((rawProduct.dimensions as Record<string, unknown>).width)
                : "",
            height:
              typeof (rawProduct.dimensions as Record<string, unknown>).height === "string"
                ? String((rawProduct.dimensions as Record<string, unknown>).height)
                : "",
          }
        : { length: "", width: "", height: "" },
    shipping_required:
      typeof rawProduct.shipping_required === "boolean" ? rawProduct.shipping_required : true,
    shipping_taxable:
      typeof rawProduct.shipping_taxable === "boolean" ? rawProduct.shipping_taxable : true,
    shipping_class: typeof rawProduct.shipping_class === "string" ? rawProduct.shipping_class : "",
    shipping_class_id:
      typeof rawProduct.shipping_class_id === "number" ? rawProduct.shipping_class_id : 0,

    // Reviews
    reviews_allowed:
      typeof rawProduct.reviews_allowed === "boolean" ? rawProduct.reviews_allowed : true,
    average_rating: typeof rawProduct.average_rating === "string" ? rawProduct.average_rating : "0",
    rating_count: typeof rawProduct.rating_count === "number" ? rawProduct.rating_count : 0,

    // Related products
    upsell_ids: Array.isArray(rawProduct.upsell_ids) ? rawProduct.upsell_ids : [],
    cross_sell_ids: Array.isArray(rawProduct.cross_sell_ids) ? rawProduct.cross_sell_ids : [],
    parent_id: typeof rawProduct.parent_id === "number" ? rawProduct.parent_id : 0,
    purchase_note: typeof rawProduct.purchase_note === "string" ? rawProduct.purchase_note : "",

    // Taxonomies
    categories: Array.isArray(rawProduct.categories) ? rawProduct.categories : [],
    tags: Array.isArray(rawProduct.tags) ? rawProduct.tags : [],
    images: Array.isArray(rawProduct.images) ? rawProduct.images : [],
    attributes: Array.isArray(rawProduct.attributes) ? rawProduct.attributes : [],
    default_attributes: Array.isArray(rawProduct.default_attributes)
      ? rawProduct.default_attributes
      : [],
    variations: Array.isArray(rawProduct.variations) ? rawProduct.variations : [],
    grouped_products: Array.isArray(rawProduct.grouped_products) ? rawProduct.grouped_products : [],
    menu_order: typeof rawProduct.menu_order === "number" ? rawProduct.menu_order : 0,
    price_html: typeof rawProduct.price_html === "string" ? rawProduct.price_html : "",
    related_ids: Array.isArray(rawProduct.related_ids) ? rawProduct.related_ids : [],

    // Metadata
    meta_data: Array.isArray(rawProduct.meta_data) ? rawProduct.meta_data : [],

    // Stock status
    stock_status:
      typeof rawProduct.stock_status === "string"
        ? (rawProduct.stock_status as WooCommerceProduct["stock_status"])
        : "instock",
  };

  return validatedProduct;
}

/**
 * Extract BroLab specific metadata from WooCommerce product
 */
export function extractBroLabMetadata(product: WooCommerceProduct): BroLabProductMetadata {
  const metadata: BroLabProductMetadata = {};

  if (!product.meta_data || !Array.isArray(product.meta_data)) {
    return metadata;
  }

  // Helper function to find metadata by key
  const findMetaValue = (key: string): WooCommerceMetaData | undefined => {
    return product.meta_data.find((meta: WooCommerceMetaData) => meta.key === key);
  };

  // Extract audio URL from alb_tracklist or audio_url
  const albTracklistMeta = findMetaValue("alb_tracklist");
  const audioUrlMeta = findMetaValue("audio_url");

  if (albTracklistMeta && albTracklistMeta.value) {
    try {
      const tracklistValue =
        typeof albTracklistMeta.value === "string"
          ? JSON.parse(albTracklistMeta.value)
          : albTracklistMeta.value;

      if (Array.isArray(tracklistValue) && tracklistValue.length > 0) {
        const firstTrack = tracklistValue[0];
        if (firstTrack && typeof firstTrack === "object" && "file" in firstTrack) {
          metadata.audio_url = String(firstTrack.file);
        }
      }
    } catch (error) {
      console.warn(`Failed to parse alb_tracklist for product ${product.id}:`, error);
    }
  }

  if (!metadata.audio_url && audioUrlMeta && audioUrlMeta.value) {
    metadata.audio_url = String(audioUrlMeta.value);
  }

  // Extract other BroLab metadata
  const hasVocalsMeta = findMetaValue("has_vocals");
  if (hasVocalsMeta) {
    metadata.hasVocals = hasVocalsMeta.value === "yes" || hasVocalsMeta.value === true;
  }

  // Check tags for vocals if not found in metadata
  if (metadata.hasVocals === undefined && product.tags) {
    metadata.hasVocals = product.tags.some(
      tag =>
        tag &&
        typeof tag === "object" &&
        "name" in tag &&
        String((tag as { name: unknown }).name)
          .toLowerCase()
          .includes("vocals")
    );
  }

  const stemsMeta = findMetaValue("stems");
  if (stemsMeta) {
    metadata.stems = stemsMeta.value === "yes" || stemsMeta.value === true;
  }

  // Check tags for stems if not found in metadata
  if (metadata.stems === undefined && product.tags) {
    metadata.stems = product.tags.some(
      tag =>
        tag &&
        typeof tag === "object" &&
        "name" in tag &&
        String((tag as { name: unknown }).name)
          .toLowerCase()
          .includes("stems")
    );
  }

  // Extract simple string metadata
  const stringFields = ["bpm", "key", "mood", "instruments", "duration"];
  for (const field of stringFields) {
    const meta = findMetaValue(field);
    if (meta && meta.value) {
      (metadata as Record<string, string>)[field] = String(meta.value);
    }
  }

  // Determine if product is free
  metadata.is_free = product.price === "0" || product.price === "";

  return metadata;
}

/**
 * Validate WooCommerce order object
 */
export function validateWooCommerceOrder(rawOrder: RawWooCommerceResponse): OrderValidationResult {
  if (!rawOrder || typeof rawOrder !== "object") {
    return {
      isValid: false,
      errors: ["Invalid order data: not an object"],
    };
  }

  const errors: string[] = [];

  // Check required fields
  const requiredFields = ["id", "status", "currency"];
  for (const field of requiredFields) {
    if (!(field in rawOrder)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  try {
    // Basic validation - in a real implementation, you'd validate all fields
    const order = rawOrder as unknown as WooCommerceOrder;

    if (typeof order.id !== "number" || order.id <= 0) {
      errors.push("Invalid order ID");
    }

    if (typeof order.status !== "string") {
      errors.push("Invalid order status");
    }

    if (typeof order.currency !== "string" || order.currency.length !== 3) {
      errors.push("Invalid currency code");
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, order };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`],
    };
  }
}

/**
 * Sanitize and validate unknown data from WooCommerce API
 */
export function sanitizeWooCommerceData<T>(
  data: unknown,
  validator: (data: unknown) => T
): T | null {
  try {
    return validator(data);
  } catch (error) {
    console.error("WooCommerce data validation failed:", error);
    return null;
  }
}

/**
 * Check if a value is a valid WooCommerce metadata entry
 */
export function isValidMetaData(value: unknown): value is WooCommerceMetaData {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    "key" in value &&
    "value" in value &&
    typeof (value as { id?: unknown; key?: unknown }).id === "number" &&
    typeof (value as { id?: unknown; key?: unknown }).key === "string"
  );
}

/**
 * Safely extract array from unknown data
 */
export function safeExtractArray<T>(
  data: unknown,
  itemValidator?: (item: unknown) => T | null
): T[] {
  if (!Array.isArray(data)) {
    return [];
  }

  if (!itemValidator) {
    return data as T[];
  }

  const validItems: T[] = [];
  for (const item of data) {
    const validatedItem = itemValidator(item);
    if (validatedItem !== null) {
      validItems.push(validatedItem);
    }
  }

  return validItems;
}
