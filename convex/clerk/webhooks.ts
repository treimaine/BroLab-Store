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
        await ctx.runMutation("users/clerkSync:deleteClerkUser" as any, {
          clerkId: evt.data.id,
        });
        break;

      case "session.created":
        if (evt.data.user_id) {
          await ctx.runMutation("users/clerkSync:syncClerkUser" as any, {
            clerkId: evt.data.user_id,
            email: "", // We don't have email in session event, will be handled by the sync function
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
