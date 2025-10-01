import { Express } from "express";
import request from "supertest";
import { registerRoutes } from "../server/routes";
import { Server } from "http";


describe(_"BPM Filter Server-Side", _() => {
  let app: Express;
  let server: Server;

  beforeAll(_async () => {
    app = require("express")();
    server = await registerRoutes(app);
  });

  afterAll(_async () => {
    if (server) {
      server.close();
    }
  });

  describe(_"GET /api/woocommerce/products", _() => {
    it(_"should filter products by BPM range server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        bpm_min: 120,
        bpm_max: 140,
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont un BPM dans la plage
      response.body.forEach(_(product: { bpm?: string | number }) => {
        if (product.bpm) {
          const bpm = parseInt(product.bpm);
          expect(bpm).toBeGreaterThanOrEqual(120);
          expect(bpm).toBeLessThanOrEqual(140);
        }
      });
    });

    it(_"should filter products by single BPM value server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        bpm_min: 120,
        bpm_max: 120,
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont exactement BPM 120
      response.body.forEach(_(product: { bpm?: string | number }) => {
        if (product.bpm) {
          const bpm = parseInt(product.bpm);
          expect(bpm).toBe(120);
        }
      });
    });

    it(_"should filter products by key server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        key: "C Major",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont la clé spécifiée
      response.body.forEach(_(product: { key?: string }) => {
        if (product.key) {
          expect(product.key).toBe("C Major");
        }
      });
    });

    it(_"should filter products by mood server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        mood: "Energetic",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont l'humeur spécifiée
      response.body.forEach(_(product: { mood?: string }) => {
        if (product.mood) {
          expect(product.mood).toBe("Energetic");
        }
      });
    });

    it(_"should filter products by producer server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        producer: "BroLab",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont le producteur spécifié
      response.body.forEach(_(product: { producer?: string }) => {
        if (product.producer) {
          expect(product.producer).toBe("BroLab");
        }
      });
    });

    it(_"should filter free products server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        is_free: "true",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés sont gratuits
      response.body.forEach(_(product: any) => {
        expect(product.is_free).toBe(true);
      });
    });

    it(_"should combine multiple filters server-side", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        bpm_min: 120,
        bpm_max: 140,
        key: "C Major",
        mood: "Energetic",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés respectent tous les filtres
      response.body.forEach(_(product: any) => {
        if (product.bpm) {
          const bpm = parseInt(product.bpm);
          expect(bpm).toBeGreaterThanOrEqual(120);
          expect(bpm).toBeLessThanOrEqual(140);
        }
        if (product.key) {
          expect(product.key).toBe("C Major");
        }
        if (product.mood) {
          expect(product.mood).toBe("Energetic");
        }
      });
    });

    it(_"should return products without BPM when filtering by non-existent BPM", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        bpm_min: 999,
        bpm_max: 999,
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Les produits sans BPM ne sont pas filtrés (comportement attendu)
      response.body.forEach(_(product: any) => {
        if (product.bpm) {
          const bpm = parseInt(product.bpm);
          expect(bpm).toBe(999);
        }
      });
    });

    it(_"should handle invalid BPM range gracefully", _async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
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
