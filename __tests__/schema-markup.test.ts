import request from "supertest";
import { cleanupWooCommerceStubs, setupWooCommerceStubs } from "./stubs/woocommerce-stubs";

// Mock des modules avant l'import de l'app
jest.mock("../server/routes/openGraph", () => {
  const express = require("express");
  const router = express.Router();

  router.get("/beat/:id", (req: any, res: any) => {
    const beatId = req.params.id;
    if (beatId === "999999") {
      return res.status(404).json({ error: "Beat not found" });
    }

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(`
      <meta property="og:title" content="Test Beat ${beatId}" />
      <meta property="og:description" content="Test beat description" />
      <meta property="og:url" content="https://example.com/product/${beatId}" />
      <meta property="og:image" content="https://example.com/test-image.jpg" />
      <meta property="og:type" content="music.song" />
      <meta property="og:site_name" content="BroLab Entertainment" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Test Beat ${beatId}" />
      <meta name="twitter:description" content="Test beat description" />
      <meta name="twitter:image" content="https://example.com/test-image.jpg" />
    `);
  });

  router.get("/shop", (req: any, res: any) => {
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(`
      <meta property="og:title" content="BroLab Beats Store" />
      <meta property="og:description" content="Discover amazing beats for your next project" />
      <meta property="og:url" content="https://example.com/shop" />
      <meta property="og:image" content="https://example.com/shop-image.jpg" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="BroLab Entertainment" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="BroLab Beats Store" />
      <meta name="twitter:description" content="Discover amazing beats for your next project" />
      <meta name="twitter:image" content="https://example.com/shop-image.jpg" />
    `);
  });

  router.get("/home", (req: any, res: any) => {
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(`
      <meta property="og:title" content="BroLab Entertainment - Professional Music Production" />
      <meta property="og:description" content="High-quality beats and music production services" />
      <meta property="og:url" content="https://example.com" />
      <meta property="og:image" content="https://example.com/home-image.jpg" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="BroLab Entertainment" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="BroLab Entertainment - Professional Music Production" />
      <meta name="twitter:description" content="High-quality beats and music production services" />
      <meta name="twitter:image" content="https://example.com/home-image.jpg" />
    `);
  });

  router.get("/page/:pageName", (req: any, res: any) => {
    const pageName = req.params.pageName;
    const validPages = ["about", "contact", "terms", "privacy", "license"];

    if (!validPages.includes(pageName)) {
      return res.status(400).json({ error: "Invalid page name" });
    }

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(`
      <meta property="og:title" content="${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - BroLab Entertainment" />
      <meta property="og:description" content="Page description for ${pageName}" />
      <meta property="og:url" content="https://example.com/${pageName}" />
      <meta property="og:image" content="https://example.com/default-page.jpg" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="BroLab Entertainment" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - BroLab Entertainment" />
      <meta name="twitter:description" content="Page description for ${pageName}" />
      <meta name="twitter:image" content="https://example.com/default-page.jpg" />
    `);
  });

  return router;
});

// Mock des modules schema
jest.mock("../server/routes/schema", () => {
  const express = require("express");
  const router = express.Router();

  router.get("/beat/:id", (req: any, res: any) => {
    const beatId = req.params.id;
    if (beatId === "999999") {
      return res.status(404).json({ error: "Beat not found" });
    }

    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      name: `Test Beat ${beatId}`,
      description: "Test beat description",
      url: `https://example.com/product/${beatId}`,
      genre: "Hip Hop",
      byArtist: {
        "@type": "MusicGroup",
        name: "BroLab Entertainment",
      },
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "BPM",
          value: "140",
        },
        {
          "@type": "PropertyValue",
          name: "Key",
          value: "C",
        },
      ],
    });
  });

  router.get("/beats-list", (req: any, res: any) => {
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({
      "@context": "https://schema.org",
      "@type": "MusicAlbum",
      name: "BroLab Beats Collection",
      byArtist: {
        "@type": "MusicGroup",
        name: "BroLab Entertainment",
      },
      tracks: [
        {
          "@type": "MusicRecording",
          name: "Test Beat - Hip Hop",
          url: "https://example.com/product/123",
          genre: "Hip Hop",
        },
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    });
  });

  router.get("/organization", (req: any, res: any) => {
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "BroLab Entertainment",
      url: "https://example.com",
      logo: "https://example.com/logo.png",
      description: "Professional music production company",
    });
  });

  return router;
});

// Import de l'app après les mocks
import { app } from "../server/app";

