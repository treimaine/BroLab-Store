import { Express } from "express";
import request from "supertest";
import { registerRoutes } from "../server/routes";

describe(_"All Filters Server-Side", _() => {
  let app: Express;
  let server: any;

  beforeAll(_async () => {
    app = (await import("express")).default();
    server = await registerRoutes(app);
  });

  afterAll(_async () => {
    if (server) {
      server.close();
    }
  });

  describe(_"GET /api/woocommerce/products", _() => {
    it(_"should filter by multiple keys server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        keys: "C Major,D Major",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach(_(product: any) => {
        if (product.key) {
          expect(["C Major", "D Major"]).toContain(product.key);
        }
      });
    });

    it(_"should filter by multiple moods server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        moods: "Energetic,Chill",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach(_(product: any) => {
        if (product.mood) {
          expect(["Energetic", "Chill"]).toContain(product.mood);
        }
      });
    });

    it(_"should filter by multiple producers server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        producers: "BroLab,Producer1",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach(_(product: any) => {
        if (product.producer) {
          expect(["BroLab", "Producer1"]).toContain(product.producer);
        }
      });
    });

    it(_"should filter by instruments server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        instruments: "Piano,Guitar",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que les produits contiennent au moins un des instruments
      response.body.forEach(_(product: any) => {
        if (product.instruments) {
          const hasInstrument = product.instruments.some(_(instrument: string) =>
            ["Piano", "Guitar"].includes(instrument)
          );
          expect(hasInstrument).toBe(true);
        }
      });
    });

    it(_"should filter by tags server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        tags: "hip-hop,trap",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que les produits contiennent au moins un des tags
      response.body.forEach(_(product: any) => {
        if (product.tags) {
          const hasTag = product.tags.some(_(tag: any) =>
            ["hip-hop", "trap"].includes(tag.name.toLowerCase())
          );
          expect(hasTag).toBe(true);
        }
      });
    });

    it(_"should filter by time signature server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        time_signature: "4/4,3/4",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach(_(product: any) => {
        if (product.timeSignature) {
          expect(["4/4", "3/4"]).toContain(product.timeSignature);
        }
      });
    });

    it(_"should filter by duration range server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        duration_min: 120,
        duration_max: 180,
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach(_(product: any) => {
        if (product.duration) {
          const duration = parseInt(product.duration);
          expect(duration).toBeGreaterThanOrEqual(120);
          expect(duration).toBeLessThanOrEqual(180);
        }
      });
    });

    it(_"should filter by has vocals server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        has_vocals: "true",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que les produits avec hasVocals sont correctement mappés
      response.body.forEach(_(product: any) => {
        // hasVocals peut être undefined si pas de métadonnées, mais ne doit pas être false
        if (product.hasVocals !== undefined) {
          expect(product.hasVocals).toBe(true);
        }
      });
    });

    it(_"should filter by stems server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        stems: "true",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que les produits avec stems sont correctement mappés
      response.body.forEach(_(product: any) => {
        // stems peut être undefined si pas de métadonnées, mais ne doit pas être false
        if (product.stems !== undefined) {
          expect(product.stems).toBe(true);
        }
      });
    });

    it(_"should combine multiple complex filters server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        bpm_min: 120,
        bpm_max: 140,
        keys: "C Major,D Major",
        moods: "Energetic",
        instruments: "Piano",
        tags: "hip-hop",
        duration_min: 120,
        duration_max: 180,
        has_vocals: "true",
        is_free: "true",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits respectent tous les filtres
      response.body.forEach(_(product: any) => {
        // BPM
        if (product.bpm) {
          const bpm = parseInt(product.bpm);
          expect(bpm).toBeGreaterThanOrEqual(120);
          expect(bpm).toBeLessThanOrEqual(140);
        }

        // Keys
        if (product.key) {
          expect(["C Major", "D Major"]).toContain(product.key);
        }

        // Moods
        if (product.mood) {
          expect(product.mood).toBe("Energetic");
        }

        // Instruments
        if (product.instruments) {
          const hasPiano = product.instruments.includes("Piano");
          expect(hasPiano).toBe(true);
        }

        // Tags
        if (product.tags) {
          const hasHipHop = product.tags.some(_(tag: any) =>
            tag.name.toLowerCase().includes("hip-hop")
          );
          expect(hasHipHop).toBe(true);
        }

        // Duration
        if (product.duration) {
          const duration = parseInt(product.duration);
          expect(duration).toBeGreaterThanOrEqual(120);
          expect(duration).toBeLessThanOrEqual(180);
        }

        // Has Vocals
        if (product.hasVocals !== undefined) {
          expect(product.hasVocals).toBe(true);
        }

        // Is Free
        if (product.is_free !== undefined) {
          expect(product.is_free).toBe(true);
        }
      });
    });

    it(_"should handle empty filters gracefully", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        keys: "",
        moods: "",
        instruments: "",
        tags: "",
        time_signature: "",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Devrait retourner tous les produits car les filtres vides sont ignorés
    });

    it(_"should handle invalid filter values gracefully", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        duration_min: "invalid",
        duration_max: "invalid",
        bpm_min: "invalid",
        bpm_max: "invalid",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Devrait retourner tous les produits car les filtres invalides sont ignorés
    });
  });
});
