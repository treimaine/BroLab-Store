/**
 * Beat/Track Type Definitions for BroLab Entertainment
 *
 * This module contains all type definitions related to beats, tracks, and music products
 * in the BroLab Entertainment marketplace platform.
 */

// ================================
// ENUMS
// ================================

/**
 * Available license types for beat purchases
 */
export enum LicenseType {
  BASIC = "basic",
  PREMIUM = "premium",
  UNLIMITED = "unlimited",
}

/**
 * Beat genre categories
 */
export enum BeatGenre {
  HIP_HOP = "hip-hop",
  TRAP = "trap",
  R_AND_B = "r&b",
  POP = "pop",
  DRILL = "drill",
  AFROBEAT = "afrobeat",
  REGGAETON = "reggaeton",
  DANCEHALL = "dancehall",
  ELECTRONIC = "electronic",
  JAZZ = "jazz",
  ROCK = "rock",
  COUNTRY = "country",
  LATIN = "latin",
  WORLD = "world",
  EXPERIMENTAL = "experimental",
}

/**
 * Musical keys for beats
 */
export enum MusicalKey {
  C_MAJOR = "C",
  C_SHARP_MAJOR = "C#",
  D_MAJOR = "D",
  D_SHARP_MAJOR = "D#",
  E_MAJOR = "E",
  F_MAJOR = "F",
  F_SHARP_MAJOR = "F#",
  G_MAJOR = "G",
  G_SHARP_MAJOR = "G#",
  A_MAJOR = "A",
  A_SHARP_MAJOR = "A#",
  B_MAJOR = "B",
  C_MINOR = "Cm",
  C_SHARP_MINOR = "C#m",
  D_MINOR = "Dm",
  D_SHARP_MINOR = "D#m",
  E_MINOR = "Em",
  F_MINOR = "Fm",
  F_SHARP_MINOR = "F#m",
  G_MINOR = "Gm",
  G_SHARP_MINOR = "G#m",
  A_MINOR = "Am",
  A_SHARP_MINOR = "A#m",
  B_MINOR = "Bm",
}

/**
 * Mood categories for beats
 */
export enum BeatMood {
  AGGRESSIVE = "aggressive",
  CHILL = "chill",
  DARK = "dark",
  ENERGETIC = "energetic",
  HAPPY = "happy",
  MELANCHOLIC = "melancholic",
  ROMANTIC = "romantic",
  UPLIFTING = "uplifting",
  MYSTERIOUS = "mysterious",
  NOSTALGIC = "nostalgic",
  EPIC = "epic",
  DREAMY = "dreamy",
}

/**
 * Audio file formats available for download
 */
export enum AudioFormat {
  MP3 = "mp3",
  WAV = "wav",
  FLAC = "flac",
  AIFF = "aiff",
}

/**
 * Beat status in the system
 */
export enum BeatStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DRAFT = "draft",
  ARCHIVED = "archived",
  PENDING_REVIEW = "pending_review",
}

// ================================
// CORE INTERFACES
// ================================

/**
 * License pricing configuration
 */
export interface LicensePricing {
  readonly [LicenseType.BASIC]: 29.99;
  readonly [LicenseType.PREMIUM]: 49.99;
  readonly [LicenseType.UNLIMITED]: 149.99;
}

/**
 * License terms and restrictions for each license type
 */
export interface LicenseTerms {
  /** License type identifier */
  type: LicenseType;
  /** Maximum number of copies that can be sold */
  copiesSold: number;
  /** Whether radio play is allowed */
  radioPlay: boolean;
  /** Whether music videos are allowed */
  musicVideos: boolean;
  /** Whether streaming is allowed */
  streaming: boolean;
  /** Whether the license is exclusive */
  exclusive: boolean;
  /** Additional restrictions or permissions */
  additionalTerms?: string[];
}

/**
 * Beat metadata from WooCommerce integration
 */
export interface BeatMetadata {
  /** WooCommerce metadata key */
  key: string;
  /** Metadata value (can be various types) */
  value: string | number | boolean | string[] | null;
}

/**
 * Beat attribute from WooCommerce (e.g., BPM, Genre, Style)
 */
export interface BeatAttribute {
  /** Attribute name */
  name: string;
  /** Available options for this attribute */
  options?: string[];
  /** Whether this attribute is visible on product page */
  visible?: boolean;
  /** Whether this attribute is used for variations */
  variation?: boolean;
}

