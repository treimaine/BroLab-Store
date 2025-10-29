import { getCartSyncService } from "@/services/CartSyncService";
import type { ConvexClient } from "convex/browser";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  productId: number;
  variationId?: number;
  name: string;
  price: number;
  licenseName: string;
  quantity: number;
  image?: string;
  sku?: string;
  downloadable?: boolean;
}

type SyncStatus = "idle" | "syncing" | "error";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;

  // Actions
  addItem: (item: Omit<CartItem, "id" | "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Sync actions
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  initializeSync: (convexClient: ConvexClient) => void;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;

  // Computed values
  getItemCount: () => number;
  getTotal: () => number;
  getItem: (id: string) => CartItem | undefined;
}

// Cart sync service instance
let cartSyncService: ReturnType<typeof getCartSyncService> | null = null;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      syncStatus: "idle",
      lastSyncedAt: null,

      // Initialize sync service with Convex client
      initializeSync: (convexClient: ConvexClient) => {
        cartSyncService = getCartSyncService();
        cartSyncService.initialize(convexClient);
      },

      // Sync cart to server
      syncToServer: async () => {
        if (!cartSyncService) return;

        set({ syncStatus: "syncing" });
        const result = await cartSyncService.syncToConvex(get().items);

        if (result.success) {
          set({ syncStatus: "idle", lastSyncedAt: Date.now() });
        } else {
          set({ syncStatus: "error" });
          console.error("Failed to sync cart:", result.error);
        }
      },

      // Load cart from server
      loadFromServer: async () => {
        if (!cartSyncService) return;

        set({ syncStatus: "syncing" });
        try {
          const items = await cartSyncService.loadFromConvex();
          set({ items, syncStatus: "idle", lastSyncedAt: Date.now() });
        } catch (error) {
          set({ syncStatus: "error" });
          console.error("Failed to load cart:", error);
        }
      },

      // Handle login - merge local and server cart
      handleLogin: async () => {
        if (!cartSyncService) return;

        set({ syncStatus: "syncing" });
        try {
          const localItems = get().items;
          const mergedItems = await cartSyncService.handleLogin(localItems);
          set({ items: mergedItems, syncStatus: "idle", lastSyncedAt: Date.now() });
        } catch (error) {
          set({ syncStatus: "error" });
          console.error("Failed to handle login:", error);
        }
      },

      // Handle logout - save cart before logout
      handleLogout: async () => {
        if (!cartSyncService) return;

        try {
          await cartSyncService.handleLogout(get().items);
        } catch (error) {
          console.error("Failed to save cart on logout:", error);
        }
      },

      addItem: newItem => {
        const itemId = `${newItem.productId}-${newItem.variationId || 0}`;
        const existingItem = get().items.find(item => item.id === itemId);

        if (existingItem) {
          // Update quantity if item already exists
          set(state => ({
            items: state.items.map(item =>
              item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
            ),
          }));
        } else {
          // Add new item
          const item: CartItem = {
            ...newItem,
            id: itemId,
            quantity: 1,
          };

          set(state => ({
            items: [...state.items, item],
          }));
        }

        // Sync to server after adding item
        void get().syncToServer();
      },

      removeItem: id => {
        set(state => ({
          items: state.items.filter(item => item.id !== id),
        }));

        // Sync to server after removing item
        void get().syncToServer();
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set(state => ({
          items: state.items.map(item => (item.id === id ? { ...item, quantity } : item)),
        }));

        // Sync to server after updating quantity
        void get().syncToServer();
      },

      clearCart: () => {
        set({ items: [] });

        // Sync to server after clearing cart
        void get().syncToServer();
      },

      toggleCart: () => {
        set(state => ({ isOpen: !state.isOpen }));
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getItem: id => {
        return get().items.find(item => item.id === id);
      },
    }),
    {
      name: "brolab-cart-storage",
      partialize: state => ({
        items: state.items,
      }),
    }
  )
);

// Set up beforeunload event listener to save cart before page close
if (globalThis.window !== undefined) {
  globalThis.window.addEventListener("beforeunload", () => {
    const store = useCartStore.getState();
    void store.handleLogout();
  });
}
