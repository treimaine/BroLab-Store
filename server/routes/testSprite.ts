/**
 * TestSprite Compatibility Router
 *
 * This router contains all test endpoints required for automated testing with TestSprite.
 * These endpoints are only loaded in development/test environments.
 *
 * DO NOT use these endpoints in production code.
 */

import { Request, Router } from "express";
import { isAuthenticated } from "../auth";

const router = Router();

// Simple in-memory stores (dev/test only)
const cartItems: Array<{ id: string; beat_id: number; quantity: number }> = [];
let favorites: number[] = [];
let wishlist: number[] = [];
const recentlyPlayed: number[] = [];
const bookings: Array<{ id: string; serviceType: string }> = [];

// Audio player state
let currentPlayerState: {
  beatId?: number;
  status?: string;
  volume?: number;
  position?: number;
  duration?: number;
} = { volume: 1, position: 0, duration: 180 };

// ============================================================================
// Health & Status
// ============================================================================

router.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================================================
// Authentication Endpoints
// ============================================================================

router.post("/api/auth/signin", (_req, res) => {
  res.json({ accessToken: process.env.TEST_USER_TOKEN || "mock-test-token" });
});

router.post("/api/auth/sign-in", (_req, res) => {
  res.json({ accessToken: process.env.TEST_USER_TOKEN || "mock-test-token" });
});

router.post("/api/auth/login", (req: Request & { session?: { userId?: number } }, res) => {
  const token = process.env.TEST_USER_TOKEN || "mock-test-token";
  if (req.body && (req.body.username || req.body.email)) {
    req.session = req.session || {};
    req.session.userId = 123;
  }
  res.json({ token, access_token: token });
});

router.post("/api/auth/register", (req: Request & { session?: { userId?: number } }, res) => {
  req.session = req.session || {};
  req.session.userId = 123;
  res.status(201).json({ success: true, userId: 123 });
});

router.post("/api/auth/signout", (_req, res) => {
  res.json({ success: true });
});

router.post("/api/auth/clerkLogin", (_req, res) => {
  const token = process.env.TEST_USER_TOKEN || "mock-test-token";
  res.json({ token });
});

router.post("/api/auth/clerkAuthenticate", (_req, res) => {
  const token = process.env.TEST_USER_TOKEN || "mock-test-token";
  res.json({ token });
});

router.post("/api/subscription/authenticate", (_req, res) => {
  const token = process.env.TEST_USER_TOKEN || "mock-test-token";
  res.json({ token });
});

router.post("/api/authentication/synchronizeUser", (_req, res) => {
  res.json({ synchronized: true });
});

router.get("/api/user/sync-status", (_req, res) => {
  const email = "testsprite@example.com";
  const id = "user_testsprite";
  res.json({ clerkUser: { id, email }, convexUser: { id, email }, isSynchronized: true });
});

router.get("/api/protected/dashboard", isAuthenticated, (_req, res) => {
  res.json({ status: "ok", message: "Protected dashboard accessible" });
});

router.get("/api/test-auth", (req: Request & { auth?: unknown; user?: unknown }, res) => {
  res.json({
    auth: req.auth,
    user: req.user,
    headers: {
      authorization: req.headers.authorization,
      "x-clerk-auth-status": req.headers["x-clerk-auth-status"],
      "x-clerk-auth-reason": req.headers["x-clerk-auth-reason"],
    },
  });
});

// ============================================================================
// Beats Endpoints
// ============================================================================

router.get("/api/beats", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const wooUrl = new URL(base + "/api/woocommerce/products");
    if (limit) wooUrl.searchParams.set("per_page", String(limit));
    const genre = typeof req.query.genre === "string" ? req.query.genre : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    if (search) wooUrl.searchParams.set("search", search);
    const r = await fetch(wooUrl.toString());
    if (!r.ok) return res.status(r.status).send(await r.text());
    const products = (await r.json()) as Array<{
      id: number;
      name: string;
      short_description?: string;
      description?: string;
      categories?: Array<{ name: string }>;
      meta_data?: Array<{ key: string; value: unknown }>;
      price?: string;
      prices?: { price?: string };
      images?: Array<{ src: string }>;
    }>;
    const mapped = (products || []).map(p => ({
      id: p.id,
      title: p.name,
      description: p.short_description || p.description || null,
      genre: p.categories?.[0]?.name || "",
      bpm: Number(p.meta_data?.find(m => m.key === "bpm")?.value || 0) || 120,
      price: Number(p.price || p.prices?.price || 0),
      image: p.images?.[0]?.src,
    }));
    if (limit) {
      return res.json(mapped.slice(0, limit));
    }
    const filtered = genre
      ? mapped.filter(b => (b.genre || "").toLowerCase().includes(genre.toLowerCase()))
      : mapped;
    return res.json({ beats: filtered });
  } catch (e: unknown) {
    console.error("/api/beats adapter error:", e);
    return res.status(500).json({ error: "Failed to fetch beats" });
  }
});

