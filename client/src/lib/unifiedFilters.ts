import { BeatProduct } from "@shared/schema";

// Types for unified filters
export interface UnifiedFilters {
  // Server-side filters (WooCommerce API)
  search?: string;
  categories?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  sortBy?: "date" | "price" | "title" | "popularity";
  sortOrder?: "asc" | "desc";

  // Client-side filters (custom metadata)
  bpmRange?: {
    min: number;
    max: number;
  };
  keys?: string[];
  moods?: string[];
  instruments?: string[];
  producers?: string[];
  tags?: string[];
  timeSignature?: string[];
  duration?: {
    min: number;
    max: number;
  };
  isFree?: boolean;
  hasVocals?: boolean;
  stems?: boolean;
}

// Types for WooCommerce metadata and attributes
interface WooMetaData {
  key: string;
  value: string | number | boolean;
}

interface WooAttribute {
  name: string;
  options?: string[];
}

interface WooTag {
  name: string;
}

interface ExtendedBeatProduct extends BeatProduct {
  meta_data?: WooMetaData[];
  attributes?: WooAttribute[];
  tags?: WooTag[];
}

// Server filter result type
interface ServerFilters {
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  orderby?: string;
  order?: string;
  bpm_min?: number;
  bpm_max?: number;
  keys?: string;
  moods?: string;
  producers?: string;
  instruments?: string;
  tags?: string;
  time_signature?: string;
  duration_min?: number;
  duration_max?: number;
  is_free?: string;
  has_vocals?: string;
  stems?: string;
}

// Filter configuration by source
export const FILTER_CONFIG = {
  // Server-side filters (WooCommerce API)
  SERVER_SIDE: {
    search: true,
    categories: true,
    priceRange: true,
    sortBy: true,
    sortOrder: true,
  },

  // Client-side filters (custom metadata)
  CLIENT_SIDE: {
    bpmRange: true,
    keys: true,
    moods: true,
    instruments: true,
    producers: true,
    tags: true,
    timeSignature: true,
    duration: true,
    isFree: true,
    hasVocals: true,
    stems: true,
  },
} as const;

// Helper to add basic server filters
function addBasicFilters(filters: UnifiedFilters, result: ServerFilters): void {
  if (filters.search) result.search = filters.search;
  if (filters.categories?.length) result.category = filters.categories.join(",");
  if (filters.priceRange) {
    result.min_price = filters.priceRange.min;
    result.max_price = filters.priceRange.max;
  }
  if (filters.sortBy) result.orderby = filters.sortBy;
  if (filters.sortOrder) result.order = filters.sortOrder;
}

// Helper to add metadata filters
function addMetadataFilters(filters: UnifiedFilters, result: ServerFilters): void {
  if (filters.bpmRange) {
    result.bpm_min = filters.bpmRange.min;
    result.bpm_max = filters.bpmRange.max;
  }
  if (filters.keys?.length) result.keys = filters.keys.join(",");
  if (filters.moods?.length) result.moods = filters.moods.join(",");
  if (filters.producers?.length) result.producers = filters.producers.join(",");
  if (filters.instruments?.length) result.instruments = filters.instruments.join(",");
  if (filters.tags?.length) result.tags = filters.tags.join(",");
  if (filters.timeSignature?.length) result.time_signature = filters.timeSignature.join(",");
  if (filters.duration) {
    result.duration_min = filters.duration.min;
    result.duration_max = filters.duration.max;
  }
  if (filters.isFree === true) result.is_free = "true";
  if (filters.hasVocals === true) result.has_vocals = "true";
  if (filters.stems === true) result.stems = "true";
}

// Extract server-side filters from unified filters
export function extractServerSideFilters(filters: UnifiedFilters): ServerFilters {
  const serverFilters: ServerFilters = {};
  addBasicFilters(filters, serverFilters);
  addMetadataFilters(filters, serverFilters);
  return serverFilters;
}

// Client-side filtering - ALL FILTERS ARE NOW SERVER-SIDE
export function filterClientSide(products: BeatProduct[], _filters: UnifiedFilters): BeatProduct[] {
  // All filters are now handled server-side
  // This function no longer performs client-side filtering
  return products;
}

// Metadata extraction functions
function findMetaValue(
  product: ExtendedBeatProduct,
  key: string
): string | number | boolean | undefined {
  return product.meta_data?.find(meta => meta.key === key)?.value;
}

function findAttributeOption(product: ExtendedBeatProduct, name: string): string | undefined {
  return product.attributes?.find(attr => attr.name === name)?.options?.[0];
}

function extractBPM(product: BeatProduct): number | null {
  const extended = product as ExtendedBeatProduct;
  const bpm = product.bpm ?? findMetaValue(extended, "bpm") ?? findAttributeOption(extended, "BPM");
  if (typeof bpm === "number") return bpm;
  if (bpm) return Number(bpm);
  return null;
}

