// server/routes/woo.ts
import { Request, Response, Router } from "express";
import { fetchWooCategories, fetchWooProduct, fetchWooProducts } from "../services/woo";
import { handleRouteError } from "../types/routes";
import { WooCommerceMetaData, WooCommerceProduct } from "../types/woocommerce";

const router = Router();

// Helper function to safely convert to string
function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

// Audio URLs extracted from track data
interface TrackUrls {
  previewUrl: string | null; // For playback (30 sec preview)
  downloadUrl: string | null; // For download (full audio)
}

/**
 * Fix WordPress audio URLs to point to the correct domain
 * WordPress stores URLs with brolabentertainment.com but files are on wp.brolabentertainment.com
 */
function fixAudioUrl(url: string): string {
  if (!url) return url;
  // Replace the main domain with the WordPress subdomain for audio files
  return url
    .replaceAll(
      "https://brolabentertainment.com/wp-content/",
      "https://wp.brolabentertainment.com/wp-content/"
    )
    .replaceAll(
      "https://www.brolabentertainment.com/wp-content/",
      "https://wp.brolabentertainment.com/wp-content/"
    );
}

// Helper function to extract both preview and download URLs from track data
function extractAudioUrlsFromTrack(track: Record<string, unknown>): TrackUrls {
  // Preview URL from Sonaar (30 sec preview for single-track products)
  const audioPreview = fixAudioUrl(safeString(track.audio_preview));

  // Full audio URLs
  const trackMp3 = fixAudioUrl(safeString(track.track_mp3));
  const src = fixAudioUrl(safeString(track.src));
  const url = fixAudioUrl(safeString(track.url));

  // Full audio URL (for download) - track_mp3 is the original full audio
  const downloadUrl = trackMp3 || src || url || null;

  // Preview URL (for playback) - prioritize audio_preview (30 sec) if available
  // This ensures single-track products play the 30-sec preview, not the full audio
  const previewUrl = audioPreview || trackMp3 || src || url || null;

  console.log(
    `🔍 Track URLs - audio_preview: "${audioPreview}", track_mp3: "${trackMp3}" => preview: "${previewUrl}"`
  );

  return { previewUrl, downloadUrl };
}

// Helper function to extract audio URL from track data (for backward compatibility)
function extractAudioFromTrack(track: Record<string, unknown>): string | null {
  const { previewUrl } = extractAudioUrlsFromTrack(track);
  return previewUrl;
}

