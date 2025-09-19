import { ConvexHttpClient } from "convex/browser";
import { getWooCommerceOrders } from "./woo";
import { getWordPressProducts } from "./wp";

// Import API types more carefully to avoid deep instantiation
interface Product {
  id: number;
  isActive: boolean;
  featured: boolean;
}

interface Order {
  status: string;
}

// Configuration Convex
const convexUrl = process.env.VITE_CONVEX_URL || "https://agile-boar-163.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

export interface SyncResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  errors?: string[];
}

// Synchroniser les produits WordPress avec Convex
export async function syncWordPressToConvex(): Promise<SyncResult> {
  try {
    console.log("🔄 Starting WordPress to Convex sync...");

    // Récupérer les produits WordPress
    const wordpressProducts = await getWordPressProducts();

    if (!wordpressProducts || wordpressProducts.length === 0) {
      return {
        success: false,
        message: "No WordPress products found",
      };
    }

    // Transformer les données pour Convex
    const productsForConvex = wordpressProducts.map(
      (product: {
        id: number;
        title: { rendered: string };
        content: { rendered: string };
        excerpt: { rendered: string };
        meta: Record<string, unknown>;
        [key: string]: unknown;
      }) => ({
        id: product.id,
        title: product.title.rendered,
        description: product.excerpt?.rendered,
        genre: product.genre || "Unknown",
        bpm: product.bpm || 0,
        key: product.key,
        mood: product.mood,
        price: product.price || 0,
        audioUrl: product.audio_url,
        imageUrl: product.featured_media_url,
        tags: product.tags || [],
        featured: product.featured || false,
        downloads: product.downloads || 0,
        views: product.views || 0,
        duration: product.duration,
        isActive: product.status === "publish",
      })
    );

    // Synchroniser avec Convex
    const result = await convex.mutation("sync:wordpress:syncWordPressProducts" as any, {
      products: productsForConvex,
    });

    console.log(`✅ WordPress sync completed: ${result.length} products processed`);

    return {
      success: true,
      message: `Successfully synced ${result.length} products`,
      details: { results: result },
    };
  } catch (error) {
    console.error("❌ WordPress sync error:", error);
    return {
      success: false,
      message: "Failed to sync WordPress products",
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// Synchroniser les commandes WooCommerce avec Convex
export async function syncWooCommerceToConvex(): Promise<SyncResult> {
  try {
    console.log("🔄 Starting WooCommerce to Convex sync...");

    // Récupérer les commandes WooCommerce
    const wooCommerceOrders = await getWooCommerceOrders();

    if (!wooCommerceOrders || wooCommerceOrders.length === 0) {
      return {
        success: false,
        message: "No WooCommerce orders found",
      };
    }

    // Transformer les données pour Convex
    const ordersForConvex = wooCommerceOrders.map(
      (order: {
        id: number;
        status: string;
        date_created: string;
        billing?: { email?: string };
        customer_email?: string;
        line_items?: Array<{
          product_id: number;
          name: string;
          quantity: number;
          total: string;
          meta_data?: Array<{ key: string; value: unknown }>;
        }>;
        [key: string]: unknown;
      }) => ({
        id: order.id,
        status: order.status,
        total: order.total,
        currency: order.currency,
        customerId: order.customer_id,
        customerEmail: order.billing?.email || order.customer_email || "",
        items:
          order.line_items?.map(item => ({
            productId: item.product_id,
            name: item.name,
            quantity: item.quantity,
            total: item.total,
            license: item.meta_data?.find(meta => meta.key === "license")?.value,
          })) || [],
        createdAt: order.date_created,
        updatedAt: order.date_modified,
      })
    );

    // Synchroniser avec Convex
    const result = await convex.mutation("sync:woocommerce:syncWooCommerceOrders" as any, {
      orders: ordersForConvex,
    });

    console.log(`✅ WooCommerce sync completed: ${result.length} orders processed`);

    return {
      success: true,
      message: `Successfully synced ${result.length} orders`,
      details: { results: result },
    };
  } catch (error) {
    console.error("❌ WooCommerce sync error:", error);
    return {
      success: false,
      message: "Failed to sync WooCommerce orders",
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// Synchroniser un utilisateur Clerk avec Convex
export async function syncClerkUserToConvex(clerkUser: {
  id: string;
  sessionId?: string;
  getToken?: (options?: any) => Promise<string | null>;
  [key: string]: unknown;
}): Promise<SyncResult> {
  try {
    console.log(`🔄 Syncing Clerk user: ${clerkUser.id}`);

    const result = await convex.mutation("users:clerkSync:syncClerkUser" as any, {
      clerkId: clerkUser.id,
      email: "", // Will be updated when full user data is available
      username: undefined,
      firstName: undefined,
      lastName: undefined,
      imageUrl: undefined,
    });

    console.log(`✅ Clerk user sync completed: ${result.action}`);

    return {
      success: true,
      message: `User ${result.action} successfully`,
      details: result,
    };
  } catch (error) {
    console.error("❌ Clerk user sync error:", error);
    return {
      success: false,
      message: "Failed to sync Clerk user",
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// Synchronisation complète
export async function performFullSync(): Promise<SyncResult> {
  try {
    console.log("🚀 Starting full synchronization...");

    const results = {
      wordpress: await syncWordPressToConvex(),
      woocommerce: await syncWooCommerceToConvex(),
    };

    const allSuccessful = results.wordpress.success && results.woocommerce.success;

    return {
      success: allSuccessful,
      message: allSuccessful
        ? "Full synchronization completed successfully"
        : "Synchronization completed with errors",
      details: results,
    };
  } catch (error) {
    console.error("❌ Full sync error:", error);
    return {
      success: false,
      message: "Failed to perform full synchronization",
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// Obtenir les statistiques de synchronisation
export async function getSyncStats(): Promise<any> {
  try {
    const [products, orders] = await Promise.all([
      convex.query("sync:wordpress:getSyncedProducts" as any, { limit: 1000 }),
      convex.query("sync:woocommerce:getSyncedOrders" as any, { limit: 1000 }),
    ]);

    return {
      products: {
        total: products.page.length,
        active: products.page.filter((p: Product) => p.isActive).length,
        featured: products.page.filter((p: Product) => p.featured).length,
      },
      orders: {
        total: orders.page.length,
        byStatus: orders.page.reduce(
          (acc: Record<string, number>, order: Order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    };
  } catch (error) {
    console.error("❌ Error getting sync stats:", error);
    return null;
  }
}
