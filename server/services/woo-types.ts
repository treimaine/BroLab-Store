/**
 * WooCommerce Service Type Definitions and Validation
 *
 * This module provides type-safe interfaces and runtime validation
 * for WooCommerce API interactions, replacing any types with proper interfaces.
 */

import { z } from "zod";
import type { WooCommerceMetaData } from "../../shared/types";

// ================================
// WOOCOMMERCE API TYPES
// ================================

// WooCommerceMetaData is imported from shared types to avoid conflicts

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
  image?: {
    id: number;
    src: string;
    name: string;
    alt: string;
  };
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
 * WooCommerce product image
 */
export interface WooCommerceImage {
  id: number;
  date_created: string;
  date_modified: string;
  src: string;
  name: string;
  alt: string;
  position?: number;
}

/**
 * WooCommerce product attribute
 */
export interface WooCommerceAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
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
 * WooCommerce product dimensions
 */
export interface WooCommerceDimensions {
  length: string;
  width: string;
  height: string;
}

/**
 * WooCommerce product default attribute
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
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
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
  date_on_sale_to: string | null;
  price_html: string;
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
  stock_status: "instock" | "outofstock" | "onbackorder";
  backorders: "no" | "notify" | "yes";
  backorders_allowed: boolean;
  backordered: boolean;
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
  related_ids: number[];
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
  meta_data: WooCommerceMetaData[];

  // BroLab specific fields (added by our mapping)
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
 * WooCommerce API query parameters
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
// SONAAR AUDIO PLUGIN TYPES
// ================================

/**
 * Sonaar audio track data structure
 */
export interface SonaarTrackData {
  audio_preview?: string;
  track_mp3?: string;
  src?: string;
  url?: string;
  title?: string;
  artist?: string;
  duration?: string;
  waveform?: number[];
}

/**
 * Parsed Sonaar metadata from WooCommerce
 * Note: tracks field is used in parseSonaarAudioData function
 */
export interface ParsedSonaarData {
  tracks: SonaarTrackData[];
  primaryAudioUrl: string | null;
}

// ================================
// ZOD VALIDATION SCHEMAS
// ================================

/**
 * WooCommerce metadata validation schema
 */
export const wooCommerceMetaDataSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
});

/**
 * WooCommerce category validation schema
 */
export const wooCommerceCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  parent: z.number().optional(),
  description: z.string().optional(),
  display: z.string().optional(),
  image: z
    .object({
      id: z.number(),
      src: z.string(),
      name: z.string(),
      alt: z.string(),
    })
    .optional(),
  menu_order: z.number().optional(),
  count: z.number().optional(),
});

/**
 * WooCommerce tag validation schema
 */
export const wooCommerceTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  count: z.number().optional(),
});

/**
 * WooCommerce image validation schema
 */
export const wooCommerceImageSchema = z.object({
  id: z.number(),
  date_created: z.string(),
  date_modified: z.string(),
  src: z.string().url(),
  name: z.string(),
  alt: z.string(),
  position: z.number().optional(),
});

/**
 * WooCommerce attribute validation schema
 */
export const wooCommerceAttributeSchema = z.object({
  id: z.number(),
  name: z.string(),
  position: z.number(),
  visible: z.boolean(),
  variation: z.boolean(),
  options: z.array(z.string()),
});

/**
 * WooCommerce product validation schema
 */
export const wooCommerceProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  permalink: z.string().url(),
  date_created: z.string(),
  date_modified: z.string(),
  type: z.enum(["simple", "grouped", "external", "variable"]),
  status: z.enum(["draft", "pending", "private", "publish"]),
  featured: z.boolean(),
  catalog_visibility: z.enum(["visible", "catalog", "search", "hidden"]),
  description: z.string(),
  short_description: z.string(),
  sku: z.string(),
  price: z.string(),
  regular_price: z.string(),
  sale_price: z.string(),
  date_on_sale_from: z.string().nullable(),
  date_on_sale_to: z.string().nullable(),
  price_html: z.string(),
  on_sale: z.boolean(),
  purchasable: z.boolean(),
  total_sales: z.number(),
  virtual: z.boolean(),
  downloadable: z.boolean(),
  downloads: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      file: z.string(),
    })
  ),
  download_limit: z.number(),
  download_expiry: z.number(),
  external_url: z.string(),
  button_text: z.string(),
  tax_status: z.enum(["taxable", "shipping", "none"]),
  tax_class: z.string(),
  manage_stock: z.boolean(),
  stock_quantity: z.number().nullable(),
  stock_status: z.enum(["instock", "outofstock", "onbackorder"]),
  backorders: z.enum(["no", "notify", "yes"]),
  backorders_allowed: z.boolean(),
  backordered: z.boolean(),
  sold_individually: z.boolean(),
  weight: z.string(),
  dimensions: z.object({
    length: z.string(),
    width: z.string(),
    height: z.string(),
  }),
  shipping_required: z.boolean(),
  shipping_taxable: z.boolean(),
  shipping_class: z.string(),
  shipping_class_id: z.number(),
  reviews_allowed: z.boolean(),
  average_rating: z.string(),
  rating_count: z.number(),
  related_ids: z.array(z.number()),
  upsell_ids: z.array(z.number()),
  cross_sell_ids: z.array(z.number()),
  parent_id: z.number(),
  purchase_note: z.string(),
  categories: z.array(wooCommerceCategorySchema),
  tags: z.array(wooCommerceTagSchema),
  images: z.array(wooCommerceImageSchema),
  attributes: z.array(wooCommerceAttributeSchema),
  default_attributes: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      option: z.string(),
    })
  ),
  variations: z.array(z.number()),
  grouped_products: z.array(z.number()),
  menu_order: z.number(),
  meta_data: z.array(wooCommerceMetaDataSchema),

  // BroLab specific fields
  audio_url: z.string().url().nullable().optional(),
  hasVocals: z.boolean().optional(),
  stems: z.boolean().optional(),
  bpm: z.string().optional(),
  key: z.string().optional(),
  mood: z.string().optional(),
  instruments: z.string().optional(),
  duration: z.string().optional(),
  is_free: z.boolean().optional(),
});