/**
 * Beat category information
 */
export interface BeatCategory {
  /** Category ID */
  id: number;
  /** Category name */
  name: string;
  /** Category slug for URLs */
  slug?: string;
  /** Parent category ID if this is a subcategory */
  parentId?: number;
}

/**
 * Beat tag information
 */
export interface BeatTag {
  /** Tag ID */
  id?: number;
  /** Tag name */
  name: string;
  /** Tag slug for URLs */
  slug?: string;
}

/**
 * Beat image information
 */
export interface BeatImage {
  /** Image ID */
  id?: number;
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Image name/title */
  name?: string;
  /** When the image was created */
  dateCreated?: string;
  /** When the image was last modified */
  dateModified?: string;
}

/**
 * Audio waveform data for visualization
 */
export interface WaveformData {
  /** Array of amplitude values for waveform visualization */
  peaks: number[];
  /** Duration of the audio in seconds */
  duration: number;
  /** Sample rate of the audio */
  sampleRate: number;
  /** Number of channels (1 for mono, 2 for stereo) */
  channels: number;
}

/**
 * Beat analytics and statistics
 */
export interface BeatAnalytics {
  /** Total number of plays */
  totalPlays: number;
  /** Total number of downloads */
  totalDownloads: number;
  /** Total number of purchases */
  totalPurchases: number;
  /** Revenue generated from this beat */
  totalRevenue: number;
  /** Number of times added to wishlist */
  wishlistCount: number;
  /** Average rating (1-5 stars) */
  averageRating?: number;
  /** Number of ratings */
  ratingCount?: number;
  /** Last played timestamp */
  lastPlayedAt?: string;
  /** Trending score based on recent activity */
  trendingScore?: number;
}

/**
 * Core Beat interface - represents a music track/beat in the marketplace
 */
export interface Beat {
  /** Unique identifier */
  id: number;
  /** WordPress/WooCommerce product ID for integration */
  wordpressId?: number;
  /** Beat title/name */
  title: string;
  /** Beat description */
  description: string;
  /** Musical genre */
  genre: BeatGenre;
  /** Beats per minute */
  bpm: number;
  /** Musical key */
  key: MusicalKey;
  /** Mood/vibe of the beat */
  mood: BeatMood;
  /** Base price in USD */
  price: number;
  /** URL to audio preview file */
  audioUrl: string;
  /** URL to cover image */
  imageUrl: string;
  /** Array of beat images */
  images?: BeatImage[];
  /** Beat tags for categorization and search */
  tags?: BeatTag[];
  /** Beat categories */
  categories?: BeatCategory[];
  /** WooCommerce metadata */
  metadata?: BeatMetadata[];
  /** WooCommerce attributes */
  attributes?: BeatAttribute[];
  /** Whether this beat is featured */
  featured: boolean;
  /** Number of downloads */
  downloads: number;
  /** Number of views/plays */
  views: number;
  /** Duration in seconds */
  duration: number;
  /** Whether the beat is active and available for purchase */
  isActive: boolean;
  /** Whether this is an exclusive beat */
  isExclusive: boolean;
  /** Whether this beat is free */
  isFree: boolean;
  /** Beat status */
  status: BeatStatus;
  /** Available license types for this beat */
  availableLicenses: LicenseType[];
  /** Waveform data for audio visualization */
  waveformData?: WaveformData;
  /** Analytics data */
  analytics?: BeatAnalytics;
  /** When the beat was created */
  createdAt: string;
  /** When the beat was last updated */
  updatedAt: string;
  /** Producer/artist information */
  producer: {
    id: number;
    name: string;
    avatar?: string;
  };
}

/**
 * Simplified beat interface for product listings and cards
 */
export interface BeatSummary {
  /** Unique identifier */
  id: number;
  /** Beat title */
  title: string;
  /** Musical genre */
  genre: BeatGenre;
  /** Beats per minute */
  bpm: number;
  /** Musical key */
  key: MusicalKey;
  /** Base price */
  price: number;
  /** Cover image URL */
  imageUrl: string;
  /** Audio preview URL */
  audioUrl: string;
  /** Whether featured */
  featured: boolean;
  /** Whether free */
  isFree: boolean;
  /** Duration in seconds */
  duration: number;
  /** Producer name */
  producerName: string;
}

/**
 * Beat search and filter criteria
 */