// Helper function to parse track data
function parseTrackData(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

// Audio track interface for multi-track products
interface AudioTrack {
  url: string; // Preview URL for playback
  downloadUrl?: string; // Full audio URL for download
  title?: string;
  artist?: string;
  duration?: string;
  mediaId?: number; // WordPress media attachment ID for fetching title
  mediaDescription?: string; // WordPress media description (contains BPM, Key info)
  bpm?: string; // BPM extracted from media description
  key?: string; // Musical key extracted from media description
}

// WordPress media API response interface
interface WordPressMediaResponse {
  title?: { rendered?: string; raw?: string };
  description?: { rendered?: string; raw?: string };
  caption?: { rendered?: string; raw?: string };
  alt_text?: string;
  excerpt?: { rendered?: string; raw?: string };
  content?: { rendered?: string; raw?: string };
  meta?: Record<string, unknown>;
  media_details?: {
    artist?: string;
    album?: string;
    title?: string;
    bpm?: string; // ID3 BPM tag from audio file
  };
}

// Fetch media details (title + description + BPM) from WordPress REST API
async function fetchMediaDetails(
  mediaId: number
): Promise<{ title: string | null; description: string | null; mediaDetailsBpm: string | null }> {
  try {
    const wpApiUrl =
      process.env.WORDPRESS_API_URL || "https://brolabentertainment.com/wp-json/wp/v2";
    const response = await fetch(`${wpApiUrl}/media/${mediaId}`);
    if (!response.ok) {
      console.log(`❌ Media ${mediaId} fetch failed: ${response.status}`);
      return { title: null, description: null, mediaDetailsBpm: null };
    }

    const media = (await response.json()) as WordPressMediaResponse;
    const title = media.title?.rendered || media.title?.raw || null;

    // Get BPM from ID3 tags (media_details.bpm) - but we'll prioritize description
    const mediaDetailsBpm = media.media_details?.bpm || null;

    // Log ALL available fields including RAW versions
    console.log(`📋 Media ${mediaId} ALL FIELDS:`, {
      title: media.title?.rendered?.substring(0, 50),
      description_rendered: media.description?.rendered?.substring(0, 150),
      description_raw: media.description?.raw?.substring(0, 150),
      caption_rendered: media.caption?.rendered?.substring(0, 150),
      caption_raw: media.caption?.raw?.substring(0, 150),
      media_details_bpm: mediaDetailsBpm,
    });

    // Priority order for description:
    // 1. description.raw - contains the actual text like "Elevate_(@treigua_130BPM_Cmin)"
    // 2. caption.raw
    // 3. caption.rendered
    // 4. description.rendered (often contains shortcodes, less reliable)
    const possibleDescriptions = [
      media.description?.raw, // RAW description - highest priority
      media.caption?.raw,
      media.caption?.rendered,
      media.description?.rendered,
      media.alt_text,
    ].filter(Boolean);

    // Find the description that contains BPM or Key pattern
    const bestDescription = findBestDescription(possibleDescriptions as string[]);

    return { title, description: bestDescription, mediaDetailsBpm };
  } catch (error) {
    console.error(`Failed to fetch media ${mediaId}:`, error);
    return { title: null, description: null, mediaDetailsBpm: null };
  }
}

// Helper function to clean HTML from description
function cleanDescription(desc: string): string {
  return desc
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/&[^;]+;/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

// Helper function to find the best description containing metadata
function findBestDescription(possibleDescriptions: string[]): string | null {
  for (const desc of possibleDescriptions) {
    if (desc) {
      const cleanDesc = cleanDescription(desc);

      // Look for BPM pattern like "130BPM" or musical key like "Cmin"
      const hasBpm = /(\d{2,3})BPM/i.test(cleanDesc);
      const hasKey = /([A-G][#b]?m(?:in)?|[A-G][#b]?\s*(?:maj|min))/i.test(cleanDesc);

      if (hasBpm || hasKey) {
        console.log(`✅ Found metadata in description: ${cleanDesc.substring(0, 100)}`);
        return cleanDesc;
      }
    }
  }

  // Fallback to first available description
  if (possibleDescriptions[0]) {
    return cleanDescription(possibleDescriptions[0]);
  }

  return null;
}

// Enrich tracks with titles and descriptions from WordPress media library
async function enrichTracksWithMediaTitles(tracks: AudioTrack[]): Promise<AudioTrack[]> {
  const enrichedTracks = await Promise.all(
    tracks.map(async track => {
      // If track has mediaId, fetch details from WordPress
      if (track.mediaId) {
        const { title, description, mediaDetailsBpm } = await fetchMediaDetails(track.mediaId);
        const enrichedTrack = { ...track };

        if (title && !track.title) {
          enrichedTrack.title = title;
          console.log(`🎵 Fetched media title for ID ${track.mediaId}: ${title}`);
        }

        if (description) {
          enrichedTrack.mediaDescription = description;

          // PRIORITY 1: Extract BPM from description (user-entered, most reliable)
          const trackBpm = extractBpmFromText(description);
          if (trackBpm) {
            enrichedTrack.bpm = trackBpm;
            console.log(`🎹 Track ${track.mediaId} BPM from DESCRIPTION: ${trackBpm}`);
          }

          // Extract Key from description
          const trackKey = extractKeyFromText(description);
          if (trackKey) {
            enrichedTrack.key = trackKey;
            console.log(`🎹 Track ${track.mediaId} Key from DESCRIPTION: ${trackKey}`);
          }
        }

        // PRIORITY 2: Fallback to ID3 tags if no BPM found in description
        if (!enrichedTrack.bpm && mediaDetailsBpm) {
          enrichedTrack.bpm = mediaDetailsBpm;
          console.log(`🎹 Track ${track.mediaId} BPM from ID3 TAGS (fallback): ${mediaDetailsBpm}`);
        }

        console.log(`📝 Track ${track.mediaId} enriched:`, {
          title: enrichedTrack.title,
          bpm: enrichedTrack.bpm,
          key: enrichedTrack.key,
        });

        return enrichedTrack;
      }

      return track;
    })
  );

  return enrichedTracks;
}

// Title field names used by Sonaar plugin (in priority order)
const TITLE_FIELDS = [
  "title",
  "track_title",
  "stream_title",
  "song_title",
  "name",
  "icecast_title",
] as const;

// Artist field names used by Sonaar plugin (in priority order)
const ARTIST_FIELDS = ["artist", "track_artist", "artist_name"] as const;

// Duration field names used by Sonaar plugin (in priority order)
// Note: "stream_lenght" is a typo in Sonaar plugin, kept for compatibility
const DURATION_FIELDS = [
  "duration",
  "track_duration",
  "stream_lenght",
  "post_audiopreview_duration",
] as const;

// Helper: Extract first non-empty value from track record using field list
function extractFieldValue(
  trackRecord: Record<string, unknown>,
  fields: readonly string[]
): string | undefined {
  for (const field of fields) {
    const value = safeString(trackRecord[field]);
    if (value) return value;
  }
  return undefined;
}

// Helper: Extract track title with media ID consideration
function extractTrackTitle(
  trackRecord: Record<string, unknown>,
  mediaId: number | undefined
): string | undefined {
  // When mediaId exists, let enrichTracksWithMediaTitles fetch the correct title from WordPress API
  // This ensures we use the WordPress media library title instead of potentially incorrect values
  if (mediaId) return undefined;
  return extractFieldValue(trackRecord, TITLE_FIELDS);
}

// Helper: Get valid media ID from track record
function getMediaId(trackRecord: Record<string, unknown>): number | undefined {
  if (!trackRecord.track_mp3_id) return undefined;
  const mediaId = Number(trackRecord.track_mp3_id);
  return Number.isNaN(mediaId) ? undefined : mediaId;
}

// Helper: Build AudioTrack from track record
function buildAudioTrack(trackRecord: Record<string, unknown>): AudioTrack | null {
  const { previewUrl, downloadUrl } = extractAudioUrlsFromTrack(trackRecord);
  if (!previewUrl) return null;

  const mediaId = getMediaId(trackRecord);

  return {
    url: previewUrl,
    downloadUrl: downloadUrl || undefined,
    title: extractTrackTitle(trackRecord, mediaId),
    artist: extractFieldValue(trackRecord, ARTIST_FIELDS),
    duration: extractFieldValue(trackRecord, DURATION_FIELDS),
    mediaId,
  };
}

// Helper: Process array of track data
function processTrackArray(trackData: unknown[], productId: number): AudioTrack[] {
  const tracks: AudioTrack[] = [];

  for (const track of trackData) {
    const trackRecord = track as Record<string, unknown>;
    const audioTrack = buildAudioTrack(trackRecord);

    if (audioTrack) {
      tracks.push(audioTrack);
      console.log(
        `🎵 Product ${productId} - Track:`,
        audioTrack.title || "(no title)",
        `preview: ${audioTrack.url?.substring(0, 50)}...`,
        `download: ${audioTrack.downloadUrl?.substring(0, 50)}...`
      );
    }
  }

  console.log(`🎵 Product ${productId} - Found ${tracks.length} audio tracks`);
  return tracks;
}

// Helper: Process single track object
function processSingleTrackObject(
  trackData: Record<string, unknown>,
  productId: number
): AudioTrack[] {
  const url = extractAudioFromTrack(trackData);
  if (!url) return [];

  const track: AudioTrack = {
    url,
    title: safeString(trackData.title) || undefined,
    artist: safeString(trackData.artist) || undefined,
    duration: safeString(trackData.duration) || undefined,
  };

  console.log(`🎵 Product ${productId} - Found audio URL (object):`, url);
  return [track];
}

// Helper: Get fallback track from audio_url metadata
function getFallbackTrack(
  audioUrlMeta: WooCommerceMetaData | undefined,
  productId: number
): AudioTrack[] {
  if (!audioUrlMeta?.value) return [];

  const audioUrl = safeString(audioUrlMeta.value);
  if (!audioUrl) return [];

  console.log(`🎵 Product ${productId} - Fallback audio URL:`, audioUrl);
  return [{ url: audioUrl }];
}

// Helper function to extract all audio tracks from alb_tracklist metadata
function extractAudioTracks(
  albTracklistMeta: WooCommerceMetaData | undefined,
  audioUrlMeta: WooCommerceMetaData | undefined,
  productId: number
): AudioTrack[] {
  if (!albTracklistMeta?.value) {
    console.log(`🎵 Product ${productId} - No alb_tracklist metadata, using fallback`);
    return getFallbackTrack(audioUrlMeta, productId);
  }

  console.log(
    `🎵 Product ${productId} - Raw alb_tracklist:`,
    JSON.stringify(albTracklistMeta.value).substring(0, 200)
  );
  const trackData = parseTrackData(albTracklistMeta.value);
  console.log(
    `🎵 Product ${productId} - Parsed trackData type:`,
    Array.isArray(trackData) ? "array" : typeof trackData
  );

  // Handle array of tracks
  if (Array.isArray(trackData) && trackData.length > 0) {
    return processTrackArray(trackData, productId);
  }

  // Handle single track object
  if (trackData && typeof trackData === "object") {
    const tracks = processSingleTrackObject(trackData as Record<string, unknown>, productId);
    if (tracks.length > 0) return tracks;
  }

  // Fallback to audio_url metadata
  return getFallbackTrack(audioUrlMeta, productId);
}

// Helper function to find metadata value
function findMetaValue(
  metaData: WooCommerceMetaData[] | undefined,
  key: string
): string | number | boolean | null {
  const meta = metaData?.find((m: WooCommerceMetaData) => m.key === key);
  const value = meta?.value ?? null;

  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : null;
  }
  return value;
}

// Helper function to check if product has tag
function hasTagWithName(tags: unknown[] | undefined, searchTerm: string): boolean {
  return (
    tags?.some(
      (tag: unknown) =>
        tag &&
        typeof tag === "object" &&
        "name" in tag &&
        String((tag as { name: unknown }).name)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    ) ?? false
  );
}

// Helper function to extract BPM from text (URL, description, name)
function extractBpmFromText(text: string | undefined): string {
  if (!text) return "";
  const patterns = [
    /(\d{2,3})\s*bpm/i,
    /bpm[:\s]*(\d{2,3})/i,
    /_(\d{2,3})BPM_/i,
    /(\d{2,3})BPM/i,
    /tempo[:\s]*(\d{2,3})/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const bpm = Number.parseInt(match[1], 10);
      if (bpm >= 40 && bpm <= 300) return match[1];
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

// Helper function to extract musical key from text
function extractKeyFromText(text: string | undefined): string {
  if (!text) return "";

  const patterns = [
    /\bkey[:\s]*([A-G][#b]?)\s*(maj(?:or)?|min(?:or)?|m)?\b/i,
    /_([A-G][#b]?m)(?:in)?_/i,
    /_([A-G][#b]?)min_/i,
    /\b([A-G][#b]?)\s*(maj(?:or)?|min(?:or)?)\b/i,
    /\b([A-G][#b]?m)\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return normalizeKeyFormat(match[1], match[2] || "");
    }
  }

  return "";
}

// Helper function to extract mood from text
function extractMoodFromText(text: string | undefined): string {
  if (!text) return "";
  const pattern =
    /\b(dark|chill|upbeat|sad|happy|aggressive|energetic|mellow|dreamy|intense|smooth|hard|soft|emotional|epic|ambient)\b/i;
  const match = pattern.exec(text);
  if (match?.[1]) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }
  return "";
}

// Helper function to strip HTML tags
function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return html
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/&[^;]+;/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

// Helper function to map WooCommerce product to beat format
async function mapProductToBeat(product: WooCommerceProduct) {
  const albTracklistMeta = product.meta_data?.find(
    (meta: WooCommerceMetaData) => meta.key === "alb_tracklist"
  );
  const audioUrlMeta = product.meta_data?.find(
    (meta: WooCommerceMetaData) => meta.key === "audio_url"
  );

  const rawTracks = extractAudioTracks(albTracklistMeta, audioUrlMeta, product.id);

  // Enrich tracks with titles AND descriptions from WordPress media library
  const audioTracks = await enrichTracksWithMediaTitles(rawTracks);

  // Preview URL for playback (30 sec preview)
  const audioUrl = audioTracks.length > 0 ? audioTracks[0].url : null;

  // Download URL for full audio (original file)
  const downloadUrl = audioTracks.length > 0 ? audioTracks[0].downloadUrl : null;

  console.log(
    `✅ Product ${product.id} - Final URLs:`,
    `preview: ${audioUrl?.substring(0, 60)}...`,
    `download: ${downloadUrl?.substring(0, 60)}...`,
    `(${audioTracks.length} tracks)`
  );

  // Build text sources with PRIORITY ORDER:
  // 1. WordPress media DESCRIPTIONS (HIGHEST PRIORITY - contains actual BPM like "Elevate_(@treigua_130BPM_Cmin)")
  // 2. Product meta_data fields
  // 3. Product description
  // 4. Audio URLs (contain filename)
  // 5. Track titles
  // 6. Product name (LAST - often contains wrong/marketing numbers)

  // Media descriptions are the most reliable source (from WordPress media library)
  const mediaDescriptions = audioTracks.map(t => t.mediaDescription || "").join(" ");
  const trackTitles = audioTracks.map(t => t.title || "").join(" ");
  const trackUrls = audioTracks.map(t => `${t.url || ""} ${t.downloadUrl || ""}`).join(" ");
  const description = stripHtml(product.description);
  const shortDescription = stripHtml(product.short_description);

  // Priority 1: Media descriptions (most reliable - from WordPress media library details)
  const highestPrioritySource = mediaDescriptions;
  // Priority 2: Product descriptions and audio URLs
  const mediumPrioritySource = `${description} ${shortDescription} ${trackUrls} ${audioUrl || ""} ${downloadUrl || ""}`;
  // Priority 3: Track titles (filenames)
  const lowPrioritySource = trackTitles;
  // Priority 4: Product name (last resort - often wrong)
  const fallbackSource = `${product.name || ""}`;

  console.log(`🔍 Product ${product.id} - Text sources:`, {
    mediaDescriptions: mediaDescriptions.substring(0, 100),
    description: description.substring(0, 50),
  });

  // Extract BPM with priority order
  const bpmFromMeta = safeString(findMetaValue(product.meta_data, "bpm"));
  let bpm = bpmFromMeta;
  if (!bpm) bpm = extractBpmFromText(highestPrioritySource);
  if (!bpm) bpm = extractBpmFromText(mediumPrioritySource);
  if (!bpm) bpm = extractBpmFromText(lowPrioritySource);
  if (!bpm) bpm = extractBpmFromText(fallbackSource);

  // Extract Key with priority order
  const keyFromMeta = safeString(findMetaValue(product.meta_data, "key"));
  let key = keyFromMeta;
  if (!key) key = extractKeyFromText(highestPrioritySource);
  if (!key) key = extractKeyFromText(mediumPrioritySource);
  if (!key) key = extractKeyFromText(lowPrioritySource);
  if (!key) key = extractKeyFromText(fallbackSource);

  // Extract Mood with priority order
  const moodFromMeta = safeString(findMetaValue(product.meta_data, "mood"));
  let mood = moodFromMeta;
  if (!mood) mood = extractMoodFromText(highestPrioritySource);
  if (!mood) mood = extractMoodFromText(mediumPrioritySource);
  if (!mood) mood = extractMoodFromText(lowPrioritySource);
  if (!mood) mood = extractMoodFromText(fallbackSource);

  console.log(`🎵 Product ${product.id} metadata:`, {
    bpm,
    key,
    mood,
    mediaDescriptions: mediaDescriptions.substring(0, 80),
  });

  return {
    ...product,
    audio_url: audioUrl, // Preview URL for playback
    download_url: downloadUrl, // Full audio URL for download
    audio_tracks: audioTracks, // All tracks for multi-track navigation
    hasVocals:
      findMetaValue(product.meta_data, "has_vocals") === "yes" ||
      hasTagWithName(product.tags, "vocals"),
    stems:
      findMetaValue(product.meta_data, "stems") === "yes" || hasTagWithName(product.tags, "stems"),
    bpm,
    key,
    mood,
    instruments: safeString(findMetaValue(product.meta_data, "instruments")),
    duration: safeString(findMetaValue(product.meta_data, "duration")),
    is_free: product.price === "0" || product.price === "",
  };
}

// Check if WooCommerce is configured
function isWooCommerceConfigured(): boolean {
  const apiUrl = process.env.WOOCOMMERCE_API_URL;
  const apiKey = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.VITE_WC_KEY;
  const apiSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  const isConfigured = !!(apiUrl && apiKey && apiSecret);

  if (!isConfigured) {
    console.log("⚠️ WooCommerce config check:", {
      hasApiUrl: !!apiUrl,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
    });
  }

  return isConfigured;
}

router.get("/products", async (req: Request, res: Response) => {
  try {
    if (!isWooCommerceConfigured()) {
      console.log("⚠️ WooCommerce not configured, returning sample data");

      const sampleProducts = [
        {
          id: 1,
          name: "Sample Beat 1",
          price: "29.99",
          regular_price: "39.99",
          sale_price: "29.99",
          description: "A sample beat for testing",
          short_description: "Sample beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Hip Hop" }],
          meta_data: [
            { key: "bpm", value: "140" },
            { key: "key", value: "C" },
            { key: "mood", value: "Energetic" },
            { key: "instruments", value: "Drums, Bass, Synth" },
            { key: "duration", value: "3:45" },
            { key: "has_vocals", value: "no" },
            { key: "stems", value: "yes" },
          ],
          tags: [],
          total_sales: 0,
          hasVocals: false,
          stems: true,
          bpm: "140",
          key: "C",
          mood: "Energetic",
          instruments: "Drums, Bass, Synth",
          duration: "3:45",
          is_free: false,
        },
        {
          id: 2,
          name: "Sample Beat 2",
          price: "0",
          regular_price: "0",
          sale_price: "0",
          description: "A free sample beat",
          short_description: "Free beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Trap" }],
          meta_data: [
            { key: "bpm", value: "150" },
            { key: "key", value: "F" },
            { key: "mood", value: "Dark" },
            { key: "instruments", value: "Drums, 808, Hi-hats" },
            { key: "duration", value: "2:30" },
            { key: "has_vocals", value: "yes" },
            { key: "stems", value: "no" },
          ],
          tags: [],
          total_sales: 0,
          hasVocals: true,
          stems: false,
          bpm: "150",
          key: "F",
          mood: "Dark",
          instruments: "Drums, 808, Hi-hats",
          duration: "2:30",
          is_free: true,
        },
      ];

      res.json(sampleProducts);
      return;
    }

    const wooProducts = await fetchWooProducts(req.query);
    const beats = await Promise.all(wooProducts.map(mapProductToBeat));

    res.json(beats);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch products");
  }
});

router.get("/products/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isWooCommerceConfigured()) {
      console.log("⚠️ WooCommerce not configured, returning sample product");

      const sampleProduct = {
        id: Number.parseInt(req.params.id, 10),
        name: "Sample Beat",
        price: "29.99",
        regular_price: "39.99",
        sale_price: "29.99",
        description: "A sample beat for testing",
        short_description: "Sample beat",
        images: [{ src: "/api/placeholder/300/300" }],
        categories: [{ name: "Hip Hop" }],
        meta_data: [
          { key: "bpm", value: "140" },
          { key: "key", value: "C" },
          { key: "mood", value: "Energetic" },
          { key: "instruments", value: "Drums, Bass, Synth" },
          { key: "duration", value: "3:45" },
          { key: "has_vocals", value: "no" },
          { key: "stems", value: "yes" },
        ],
        tags: [],
        total_sales: 0,
        hasVocals: false,
        stems: true,
        bpm: "140",
        key: "C",
        mood: "Energetic",
        instruments: "Drums, Bass, Synth",
        duration: "3:45",
        is_free: false,
        audio_url: null,
      };

      res.json({ beat: sampleProduct });
      return;
    }

    const product = await fetchWooProduct(req.params.id);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const beat = await mapProductToBeat(product);
    res.json(beat);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch product");
  }
});

router.get("/categories", async (_req: Request, res: Response) => {
  try {
    if (!isWooCommerceConfigured()) {
      console.log("⚠️ WooCommerce not configured, returning sample categories");

      const sampleCategories = [
        { id: 1, name: "Hip Hop", count: 15 },
        { id: 2, name: "Trap", count: 8 },
        { id: 3, name: "R&B", count: 12 },
        { id: 4, name: "Pop", count: 6 },
      ];

      res.json({ categories: sampleCategories });
      return;
    }

    const cats = await fetchWooCategories();
    res.json({ categories: cats });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch categories");
  }
});

export default router;
