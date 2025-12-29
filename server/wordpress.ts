import { config } from "dotenv";
import type { Express } from "express";
import { ErrorMessages } from "../shared/constants/ErrorMessages";
import type {
  WooCommerceAttribute,
  WooCommerceCategory,
  WooCommerceImage,
  WooCommerceMetaData,
  WooCommerceProduct,
  WooCommerceTag,
} from "./types/woocommerce";

// Define missing types
interface WooCommerceMetaQuery {
  key: string;
  value: string;
  compare?: string;
  type?: string;
}

interface TransformedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  regular_price: number;
  sale_price: number;
  on_sale: boolean;
  featured: boolean;
  categories: WooCommerceCategory[];
  tags: WooCommerceTag[];
  images: WooCommerceImage[];
  attributes: WooCommerceAttribute[];
  meta_data: WooCommerceMetaData[];
  // BroLab specific fields
  audio_url?: string | null;
  hasVocals?: boolean;
  stems?: boolean;
  bpm?: string;
  key?: string;
  mood?: string;
  instruments?: string;
  duration?: string;
  is_free?: boolean;
  artist?: string;
  genre?: string;
  total_sales?: number;
}

// Ensure environment variables are loaded
config();

// WordPress API credentials - should be set in environment variables
const WORDPRESS_API_URL =
  process.env.WORDPRESS_API_URL || "https://brolabentertainment.com/wp-json/wp/v2";
const WOOCOMMERCE_API_URL =
  process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

import { secureLogger } from "./lib/secureLogger";

// Debug environment loading
secureLogger.debug("WordPress module loaded - API credentials", {
  wordpressUrl: WORDPRESS_API_URL,
  woocommerceUrl: WOOCOMMERCE_API_URL,
  consumerKey: WC_CONSUMER_KEY ? "present" : "missing",
  consumerSecret: WC_CONSUMER_SECRET ? "present" : "missing",
});

// WordPress REST API helpers
async function wpApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${WORDPRESS_API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "BroLab-Frontend/1.0",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(ErrorMessages.WOOCOMMERCE.CONNECTION_ERROR);
  }

  return response.json();
}

// Helper function to proxy audio URLs
function proxyAudioUrl(originalUrl: string | null): string | null {
  if (!originalUrl) return null;

  secureLogger.debug("Original audio URL retrieved", { hasUrl: !!originalUrl });

  // Return the original URL directly - no proxy needed
  return originalUrl;
}

function proxyImageUrl(originalUrl: string | null): string | null {
  if (!originalUrl) return null;

  secureLogger.debug("Original image URL retrieved", { hasUrl: !!originalUrl });

  // If it's already a full URL, return as is
  if (originalUrl.startsWith("http://") || originalUrl.startsWith("https://")) {
    return originalUrl;
  }

  // If it's a relative URL starting with /, make it absolute
  if (originalUrl.startsWith("/")) {
    const baseUrl =
      process.env.WOOCOMMERCE_API_URL?.replace("/wp-json/wc/v3", "") ||
      "https://brolabentertainment.com";
    return `${baseUrl}${originalUrl}`;
  }

  // If it's a relative URL, proxy it through our server
  return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
}

// Fonctions d'extraction des métadonnées pour le filtrage côté serveur
// Note: These functions are available for future server-side filtering enhancements
function _extractInstruments(product: WooCommerceProduct): string[] | null {
  const instruments = product.meta_data?.find(
    (meta: WooCommerceMetaData) => meta.key === "instruments"
  )?.value;
  if (instruments) {
    return typeof instruments === "string" ? instruments.split(",") : (instruments as string[]);
  }
  return null;
}

function _extractTags(product: WooCommerceProduct): string[] | null {
  return product.tags?.map((tag: WooCommerceTag) => tag.name) || null;
}

function _extractTimeSignature(product: WooCommerceProduct): string | null {
  return (
    (product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "time_signature")
      ?.value as string) ||
    product.attributes?.find((attr: WooCommerceAttribute) => attr.name === "Time Signature")
      ?.options?.[0] ||
    null
  );
}

