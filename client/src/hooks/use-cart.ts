import { useState, useEffect } from 'react';
import { cartManager, Cart, CartItem } from '@/lib/cart';
import { LicenseTypeEnum } from '@shared/schema';

export function useCart() {
  const [cart, setCart] = useState<Cart>(cartManager.getCart());

  const updateCart = () => {
    setCart(cartManager.getCart());
  };

  const addItem = (item: Omit<CartItem, 'price'>) => {
    cartManager.addItem(item);
    updateCart();
  };

  const updateQuantity = (beatId: number, licenseType: string, quantity: number) => {
    cartManager.updateQuantity(beatId, licenseType, quantity);
    updateCart();
  };

  const removeItem = (beatId: number, licenseType: string) => {
    cartManager.removeItem(beatId, licenseType);
    updateCart();
  };

  const updateLicense = (beatId: number, oldLicense: string, newLicense: string) => {
    cartManager.updateLicense(beatId, oldLicense, newLicense);
    updateCart();
  };

  const clearCart = () => {
    cartManager.clearCart();
    updateCart();
  };

  const refreshCartPricing = () => {
    cartManager.refreshCartPricing();
    updateCart();
  };



  const getItemCount = () => cartManager.getItemCount();

  useEffect(() => {
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'brolab_cart') {
        updateCart();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    updateLicense,
    clearCart,
    refreshCartPricing,
    getItemCount,
  };
}