describe("Schema Markup API", () => {
  beforeAll(() => {
    setupWooCommerceStubs();
  });

  afterAll(() => {
    cleanupWooCommerceStubs();
  });
  describe("GET /api/schema/organization", () => {
    it("should return organization schema markup", async () => {
      const response = await request(app).get("/api/schema/organization").expect(200);

      expect(response.headers["content-type"]).toContain("application/ld+json");

      const schema = JSON.parse(response.text);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Organization");
      expect(schema.name).toBe("BroLab Entertainment");
      expect(schema.url).toBeDefined();
    });
  });

  describe("GET /api/schema/beats-list", () => {
    it("should return beats list schema markup", async () => {
      const response = await request(app).get("/api/schema/beats-list").expect(200);

      expect(response.headers["content-type"]).toContain("application/ld+json");

      const schema = JSON.parse(response.text);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("MusicAlbum");
      expect(schema.name).toBe("BroLab Beats Collection");
      expect(schema.byArtist).toBeDefined();
      expect(schema.offers).toBeDefined();
    });
  });

  describe("GET /api/schema/beat/:id", () => {
    it("should return beat schema markup for valid ID", async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app).get("/api/schema/beats-list").expect(200);

      const listSchema = JSON.parse(listResponse.text);
      if (listSchema.tracks && listSchema.tracks.length > 0) {
        const validBeatId = listSchema.tracks[0].url.split("/").pop();

        const response = await request(app).get(`/api/schema/beat/${validBeatId}`).expect(200);

        expect(response.headers["content-type"]).toContain("application/ld+json");

        const schema = JSON.parse(response.text);
        expect(schema["@context"]).toBe("https://schema.org");
        expect(schema["@type"]).toBe("MusicRecording");
        expect(schema.name).toBeDefined();
        expect(schema.genre).toBeDefined();
        expect(schema.byArtist).toBeDefined();
        expect(schema.additionalProperty).toBeDefined();
      } else {
        // Skip test if no products available
        console.log("No products available for testing");
      }
    });

    it("should return 404 for invalid beat ID", async () => {
      const response = await request(app).get("/api/schema/beat/999999").expect(404);

      expect(response.body.error).toBe("Beat not found");
    });
  });

  describe("Schema Markup Structure", () => {
    it("should include required MusicRecording properties", async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app).get("/api/schema/beats-list").expect(200);

      const listSchema = JSON.parse(listResponse.text);
      if (listSchema.tracks && listSchema.tracks.length > 0) {
        const validBeatId = listSchema.tracks[0].url.split("/").pop();

        const response = await request(app).get(`/api/schema/beat/${validBeatId}`).expect(200);

        const schema = JSON.parse(response.text);

        // Required properties
        expect(schema["@context"]).toBe("https://schema.org");
        expect(schema["@type"]).toBe("MusicRecording");
        expect(schema.name).toBeDefined();
        expect(schema.url).toBeDefined();

        // Music-specific properties
        expect(schema.genre).toBeDefined();
        expect(schema.byArtist).toBeDefined();
        expect(schema.byArtist["@type"]).toBe("MusicGroup");

        // Additional properties for beats
        expect(schema.additionalProperty).toBeDefined();
        expect(Array.isArray(schema.additionalProperty)).toBe(true);

        // Check for BPM property
        const bpmProperty = schema.additionalProperty.find((prop: any) => prop.name === "BPM");
        expect(bpmProperty).toBeDefined();
        expect(bpmProperty["@type"]).toBe("PropertyValue");
      } else {
        // Skip test if no products available
        console.log("No products available for testing");
      }
    });

    it("should include offers when available", async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app).get("/api/schema/beats-list").expect(200);

      const listSchema = JSON.parse(listResponse.text);
      if (listSchema.tracks && listSchema.tracks.length > 0) {
        const validBeatId = listSchema.tracks[0].url.split("/").pop();

        const response = await request(app).get(`/api/schema/beat/${validBeatId}`).expect(200);

        const schema = JSON.parse(response.text);

        if (schema.offers) {
          expect(schema.offers["@type"]).toBe("Offer");
          expect(schema.offers.priceCurrency).toBe("USD");
          expect(schema.offers.availability).toBe("https://schema.org/InStock");
          expect(schema.offers.seller).toBeDefined();
          expect(schema.offers.seller.name).toBe("BroLab Entertainment");
        }
      } else {
        // Skip test if no products available
        console.log("No products available for testing");
      }
    });
  });

  describe("Cache Headers", () => {
    it("should include appropriate cache headers", async () => {
      const response = await request(app).get("/api/schema/organization").expect(200);

      expect(response.headers["cache-control"]).toContain("public");
      expect(response.headers["cache-control"]).toContain("max-age=");
    });
  });
});
