// server/lib/mappers/woo.ts
import { BeatProduct } from "../../../shared/schema";
import { WooCommerceCategory, WooCommerceMetaData } from "../../../shared/types/WooCommerceApi";

export interface WooProduct {
  id: number;
  name: string;
  price: string;
  images?: { src: string }[];
  meta_data?: WooCommerceMetaData[];
  categories?: WooCommerceCategory[];
  date_created?: string;
  tags?: Array<{ name: string }>;
  description?: string;
}

// === STUBS for unimplemented extractors (if needed) ===
const _extractKey = (_: WooProduct) => null;
const _extractDuration = (_: WooProduct) => null;
const _extractMood = (_: WooProduct) => null;
const extractIsFree = (p: WooProduct) => {
  // Check if product is free based on price, tags, or meta data
  const price = Number(p.price) || 0;
  const hasFreeTag = p.tags?.some(tag => tag.name.toLowerCase() === "free") || false;
  const isFreeInMeta =
    p.meta_data?.some(
      meta => meta.key === "is_free" && (meta.value === "true" || meta.value === true)
    ) || false;

  return price === 0 || hasFreeTag || isFreeInMeta;
};

export function mapWooProductToBeat(p: WooProduct): BeatProduct {
  return {
    id: p.id,
    title: p.name,
    genre: p.categories?.[0]?.name || "",
    bpm: extractBpm(p) ?? 120,
    price: Number(p.price) || 0,
    image_url: p.images?.[0]?.src || "",
    audio_url: extractAudioUrl(p),
    tags: p.tags?.map(t => t.name) || [],
    description: p.description || "",
    wordpress_id: 0, // Default, as Woo products are not WP posts
    created_at: p.date_created || new Date().toISOString(),
    is_free: extractIsFree(p), // Include is_free property
  };
}

export function mapWooCategory(c: WooCommerceCategory) {
  return { id: c.id, name: c.name };
}

function extractAudioUrl(p: WooProduct): string | null {
  const audioUrlMeta = p.meta_data?.find(m => m.key === "audio_url");
  if (audioUrlMeta && typeof audioUrlMeta.value === "string") {
    return audioUrlMeta.value;
  }
  return null;
}

function extractBpm(p: WooProduct): number | null {
  const bpmMeta = p.meta_data?.find(m => m.key === "bpm");
  if (bpmMeta && (typeof bpmMeta.value === "string" || typeof bpmMeta.value === "number")) {
    const bpmValue = Number(bpmMeta.value);
    return isNaN(bpmValue) ? null : bpmValue;
  }
  return null;
}
