/**
 * Placeholder hook for cart functionality
 * The actual cart is managed by CartProvider
 * This hook is kept for backward compatibility
 */
export function useCart() {
  return {
    cart: {
      items: [],
      total: 0,
      subtotal: 0,
      itemCount: 0,
    },
    items: [],
    addItem: () => {},
    addToCart: () => {},
    removeItem: () => {},
    clearCart: () => {},
    updateQuantity: () => {},
    updateLicense: () => {},
    refreshCartPricing: async () => {},
    getItemCount: () => 0,
    total: 0,
  };
}
