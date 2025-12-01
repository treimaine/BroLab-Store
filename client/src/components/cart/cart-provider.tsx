/* eslint-disable react-refresh/only-export-components -- Provider pattern requires exporting both provider component and context hook */
import { useCart } from "@/hooks/use-cart";
import { Cart, CartItem } from "@/lib/cart";
import { ReactNode, createContext, useContext, useMemo } from "react";

interface CartContextType {
  cart: Cart;
  addItem: (item: Omit<CartItem, "price">) => void;
  addToCart: (item: Omit<CartItem, "price">) => void; // Alias for compatibility
  updateQuantity: (beatId: number, licenseType: string, quantity: number) => void;
  removeItem: (beatId: number, licenseType: string) => void;
  updateLicense: (beatId: number, oldLicense: string, newLicense: string) => void;
  clearCart: () => void;
  refreshCartPricing: () => void;
  getItemCount: () => number;
}

interface CartProviderProps {
  readonly children: ReactNode;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const cartHook = useCart();

  // Add addToCart alias for compatibility - memoized to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...cartHook,
      addToCart: cartHook.addItem,
    }),
    [cartHook]
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}

// Re-export useCart for compatibility
export { useCart } from "@/hooks/use-cart";
