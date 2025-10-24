import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Webhook Clerk ultra-simple qui fonctionne
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
