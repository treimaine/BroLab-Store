import { z } from "zod";

// ================================
// BEAT VALIDATION SCHEMAS
// ================================

/**
 * Beat genre validation with BroLab-specific genres
 */
export const BeatGenre = z.enum([
  "hip-hop",
  "trap",
  "r&b",
  "pop",
  "drill",
  "afrobeat",
  "reggaeton",
  "dancehall",
  "uk-drill",
  "jersey-club",
  "amapiano",
  "custom",
]);

/**
 * Beat mood validation
 */
export const BeatMood = z.enum([
  "aggressive",
  "chill",
  "dark",
  "energetic",
  "emotional",
  "happy",
  "melancholic",
  "mysterious",
  "romantic",
  "uplifting",
]);

/**
 * Musical key validation
 */
export const MusicalKey = z.enum([
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "Cm",
  "C#m",
  "Dbm",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gbm",
  "Gm",
  "G#m",
  "Abm",
  "Am",
  "A#m",
  "Bbm",
  "Bm",
]);

/**
 * License type validation
 */
export const LicenseType = z.enum(["basic", "premium", "unlimited", "exclusive"]);

/**
 * Beat status validation
 */
export const BeatStatus = z.enum([
  "active",
  "inactive",
  "sold_exclusively",
  "pending_review",
  "rejected",
]);

/**
 * BPM validation with genre-specific ranges
 */
export const BpmSchema = z
  .number()
  .min(60, "BPM must be at least 60")
  .max(200, "BPM cannot exceed 200")
  .int("BPM must be a whole number");

/**
 * Beat price validation (in cents)
 */
export const BeatPriceSchema = z
  .number()
  .min(100, "Price must be at least $1.00") // $1.00 minimum
  .max(99999999, "Price cannot exceed $999,999.99") // $999,999.99 maximum
  .int("Price must be in cents (whole number)");

/**
 * Beat duration validation (in seconds)
 */
export const BeatDurationSchema = z
  .number()
  .min(30, "Beat must be at least 30 seconds")
  .max(600, "Beat cannot exceed 10 minutes")
  .positive("Duration must be positive");

/**
 * Beat tags validation
 */
export const BeatTagsSchema = z
  .array(z.string().min(1).max(20))
  .max(10, "Maximum 10 tags allowed")
  .optional();

/**
 * Audio file validation
 */
export const AudioFileSchema = z.object({
  url: z.string().url("Invalid audio file URL"),
  format: z.enum(["mp3", "wav", "aiff", "flac"]),
  quality: z.enum(["128", "192", "256", "320", "lossless"]),
  duration: BeatDurationSchema,
  fileSize: z.number().positive("File size must be positive"),
  waveformData: z.array(z.number()).optional(),
});

/**
 * Beat metadata validation
 */
export const BeatMetadataSchema = z.object({
  producer: z.string().min(1, "Producer name is required").max(100),
  credits: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  inspiration: z.string().max(200).optional(),
  collaborators: z.array(z.string()).max(5).optional(),
});

/**
 * Complete beat validation schema
 */
export const BeatSchema = z.object({
  id: z.number().positive().optional(),
  title: z
    .string()
    .min(1, "Beat title is required")
    .max(100, "Beat title cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_()]+$/, "Beat title contains invalid characters"),

  slug: z
    .string()
    .min(1, "Slug is required")
    .max(120, "Slug cannot exceed 120 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),

  genre: BeatGenre,
  mood: BeatMood.optional(),
  key: MusicalKey.optional(),
  bpm: BpmSchema,

  status: BeatStatus.default("pending_review"),

  // Pricing for different license types
  basicPrice: BeatPriceSchema,
  premiumPrice: BeatPriceSchema,
  unlimitedPrice: BeatPriceSchema,
  exclusivePrice: BeatPriceSchema.optional(),

  // Audio files
  previewFile: AudioFileSchema,
  basicFile: AudioFileSchema.optional(),
  premiumFile: AudioFileSchema.optional(),
  unlimitedFile: AudioFileSchema.optional(),
  stemsFile: AudioFileSchema.optional(),

  // Metadata
  metadata: BeatMetadataSchema.optional(),
  tags: BeatTagsSchema,

  // Timestamps
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),

  // Producer information
  producerId: z.number().positive(),
  producerName: z.string().min(1).max(100),

  // Analytics
  playCount: z.number().nonnegative().default(0),
  downloadCount: z.number().nonnegative().default(0),
  likeCount: z.number().nonnegative().default(0),

  // SEO
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),

  // Featured status
  isFeatured: z.boolean().default(false),
  featuredUntil: z.string().datetime().optional(),
});

