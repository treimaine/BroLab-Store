import { Webhook } from "svix";
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

/**
 * Clerk webhook handler for Convex
 * Handles user lifecycle events from Clerk and syncs with Convex database
 */
export const clerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing svix headers");
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();
  const webhook = new Webhook(webhookSecret);

  let evt: ClerkWebhookEvent;
  try {
    evt = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  const eventType = evt.type;
  console.log(`Clerk webhook received: ${eventType}`);

  try {
    switch (eventType) {
      case "user.created":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.runMutation("users/clerkSync:syncClerkUser" as any, {
          clerkId: evt.data.id,
          email: evt.data.email_addresses?.[0]?.email_address || "",
          username: evt.data.username,
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          imageUrl: evt.data.image_url,
        });
        break;

      case "user.updated":
        console.log(`Updating user ${evt.data.id}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.runMutation("users/clerkSync:syncClerkUser" as any, {
          clerkId: evt.data.id,
          email: evt.data.email_addresses?.[0]?.email_address || "",
          username: evt.data.username,
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          imageUrl: evt.data.image_url,
        });
        break;

      case "user.deleted":
        console.log(`User deletion requested for ${evt.data.id}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.runMutation("users/clerkSync:deleteClerkUser" as any, {
          clerkId: evt.data.id,
        });
        break;

      case "session.created":
        // Pour les sessions, on a besoin de récupérer les données utilisateur depuis Clerk
        if (evt.data.user_id) {
          console.log(`Session created for user ${evt.data.user_id}`);
          // On va déclencher une synchronisation avec les données minimales
          // La fonction clerkSync va récupérer les données complètes si nécessaire
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await ctx.runMutation("users/clerkSync:syncClerkUser" as any, {
            clerkId: evt.data.user_id,
            email: "temp@example.com", // Temporaire, sera mis à jour par la sync
          });
        }
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error(`Error processing webhook ${eventType}:`, error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});
