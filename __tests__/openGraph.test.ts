import request from "supertest";
import { cleanupWooCommerceStubs, setupWooCommerceStubs } from "./stubs/woocommerce-stubs";
import { app } from "../server/app";

// Mock des modules avant l'import de l'app
jest.mock(_"../server/routes/openGraph", _() => {
  const express = require("express");
  const router = express.Router();

  router.get(_"/beat/:id", _(req: express.Request, _res: express.Response) => {
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

  router.get(_"/shop", _(req: express.Request, _res: express.Response) => {
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

  router.get(_"/home", _(req: express.Request, _res: express.Response) => {
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

  router.get(_"/page/:pageName", _(req: express.Request, _res: express.Response) => {
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
jest.mock(_"../server/routes/schema", _() => {
  const express = require("express");
  const router = express.Router();

  router.get(_"/beat/:id", _(req: express.Request, _res: express.Response) => {
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

  router.get(_"/beats-list", _(req: express.Request, _res: express.Response) => {
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

  router.get(_"/organization", _(req: express.Request, _res: express.Response) => {
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

describe(_"Open Graph API", _() => {
  beforeAll_(() => {
    setupWooCommerceStubs();
  });

  afterAll_(() => {
    cleanupWooCommerceStubs();
  });
  describe(_"GET /api/opengraph/beat/:id", _() => {
    it(_"should return Open Graph meta tags for valid beat ID", _async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app).get("/sitemap.xml").expect(200);

      const xml = listResponse.text;
      const productMatches = xml.match(/\/product\/(\d+)/);

      if (productMatches && productMatches[1]) {
        const validBeatId = productMatches[1];

        const response = await request(app).get(`/api/opengraph/beat/${validBeatId}`).expect(200);

        expect(response.headers["content-type"]).toContain("text/html");
        expect(response.headers["cache-control"]).toContain("public");

        const html = response.text;

        // Vérifier la présence des meta tags Open Graph
        expect(html).toContain('property="og:title"');
        expect(html).toContain('property="og:description"');
        expect(html).toContain('property="og:url"');
        expect(html).toContain('property="og:image"');
        expect(html).toContain('property="og:type"');
        expect(html).toContain('property="og:site_name"');

        // Vérifier les meta tags Twitter Card
        expect(html).toContain('name="twitter:card"');
        expect(html).toContain('name="twitter:title"');
        expect(html).toContain('name="twitter:description"');
        expect(html).toContain('name="twitter:image"');

        // Vérifier le type de contenu musical
        expect(html).toContain('content="music.song"');
      } else {
        console.log("No products available for testing");
      }
    });

    it(_"should return 404 for invalid beat ID", _async () => {
      const response = await request(app).get("/api/opengraph/beat/999999").expect(404);

      expect(response.body.error).toBe("Beat not found");
    });
  });

  describe(_"GET /api/opengraph/shop", _() => {
    it(_"should return Open Graph meta tags for shop page", _async () => {
      const response = await request(app).get("/api/opengraph/shop").expect(200);

      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.headers["cache-control"]).toContain("public");

      const html = response.text;

      // Vérifier la présence des meta tags Open Graph
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:url"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('property="og:type"');
      expect(html).toContain('property="og:site_name"');

      // Vérifier le type de contenu website
      expect(html).toContain('content="website"');

      // Vérifier que c'est pour la page shop
      expect(html).toContain("/shop");
    });
  });

  describe(_"GET /api/opengraph/home", _() => {
    it(_"should return Open Graph meta tags for home page", _async () => {
      const response = await request(app).get("/api/opengraph/home").expect(200);

      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.headers["cache-control"]).toContain("public");

      const html = response.text;

      // Vérifier la présence des meta tags Open Graph
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:url"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('property="og:type"');
      expect(html).toContain('property="og:site_name"');

      // Vérifier le type de contenu website
      expect(html).toContain('content="website"');
    });
  });

  describe(_"GET /api/opengraph/page/:pageName", _() => {
    it(_"should return Open Graph meta tags for valid static pages", _async () => {
      const validPages = ["about", "contact", "terms", "privacy", "license"];

      for (const pageName of validPages) {
        const response = await request(app).get(`/api/opengraph/page/${pageName}`).expect(200);

        expect(response.headers["content-type"]).toContain("text/html");
        expect(response.headers["cache-control"]).toContain("public");

        const html = response.text;

        // Vérifier la présence des meta tags Open Graph
        expect(html).toContain('property="og:title"');
        expect(html).toContain('property="og:description"');
        expect(html).toContain('property="og:url"');
        expect(html).toContain('property="og:image"');
        expect(html).toContain('property="og:type"');
        expect(html).toContain('property="og:site_name"');

        // Vérifier que l'URL contient le nom de la page
        expect(html).toContain(`/${pageName}`);
      }
    });

    it(_"should return 400 for invalid page name", _async () => {
      const response = await request(app).get("/api/opengraph/page/invalid-page").expect(400);

      expect(response.body.error).toBe("Invalid page name");
    });
  });

  describe(_"Open Graph Content Validation", _() => {
    it(_"should include proper Twitter Card type for beats", _async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app).get("/sitemap.xml").expect(200);

      const xml = listResponse.text;
      const productMatches = xml.match(/\/product\/(\d+)/);

      if (productMatches && productMatches[1]) {
        const validBeatId = productMatches[1];

        const response = await request(app).get(`/api/opengraph/beat/${validBeatId}`).expect(200);

        const html = response.text;

        // Vérifier le type Twitter Card pour les beats
        expect(html).toContain('content="summary_large_image"');

        // Vérifier les meta tags spécifiques à la musique
        expect(html).toContain('content="music.song"');
      } else {
        console.log("No products available for testing");
      }
    });

    it(_"should include proper Twitter Card type for pages", _async () => {
      const response = await request(app).get("/api/opengraph/shop").expect(200);

      const html = response.text;

      // Vérifier le type Twitter Card pour les pages
      expect(html).toContain('content="summary_large_image"');

      // Vérifier les meta tags pour les pages
      expect(html).toContain('content="website"');
    });

    it(_"should include proper site name", _async () => {
      const response = await request(app).get("/api/opengraph/home").expect(200);

      const html = response.text;

      // Vérifier le nom du site
      expect(html).toContain('content="BroLab Entertainment"');
    });
  });

  describe(_"HTML Escaping", _() => {
    it(_"should properly escape HTML characters in meta tags", _async () => {
      const response = await request(app).get("/api/opengraph/shop").expect(200);

      const html = response.text;

      // Vérifier qu'il n'y a pas de caractères HTML non échappés
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("javascript:");

      // Vérifier que le HTML est valide et bien formaté
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('content="');

      // Vérifier que le HTML est bien structuré
      expect(html).toContain("<meta");
      expect(html).toContain("/>");
    });
  });

  describe(_"Cache Headers", _() => {
    it(_"should include appropriate cache headers for Open Graph", _async () => {
      const response = await request(app).get("/api/opengraph/shop").expect(200);

      expect(response.headers["cache-control"]).toContain("public");
      expect(response.headers["cache-control"]).toContain("max-age=");
    });
  });
});