function _extractDuration(product: WooCommerceProduct): number | null {
  const duration =
    product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "duration")?.value ||
    product.attributes?.find((attr: WooCommerceAttribute) => attr.name === "Duration")
      ?.options?.[0];

  return duration ? Number(duration) : null;
}

function _extractHasVocals(product: WooCommerceProduct): boolean {
  return (
    product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "has_vocals")?.value ===
      "true" ||
    product.tags?.some((tag: WooCommerceTag) => tag.name.toLowerCase().includes("vocals")) ||
    false
  );
}

function _extractStems(product: WooCommerceProduct): boolean {
  return (
    product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === "stems")?.value ===
      "true" ||
    product.tags?.some((tag: WooCommerceTag) => tag.name.toLowerCase().includes("stems")) ||
    false
  );
}

// Helper regex patterns for metadata extraction from text (name, description, audio URL)
const BPM_PATTERNS = [
  /(\d{2,3})\s*bpm/i, // "140 BPM" or "140bpm"
  /bpm[:\s]*(\d{2,3})/i, // "BPM: 140" or "BPM 140"
  /_(\d{2,3})BPM_/i, // "_140BPM_" in filename
  /(\d{2,3})BPM/i, // "140BPM" anywhere
  /tempo[:\s]*(\d{2,3})/i, // "Tempo: 140"
];

