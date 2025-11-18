import express, { type Express } from "express";
import { Server } from "http";
import request from "supertest";
import { registerRoutes } from "../server/routes";
import { MockProduct } from "./types/mocks";

describe("BPM Filter Server-Side", () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    app = express();
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe("GET /api/woocommerce/products", () => {
    it("should filter products by BPM range server-side", async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        bpm_min: 120,
        bpm_max: 140,
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont un BPM dans la plage
      response.body.forEach((product: { bpm?: string | number }) => {
        if (product.bpm) {
          const bpm = parseInt(product.bpm);
          expect(bpm).toBeGreaterThanOrEqual(120);
          expect(bpm).toBeLessThanOrEqual(140);
        }
      });
    });

    it("should filter products by single BPM value server-side", async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        bpm_min: 120,
        bpm_max: 120,
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont exactement BPM 120
      response.body.forEach((product: { bpm?: string | number }) => {
        if (product.bpm) {
          const bpm = parseInt(product.bpm);
          expect(bpm).toBe(120);
        }
      });
    });

    it("should filter products by key server-side", async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        key: "C Major",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont la clé spécifiée
      response.body.forEach((product: { key?: string }) => {
        if (product.key) {
          expect(product.key).toBe("C Major");
        }
      });
    });

    it("should filter products by mood server-side", async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        mood: "Energetic",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont l'humeur spécifiée
      response.body.forEach((product: { mood?: string }) => {
        if (product.mood) {
          expect(product.mood).toBe("Energetic");
        }
      });
    });

    it("should filter products by producer server-side", async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        producer: "BroLab",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés ont le producteur spécifié
      response.body.forEach((product: { producer?: string }) => {
        if (product.producer) {
          expect(product.producer).toBe("BroLab");
        }
      });
    });

    it("should filter free products server-side", async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        is_free: "true",
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Vérifier que tous les produits retournés sont gratuits
      response.body.forEach((product: MockProduct) => {
        expect(product.is_free).toBe(true);
      });
    });

    it("should combine multiple filters server-side", async () => {
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
      response.body.forEach((product: MockProduct) => {
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

    it("should return products without BPM when filtering by non-existent BPM", async () => {
      const response = await request(app).get("/api/woocommerce/products").query({
        bpm_min: 999,
        bpm_max: 999,
        per_page: 50,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Les produits sans BPM ne sont pas filtrés (comportement attendu)
      response.body.forEach((product: MockProduct) => {
        if (product.bpm) {
          const bpm = parseInt(product.bpm);
          expect(bpm).toBe(999);
        }
      });
    });

    it("should handle invalid BPM range gracefully", async () => {
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
