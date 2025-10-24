/**
 * Routes pour les webhooks (Clerk, Stripe, etc.)
 */

import { ConvexHttpClient } from "convex/browser";
import { Router } from "express";

const router = Router();

// Configuration Convex
const convexUrl = process.env.VITE_CONVEX_URL || "https://amicable-lemming-546.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    user_id?: string;
    email_addresses?: Array<{ email_address: string }>;
    username?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
}

type ConvexMutation = (name: string, args: Record<string, unknown>) => Promise<unknown>;

/**
 * Webhook Clerk - Version Express de secours
 */
router.post("/clerk", async (req, res) => {
  console.log("🔔 Webhook Clerk reçu via Express !");

  try {
    const evt = req.body as ClerkWebhookEvent;
    const eventType = evt.type;

    console.log(`📋 Type d'événement: ${eventType}`);
    console.log(`👤 Données:`, evt.data);

    // Traitement des événements
    switch (eventType) {
      case "user.created":
      case "user.updated":
        console.log(`✅ Traitement utilisateur: ${evt.data.id}`);
        try {
          await (convex.mutation as ConvexMutation)("users/clerkSync:syncClerkUser", {
            clerkId: evt.data.id,
            email: evt.data.email_addresses?.[0]?.email_address || "unknown@example.com",
            username: evt.data.username,
            firstName: evt.data.first_name,
            lastName: evt.data.last_name,
            imageUrl: evt.data.image_url,
          });
          console.log("✅ Synchronisation réussie");
        } catch (syncError) {
          console.error("❌ Erreur de synchronisation:", syncError);
        }
        break;

      case "session.created": {
        console.log(`🔐 Session créée pour: ${evt.data.user_id || evt.data.id}`);
        const userId = evt.data.user_id || evt.data.id;
        if (userId) {
          try {
            await (convex.mutation as ConvexMutation)("users/clerkSync:syncClerkUser", {
              clerkId: userId,
              email: "session@example.com", // Temporaire
            });
            console.log("✅ Synchronisation de session réussie");
          } catch (syncError) {
            console.error("❌ Erreur de synchronisation de session:", syncError);
          }
        }
        break;
      }

      case "session.ended":
        console.log(`🔚 Session terminée pour: ${evt.data.user_id || evt.data.id}`);
        break;

      default:
        console.log(`❓ Événement non géré: ${eventType}`);
    }

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      eventType,
    });
  } catch (error) {
    console.error("❌ Erreur dans le webhook Clerk:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Test endpoint pour vérifier que les webhooks fonctionnent
 */
router.get("/test", (req, res) => {
  res.json({
    message: "Webhooks endpoint is working!",
    timestamp: new Date().toISOString(),
    convexUrl,
  });
});

export default router;
