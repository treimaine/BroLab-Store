/**
 * WooCommerce Type Helper Functions
 * Provides type-safe utilities for working with WooCommerce product data
 */

import type {
  BroLabWooCommerceProduct,
  WooCommerceAttribute,
  WooCommerceCategory,
  WooCommerceMetaData,
  WooCommerceTag,
} from "@shared/types";

/**
 * Safely extract audio URL from product metadata
 */
export function getAudioUrl(product: BroLabWooCommerceProduct): string {
  if (product.audio_url && typeof product.audio_url === "string") {
    return product.audio_url;
  }

  const audioMeta = product.meta_data?.find(
    (meta: WooCommerceMetaData) => meta.key === "audio_url"
  );

  if (audioMeta?.value && typeof audioMeta.value === "string") {
    return audioMeta.value;
  }

  return "/api/placeholder/audio.mp3";
}

/**
 * Safely extract image URL from product
 */
export function getImageUrl(product: BroLabWooCommerceProduct): string {
  return product.images?.[0]?.src || "/api/placeholder/400/250";
}

/**
 * Safely extract genre from product
 */
export function getGenre(product: BroLabWooCommerceProduct): string {
  // Try categories first
  if (product.categories?.[0]?.name) {
    return product.categories[0].name;
  }

  const categoryWithName = product.categories?.find((cat: WooCommerceCategory) => cat.name);
  if (categoryWithName) {
    return categoryWithName.name;
  }

  // Try metadata
  const genreMeta = product.meta_data?.find(
    (meta: WooCommerceMetaData) =>
      meta.key === "genre" || meta.key === "category" || meta.key === "style"
  );

  if (genreMeta?.value && typeof genreMeta.value === "string") {
    return genreMeta.value;
  }

  // Try attributes
  const genreAttr = product.attributes?.find(
    (attr: WooCommerceAttribute) => attr.name === "Genre" || attr.name === "Style"
  );

  if (genreAttr?.options?.[0]) {
    return genreAttr.options[0];
  }

  return "Unknown";
}

/**
 * Check if product is free
 */
export function isFreeProduct(product: BroLabWooCommerceProduct): boolean {
  if (product.is_free) {
    return true;
  }

  const hasFreeTag = product.tags?.some((tag: WooCommerceTag) => tag.name.toLowerCase() === "free");

  if (hasFreeTag) {
    return true;
  }

  const priceNum = Number.parseFloat(product.price);
  return priceNum === 0 || product.price === "0" || product.price === "";
}

/**
 * Get formatted price or "FREE"
 */
export function getFormattedPrice(product: BroLabWooCommerceProduct): string {
  if (isFreeProduct(product)) {
    return "FREE";
  }

  return product.price || "29.99";
}

/**
 * Safely extract BPM from product metadata
 */
export function getBpm(product: BroLabWooCommerceProduct): number | undefined {
  const bpmMeta = product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "bpm");

  if (!bpmMeta?.value) {
    return undefined;
  }

  if (typeof bpmMeta.value === "number") {
    return bpmMeta.value;
  }

  if (typeof bpmMeta.value === "string") {
    const parsed = Number.parseFloat(bpmMeta.value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

/**
 * Safely extract duration from product metadata
 */
export function getDuration(product: BroLabWooCommerceProduct): number | undefined {
  const durationMeta = product.meta_data?.find(
    (meta: WooCommerceMetaData) => meta.key === "duration"
  );

  if (!durationMeta?.value) {
    return undefined;
  }

  if (typeof durationMeta.value === "number") {
    return durationMeta.value;
  }

  if (typeof durationMeta.value === "string") {
    const parsed = Number.parseFloat(durationMeta.value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

/**
 * Safely extract tags as string array
 */
export function getTags(product: BroLabWooCommerceProduct): string[] {
  if (!product.tags) {
    return [];
  }

  return product.tags.map((tag: WooCommerceTag) => tag.name);
}

/**
 * Check if product has real audio (not placeholder)
 */
export function hasRealAudio(product: BroLabWooCommerceProduct): boolean {
  const audioUrl = getAudioUrl(product);
  return audioUrl !== "/api/placeholder/audio.mp3" && audioUrl !== "";
}
