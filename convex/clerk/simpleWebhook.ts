/**
 * Webhook Clerk simplifié pour diagnostic
 * Sans vérification de signature pour tester la connectivité
 */

import { httpAction } from "../_generated/server";

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

export const simpleClerkWebhook = httpAction(async (ctx, request) => {
  console.log("🔔 Webhook Clerk reçu !");

  try {
    const body = await request.text();
    console.log("📦 Body reçu:", body);

    // Parse le JSON
    let evt: ClerkWebhookEvent;
    try {
      evt = JSON.parse(body) as ClerkWebhookEvent;
    } catch (parseError) {
      console.error("❌ Erreur de parsing JSON:", parseError);
      return new Response("Invalid JSON", { status: 400 });
    }

    const eventType = evt.type;
    console.log(`📋 Type d'événement: ${eventType}`);
    console.log(`👤 Données utilisateur:`, evt.data);

    // Traitement simplifié des événements
    switch (eventType) {
      case "user.created":
        console.log(`✅ Utilisateur créé: ${evt.data.id}`);
        // Appel simplifié à clerkSync
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await ctx.runMutation("users/clerkSync:syncClerkUser" as any, {
            clerkId: evt.data.id,
            email: evt.data.email_addresses?.[0]?.email_address || "unknown@example.com",
            username: evt.data.username,
            firstName: evt.data.first_name,
            lastName: evt.data.last_name,
            imageUrl: evt.data.image_url,
          });
          console.log("✅ Synchronisation utilisateur réussie");
        } catch (syncError) {
          console.error("❌ Erreur de synchronisation:", syncError);
        }
        break;

      case "user.updated":
        console.log(`🔄 Utilisateur mis à jour: ${evt.data.id}`);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await ctx.runMutation("users/clerkSync:syncClerkUser" as any, {
            clerkId: evt.data.id,
            email: evt.data.email_addresses?.[0]?.email_address || "unknown@example.com",
            username: evt.data.username,
            firstName: evt.data.first_name,
            lastName: evt.data.last_name,
            imageUrl: evt.data.image_url,
          });
          console.log("✅ Mise à jour utilisateur réussie");
        } catch (syncError) {
          console.error("❌ Erreur de mise à jour:", syncError);
        }
        break;

      case "session.created": {
        console.log(`🔐 Session créée pour: ${evt.data.user_id || evt.data.id}`);
        const userId = evt.data.user_id || evt.data.id;
        if (userId) {
          try {
            // Pour les sessions, on synchronise avec des données minimales
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await ctx.runMutation("users/clerkSync:syncClerkUser" as any, {
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
        // Pas d'action spécifique pour le moment
        break;

      default:
        console.log(`❓ Événement non géré: ${eventType}`);
    }

    console.log("✅ Webhook traité avec succès");
    return new Response("Webhook processed successfully", {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("❌ Erreur générale dans le webhook:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Webhook processing failed: ${errorMessage}`, {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
});
