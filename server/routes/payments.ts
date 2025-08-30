import { ConvexHttpClient } from "convex/browser";
import { Router } from "express";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import { isAuthenticated } from "../auth";
import { urls } from "../config/urls";
import { createValidationMiddleware as validateRequest } from "../lib/validation";

const router = Router();

// Schéma de validation pour la création de session de paiement
const createPaymentSessionSchema = z.object({
  reservationId: z.string(),
  amount: z.number().min(1),
  currency: z.string().default("eur"),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
});

// Créer une session de paiement Clerk
router.post(
  "/create-payment-session",
  isAuthenticated,
  validateRequest(createPaymentSessionSchema),
  async (req, res) => {
    try {
      const { reservationId, amount, currency, description, metadata } = req.body;

      // Vérifier que req.user existe
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Pour l'instant, créer une session de paiement simple
      // TODO: Implémenter l'intégration complète avec Clerk Billing

      // Créer une URL de paiement temporaire (à remplacer par Clerk Billing)
      const paymentUrl = urls.genericCheckout(reservationId, amount, currency);

      res.json({
        success: true,
        checkoutUrl: paymentUrl,
        sessionId: `session_${Date.now()}`,
        amount,
        currency,
        description,
        metadata,
      });
    } catch (error: any) {
      console.error("Error creating payment session:", error);
      res.status(500).json({ error: error.message || "Failed to create payment session" });
    }
  }
);

// Webhook pour les notifications de paiement Clerk
router.post("/webhook", async (req, res) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    let payload: any = null;

    // Try to verify signature with Svix if configured
    if (WEBHOOK_SECRET) {
      try {
        const mod: any = await import("svix");
        const Webhook = mod?.Webhook;
        if (!Webhook) throw new Error("Svix Webhook class not found");
        const svix = new Webhook(WEBHOOK_SECRET);
        payload = svix.verify(JSON.stringify(req.body), req.headers as any);
      } catch (err: any) {
        if (isProd) {
          console.error("Webhook signature verification failed:", err?.message || err);
          return res.status(400).json({ error: "invalid_signature" });
        }
        console.warn("⚠️ Svix not available or verification failed; using raw body in dev.");
        payload = req.body;
      }
    } else {
      if (isProd) {
        console.error("CLERK_WEBHOOK_SECRET not set in production");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }
      console.warn("⚠️ Missing CLERK_WEBHOOK_SECRET; using raw body in dev.");
      payload = req.body;
    }

    console.log("Payment webhook received:", payload?.type || "unknown", payload);

    // Initialize Convex client (server-side) using public URL (dev-safe)
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      console.warn("VITE_CONVEX_URL not set; skipping Convex sync for webhook");
      return res.json({ received: true, synced: false });
    }

    const convex = new ConvexHttpClient(convexUrl);

    // Normalize common fields potentially present from providers
    const email: string | undefined =
      payload?.data?.customer_email ||
      payload?.data?.customerEmail ||
      payload?.data?.email ||
      payload?.email;
    const sessionId: string | undefined =
      payload?.data?.id || payload?.data?.session_id || payload?.session_id;
    const paymentId: string | undefined =
      payload?.data?.payment_intent || payload?.data?.payment_id || payload?.payment_id;
    const statusRaw: string | undefined = payload?.data?.status || payload?.status;

    const normalized = {
      email,
      sessionId,
      paymentId,
      status: statusRaw && typeof statusRaw === "string" ? statusRaw.toLowerCase() : undefined,
    } as const;

    // Map external status to internal
    const statusMap: Record<string, { status: string; paymentStatus: string }> = {
      completed: { status: "completed", paymentStatus: "succeeded" },
      paid: { status: "completed", paymentStatus: "succeeded" },
      succeeded: { status: "completed", paymentStatus: "succeeded" },
      processing: { status: "processing", paymentStatus: "processing" },
      requires_payment_method: { status: "pending", paymentStatus: "requires_payment_method" },
      failed: { status: "cancelled", paymentStatus: "failed" },
      canceled: { status: "cancelled", paymentStatus: "canceled" },
    };

    const mapped = statusMap[normalized.status || ""] || {
      status: "completed",
      paymentStatus: "succeeded",
    };

    try {
      const result = await convex.mutation(api.orders.markOrderFromWebhook, {
        email: normalized.email,
        sessionId: normalized.sessionId,
        paymentId: normalized.paymentId,
        status: mapped.status,
        paymentStatus: mapped.paymentStatus,
      } as any);

      // Save invoice URL if present and we have an orderId from the mutation result
      const invoiceUrl: string | undefined =
        (payload?.data?.invoice_url as string | undefined) ||
        (payload?.data?.invoiceUrl as string | undefined) ||
        (payload?.invoice_url as string | undefined);
      if (invoiceUrl && result?.orderId) {
        await convex.mutation(api.orders.saveInvoiceUrl, {
          orderId: result.orderId,
          invoiceUrl,
        } as any);
      }

      console.log("Convex markOrderFromWebhook result:", result);
      return res.json({ received: true, synced: true, result });
    } catch (err: any) {
      console.error("Failed to sync webhook to Convex:", err?.message || err);
      return res
        .status(500)
        .json({ received: true, synced: false, error: err?.message || "sync_failed" });
    }
  } catch (error: any) {
    console.error("Error processing payment webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

export default router;
