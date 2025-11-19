/**
 * Product Page Helper Functions
 * Extracted to reduce cognitive complexity
 */

import type { LicenseTypeEnum } from "@shared/schema";
import { LicenseType } from "@shared/types/Beat";

// Type alias for WooCommerce metadata value
export type MetaDataValue = string | number | boolean | string[] | null;

export interface WooCommerceMetaData {
  key: string;
  value: MetaDataValue;
}

export interface WooCommerceTag {
  name: string;
}

export interface LicenseOption {
  type: LicenseTypeEnum;
  name: string;
  description: string;
  price: number;
}

/**
 * Convert LicenseTypeEnum to LicenseType enum for modal
 */
export function getLicenseTypeForModal(license: LicenseTypeEnum): LicenseType {
  switch (license) {
    case "basic":
      return LicenseType.BASIC;
    case "premium":
      return LicenseType.PREMIUM;
    case "unlimited":
      return LicenseType.UNLIMITED;
    default:
      return LicenseType.BASIC;
  }
}

/**
 * Check if a product is free
 */
export function isProductFree(product: {
  is_free?: boolean;
  tags?: Array<WooCommerceTag | string>;
  price: number | string;
}): boolean {
  return (
    product.is_free ||
    product.tags?.some((tag: WooCommerceTag | string) =>
      typeof tag === "string" ? tag.toLowerCase() === "free" : tag.name.toLowerCase() === "free"
    ) ||
    product.price === 0 ||
    product.price === "0" ||
    false
  );
}

/**
 * Extract metadata value by key
 */
export function getMetaDataValue(
  metaData: Array<WooCommerceMetaData> | undefined,
  key: string
): MetaDataValue {
  return metaData?.find(meta => meta.key === key)?.value || null;
}

/**
 * Map tags to string array
 */
export function mapTagsToStrings(tags: Array<WooCommerceTag | string> | undefined): string[] {
  return tags?.map(tag => (typeof tag === "string" ? tag : tag.name)) || [];
}

/**
 * WooCommerce product type for similar products
 */
export interface WooCommerceProduct {
  id: number;
  name: string;
  price: number;
  images?: Array<{ src: string }>;
  bpm?: number;
  categories?: Array<{ name: string }>;
  meta_data?: Array<WooCommerceMetaData>;
  tags?: Array<WooCommerceTag | string>;
}

/**
 * Beat recommendation type
 */
export interface BeatRecommendation {
  id: number;
  title: string;
  price: number;
  image: string;
  bpm: number | null;
  genre: string;
  mood: MetaDataValue;
  key: MetaDataValue;
  tags: string[];
}

/**
 * Transform WooCommerce product to beat recommendation
 */
export function transformProductToRecommendation(product: WooCommerceProduct): BeatRecommendation {
  return {
    id: product.id,
    title: product.name,
    price: product.price,
    image: product.images?.[0]?.src || "/api/placeholder/400/400",
    bpm: product.bpm || null,
    genre: product.categories?.[0]?.name || "Unknown",
    mood: getMetaDataValue(product.meta_data, "mood"),
    key: getMetaDataValue(product.meta_data, "key"),
    tags: mapTagsToStrings(product.tags),
  };
}

/**
 * Handle download error with user-friendly messages
 */
export function handleDownloadError(
  error: unknown,
  toast: (options: { title: string; description: string; variant?: "destructive" }) => void
): void {
  console.error("Download error:", error);

  if (!(error instanceof Error)) {
    toast({
      title: "Download Error",
      description: "An unexpected error occurred. Please try again.",
      variant: "destructive",
    });
    return;
  }

  if (error.message === "AUTHENTICATION_REQUIRED" || error.message.includes("401")) {
    toast({
      title: "Authentication Required",
      description: "Please log in to download this beat.",
      variant: "destructive",
    });
    setTimeout(() => {
      globalThis.location.href = "/login";
    }, 2000);
  } else if (error.message.includes("Network")) {
    toast({
      title: "Network Error",
      description: "Please check your internet connection and try again.",
      variant: "destructive",
    });
  } else {
    toast({
      title: "Download Error",
      description: "There was an error processing your download. Please try again.",
      variant: "destructive",
    });
  }
}
