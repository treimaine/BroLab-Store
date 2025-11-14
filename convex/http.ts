import { httpRouter } from "convex/server";
import type { ActionCtx } from "./_generated/server";
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

/**
 * User data structure for Clerk webhook synchronization
 */
interface ClerkUserData {
  clerkId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

/**
 * Clerk webhook event data structure
 */
interface ClerkWebhookEvent {
  type: string;
  data: {
    id?: string;
    user_id?: string;
    email_addresses?: Array<{ email_address: string }>;
    username?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
}

/**
 * Result type for sync operations
 */
interface SyncResult {
  success: boolean;
  error?: unknown;
}

/**
 * Helper function to sync Clerk user data to Convex database
 * Uses scheduler to avoid circular dependencies with api imports
 */
async function syncClerkUserMutation(ctx: ActionCtx, userData: ClerkUserData): Promise<SyncResult> {
  try {
    // Use scheduler with string reference to avoid circular dependency
    await ctx.scheduler.runAfter(0, "users/clerkSync:syncClerkUser" as never, userData as never);
    return { success: true };
  } catch (error) {
    console.error("Error scheduling syncClerkUser:", error);
    return { success: false, error };
  }
}

/**
 * Extract user data from Clerk webhook event
 */
function extractUserData(evt: ClerkWebhookEvent): ClerkUserData | null {
  const userId = evt.data.id || evt.data.user_id;
  const email = evt.data.email_addresses?.[0]?.email_address;

  if (!userId || !email) {
    return null;
  }

  return {
    clerkId: userId,
    email,
    username: evt.data.username,
    firstName: evt.data.first_name,
    lastName: evt.data.last_name,
    imageUrl: evt.data.image_url,
  };
}

/**
 * Process user sync for different event types
 */
async function processUserSync(
  ctx: ActionCtx,
  evt: ClerkWebhookEvent,
  eventLabel: string
): Promise<void> {
  const userData = extractUserData(evt);

  if (!userData) {
    console.warn(`Missing user data for ${eventLabel}`);
    return;
  }

  console.log(`${eventLabel}: ${userData.clerkId}`);

  const result = await syncClerkUserMutation(ctx, userData);

  if (result.success) {
    console.log(`User synced successfully: ${userData.clerkId}`);
  } else {
    console.error(`User sync error:`, result.error);
  }
}

// Clerk webhook handler for user session management
const clerkWebhook = httpAction(async (ctx, request) => {
  console.log("Clerk webhook received");

  try {
    const body = await request.text();
    const evt: ClerkWebhookEvent = JSON.parse(body);

    console.log(`Event type: ${evt.type}`);

    // Handle different event types
    switch (evt.type) {
      case "session.created":
        await processUserSync(ctx, evt, "Session created");
        break;
      case "user.created":
        await processUserSync(ctx, evt, "User created");
        break;
      case "user.updated":
        await processUserSync(ctx, evt, "User updated");
        break;
      default:
        console.log(`Unhandled event type: ${evt.type}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
});

http.route({
  path: "/api/webhooks/clerk",
  method: "POST",
  handler: clerkWebhook,
});

export default http;
