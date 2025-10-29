import type { CartItem } from "@/stores/useCartStore";

import { api } from "@convex/_generated/api";
import type { ConvexClient } from "convex/browser";

/**
 * CartSyncService - Manages cart synchronization between Zustand and Convex
 * Implements debouncing, optimistic updates, and retry logic
 */

// Type aliases to avoid deep type instantiation
type ConvexCartItem = {
  beatId: number;
  licenseType: string;
  price: number;
  quantity: number;
};

type SyncCartResult = {
  success: boolean;
  itemCount: number;
};

type LoadCartItem = {
  id: string;
  productId: number;
  name: string;
  price: number;
  licenseName: string;
  quantity: number;
  image?: string;
};

interface CartSyncOptions {
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

interface SyncResult {
  success: boolean;
  error?: string;
}

export class CartSyncService {
  private static instance: CartSyncService | null = null;
  private convexClient: ConvexClient | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private pendingSync: CartItem[] | null = null;

  private readonly options: Required<CartSyncOptions> = {
    debounceMs: 300,
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 2000,
  };

  private constructor(options?: CartSyncOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    // Set up beforeunload event listener to save cart before logout
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  static getInstance(options?: CartSyncOptions): CartSyncService {
    CartSyncService.instance ??= new CartSyncService(options);
    return CartSyncService.instance;
  }

  /**
   * Initialize the service with Convex client
   */
  initialize(convexClient: ConvexClient): void {
    this.convexClient = convexClient;
  }

  /**
   * Helper method to call Convex syncCart mutation with proper typing
   */
  private async callSyncCartMutation(items: ConvexCartItem[]): Promise<SyncCartResult> {
    if (!this.convexClient) {
      throw new Error("Convex client not initialized");
    }
    // Type assertion to bypass deep type instantiation issue with Convex API
    // @ts-expect-error - Convex API types cause deep instantiation issues
    const apiFunction = api.cartItems.syncCart;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mutationFn = this.convexClient.mutation as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await mutationFn(apiFunction, { items });
    return result as SyncCartResult;
  }

  /**
   * Helper method to call Convex loadCart query with proper typing
   */
  private async callLoadCartQuery(): Promise<LoadCartItem[]> {
    if (!this.convexClient) {
      throw new Error("Convex client not initialized");
    }
    // Type assertion to bypass deep type instantiation issue with Convex API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiFunction = api.cartItems.loadCart as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryFn = this.convexClient.query as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await queryFn(apiFunction, {});
    return result as LoadCartItem[];
  }

  /**
   * Sync cart items to Convex with debouncing
   */
  async syncToConvex(items: CartItem[]): Promise<SyncResult> {
    if (!this.convexClient) {
      return { success: false, error: "Convex client not initialized" };
    }

    // Store pending sync data
    this.pendingSync = items;

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set up new debounce timer
    return new Promise(resolve => {
      this.debounceTimer = setTimeout(async () => {
        const result = await this.executeSyncWithRetry(items);
        resolve(result);
      }, this.options.debounceMs);
    });
  }

  /**
   * Execute sync with retry logic
   */
  private async executeSyncWithRetry(items: CartItem[], attempt = 1): Promise<SyncResult> {
    if (!this.convexClient) {
      return { success: false, error: "Convex client not initialized" };
    }

    if (this.syncInProgress) {
      // Wait for current sync to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.executeSyncWithRetry(items, attempt);
    }

    this.syncInProgress = true;

    try {
      // Transform cart items to Convex format
      const convexItems: ConvexCartItem[] = items.map(item => ({
        beatId: item.productId,
        licenseType: item.licenseName,
        price: item.price,
        quantity: item.quantity,
      }));

      // Execute sync with timeout
      const syncPromise = this.callSyncCartMutation(convexItems);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Sync timeout")), this.options.timeoutMs);
      });

      await Promise.race([syncPromise, timeoutPromise]);

      this.syncInProgress = false;
      return { success: true };
    } catch (error) {
      this.syncInProgress = false;

      // Retry logic
      if (attempt < this.options.maxRetries) {
        const delay = this.options.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeSyncWithRetry(items, attempt + 1);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Load cart items from Convex
   */
  async loadFromConvex(): Promise<CartItem[]> {
    if (!this.convexClient) {
      console.warn("Convex client not initialized");
      return [];
    }

    try {
      // Execute load with timeout
      const loadPromise = this.callLoadCartQuery();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Load timeout")), this.options.timeoutMs);
      });

      const items = await Promise.race([loadPromise, timeoutPromise]);

      // Transform Convex items to CartItem format
      return items.map(
        (item: {
          id: string;
          productId: number;
          name: string;
          price: number;
          licenseName: string;
          quantity: number;
          image?: string;
        }) => ({
          id: item.id,
          productId: item.productId,
          variationId: undefined,
          name: item.name,
          price: item.price,
          licenseName: item.licenseName,
          quantity: item.quantity,
          image: item.image,
        })
      );
    } catch (error) {
      console.error("Failed to load cart from Convex:", error);
      return [];
    }
  }

