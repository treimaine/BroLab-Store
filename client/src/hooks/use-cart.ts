/**
 * Cart hook that uses the CartManager for localStorage persistence
 * This hook provides the actual cart functionality
 */
import { Cart, CartItem, cartManager } from "@/lib/cart";
import { useCallback, useEffect, useState } from "react";

interface UseCartReturn {
  cart: Cart;
  items: CartItem[];
  addItem: (item: Omit<CartItem, "price">) => void;
  addToCart: (item: Omit<CartItem, "price">) => void;
  removeItem: (beatId: number, licenseType: string) => void;
  clearCart: () => void;
  updateQuantity: (beatId: number, licenseType: string, quantity: number) => void;
  updateLicense: (beatId: number, oldLicense: string, newLicense: string) => void;
  refreshCartPricing: () => void;
  getItemCount: () => number;
  total: number;
}

export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<Cart>(() => cartManager.getCart());

  // Refresh cart state from localStorage
  const refreshCart = useCallback((): void => {
    setCart(cartManager.getCart());
  }, []);

  // Listen for storage events (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === "brolab_cart") {
        refreshCart();
      }
    };

    globalThis.addEventListener("storage", handleStorageChange);
    return () => globalThis.removeEventListener("storage", handleStorageChange);
  }, [refreshCart]);

  const addItem = useCallback((item: Omit<CartItem, "price">): void => {
    try {
      cartManager.addItem(item);
      setCart(cartManager.getCart());
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      throw error;
    }
  }, []);

  const removeItem = useCallback((beatId: number, licenseType: string): void => {
    cartManager.removeItem(beatId, licenseType);
    setCart(cartManager.getCart());
  }, []);

  const clearCart = useCallback((): void => {
    cartManager.clearCart();
    setCart(cartManager.getCart());
  }, []);

  const updateQuantity = useCallback(
    (beatId: number, licenseType: string, quantity: number): void => {
      cartManager.updateQuantity(beatId, licenseType, quantity);
      setCart(cartManager.getCart());
    },
    []
  );

  const updateLicense = useCallback(
    (beatId: number, oldLicense: string, newLicense: string): void => {
      cartManager.updateLicense(beatId, oldLicense, newLicense);
      setCart(cartManager.getCart());
    },
    []
  );

  const refreshCartPricing = useCallback((): void => {
    cartManager.refreshCartPricing();
    setCart(cartManager.getCart());
  }, []);

  const getItemCount = useCallback((): number => {
    return cart.itemCount;
  }, [cart.itemCount]);

  return {
    cart,
    items: cart.items,
    addItem,
    addToCart: addItem, // Alias for compatibility
    removeItem,
    clearCart,
    updateQuantity,
    updateLicense,
    refreshCartPricing,
    getItemCount,
    total: cart.total,
  };
}