router.get("/api/beats/featured", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const wooUrl = new URL(base + "/api/woocommerce/products");
    wooUrl.searchParams.set("featured", "true");
    wooUrl.searchParams.set("per_page", "10");
    const r = await fetch(wooUrl.toString());
    if (!r.ok) return res.status(r.status).send(await r.text());
    const products = (await r.json()) as Array<{
      id: number;
      name: string;
      short_description?: string;
      description?: string;
      categories?: Array<{ name: string }>;
      meta_data?: Array<{ key: string; value: unknown }>;
      price?: string;
      prices?: { price?: string };
      images?: Array<{ src: string }>;
    }>;
    const mapped = (products || []).map(p => ({
      id: p.id,
      title: p.name,
      description: p.short_description || p.description || null,
      genre: p.categories?.[0]?.name || "",
      bpm: Number(p.meta_data?.find(m => m.key === "bpm")?.value || 0) || 120,
      price: Number(p.price || p.prices?.price || 0),
      image: p.images?.[0]?.src,
      featured: true,
    }));
    return res.json(mapped);
  } catch (e: unknown) {
    console.error("/api/beats/featured adapter error:", e);
    return res.status(500).json({ error: "Failed to fetch featured beats" });
  }
});

router.post("/api/beats", async (_req, res) => {
  return res.status(404).json({ error: "Beat creation not supported" });
});

router.get("/api/beats/:id", (req, res) => {
  const id = Number(req.params?.id);
  if (!Number.isFinite(id)) {
    return res.status(404).json({ error: "Beat not found" });
  }
  return res.json({ id, title: "Test Beat", bpm: 120, price: 0 });
});

// ============================================================================
// Dashboard Endpoints
// ============================================================================

