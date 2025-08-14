import { Router } from "express";
import { z } from "zod";
import { isAuthenticated } from "../auth";
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
      const paymentUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/checkout?reservation=${reservationId}&amount=${amount}&currency=${currency}`;

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
    // TODO: Implémenter la vérification des webhooks Clerk
    console.log("Payment webhook received:", req.body);

    res.json({ received: true });
  } catch (error: any) {
    console.error("Error processing payment webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

export default router;
