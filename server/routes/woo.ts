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

// Helper function to extract audio URL from track data
function extractAudioFromTrack(track: Record<string, unknown>): string | null {
  const audioPreview = safeString(track.audio_preview);
  if (audioPreview) return audioPreview;

  const trackMp3 = safeString(track.track_mp3);
  if (trackMp3) return trackMp3;

  const src = safeString(track.src);
  if (src) return src;

  const url = safeString(track.url);
  if (url) return url;

  return null;
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
  url: string;
  title?: string;
  artist?: string;
  duration?: string;
}

// Helper function to extract all audio tracks from alb_tracklist metadata
function extractAudioTracks(
  albTracklistMeta: WooCommerceMetaData | undefined,
  audioUrlMeta: WooCommerceMetaData | undefined,
  productId: number
): AudioTrack[] {
  const tracks: AudioTrack[] = [];

  if (albTracklistMeta?.value) {
    const trackData = parseTrackData(albTracklistMeta.value);

    if (Array.isArray(trackData) && trackData.length > 0) {
      for (const track of trackData) {
        const trackRecord = track as Record<string, unknown>;
        const url = extractAudioFromTrack(trackRecord);
        if (url) {
          tracks.push({
            url,
            title:
              safeString(trackRecord.title) || safeString(trackRecord.track_title) || undefined,
            artist:
              safeString(trackRecord.artist) || safeString(trackRecord.track_artist) || undefined,
            duration:
              safeString(trackRecord.duration) ||
              safeString(trackRecord.track_duration) ||
              undefined,
          });
        }
      }
      console.log(`🎵 Product ${productId} - Found ${tracks.length} audio tracks`);
    } else if (trackData && typeof trackData === "object") {
      const url = extractAudioFromTrack(trackData as Record<string, unknown>);
      if (url) {
        const trackRecord = trackData as Record<string, unknown>;
        tracks.push({
          url,
          title: safeString(trackRecord.title) || undefined,
          artist: safeString(trackRecord.artist) || undefined,
          duration: safeString(trackRecord.duration) || undefined,
        });
      }
      console.log(`🎵 Product ${productId} - Found audio URL (object):`, url);
    }
  }

  // Fallback to audio_url metadata if no tracks found
  if (tracks.length === 0 && audioUrlMeta?.value) {
    const audioUrl = safeString(audioUrlMeta.value);
    if (audioUrl) {
      tracks.push({ url: audioUrl });
      console.log(`🎵 Product ${productId} - Fallback audio URL:`, audioUrl);
    }
  }

  return tracks;
}

// Helper function to extract primary audio URL (backward compatibility)
function extractAudioUrl(
  albTracklistMeta: WooCommerceMetaData | undefined,
  audioUrlMeta: WooCommerceMetaData | undefined,
  productId: number
): string | null {
  const tracks = extractAudioTracks(albTracklistMeta, audioUrlMeta, productId);
  return tracks.length > 0 ? tracks[0].url : null;
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

// Helper function to map WooCommerce product to beat format
function mapProductToBeat(product: WooCommerceProduct) {
  const albTracklistMeta = product.meta_data?.find(
    (meta: WooCommerceMetaData) => meta.key === "alb_tracklist"
  );
  const audioUrlMeta = product.meta_data?.find(
    (meta: WooCommerceMetaData) => meta.key === "audio_url"
  );

  const audioTracks = extractAudioTracks(albTracklistMeta, audioUrlMeta, product.id);
  const audioUrl = audioTracks.length > 0 ? audioTracks[0].url : null;

  console.log(
    `✅ Product ${product.id} - Final audio_url:`,
    audioUrl,
    `(${audioTracks.length} tracks)`
  );

  return {
    ...product,
    audio_url: audioUrl,
    audio_tracks: audioTracks, // All tracks for multi-track navigation
    hasVocals:
      findMetaValue(product.meta_data, "has_vocals") === "yes" ||
      hasTagWithName(product.tags, "vocals"),
    stems:
      findMetaValue(product.meta_data, "stems") === "yes" || hasTagWithName(product.tags, "stems"),
    bpm: safeString(findMetaValue(product.meta_data, "bpm")),
    key: safeString(findMetaValue(product.meta_data, "key")),
    mood: safeString(findMetaValue(product.meta_data, "mood")),
    instruments: safeString(findMetaValue(product.meta_data, "instruments")),
    duration: safeString(findMetaValue(product.meta_data, "duration")),
    is_free: product.price === "0" || product.price === "",
  };
}

// Check if WooCommerce is configured
function isWooCommerceConfigured(): boolean {
  return !!(
    process.env.WOOCOMMERCE_API_URL &&
    process.env.VITE_WC_KEY &&
    process.env.WOOCOMMERCE_CONSUMER_SECRET
  );
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
    const beats = wooProducts.map(mapProductToBeat);

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

    const beat = mapProductToBeat(product);
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
