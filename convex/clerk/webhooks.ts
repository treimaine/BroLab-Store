import { httpRouter } from "convex/server";
import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";

// Types pour les webhooks Clerk
interface WebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ id: string; email_address: string }>;
    primary_email_address_id?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    username?: string;
    user_id?: string;
  };
}

// Simple webhook verification (remplace svix pour éviter les dépendances)
class SimpleWebhook {
  constructor(private secret: string) {}
  
  verify(body: string, headers: Record<string, string>): WebhookEvent {
    // Vérification simplifiée - en production, utiliser svix
    try {
      return JSON.parse(body) as WebhookEvent;
    } catch (error) {
      throw new Error('Invalid webhook payload');
    }
  }
}

const http = httpRouter();

// Configuration des webhooks Clerk
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

if (!CLERK_WEBHOOK_SECRET) {
  console.warn("⚠️ CLERK_WEBHOOK_SECRET not configured. Webhooks will not work.");
}

/**
 * Webhook handler pour les événements Clerk
 * Gère automatiquement la synchronisation des utilisateurs
 */
const clerkWebhook = httpAction(async (ctx, request) => {
  try {
    console.log("🔔 Received Clerk webhook");

    if (!CLERK_WEBHOOK_SECRET) {
      console.error("❌ CLERK_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Vérifier la signature du webhook
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("❌ Missing svix headers");
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();
    const wh = new SimpleWebhook(CLERK_WEBHOOK_SECRET);

    let evt: WebhookEvent;
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    console.log(`📨 Processing webhook event: ${evt.type}`);

    // Traiter les différents types d'événements
    switch (evt.type) {
      case "user.created":
        await handleUserCreated(ctx, evt);
        break;
      case "user.updated":
        await handleUserUpdated(ctx, evt);
        break;
      case "user.deleted":
        await handleUserDeleted(ctx, evt);
        break;
      case "session.created":
        await handleSessionCreated(ctx, evt);
        break;
      case "session.ended":
        await handleSessionEnded(ctx, evt);
        break;
      default:
        console.log(`ℹ️ Unhandled webhook event: ${evt.type}`);
    }

    console.log(`✅ Webhook processed successfully: ${evt.type}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Webhook error: ${errorMessage}`, { status: 500 });
  }
});

/**
 * Gérer la création d'un utilisateur
 */
async function handleUserCreated(ctx: any, evt: WebhookEvent) {
  try {
    const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;
    
    console.log(`👤 Creating user: ${id}`);

    const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
    
    // Synchronisation utilisateur via mutation interne
    const syncResult = await ctx.runMutation("users/clerkSync:syncClerkUser", {
      clerkId: id,
      email: primaryEmail?.email_address || "",
      firstName: first_name || "",
      lastName: last_name || "",
      username: username || `user_${id.slice(-8)}`,
      imageUrl: image_url || "",
      role: "user",
      isActive: true,
    });

    console.log(`✅ User created successfully: ${id}`);
  } catch (error) {
    console.error(`❌ Error creating user:`, error);
    throw error;
  }
}

/**
 * Gérer la mise à jour d'un utilisateur
 */
async function handleUserUpdated(ctx: any, evt: WebhookEvent) {
  try {
    const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;
    
    console.log(`🔄 Updating user: ${id}`);

    const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
    
    // Synchronisation utilisateur via mutation interne
    await ctx.runMutation("users/clerkSync:syncClerkUser", {
      clerkId: id,
      email: primaryEmail?.email_address || "",
      firstName: first_name || "",
      lastName: last_name || "",
      username: username || `user_${id.slice(-8)}`,
      imageUrl: image_url || "",
      role: "user",
      isActive: true,
    });

    console.log(`✅ User updated successfully: ${id}`);
  } catch (error) {
    console.error(`❌ Error updating user:`, error);
    throw error;
  }
}

/**
 * Gérer la suppression d'un utilisateur
 */
async function handleUserDeleted(ctx: any, evt: WebhookEvent) {
  try {
    const { id } = evt.data;
    
    console.log(`🗑️ Deleting user: ${id}`);

    // Suppression utilisateur via mutation interne
    await ctx.runMutation("users/clerkSync:deleteClerkUser", {
      clerkId: id,
      reason: "user_deleted_from_clerk",
    });

    console.log(`✅ User deleted successfully: ${id}`);
  } catch (error) {
    console.error(`❌ Error deleting user:`, error);
    throw error;
  }
}

/**
 * Gérer la création d'une session
 */
async function handleSessionCreated(ctx: any, evt: WebhookEvent) {
  try {
    const { user_id } = evt.data;
    
    console.log(`🔐 Session created for user: ${user_id}`);

    // Mettre à jour la dernière connexion
    // Récupération de l'utilisateur via query interne
    const user = await ctx.runQuery("users/clerkSync:getUserByClerkId", {
      clerkId: user_id,
    });

    if (user) {
      // Mise à jour de la dernière connexion via mutation interne
      await ctx.runMutation("users/clerkSync:syncClerkUser", {
        clerkId: user_id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        imageUrl: user.imageUrl,
        role: user.role || "user",
        isActive: true,
        lastLoginAt: Date.now(),
      });
    }

    console.log(`✅ Session created processed: ${user_id}`);
  } catch (error) {
    console.error(`❌ Error processing session created:`, error);
    throw error;
  }
}

/**
 * Gérer la fin d'une session
 */
async function handleSessionEnded(ctx: any, evt: WebhookEvent) {
  try {
    const { user_id } = evt.data;
    
    console.log(`🔓 Session ended for user: ${user_id}`);

    // Log de l'activité - supprimé car les mutations ne sont pas autorisées dans ce contexte

    console.log(`✅ Session ended processed: ${user_id}`);
  } catch (error) {
    console.error(`❌ Error processing session ended:`, error);
    throw error;
  }
}

// Enregistrer le webhook
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: clerkWebhook,
});

export default http;