/**
 * Beat creation validation (excludes auto-generated fields)
 */
export const CreateBeatSchema = BeatSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  playCount: true,
  downloadCount: true,
  likeCount: true,
});

/**
 * Beat update validation (all fields optional except ID)
 */
export const UpdateBeatSchema = BeatSchema.partial().extend({
  id: z.number().positive(),
});

/**
 * Beat filter validation for search/browse
 */
export const BeatFilterSchema = z.object({
  genre: BeatGenre.optional(),
  mood: BeatMood.optional(),
  key: MusicalKey.optional(),
  bpmMin: z.number().min(60).max(200).optional(),
  bpmMax: z.number().min(60).max(200).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  producer: z.string().optional(),
  isFeatured: z.boolean().optional(),
  status: BeatStatus.optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum(["newest", "oldest", "price_low", "price_high", "popular", "trending"])
    .default("newest"),
  page: z.number().positive().default(1),
  limit: z.number().min(1).max(100).default(20),
});

/**
 * Beat purchase validation
 */
export const BeatPurchaseSchema = z.object({
  beatId: z.number().positive(),
  licenseType: LicenseType,
  quantity: z.number().positive().default(1),
  customLicenseTerms: z.string().max(1000).optional(),
});

/**
 * Beat like/favorite validation
 */
export const BeatInteractionSchema = z.object({
  beatId: z.number().positive(),
  action: z.enum(["like", "unlike", "favorite", "unfavorite"]),
});

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validate BPM range for specific genre
 */
export const validateBpmForGenre = (bpm: number, genre: string): boolean => {
  const genreRanges: Record<string, { min: number; max: number }> = {
    "hip-hop": { min: 70, max: 140 },
    trap: { min: 130, max: 170 },
    "r&b": { min: 60, max: 120 },
    pop: { min: 100, max: 130 },
    drill: { min: 130, max: 150 },
    afrobeat: { min: 100, max: 130 },
    reggaeton: { min: 90, max: 110 },
    dancehall: { min: 85, max: 110 },
    "uk-drill": { min: 130, max: 150 },
    "jersey-club": { min: 130, max: 140 },
    amapiano: { min: 110, max: 120 },
  };

  const range = genreRanges[genre.toLowerCase()];
  if (!range) return true; // Allow unknown genres

  return bpm >= range.min && bpm <= range.max;
};

/**
 * Validate beat pricing consistency
 */
export const validateBeatPricing = (prices: {
  basic: number;
  premium: number;
  unlimited: number;
  exclusive?: number;
}): boolean => {
  // Basic < Premium < Unlimited < Exclusive
  if (prices.basic >= prices.premium) return false;
  if (prices.premium >= prices.unlimited) return false;
  if (prices.exclusive && prices.unlimited >= prices.exclusive) return false;

  return true;
};

/**
 * Validate audio file format for license type
 */
export const validateAudioFormatForLicense = (format: string, licenseType: string): boolean => {
  const formatRequirements: Record<string, string[]> = {
    basic: ["mp3"],
    premium: ["mp3", "wav"],
    unlimited: ["mp3", "wav", "aiff"],
    exclusive: ["wav", "aiff", "flac"],
  };

  const allowedFormats = formatRequirements[licenseType];
  return allowedFormats ? allowedFormats.includes(format.toLowerCase()) : false;
};

// ================================
// TYPE EXPORTS
// ================================

export type Beat = z.infer<typeof BeatSchema>;
export type CreateBeat = z.infer<typeof CreateBeatSchema>;
export type UpdateBeat = z.infer<typeof UpdateBeatSchema>;
export type BeatFilter = z.infer<typeof BeatFilterSchema>;
export type BeatPurchase = z.infer<typeof BeatPurchaseSchema>;
export type BeatInteraction = z.infer<typeof BeatInteractionSchema>;
export type AudioFile = z.infer<typeof AudioFileSchema>;
export type BeatMetadata = z.infer<typeof BeatMetadataSchema>;

export type BeatGenreType = z.infer<typeof BeatGenre>;
export type BeatMoodType = z.infer<typeof BeatMood>;
export type MusicalKeyType = z.infer<typeof MusicalKey>;
export type LicenseTypeType = z.infer<typeof LicenseType>;
export type BeatStatusType = z.infer<typeof BeatStatus>;