function extractKey(product: BeatProduct): string | null {
  const extended = product as ExtendedBeatProduct;
  const key = product.key ?? findMetaValue(extended, "key") ?? findAttributeOption(extended, "Key");
  return typeof key === "string" ? key : null;
}

function extractMood(product: BeatProduct): string | null {
  const extended = product as ExtendedBeatProduct;
  const mood =
    product.mood ?? findMetaValue(extended, "mood") ?? findAttributeOption(extended, "Mood");
  return typeof mood === "string" ? mood : null;
}

function extractInstruments(product: BeatProduct): string[] | null {
  const extended = product as ExtendedBeatProduct;
  const instruments = findMetaValue(extended, "instruments");
  if (instruments) {
    return typeof instruments === "string" ? instruments.split(",") : null;
  }
  return null;
}

function extractProducer(product: BeatProduct): string | null {
  const extended = product as ExtendedBeatProduct;
  const producer = findMetaValue(extended, "producer") ?? findAttributeOption(extended, "Producer");
  return typeof producer === "string" ? producer : null;
}

function extractTags(product: BeatProduct): string[] | null {
  const extended = product as ExtendedBeatProduct;
  return extended.tags?.map(tag => tag.name) ?? null;
}

function extractTimeSignature(product: BeatProduct): string | null {
  const extended = product as ExtendedBeatProduct;
  const timeSig =
    findMetaValue(extended, "time_signature") ?? findAttributeOption(extended, "Time Signature");
  return typeof timeSig === "string" ? timeSig : null;
}

function extractDuration(product: BeatProduct): number | null {
  const extended = product as ExtendedBeatProduct;
  const duration = findMetaValue(extended, "duration") ?? findAttributeOption(extended, "Duration");
  if (typeof duration === "number") return duration;
  if (duration) return Number(duration);
  return null;
}

// Helper functions for extracting metadata - kept for potential future client-side filtering
function _extractIsFree(product: BeatProduct): boolean {
  const extended = product as ExtendedBeatProduct;
  return (
    product.is_free ||
    extended.tags?.some(tag => tag.name.toLowerCase() === "free") ||
    product.price === 0 ||
    false
  );
}

function _extractHasVocals(product: BeatProduct): boolean {
  const extended = product as ExtendedBeatProduct;
  return (
    findMetaValue(extended, "has_vocals") === "true" ||
    extended.tags?.some(tag => tag.name.toLowerCase().includes("vocals")) ||
    false
  );
}

function _extractStems(product: BeatProduct): boolean {
  const extended = product as ExtendedBeatProduct;
  return (
    findMetaValue(extended, "stems") === "true" ||
    extended.tags?.some(tag => tag.name.toLowerCase().includes("stems")) ||
    false
  );
}

// Export unused functions to prevent ESLint warnings while keeping them available
export const _unusedExtractors = { _extractIsFree, _extractHasVocals, _extractStems };

// Calculate available ranges from products
export function calculateAvailableRanges(products: BeatProduct[]): {
  bpm: { min: number; max: number };
  duration: { min: number; max: number };
} {
  const bpmValues = products.map(p => extractBPM(p)).filter((v): v is number => v !== null);
  const durationValues = products
    .map(p => extractDuration(p))
    .filter((v): v is number => v !== null);

  return {
    bpm:
      bpmValues.length > 0
        ? { min: Math.min(...bpmValues), max: Math.max(...bpmValues) }
        : { min: 60, max: 200 },
    duration:
      durationValues.length > 0
        ? { min: Math.min(...durationValues), max: Math.max(...durationValues) }
        : { min: 60, max: 300 },
  };
}

// Get available filter options from products
export function getAvailableOptions(products: BeatProduct[]): {
  keys: string[];
  moods: string[];
  instruments: string[];
  producers: string[];
  tags: string[];
  timeSignature: string[];
} {
  const options = {
    keys: new Set<string>(),
    moods: new Set<string>(),
    instruments: new Set<string>(),
    producers: new Set<string>(),
    tags: new Set<string>(),
    timeSignature: new Set<string>(),
  };

  products.forEach(product => {
    const key = extractKey(product);
    if (key) options.keys.add(key);

    const mood = extractMood(product);
    if (mood) options.moods.add(mood);

    const instruments = extractInstruments(product);
    if (instruments) instruments.forEach(i => options.instruments.add(i));

    const producer = extractProducer(product);
    if (producer) options.producers.add(producer);

    const tags = extractTags(product);
    if (tags) tags.forEach(t => options.tags.add(t));

    const timeSignature = extractTimeSignature(product);
    if (timeSignature) options.timeSignature.add(timeSignature);
  });

  return {
    keys: Array.from(options.keys),
    moods: Array.from(options.moods),
    instruments: Array.from(options.instruments),
    producers: Array.from(options.producers),
    tags: Array.from(options.tags),
    timeSignature: Array.from(options.timeSignature),
  };
}