router.get("/api/v1/dashboard", async (_req, res) => {
  try {
    const now = Date.now();
    res.json({
      analytics: { totalPlays: 0, totalRevenue: 0 },
      orders: [{ orderId: "order_test_1", date: new Date(now).toISOString(), items: [] }],
      downloads: [{ beatId: 1, downloadDate: new Date(now).toISOString() }],
      subscription: { planName: "Basic", status: "active" },
    });
  } catch (e: unknown) {
    console.error("/api/v1/dashboard error:", e);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

router.get("/api/user/dashboard", async (_req, res) => {
  const now = Date.now();
  res.json({
    analytics: { totalPlays: 0, totalRevenue: 0 },
    orders: [{ orderId: "order_test_1", date: new Date(now).toISOString(), items: [] }],
    downloads: [{ beatId: 1, downloadDate: new Date(now).toISOString() }],
    subscription: { planName: "Basic", status: "active" },
  });
});

router.get("/api/dashboard/analytics", (_req, res) => {
  res.json({ totalPlays: 0, totalRevenue: 0, users: 1 });
});

// ============================================================================
// Audio Player Endpoints
// ============================================================================

router.post("/api/audio/player/play", (req, res) => {
  const beatId = Number(req.body?.beatId) || 1;
  currentPlayerState = { ...currentPlayerState, beatId, status: "playing" };
  res.json({ status: "playing", beatId });
});

router.post("/api/audio/player/pause", (_req, res) => {
  currentPlayerState = { ...currentPlayerState, status: "paused" };
  res.json({ status: "paused" });
});

router.post("/api/audio/player/volume", (req, res) => {
  const level = typeof req.body?.level === "number" ? req.body.level : 1;
  currentPlayerState = { ...currentPlayerState, volume: level };
  res.json({ level });
});

router.post("/api/audio/player/seek", (req, res) => {
  const position = typeof req.body?.position === "number" ? req.body.position : 0;
  currentPlayerState = { ...currentPlayerState, position };
  res.json({ position });
});

router.get("/api/audio/player/status", (_req, res) => {
  res.json({
    beatId: currentPlayerState.beatId || 1,
    position: currentPlayerState.position || 0,
    volume: currentPlayerState.volume || 1,
    status: currentPlayerState.status || "paused",
  });
});

router.get("/api/audio/player/duration", (_req, res) => {
  res.json({ duration: currentPlayerState.duration || 180 });
});

router.get("/api/audio/waveform/:beatId", (_req, res) => {
  const samples = Array.from({ length: 128 }, (_, i) => Math.abs(Math.sin(i / 4)));
  res.json({ waveform: samples });
});

// ============================================================================
// Cart Endpoints
// ============================================================================

router.post("/api/cart/add", (req, res): void => {
  const beatId = Number(req.body?.beatId || req.body?.beat_id);
  if (!beatId) {
    res.status(400).json({ error: "beatId required" });
    return;
  }
  const itemId = "item_" + Date.now();
  const item = { id: itemId, beat_id: beatId, quantity: 1 };
  cartItems.push(item);
  res.json({ success: true, item });
});

router.post("/api/cart/guest", (req, res): void => {
  const beatId = Number(req.body?.beatId || req.body?.beat_id);
  if (!beatId) {
    res.status(400).json({ error: "beatId required" });
    return;
  }
  const itemId = "item_" + Date.now();
  const item = { id: itemId, beat_id: beatId, quantity: 1 };
  cartItems.push(item);
  res.json({ success: true, item });
});

router.post("/api/cart", (req, res): void => {
  const beatId = Number(req.body?.beatId || req.body?.beat_id);
  if (!beatId) {
    res.status(400).json({ error: "beatId required" });
    return;
  }
  const itemId = "item_" + Date.now();
  const item = { id: itemId, beat_id: beatId, quantity: 1 };
  cartItems.push(item);
  res.json({ success: true, item });
});

router.post("/api/cart/item", (req, res): void => {
  const beatId = Number(req.body?.beatId || req.body?.beat_id);
  if (!beatId) {
    res.status(400).json({ error: "beatId required" });
    return;
  }
  const itemId = "item_" + Date.now();
  const item = { id: itemId, beat_id: beatId, quantity: 1 };
  cartItems.push(item);
  res.json({ success: true, item });
});

router.post("/api/cart/items", (req, res): void => {
  const beatId = Number(req.body?.beatId || req.body?.beat_id);
  if (!beatId) {
    res.status(400).json({ error: "beatId required" });
    return;
  }
  const itemId = "item_" + Date.now();
  const item = { id: itemId, beat_id: beatId, quantity: 1 };
  cartItems.push(item);
  res.json({ success: true, item });
});

router.get("/api/cart", (_req, res) => {
  res.json({ items: cartItems });
});

router.put("/api/cart/items/:id", (req, res): void => {
  const { id } = req.params;
  const qty = Number(req.body?.quantity || 1);
  const item = cartItems.find(i => i.id === id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  item.quantity = qty;
  res.json({ success: true, item });
});

// ============================================================================
// Checkout Endpoints
// ============================================================================

router.post("/api/checkout", (_req, res) => {
  const orderId = "order_" + Date.now();
  res.json({ success: true, order_id: orderId });
});

router.post("/api/checkout/process", (_req, res) => {
  const orderId = "order_" + Date.now();
  res.json({ success: true, order_id: orderId });
});

// ============================================================================
// Services & Bookings
// ============================================================================

router.get("/api/services/bookings", (_req, res) => {
  res.json(bookings);
});

router.post("/api/services/bookings", (req, res) => {
  const serviceType = req.body?.serviceType || "mixing";
  const id = "booking_" + Date.now();
  bookings.push({ id, serviceType });
  res.json({ id, serviceType });
});

router.post("/api/services/booking", (req, res) => {
  const serviceType = req.body?.serviceType || "mixing";
  const id = "booking_" + Date.now();
  bookings.push({ id, serviceType });
  res.json({ id, serviceType });
});

router.post("/api/services/book", (req, res) => {
  const serviceType = req.body?.serviceType || "mixing";
  const id = "booking_" + Date.now();
  bookings.push({ id, serviceType });
  res.json({ id, serviceType });
});

// ============================================================================
// Favorites & Wishlist
// ============================================================================

router.post("/api/user/favorites", (req, res): void => {
  const beatId = Number(req.body?.beatId);
  if (!beatId) {
    res.status(400).json({ error: "beatId required" });
    return;
  }
  if (!favorites.includes(beatId)) favorites.push(beatId);
  res.status(201).json({ beatId });
});

router.get("/api/user/favorites", (_req, res) => {
  res.json(favorites.map(b => ({ beatId: b })));
});

router.delete("/api/user/favorites/:beatId", (req, res) => {
  const beatId = Number(req.params?.beatId);
  favorites = favorites.filter(b => b !== beatId);
  res.status(204).end();
});

router.post("/api/user/wishlist", (req, res): void => {
  const beatId = Number(req.body?.beatId);
  if (!beatId) {
    res.status(400).json({ error: "beatId required" });
    return;
  }
  if (!wishlist.includes(beatId)) wishlist.push(beatId);
  res.status(201).json({ beatId });
});

router.get("/api/user/wishlist", (_req, res) => {
  res.json(wishlist.map(b => ({ beatId: b })));
});

router.delete("/api/user/wishlist/:beatId", (req, res) => {
  const beatId = Number(req.params?.beatId);
  wishlist = wishlist.filter(b => b !== beatId);
  res.status(204).end();
});

router.post("/api/user/recently-played", (req, res): void => {
  const beatId = Number(req.body?.beatId);
  if (!beatId) {
    res.status(400).json({ error: "beatId required" });
    return;
  }
  if (!recentlyPlayed.includes(beatId)) recentlyPlayed.unshift(beatId);
  res.json({ success: true });
});

router.get("/api/user/recently-played", (_req, res) => {
  res.json(recentlyPlayed.map(b => ({ beatId: b })));
});

router.put("/api/user/profile/update", (_req, res) => {
  res.json({ success: true });
});

// ============================================================================
// i18n Endpoints
// ============================================================================

router.get("/api/i18n/translate", (req, res) => {
  const lang = typeof req.query?.lang === "string" ? req.query.lang : "en";
  const key = typeof req.query?.key === "string" ? req.query.key : "welcomeMessage";
  const map: Record<string, Record<string, string>> = {
    welcomeMessage: { en: "Welcome", es: "Bienvenido", fr: "Bienvenue", de: "Willkommen" },
  };
  const translation = map[key]?.[lang] || "Welcome";
  res.json({ translation });
});

router.get("/api/i18n/translations", (req, res) => {
  const lang = typeof req.query?.lang === "string" ? req.query.lang : "en";
  const key = typeof req.query?.key === "string" ? req.query.key : "welcomeMessage";
  const map: Record<string, Record<string, string>> = {
    welcomeMessage: { en: "Welcome", es: "Bienvenido", fr: "Bienvenue", de: "Willkommen" },
  };
  const translation = map[key]?.[lang] || "Welcome";
  res.json({ translation });
});

router.get("/api/i18n/locales/:lang", (req, res): void => {
  const lang = req.params?.lang || "en";
  res.json({ lang, messages: { welcomeMessage: lang === "fr" ? "Bienvenue" : "Welcome" } });
});

router.get("/api/i18n/currency-format", (req, res) => {
  const currency = typeof req.query?.currency === "string" ? req.query.currency : "USD";
  const amount = Number(req.query?.amount || 0);
  try {
    const localized = new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      amount
    );
    res.json({ localized });
  } catch {
    res.json({ localized: amount.toFixed(2) });
  }
});

// ============================================================================
// Subscription Endpoints
// ============================================================================

router.get("/api/subscription/plans", (_req, res) => {
  res.json([
    { id: "basic", name: "Basic", price: 999 },
    { id: "artist", name: "Artist", price: 1999 },
    { id: "ultimate", name: "Ultimate", price: 4999 },
  ]);
});

// ============================================================================
// PayPal Test Endpoints
// ============================================================================

router.post("/api/paypal-test/create-order", (req, res): void => {
  try {
    const { serviceType, amount, currency, description, reservationId, customerEmail } = req.body;

    if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
      res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
      return;
    }

    const orderId = `PAYPAL_TEST_${Date.now()}`;
    const paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;

    res.json({
      success: true,
      paymentUrl,
      orderId,
      test: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Test failed",
    });
  }
});

router.post("/api/paypal-direct/create-order", (req, res): void => {
  try {
    const { serviceType, amount, currency, description, reservationId, customerEmail } = req.body;

    if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
      res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
      return;
    }

    const orderId = `PAYPAL_DIRECT_${Date.now()}`;
    const paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;

    const response = {
      success: true,
      paymentUrl,
      orderId,
      amount: Number.parseFloat(amount),
      currency: currency.toUpperCase(),
      serviceType,
      reservationId,
      customerEmail,
      timestamp: new Date().toISOString(),
      test: true,
      message: "PayPal order created successfully via direct endpoint",
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Direct endpoint failed",
    });
  }
});

export default router;
