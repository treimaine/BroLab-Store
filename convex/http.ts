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
 * Note: session.created includes nested user object, while user.created has flat structure
 */
interface ClerkWebhookEvent {
  type: string;
  data: {
    id?: string;
    user_id?: string;
    // Flat structure for user.created/user.updated events
    email_addresses?: Array<{ email_address: string }>;
    username?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    // Nested user object for session.created events
    user?: {
      id?: string;
      email_addresses?: Array<{ email_address: string }>;
      username?: string | null;
      first_name?: string;
      last_name?: string;
      image_url?: string;
    };
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
 * Process user sync for different event types (user.created, user.updated)
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

/**
 * Process session.created event - logs user login activity
 * session.created payload structure from Clerk:
 * - data.id = session ID (sess_xxx)
 * - data.user_id = user ID (user_xxx)
 * - data.user = nested user object with email_addresses, first_name, etc.
 */
async function processSessionCreated(ctx: ActionCtx, evt: ClerkWebhookEvent): Promise<void> {
  // Log the full payload for debugging
  console.log("session.created payload:", JSON.stringify(evt.data, null, 2));

  // For session.created, user_id is the Clerk user ID
  const userId = evt.data.user_id || evt.data.user?.id;

  if (!userId) {
    console.warn("Missing user_id in session.created event");
    return;
  }

  console.log(`Session created for user: ${userId}`);

  // Extract user data from nested user object (session.created structure)
  const user = evt.data.user;
  const email = user?.email_addresses?.[0]?.email_address;

  if (email) {
    // If we have email, we can do a full sync
    console.log(`Email found in session.created: ${email}, doing full sync`);
    const userData: ClerkUserData = {
      clerkId: userId,
      email,
      username: user?.username ?? undefined,
      firstName: user?.first_name,
      lastName: user?.last_name,
      imageUrl: user?.image_url,
    };
    await syncClerkUserMutation(ctx, userData);
  } else {
    // No email in payload (user.email_addresses is empty), just log the login activity
    console.log(`No email in session.created for user ${userId}, logging activity only`);
    try {
      await ctx.scheduler.runAfter(
        0,
        "users/clerkSync:logUserLogin" as never,
        {
          clerkId: userId,
        } as never
      );
      console.log(`Login activity scheduled for user: ${userId}`);
    } catch (error) {
      console.error("Error scheduling login activity:", error);
    }
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
        // session.created has different payload structure - no email_addresses
        await processSessionCreated(ctx, evt);
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