export interface BeatSearchCriteria {
  /** Search query string */
  query?: string;
  /** Filter by genre */
  genre?: BeatGenre[];
  /** Filter by BPM range */
  bpmRange?: {
    min: number;
    max: number;
  };
  /** Filter by key */
  key?: MusicalKey[];
  /** Filter by mood */
  mood?: BeatMood[];
  /** Filter by price range */
  priceRange?: {
    min: number;
    max: number;
  };
  /** Filter by tags */
  tags?: string[];
  /** Show only featured beats */
  featuredOnly?: boolean;
  /** Show only free beats */
  freeOnly?: boolean;
  /** Sort criteria */
  sortBy?: "newest" | "oldest" | "price_low" | "price_high" | "popular" | "trending";
  /** Number of results per page */
  limit?: number;
  /** Page offset */
  offset?: number;
}

/**
 * Beat search results
 */
export interface BeatSearchResults {
  /** Array of matching beats */
  beats: BeatSummary[];
  /** Total number of matching beats */
  total: number;
  /** Current page */
  page: number;
  /** Number of results per page */
  limit: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Search criteria used */
  criteria: BeatSearchCriteria;
}

/**
 * Beat creation/update input
 */
export interface BeatInput {
  /** WordPress product ID */
  wordpressId?: number;
  /** Beat title */
  title: string;
  /** Beat description */
  description?: string;
  /** Musical genre */
  genre: BeatGenre;
  /** Beats per minute */
  bpm?: number;
  /** Musical key */
  key?: MusicalKey;
  /** Mood */
  mood?: BeatMood;
  /** Price in USD */
  price: number;
  /** Audio file URL */
  audioUrl?: string;
  /** Cover image URL */
  imageUrl?: string;
  /** Tags */
  tags?: string[];
  /** Whether featured */
  featured?: boolean;
  /** Duration in seconds */
  duration?: number;
  /** Whether active */
  isActive?: boolean;
  /** Whether exclusive */
  isExclusive?: boolean;
  /** Whether free */
  isFree?: boolean;
  /** Available licenses */
  availableLicenses?: LicenseType[];
}

// ================================
// CONSTANTS
// ================================

/** Default license pricing */
export const LICENSE_PRICING: LicensePricing = {
  [LicenseType.BASIC]: 29.99,
  [LicenseType.PREMIUM]: 49.99,
  [LicenseType.UNLIMITED]: 149.99,
} as const;

/** Default license terms for each type */
export const DEFAULT_LICENSE_TERMS: Record<LicenseType, LicenseTerms> = {
  [LicenseType.BASIC]: {
    type: LicenseType.BASIC,
    copiesSold: 2000,
    radioPlay: false,
    musicVideos: true,
    streaming: true,
    exclusive: false,
  },
  [LicenseType.PREMIUM]: {
    type: LicenseType.PREMIUM,
    copiesSold: 10000,
    radioPlay: true,
    musicVideos: true,
    streaming: true,
    exclusive: false,
  },
  [LicenseType.UNLIMITED]: {
    type: LicenseType.UNLIMITED,
    copiesSold: -1, // Unlimited
    radioPlay: true,
    musicVideos: true,
    streaming: true,
    exclusive: true,
  },
} as const;

/** Common BPM ranges for different genres */
export const GENRE_BPM_RANGES: Record<BeatGenre, { min: number; max: number }> = {
  [BeatGenre.HIP_HOP]: { min: 70, max: 140 },
  [BeatGenre.TRAP]: { min: 130, max: 170 },
  [BeatGenre.R_AND_B]: { min: 60, max: 120 },
  [BeatGenre.POP]: { min: 100, max: 130 },
  [BeatGenre.DRILL]: { min: 130, max: 150 },
  [BeatGenre.AFROBEAT]: { min: 100, max: 130 },
  [BeatGenre.REGGAETON]: { min: 85, max: 105 },
  [BeatGenre.DANCEHALL]: { min: 85, max: 110 },
  [BeatGenre.ELECTRONIC]: { min: 120, max: 150 },
  [BeatGenre.JAZZ]: { min: 60, max: 200 },
  [BeatGenre.ROCK]: { min: 110, max: 180 },
  [BeatGenre.COUNTRY]: { min: 60, max: 140 },
  [BeatGenre.LATIN]: { min: 90, max: 130 },
  [BeatGenre.WORLD]: { min: 60, max: 160 },
  [BeatGenre.EXPERIMENTAL]: { min: 40, max: 200 },
} as const;