/**
 * WooCommerce product query validation schema
 */
export const wooCommerceProductQuerySchema = z.object({
  context: z.enum(["view", "edit"]).optional(),
  page: z.number().min(1).optional(),
  per_page: z.number().min(1).max(100).optional(),
  search: z.string().optional(),
  after: z.string().optional(),
  before: z.string().optional(),
  exclude: z.array(z.number()).optional(),
  include: z.array(z.number()).optional(),
  offset: z.number().min(0).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  orderby: z
    .enum(["date", "id", "include", "title", "slug", "price", "popularity", "rating"])
    .optional(),
  parent: z.array(z.number()).optional(),
  parent_exclude: z.array(z.number()).optional(),
  slug: z.string().optional(),
  status: z.enum(["any", "draft", "pending", "private", "publish"]).optional(),
  type: z.enum(["simple", "grouped", "external", "variable"]).optional(),
  sku: z.string().optional(),
  featured: z.boolean().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  shipping_class: z.string().optional(),
  attribute: z.string().optional(),
  attribute_term: z.string().optional(),
  tax_class: z.string().optional(),
  on_sale: z.boolean().optional(),
  min_price: z.string().optional(),
  max_price: z.string().optional(),
  stock_status: z.enum(["instock", "outofstock", "onbackorder"]).optional(),
});

/**
 * Sonaar track data validation schema
 */
export const sonaarTrackDataSchema = z.object({
  audio_preview: z.string().url().optional(),
  track_mp3: z.string().url().optional(),
  src: z.string().url().optional(),
  url: z.string().url().optional(),
  title: z.string().optional(),
  artist: z.string().optional(),
  duration: z.string().optional(),
  waveform: z.array(z.number()).optional(),
});

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Validate WooCommerce product data
 */
export function validateWooCommerceProduct(data: unknown): WooCommerceProduct {
  return wooCommerceProductSchema.parse(data);
}

/**
 * Validate WooCommerce product query
 */
export function validateWooCommerceQuery(query: unknown): WooCommerceProductQuery {
  return wooCommerceProductQuerySchema.parse(query);
}

/**
 * Parse Sonaar audio data from WooCommerce metadata
 */
export function parseSonaarAudioData(metaData: WooCommerceMetaData[]): ParsedSonaarData {
  const albTracklistMeta = metaData.find(meta => meta.key === "alb_tracklist");

  if (!albTracklistMeta?.value) {
    return { tracks: [], primaryAudioUrl: null };
  }

  try {
    let trackData = albTracklistMeta.value;

    // Parse JSON string if needed
    if (typeof trackData === "string") {
      trackData = JSON.parse(trackData);
    }

    let tracks: SonaarTrackData[] = [];

    if (Array.isArray(trackData)) {
      tracks = trackData.map(track => sonaarTrackDataSchema.parse(track));
    } else if (trackData && typeof trackData === "object") {
      tracks = [sonaarTrackDataSchema.parse(trackData)];
    }

    // Extract primary audio URL
    const primaryAudioUrl =
      tracks.length > 0
        ? tracks[0].audio_preview || tracks[0].track_mp3 || tracks[0].src || tracks[0].url || null
        : null;

    return { tracks, primaryAudioUrl };
  } catch (error) {
    console.error("Error parsing Sonaar audio data:", error);
    return { tracks: [], primaryAudioUrl: null };
  }
}

/**
 * Extract BroLab-specific metadata from WooCommerce product
 */
export function extractBroLabMetadata(product: WooCommerceProduct): {
  bpm?: string;
  key?: string;
  mood?: string;
  instruments?: string;
  duration?: string;
  hasVocals: boolean;
  stems: boolean;
  is_free: boolean;
  audio_url: string | null;
} {
  const { tracks: _tracks, primaryAudioUrl } = parseSonaarAudioData(product.meta_data);

  return {
    bpm: product.meta_data.find(meta => meta.key === "bpm")?.value as string,
    key: product.meta_data.find(meta => meta.key === "key")?.value as string,
    mood: product.meta_data.find(meta => meta.key === "mood")?.value as string,
    instruments: product.meta_data.find(meta => meta.key === "instruments")?.value as string,
    duration: product.meta_data.find(meta => meta.key === "duration")?.value as string,
    hasVocals:
      product.meta_data.find(meta => meta.key === "has_vocals")?.value === "yes" ||
      product.tags.some(tag => tag.name.toLowerCase().includes("vocals")),
    stems:
      product.meta_data.find(meta => meta.key === "stems")?.value === "yes" ||
      product.tags.some(tag => tag.name.toLowerCase().includes("stems")),
    is_free: product.price === "0" || product.price === "",
    audio_url: primaryAudioUrl,
  };
}

// Types are exported via the interface declarations above
