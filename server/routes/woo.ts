// server/routes/woo.ts
import { Request, Response, Router } from "express";
import { fetchWooCategories, fetchWooProduct, fetchWooProducts } from "../services/woo";
import { handleRouteError } from "../types/routes";
import { WooCommerceMetaData, WooCommerceProduct } from "../types/woocommerce";

const router = Router();

router.get("/products", async (req: Request, res: Response) => {
  try {
    // Check if WooCommerce is configured
    if (
      !process.env.WOOCOMMERCE_API_URL ||
      !process.env.VITE_WC_KEY ||
      !process.env.WOOCOMMERCE_CONSUMER_SECRET
    ) {
      console.log("⚠️ WooCommerce not configured, returning sample data");

      // Return sample data for testing
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

    // Mapper les produits WooCommerce vers le format attendu
    const beats = wooProducts.map((product: WooCommerceProduct) => {
      // Extraction robuste de l'URL audio
      let audioUrl: string | null = null;
      const albTracklistMeta = product.meta_data?.find(
        (meta: WooCommerceMetaData) => meta.key === "alb_tracklist"
      );
      const audioUrlMeta = product.meta_data?.find(
        (meta: WooCommerceMetaData) => meta.key === "audio_url"
      );

      console.log(`🔍 Product ${product.id} - alb_tracklist found:`, !!albTracklistMeta);

      if (albTracklistMeta && albTracklistMeta.value) {
        let sonaarData: unknown = albTracklistMeta.value;
        try {
          if (typeof sonaarData === "string") {
            sonaarData = JSON.parse(sonaarData);
          }
        } catch (e) {
          console.error(`❌ Error parsing alb_tracklist for product ${product.id}:`, e);
        }

        console.log(
          `📊 Product ${product.id} - sonaarData type:`,
          typeof sonaarData,
          Array.isArray(sonaarData)
        );

        // Si c'est un tableau (plus courant)
        if (Array.isArray(sonaarData) && sonaarData.length > 0) {
          const firstTrack = sonaarData[0] as Record<string, unknown>;
          audioUrl =
            (firstTrack.audio_preview as string) ||
            (firstTrack.track_mp3 as string) ||
            (firstTrack.src as string) ||
            (firstTrack.url as string) ||
            null;
          console.log(`🎵 Product ${product.id} - Found audio URL (array):`, audioUrl);
        } else if (sonaarData && typeof sonaarData === "object") {
          // Si c'est un objet unique
          const trackData = sonaarData as Record<string, unknown>;
          audioUrl =
            String(trackData.audio_preview || "") ||
            String(trackData.track_mp3 || "") ||
            String(trackData.src || "") ||
            String(trackData.url || "") ||
            null;
          console.log(`🎵 Product ${product.id} - Found audio URL (object):`, audioUrl);
        } else {
          console.log(`❌ Product ${product.id} - No valid audio data found`);
        }
      } else {
        console.log(`❌ Product ${product.id} - No alb_tracklist found`);
      }

      // Fallback sur meta_data.audio_url si rien trouvé
      if (!audioUrl && audioUrlMeta) {
        audioUrl = String(audioUrlMeta.value || "");
        console.log(`🎵 Product ${product.id} - Fallback audio URL:`, audioUrl);
      }

      console.log(`✅ Product ${product.id} - Final audio_url:`, audioUrl);

      // Extraction directe basée sur la structure connue
      let directAudioUrl: string | null = null;
      if (product.meta_data) {
        const albTracklistMeta = product.meta_data.find(
          (meta: WooCommerceMetaData) => meta.key === "alb_tracklist"
        );
        if (albTracklistMeta && albTracklistMeta.value) {
          try {
            let trackData: unknown = albTracklistMeta.value;
            if (typeof trackData === "string") {
              trackData = JSON.parse(trackData);
            }
            if (Array.isArray(trackData) && trackData.length > 0) {
              const firstTrack = trackData[0] as Record<string, unknown>;
              directAudioUrl =
                String(firstTrack.audio_preview || "") ||
                String(firstTrack.track_mp3 || "") ||
                null;
            }
          } catch (e) {
            console.error(`Error parsing track data for product ${product.id}:`, e);
          }
        }
      }

      // Extraction directe basée sur la structure connue
      let finalAudioUrl: string | null = null;

      // Chercher directement dans alb_tracklist
      if (product.meta_data) {
        const albTracklistMeta = product.meta_data.find(
          (meta: WooCommerceMetaData) => meta.key === "alb_tracklist"
        );
        if (albTracklistMeta && albTracklistMeta.value) {
          try {
            let trackData: unknown = albTracklistMeta.value;
            if (typeof trackData === "string") {
              trackData = JSON.parse(trackData);
            }
            if (Array.isArray(trackData) && trackData.length > 0) {
              const firstTrack = trackData[0] as Record<string, unknown>;
              finalAudioUrl =
                String(firstTrack.audio_preview || "") ||
                String(firstTrack.track_mp3 || "") ||
                null;
            }
          } catch (e) {
            console.error(`Error parsing track data for product ${product.id}:`, e);
          }
        }
      }

      // Si pas trouvé, utiliser la logique précédente
      if (!finalAudioUrl) {
        finalAudioUrl = directAudioUrl || audioUrl || null;
      }

      console.log(`🎯 Product ${product.id} - FINAL audio_url:`, finalAudioUrl);

      // Helper function to find metadata value
      const findMetaValue = (key: string): string | number | boolean | string[] | null => {
        const meta = product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === key);
        return meta?.value ?? null;
      };

      // Helper function to check tags
      const hasTagWithName = (searchTerm: string): boolean => {
        return (
          product.tags?.some(
            (tag: unknown) =>
              tag &&
              typeof tag === "object" &&
              "name" in tag &&
              String((tag as { name: unknown }).name)
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
          ) || false
        );
      };

      // Forcer l'ajout du champ audio_url
      const productWithAudio = {
        ...product,
        audio_url: finalAudioUrl,
        hasVocals: findMetaValue("has_vocals") === "yes" || hasTagWithName("vocals"),
        stems: findMetaValue("stems") === "yes" || hasTagWithName("stems"),
        bpm: String(findMetaValue("bpm") || ""),
        key: String(findMetaValue("key") || ""),
        mood: String(findMetaValue("mood") || ""),
        instruments: String(findMetaValue("instruments") || ""),
        duration: String(findMetaValue("duration") || ""),
        is_free: product.price === "0" || product.price === "",
      };

      console.log(
        `🎯 Product ${product.id} - audio_url field added:`,
        !!productWithAudio.audio_url
      );

      return productWithAudio;
    });

    res.json(beats);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch products");
  }
});