  /**
   * Handle logout - save cart before logout (blocking operation)
   */
  async handleLogout(items: CartItem[]): Promise<void> {
    if (!this.convexClient || items.length === 0) {
      return;
    }

    // Cancel any pending debounced sync
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Execute immediate sync without debounce
    try {
      const convexItems: ConvexCartItem[] = items.map(item => ({
        beatId: item.productId,
        licenseType: item.licenseName,
        price: item.price,
        quantity: item.quantity,
      }));

      await this.callSyncCartMutation(convexItems);
    } catch (error) {
      console.error("Failed to save cart on logout:", error);
    }
  }

  /**
   * Handle login - load and merge cart data
   */
  async handleLogin(localItems: CartItem[]): Promise<CartItem[]> {
    if (!this.convexClient) {
      return localItems;
    }

    try {
      // Load cart from Convex
      const convexItems = await this.loadFromConvex();

      // Merge logic: prefer Convex data over local data
      if (convexItems.length === 0) {
        // No cart in Convex, sync local cart
        if (localItems.length > 0) {
          await this.syncToConvex(localItems);
        }
        return localItems;
      }

      // Convex has cart data, use it as source of truth
      // But merge any local items that don't exist in Convex
      const mergedItems = [...convexItems];
      const convexItemKeys = new Set(
        convexItems.map(item => `${item.productId}-${item.licenseName}`)
      );

      for (const localItem of localItems) {
        const key = `${localItem.productId}-${localItem.licenseName}`;
        if (!convexItemKeys.has(key)) {
          mergedItems.push(localItem);
        }
      }

      // Sync merged cart back to Convex if we added local items
      if (mergedItems.length > convexItems.length) {
        await this.syncToConvex(mergedItems);
      }

      return mergedItems;
    } catch (error) {
      console.error("Failed to merge cart on login:", error);
      return localItems;
    }
  }

  /**
   * Handle beforeunload event to save cart before page close
   */
  private readonly handleBeforeUnload = (): void => {
    // If there's a pending sync, execute it immediately
    if (this.pendingSync && this.convexClient) {
      // Use synchronous approach for beforeunload
      const convexItems: ConvexCartItem[] = this.pendingSync.map(item => ({
        beatId: item.productId,
        licenseType: item.licenseName,
        price: item.price,
        quantity: item.quantity,
      }));

      // Note: This is a best-effort sync. Modern browsers may not wait for async operations.
      // The main sync happens through the debounced syncToConvex method.
      // Fire and forget - don't await in beforeunload
      this.callSyncCartMutation(convexItems).catch(err => {
        console.error("Failed to sync cart on beforeunload:", err);
      });
    }
  };

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (globalThis.window !== undefined) {
      globalThis.window.removeEventListener("beforeunload", this.handleBeforeUnload);
    }

    this.convexClient = null;
    this.pendingSync = null;
    CartSyncService.instance = null;
  }
}

// Export singleton instance getter
export const getCartSyncService = (options?: CartSyncOptions): CartSyncService =>
  CartSyncService.getInstance(options);
