import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Convex HTTP Router Configuration
 *
 * This file defines HTTP endpoints for Convex.
 *
 * WEBHOOK ROUTING ARCHITECTURE:
 * - Clerk webhooks: Handled here in Convex for user session management
 * - Stripe webhooks: Sent directly to Express at /api/webhooks/stripe (NOT forwarded through Convex)
 * - PayPal webhooks: Sent directly to Express at /api/webhooks/paypal (NOT forwarded through Convex)
 *
 * Payment webhook processing is handled by server/services/PaymentService.ts
 * This eliminates unnecessary network hops and improves webhook processing performance.
 *
 * Configure webhook URLs in provider dashboards:
 * - Stripe: https://yourdomain.com/api/webhooks/stripe
 * - PayPal: https://yourdomain.com/api/webhooks/paypal
 * - Clerk: https://yourdomain.convex.site/api/webhooks/clerk
 */

// Clerk webhook handler for user session management
const clerkWebhook = httpAction(async (ctx, request) => {
  console.log("🔔 Webhook Clerk reçu !");

  try {
    const body = await request.text();
    const evt = JSON.parse(body);

    console.log(`📋 Événement: ${evt.type}`);

    if (evt.type === "session.created" && evt.data?.user_id) {
      console.log(`🔐 Session créée pour: ${evt.data.user_id}`);

      // Juste logger pour l'instant
      console.log("✅ Session créée - webhook fonctionne !");
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Erreur webhook:", error);
    return new Response("Error", { status: 500 });
  }
});

http.route({
  path: "/api/webhooks/clerk",
  method: "POST",
  handler: clerkWebhook,
});

export default http;