router.get("/products/:id", async (req, res, next): Promise<void> => {
  try {
    // Check if WooCommerce is configured
    if (
      !process.env.WOOCOMMERCE_API_URL ||
      !process.env.VITE_WC_KEY ||
      !process.env.WOOCOMMERCE_CONSUMER_SECRET
    ) {
      console.log("⚠️ WooCommerce not configured, returning sample product");

      // Return sample product for testing
      const sampleProduct = {
        id: parseInt(req.params.id),
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

    // Appliquer la même logique d'extraction audio que pour la liste des produits
    let audioUrl: string | null = null;
    const albTracklistMeta = product.meta_data?.find(
      (meta: WooCommerceMetaData) => meta.key === "alb_tracklist"
    );
    const audioUrlMeta = product.meta_data?.find(
      (meta: WooCommerceMetaData) => meta.key === "audio_url"
    );

    if (albTracklistMeta && albTracklistMeta.value) {
      let sonaarData: unknown = albTracklistMeta.value;
      try {
        if (typeof sonaarData === "string") {
          sonaarData = JSON.parse(sonaarData);
        }
      } catch (e) {
        console.error(`❌ Error parsing alb_tracklist for product ${product.id}:`, e);
      }

      // Si c'est un tableau (plus courant)
      if (Array.isArray(sonaarData) && sonaarData.length > 0) {
        const firstTrack = sonaarData[0] as Record<string, unknown>;
        audioUrl =
          String(firstTrack.audio_preview || "") ||
          String(firstTrack.track_mp3 || "") ||
          String(firstTrack.src || "") ||
          String(firstTrack.url || "") ||
          null;
      } else if (sonaarData && typeof sonaarData === "object") {
        // Si c'est un objet unique
        const trackData = sonaarData as Record<string, unknown>;
        audioUrl =
          String(trackData.audio_preview || "") ||
          String(trackData.track_mp3 || "") ||
          String(trackData.src || "") ||
          String(trackData.url || "") ||
          null;
      }
    }

    // Fallback sur meta_data.audio_url si rien trouvé
    if (!audioUrl && audioUrlMeta) {
      audioUrl = String(audioUrlMeta.value || "");
    }

    // Extraction directe basée sur la structure connue
    let finalAudioUrl: string | null = null;
    if (product.meta_data) {
      const albTracklistMeta = product.meta_data.find(
        (meta: WooCommerceMetaData) => meta.key === "alb_tracklist"
      );
      if (albTracklistMeta && albTracklistMeta.value) {
        try {
          let trackData: unknown = albTracklistMeta.value;
          if (typeof trackData === "string") {
            trackData = JSON.parse(trackData);
          }
          if (Array.isArray(trackData) && trackData.length > 0) {
            const firstTrack = trackData[0] as Record<string, unknown>;
            finalAudioUrl =
              String(firstTrack.audio_preview || "") || String(firstTrack.track_mp3 || "") || null;
          }
        } catch (e) {
          console.error(`Error parsing track data for product ${product.id}:`, e);
        }
      }
    }

    // Si pas trouvé, utiliser la logique précédente
    if (!finalAudioUrl) {
      finalAudioUrl = audioUrl || null;
    }

    console.log(`🎯 Product ${product.id} - FINAL audio_url:`, finalAudioUrl);

    // Helper function to find metadata value
    const findMetaValue = (key: string): string | number | boolean | null => {
      const meta = product.meta_data?.find((meta: WooCommerceMetaData) => meta.key === key);
      const value: string | number | boolean | string[] | null = meta?.value ?? null;
      // Handle array values by converting to string or returning first element
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : null;
      }
      return value as string | number | boolean | null;
    };

    // Helper function to check tags
    const hasTagWithName = (searchTerm: string): boolean => {
      return (
        product.tags?.some(
          (tag: unknown) =>
            tag &&
            typeof tag === "object" &&
            "name" in tag &&
            String((tag as { name: unknown }).name)
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
        ) || false
      );
    };

    // Mapper le produit avec la même logique que la liste
    const beat = {
      ...product,
      audio_url: finalAudioUrl,
      hasVocals: findMetaValue("has_vocals") === "yes" || hasTagWithName("vocals"),
      stems: findMetaValue("stems") === "yes" || hasTagWithName("stems"),
      bpm: String(findMetaValue("bpm") || ""),
      key: String(findMetaValue("key") || ""),
      mood: String(findMetaValue("mood") || ""),
      instruments: String(findMetaValue("instruments") || ""),
      duration: String(findMetaValue("duration") || ""),
      is_free: product.price === "0" || product.price === "",
    };

    res.json(beat);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch product");
  }
});

router.get("/categories", async (_req, res, next) => {
  try {
    // Check if WooCommerce is configured
    if (
      !process.env.WOOCOMMERCE_API_URL ||
      !process.env.VITE_WC_KEY ||
      !process.env.WOOCOMMERCE_CONSUMER_SECRET
    ) {
      console.log("⚠️ WooCommerce not configured, returning sample categories");

      // Return sample categories for testing
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