const KEY_PATTERNS = [
  /\bkey[:\s]*([A-G][#b]?)\s*(maj(?:or)?|min(?:or)?|m)?\b/i, // "Key: C Major" or "Key : F#m"
  /_([A-G][#b]?m)(?:in)?_/i, // "_Fm_" or "_Cmin_" in filename
  /_([A-G][#b]?)min_/i, // "_Cmin_" in filename
  /\b([A-G][#b]?)\s*(maj(?:or)?|min(?:or)?)\b/i, // "C Major", "F#min"
  /\b([A-G][#b]?m)\b/i, // "Fm" standalone
];

const MOOD_PATTERNS = [
  /mood[:\s]*([a-z]+)/i, // "Mood: Dark"
  /vibe[:\s]*([a-z]+)/i, // "Vibe: Chill"
  /\b(dark|chill|upbeat|sad|happy|aggressive|energetic|mellow|dreamy|intense|smooth|hard|soft|emotional|epic|ambient)\b/i,
];

const DURATION_PATTERN = /(\d+:\d{2})/;

// Helper function to extract BPM from any text source
function extractBpmFromText(text: string | undefined): string {
  if (!text) return "";
  for (const pattern of BPM_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const bpm = Number.parseInt(match[1], 10);
      // Validate BPM is in reasonable range (40-300)
      if (bpm >= 40 && bpm <= 300) {
        return match[1];
      }
    }
  }
  return "";
}

// Helper function to normalize musical key format
function normalizeKeyFormat(note: string, mode: string): string {
  const upperNote = note.toUpperCase();
  const lowerMode = mode.toLowerCase();

  // Handle cases like "Fm" where note already includes 'm'
  if (upperNote.endsWith("M")) {
    return upperNote.slice(0, -1) + "m";
  }

  // Minor modes
  if (lowerMode === "m" || lowerMode === "min" || lowerMode === "minor") {
    return `${upperNote}m`;
  }

  // Major modes
  if (lowerMode === "maj" || lowerMode === "major") {
    return `${upperNote} Major`;
  }

  // Default: note with optional mode
  return upperNote + (lowerMode ? ` ${lowerMode}` : "");
}

// Helper function to extract musical key from any text source
function extractKeyFromText(text: string | undefined): string {
  if (!text) return "";

  for (const pattern of KEY_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return normalizeKeyFormat(match[1], match[2] || "");
    }
  }

  return "";
}

// Helper function to extract mood from any text source
function extractMoodFromText(text: string | undefined): string {
  if (!text) return "";
  for (const pattern of MOOD_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      // Capitalize first letter
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  return "";
}

// Helper function to extract duration from any text source
function extractDurationFromText(text: string | undefined): string {
  if (!text) return "";
  const match = DURATION_PATTERN.exec(text);
  return match?.[1] || "";
}

// Legacy aliases for backward compatibility (prefixed with _ as unused)
function _extractBpmFromName(name: string | undefined): string {
  return extractBpmFromText(name);
}

function _extractKeyFromName(name: string | undefined): string {
  return extractKeyFromText(name);
}

function _extractDurationFromName(name: string | undefined): string {
  return extractDurationFromText(name);
}

// Helper function to infer genre from product name
function inferGenreFromName(name: string | undefined): string {
  if (!name) return "";
  const lowerName = name.toLowerCase();
  if (lowerName.includes("trap")) return "Trap";
  if (lowerName.includes("hip hop")) return "Hip Hop";
  if (lowerName.includes("rnb")) return "R&B";
  if (lowerName.includes("drill")) return "Drill";
  if (lowerName.includes("afro")) return "Afrobeat";
  return "";
}

// Helper function to get default instruments based on genre
function getDefaultInstruments(genre: string | undefined): string {
  if (!genre) return "Drums, Bass, Synth";
  const lowerGenre = genre.toLowerCase();
  if (lowerGenre.includes("trap")) return "Drums, 808, Synth";
  if (lowerGenre.includes("hip hop")) return "Drums, Bass, Piano";
  return "Drums, Bass, Synth";
}

// Helper function to check if product is free
function isProductFree(product: WooCommerceProduct): boolean {
  const hasFreeTag = product.tags?.some((tag: WooCommerceTag) =>
    tag.name?.toLowerCase().includes("free")
  );
  const hasFreeCategory = product.categories?.some((cat: WooCommerceCategory) =>
    cat.name?.toLowerCase().includes("free")
  );
  const hasFreeInName = product.name?.toLowerCase().includes("free");
  const priceIsZero = product.price === "0" || Number.parseFloat(product.price || "0") === 0;
  const regularPriceIsZero =
    product.regular_price === "0" || Number.parseFloat(product.regular_price || "0") === 0;

  return Boolean(
    hasFreeTag || hasFreeCategory || hasFreeInName || priceIsZero || regularPriceIsZero
  );
}

// Helper function to find mood from categories
const MOOD_KEYWORDS = new Set(["chill", "dark", "upbeat", "sad", "happy", "aggressive"]);

function findMoodFromCategories(categories: WooCommerceCategory[] | undefined): string {
  const moodCategory = categories?.find((cat: WooCommerceCategory) =>
    MOOD_KEYWORDS.has(cat.name?.toLowerCase())
  );
  return moodCategory?.name || "";
}

// Helper function to extract metadata value
function extractMetaValue(
  metaData: WooCommerceMetaData[] | undefined,
  key: string,
  defaultValue: string = ""
): string {
  const meta = metaData?.find((m: WooCommerceMetaData) => m.key === key);
  return (meta?.value as string) || defaultValue;
}

// Interface for extracted Sonaar metadata
interface SonaarExtractedData {
  audioUrl: string | null;
  bpm: string;
  key: string;
  mood: string;
  duration: string;
  artist: string;
}

// Helper function to extract audio URL and metadata from Sonaar data
function extractFromSonaarData(sonaarData: unknown): SonaarExtractedData {
  const result: SonaarExtractedData = {
    audioUrl: null,
    bpm: "",
    key: "",
    mood: "",
    duration: "",
    artist: "",
  };

  if (Array.isArray(sonaarData) && sonaarData.length > 0) {
    const firstTrack = sonaarData[0];

    // Extract audio URL
    result.audioUrl =
      firstTrack.track_mp3 ||
      firstTrack.audio_preview ||
      firstTrack.src ||
      firstTrack.url ||
      firstTrack.stream_link ||
      null;

    // Extract duration from Sonaar data
    result.duration = firstTrack.stream_lenght || firstTrack.duration || "";

    // Extract artist from Sonaar data
    result.artist = firstTrack.artist_name || firstTrack.track_mp3_artist || "";

    // Try to extract BPM/Key from audio filename
    const audioUrl = result.audioUrl || "";
    if (audioUrl) {
      result.bpm = extractBpmFromText(audioUrl);
      result.key = extractKeyFromText(audioUrl);
    }
  } else if (sonaarData && typeof sonaarData === "object") {
    const data = sonaarData as Record<string, unknown>;

    result.audioUrl =
      (data.track_mp3 as string) ||
      (data.audio_preview as string) ||
      (data.src as string) ||
      (data.url as string) ||
      (data.stream_link as string) ||
      null;

    result.duration = (data.stream_lenght as string) || (data.duration as string) || "";
    result.artist = (data.artist_name as string) || (data.track_mp3_artist as string) || "";

    // Try to extract BPM/Key from audio filename
    const audioUrl = result.audioUrl || "";
    if (audioUrl) {
      result.bpm = extractBpmFromText(audioUrl);
      result.key = extractKeyFromText(audioUrl);
    }
  }

  return result;
}

// Legacy function for backward compatibility (prefixed with _ as unused)
function _extractAudioFromSonaarData(sonaarData: unknown): string | null {
  return extractFromSonaarData(sonaarData).audioUrl;
}

// Helper function to find tracklist metadata
function findTracklistMeta(
  metaData: WooCommerceMetaData[] | undefined
): WooCommerceMetaData | undefined {
  return metaData?.find(
    (meta: WooCommerceMetaData) =>
      meta.key === "alb_tracklist" || meta.key === "tracklist" || meta.key === "sonaar_tracklist"
  );
}

// Helper function to find audio URL metadata
function findAudioUrlMeta(
  metaData: WooCommerceMetaData[] | undefined
): WooCommerceMetaData | undefined {
  return metaData?.find(
    (meta: WooCommerceMetaData) =>
      meta.key === "audio_url" ||
      meta.key === "sonaar_audio_file" ||
      meta.key === "audio_preview" ||
      meta.key === "track_mp3"
  );
}

// Helper function to log product meta keys for debugging
function logProductMetaKeys(
  product: WooCommerceProduct,
  albTracklistMeta: WooCommerceMetaData | undefined,
  audioUrlMeta: WooCommerceMetaData | undefined
): void {
  if (product.meta_data && product.meta_data.length > 0) {
    const metaKeys = product.meta_data.map((m: WooCommerceMetaData) => m.key);
    secureLogger.debug("Product meta_data keys", {
      productId: product.id,
      metaKeys: metaKeys.slice(0, 20),
      hasAlbTracklist: !!albTracklistMeta,
      hasAudioUrl: !!audioUrlMeta,
    });
  }
}

// Helper function to extract from tracklist metadata
function extractFromTracklistMeta(
  albTracklistMeta: WooCommerceMetaData,
  productId: number
): SonaarExtractedData | null {
  try {
    const sonaarData =
      typeof albTracklistMeta.value === "string"
        ? JSON.parse(albTracklistMeta.value)
        : albTracklistMeta.value;

    secureLogger.debug("Sonaar alb_tracklist data", {
      productId,
      isArray: Array.isArray(sonaarData),
      firstTrackKeys: Array.isArray(sonaarData) && sonaarData[0] ? Object.keys(sonaarData[0]) : [],
    });

    const extracted = extractFromSonaarData(sonaarData);
    if (extracted.audioUrl) {
      secureLogger.debug("Extracted from Sonaar URL", {
        productId,
        audioUrl: extracted.audioUrl,
        bpm: extracted.bpm,
        key: extracted.key,
      });
      return extracted;
    }
  } catch (error) {
    secureLogger.debug("Failed to parse alb_tracklist", {
      productId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
  return null;
}

// Helper function to extract audio URL and metadata from product
function extractAudioUrlAndMetadata(product: WooCommerceProduct): SonaarExtractedData {
  const defaultResult: SonaarExtractedData = {
    audioUrl: null,
    bpm: "",
    key: "",
    mood: "",
    duration: "",
    artist: "",
  };

  const albTracklistMeta = findTracklistMeta(product.meta_data);
  const audioUrlMeta = findAudioUrlMeta(product.meta_data);

  logProductMetaKeys(product, albTracklistMeta, audioUrlMeta);

  // Extract from Sonaar alb_tracklist (primary source)
  if (albTracklistMeta?.value) {
    const extracted = extractFromTracklistMeta(albTracklistMeta, product.id);
    if (extracted) return extracted;
  }

  // Fallback to direct audio_url meta
  if (audioUrlMeta?.value) {
    const audioUrl = audioUrlMeta.value as string;
    return {
      ...defaultResult,
      audioUrl,
      bpm: extractBpmFromText(audioUrl),
      key: extractKeyFromText(audioUrl),
    };
  }

  return defaultResult;
}

// Legacy function for backward compatibility
function extractAudioUrl(product: WooCommerceProduct): string | null {
  return extractAudioUrlAndMetadata(product).audioUrl;
}

// Helper function to strip HTML tags from text
function stripHtmlTags(html: string | undefined): string {
  if (!html) return "";
  return html
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/&[^;]+;/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

// Helper function to extract product metadata with multiple fallback sources
// Priority: meta_data > Sonaar audio URL > description > product name
function extractProductMetadata(product: WooCommerceProduct): {
  bpm: string;
  key: string;
  mood: string;
  artist: string;
  genre: string;
  duration: string;
  instruments: string;
} {
  const getMeta = (key: string): string => extractMetaValue(product.meta_data, key);

  // Get Sonaar extracted data (from audio URL filename)
  const sonaarData = extractAudioUrlAndMetadata(product);

  // Combine all text sources for fallback extraction (strip HTML first)
  const description = stripHtmlTags(product.description);
  const shortDescription = stripHtmlTags(product.short_description);
  const productName = product.name || "";
  const allTextSources = `${productName} ${description} ${shortDescription}`;

  // Debug: Log extraction attempts
  const bpmFromMeta = getMeta("bpm") || getMeta("_bpm") || getMeta("tempo") || getMeta("_tempo");
  const bpmFromSonaar = sonaarData.bpm;
  const bpmFromText = extractBpmFromText(allTextSources);

  console.log(`[DEBUG] Product ${product.id} (${product.name}):`, {
    bpmFromMeta,
    bpmFromSonaar,
    bpmFromText,
    audioUrl: sonaarData.audioUrl?.substring(0, 50),
    descriptionSample: description.substring(0, 100),
  });

  // BPM: meta_data > Sonaar URL > description > product name
  const bpm = bpmFromMeta || bpmFromSonaar || bpmFromText;

  // Key: meta_data > Sonaar URL > description > product name
  const keyFromMeta =
    getMeta("key") ||
    getMeta("_key") ||
    getMeta("musical_key") ||
    getMeta("_musical_key") ||
    getMeta("song_key");
  const key = keyFromMeta || sonaarData.key || extractKeyFromText(allTextSources);

  // Mood: meta_data > description > categories
  const mood =
    getMeta("mood") ||
    getMeta("_mood") ||
    getMeta("vibe") ||
    getMeta("_vibe") ||
    getMeta("energy") ||
    extractMoodFromText(allTextSources) ||
    findMoodFromCategories(product.categories);

  // Artist: meta_data > Sonaar data > default
  const artist =
    getMeta("artist") ||
    getMeta("_artist") ||
    getMeta("producer") ||
    getMeta("_producer") ||
    sonaarData.artist ||
    "Treigua";

  // Genre: categories > meta_data > inferred from name
  const genreFromMeta =
    getMeta("genre") || getMeta("_genre") || getMeta("music_genre") || getMeta("style");
  const genre = product.categories?.[0]?.name || genreFromMeta || inferGenreFromName(product.name);

  // Duration: meta_data > Sonaar data > extracted from text
  const duration =
    getMeta("duration") ||
    getMeta("_duration") ||
    getMeta("length") ||
    getMeta("time") ||
    sonaarData.duration ||
    extractDurationFromText(allTextSources);

  // Instruments: meta_data > default based on genre
  const instruments =
    getMeta("instruments") ||
    getMeta("_instruments") ||
    getMeta("sounds") ||
    getMeta("tags") ||
    getDefaultInstruments(genre);

  return { bpm, key, mood, artist, genre, duration, instruments };
}

// Main product transformation function - reduces cognitive complexity
function transformProduct(
  product: WooCommerceProduct,
  proxyImages: boolean = true
): TransformedProduct {
  const metadata = extractProductMetadata(product);
  const getMeta = (key: string): string => extractMetaValue(product.meta_data, key);

  const audioUrl = extractAudioUrl(product);
  const productIsFree = isProductFree(product);

  // Debug log to see what's being extracted
  if (metadata.bpm || metadata.key) {
    secureLogger.debug("Extracted metadata for product", {
      productId: product.id,
      productName: product.name,
      bpm: metadata.bpm,
      key: metadata.key,
      mood: metadata.mood,
      audioUrl: audioUrl ? "present" : "missing",
    });
  }

  const hasVocals = getMeta("has_vocals") === "yes" || getMeta("_has_vocals") === "yes";
  const stems =
    getMeta("stems") === "yes" || getMeta("_stems") === "yes" || product.downloadable || false;

  const images = proxyImages
    ? (product.images || []).map((img: WooCommerceImage) => ({
        ...img,
        src: proxyImageUrl(img.src) || img.src,
      }))
    : product.images || [];

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price ? Number.parseFloat(product.price) : 0,
    regular_price: product.regular_price ? Number.parseFloat(product.regular_price) : 0,
    sale_price: product.sale_price ? Number.parseFloat(product.sale_price) : 0,
    on_sale: product.on_sale || false,
    featured: product.featured || false,
    categories: product.categories || [],
    tags: product.tags || [],
    images,
    attributes: product.attributes || [],
    meta_data: product.meta_data || [],
    audio_url: proxyAudioUrl(audioUrl),
    bpm: metadata.bpm,
    key: metadata.key,
    mood: metadata.mood,
    artist: metadata.artist,
    genre: metadata.genre,
    duration: metadata.duration,
    instruments: metadata.instruments,
    is_free: productIsFree,
    hasVocals,
    stems,
    total_sales: product.total_sales || 0,
  };
}

// Helper function to build basic query params from request
function buildBasicQueryParams(query: Record<string, unknown>): URLSearchParams {
  const queryParams = new URLSearchParams();
  const basicParams = [
    "search",
    "category",
    "min_price",
    "max_price",
    "per_page",
    "page",
    "orderby",
    "order",
  ];

  for (const param of basicParams) {
    if (query[param]) {
      queryParams.append(param, query[param] as string);
    }
  }
  return queryParams;
}

// Helper function to determine comparison operator for range queries
function getRangeCompareOperator(hasMin: boolean, hasMax: boolean): string {
  if (hasMin && hasMax) return "BETWEEN";
  if (hasMin) return ">=";
  return "<=";
}

// Helper function to build meta queries for filtering
function buildMetaQueries(query: Record<string, unknown>): WooCommerceMetaQuery[] {
  const metaQueries: WooCommerceMetaQuery[] = [];

  // BPM Range
  if (query.bpm_min || query.bpm_max) {
    metaQueries.push({
      key: "bpm",
      value: (query.bpm_min || query.bpm_max || "") as string,
      type: "NUMERIC",
      compare: getRangeCompareOperator(!!query.bpm_min, !!query.bpm_max),
    });
  }

  // Simple equality filters
  const equalityFilters = [
    { queryKey: "key", metaKey: "key" },
    { queryKey: "mood", metaKey: "mood" },
    { queryKey: "producer", metaKey: "producer" },
  ];

  for (const filter of equalityFilters) {
    if (query[filter.queryKey]) {
      metaQueries.push({
        key: filter.metaKey,
        value: query[filter.queryKey] as string,
        compare: "=",
      });
    }
  }

  // Duration Range
  if (query.duration_min || query.duration_max) {
    metaQueries.push({
      key: "duration",
      value: (query.duration_min || query.duration_max || "") as string,
      type: "NUMERIC",
      compare: getRangeCompareOperator(!!query.duration_min, !!query.duration_max),
    });
  }

  // Boolean filters
  if (query.has_vocals === "true") {
    metaQueries.push({ key: "has_vocals", value: "true", compare: "=" });
  }
  if (query.stems === "true") {
    metaQueries.push({ key: "stems", value: "true", compare: "=" });
  }

  return metaQueries;
}

// Helper function to add attribute filters to query params
function addAttributeFilters(queryParams: URLSearchParams, query: Record<string, unknown>): void {
  const attributeFilters = [
    { queryKey: "keys", attributeName: "Key" },
    { queryKey: "moods", attributeName: "Mood" },
    { queryKey: "producers", attributeName: "Producer" },
    { queryKey: "instruments", attributeName: "Instruments" },
    { queryKey: "time_signature", attributeName: "Time Signature" },
  ];

  for (const filter of attributeFilters) {
    if (query[filter.queryKey]) {
      const values = (query[filter.queryKey] as string).split(",");
      queryParams.append(
        "attribute",
        JSON.stringify({ name: filter.attributeName, option: values })
      );
    }
  }

  // Tags filter
  if (query.tags) {
    const tags = (query.tags as string).split(",");
    queryParams.append("tag", tags.join(","));
  }
}

// WooCommerce REST API helpers
async function wcApiRequest(endpoint: string, options: RequestInit = {}) {
  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.error("WooCommerce credentials check:", {
      key: WC_CONSUMER_KEY ? "present" : "missing",
      secret: WC_CONSUMER_SECRET ? "present" : "missing",
      env_key: process.env.WOOCOMMERCE_CONSUMER_KEY ? "present" : "missing",
      env_secret: process.env.WOOCOMMERCE_CONSUMER_SECRET ? "present" : "missing",
    });
    throw new Error(ErrorMessages.WOOCOMMERCE.CONNECTION_ERROR);
  }

  const url = new URL(`${WOOCOMMERCE_API_URL}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET);

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "BroLab-Frontend/1.0",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(ErrorMessages.WOOCOMMERCE.SYNC_FAILED);
  }

  return response.json();
}

export function registerWordPressRoutes(app: Express) {
  // Image proxy route
  app.get("/api/proxy/image", async (req, res): Promise<void> => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        res.status(400).json({ error: ErrorMessages.VALIDATION.REQUIRED_FIELD });
        return;
      }

      secureLogger.debug("Proxying image", { hasUrl: !!url });

      const response = await fetch(url);
      if (!response.ok) {
        res.status(response.status).json({ error: ErrorMessages.FILE.DOWNLOAD_FAILED });
        return;
      }

      const contentType = response.headers.get("content-type");
      const buffer = await response.arrayBuffer();

      res.setHeader("Content-Type", contentType || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(Buffer.from(buffer));
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error proxying image:", error);
      res.status(500).json({ error: ErrorMessages.FILE.DOWNLOAD_FAILED });
    }
  });

  // WordPress Pages
  app.get("/api/wordpress/pages", async (req, res) => {
    try {
      const pages = await wpApiRequest("/pages");
      res.json(pages);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error fetching pages:", error);
      res.status(500).json({ error: ErrorMessages.WOOCOMMERCE.SYNC_FAILED });
    }
  });

  app.get("/api/wordpress/pages/:slug", async (req, res): Promise<void> => {
    try {
      const pages = await wpApiRequest(`/pages?slug=${req.params.slug}`);
      if (pages.length === 0) {
        res.status(404).json({ error: ErrorMessages.WOOCOMMERCE.PRODUCT_NOT_FOUND });
        return;
      }
      res.json(pages[0]);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error fetching page:", error);
      res.status(500).json({ error: ErrorMessages.WOOCOMMERCE.SYNC_FAILED });
    }
  });

  // WordPress Posts
  app.get("/api/wordpress/posts", async (req, res) => {
    try {
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const posts = await wpApiRequest(`/posts?${queryString}`);
      res.json(posts);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: ErrorMessages.WOOCOMMERCE.SYNC_FAILED });
    }
  });

  app.get("/api/wordpress/posts/:id", async (req, res) => {
    try {
      const post = await wpApiRequest(`/posts/${req.params.id}`);
      res.json(post);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error fetching post:", error);
      res.status(500).json({ error: ErrorMessages.WOOCOMMERCE.SYNC_FAILED });
    }
  });

  // WordPress Media
  app.get("/api/wordpress/media/:id", async (req, res) => {
    try {
      const media = await wpApiRequest(`/media/${req.params.id}`);
      res.json(media);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error fetching media:", error);
      res.status(500).json({ error: ErrorMessages.FILE.DOWNLOAD_FAILED });
    }
  });

  // WooCommerce Products
  app.get("/api/woocommerce/products", async (req, res) => {
    try {
      // Build query params using helper functions
      const query = req.query as Record<string, unknown>;
      const queryParams = buildBasicQueryParams(query);

      // Build and add meta queries
      const metaQueries = buildMetaQueries(query);
      if (metaQueries.length > 0) {
        queryParams.append("meta_query", JSON.stringify({ relation: "AND", ...metaQueries }));
      }

      // Add attribute filters
      addAttributeFilters(queryParams, query);

      const queryString = queryParams.toString();
      const products = await wcApiRequest(`/products?${queryString}`);

      // Filtrage côté serveur pour les cas non supportés par WooCommerce API
      let filteredProducts = products;

      // Is Free (filtrage côté serveur car WooCommerce API ne le supporte pas bien)
      if (req.query.is_free === "true") {
        filteredProducts = products.filter((product: WooCommerceProduct) => isProductFree(product));
      }

      // Transform product data to match frontend expectations using helper function
      const transformedProducts = filteredProducts.map((product: WooCommerceProduct) =>
        transformProduct(product, true)
      );

      res.json(transformedProducts);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error fetching products:", error);
      res.status(500).json({ error: ErrorMessages.BEATS.NOT_FOUND });
    }
  });

  app.get("/api/woocommerce/products/:id", async (req, res): Promise<void> => {
    try {
      const productId = req.params.id;
      if (!productId || productId === "0") {
        res.status(400).json({ error: ErrorMessages.BEATS.NOT_FOUND });
        return;
      }

      const product = await wcApiRequest(`/products/${productId}`);

      // Transform product data using helper function (proxyImages=false for single product)
      const transformedProduct = transformProduct(product, false);

      res.json(transformedProduct);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error fetching product:", error);
      res.status(500).json({ error: ErrorMessages.BEATS.NOT_FOUND });
    }
  });

  // WooCommerce Categories
  app.get("/api/woocommerce/categories", async (req, res) => {
    try {
      const categories = await wcApiRequest("/products/categories");
      res.json(categories);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: ErrorMessages.WOOCOMMERCE.SYNC_FAILED });
    }
  });

  // WooCommerce Orders
  app.post("/api/woocommerce/orders", async (req, res) => {
    try {
      const order = await wcApiRequest("/orders", {
        method: "POST",
        body: JSON.stringify(req.body),
      });
      res.json(order);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error creating order:", error);
      res.status(500).json({ error: ErrorMessages.ORDER.PROCESSING_FAILED });
    }
  });

  // WooCommerce Customers
  app.post("/api/woocommerce/customers", async (req, res) => {
    try {
      const customer = await wcApiRequest("/customers", {
        method: "POST",
        body: JSON.stringify(req.body),
      });
      res.json(customer);
    } catch (error: unknown) {
      const _errorMessage =
        error instanceof Error ? error.message : ErrorMessages.GENERIC.UNKNOWN_ERROR;
      console.error("Error creating customer:", error);
      res.status(500).json({ error: ErrorMessages.USER.PROFILE_UPDATE_FAILED });
    }
  });
}
