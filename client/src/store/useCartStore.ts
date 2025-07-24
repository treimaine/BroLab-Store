import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  
  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  
  // Computed values
  getItemCount: () => number;
  getTotal: () => number;
  getItem: (id: string) => CartItem | undefined;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        const itemId = `${newItem.productId}-${newItem.variationId || 0}`;
        const existingItem = get().items.find(item => item.id === itemId);
        
        if (existingItem) {
          // Update quantity if item already exists
          set((state) => ({
            items: state.items.map(item =>
              item.id === itemId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          }));
        } else {
          // Add new item
          const item: CartItem = {
            ...newItem,
            id: itemId,
            quantity: 1
          };
          
          set((state) => ({
            items: [...state.items, item]
          }));
        }
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, quantity } : item
          )
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
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
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      getItem: (id) => {
        return get().items.find(item => item.id === id);
      }
    }),
    {
      name: 'brolab-cart-storage',
      partialize: (state) => ({ 
        items: state.items 
      }),
    }
  )
);