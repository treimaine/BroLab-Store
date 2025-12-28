import { storage } from "@/services/StorageManager";

// Extend globalThis interface for debugging utilities
declare global {
  var emergencyCartReset: typeof emergencyCartResetFn | undefined;

  var validateCartPricing: typeof validateCartPricingFn | undefined;
}

// Cart item interface for validation
interface CartItem {
  title?: string;
  price?: number;
  licenseType?: string;
}

// Emergency cart reset utility
const emergencyCartResetFn = (): void => {
  // Clear cart using StorageManager
  storage.setCart([]);

  // Also clear any legacy cart storage keys directly
  try {
    localStorage.removeItem("brolab_cart");
    localStorage.removeItem("cart");
    localStorage.removeItem("shopping_cart");

    // Clear any other cart-related keys
    Object.keys(localStorage).forEach(key => {
      if (key.includes("cart") || key.includes("brolab")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Failed to clear legacy cart storage:", error);
  }

  console.log("🚨 Emergency cart reset completed");

  // Reload the page to ensure clean state
  globalThis.location.reload();
};

// Test current cart pricing
const validateCartPricingFn = (): boolean => {
  const cartItems = storage.getCart();
  if (cartItems.length > 0) {
    console.log("Current cart data:", cartItems);

    cartItems.forEach((item: CartItem, index: number) => {
      console.log(
        `Item ${index}: ${item.title ?? "Unknown"} - ${item.price ?? 0} (${item.licenseType ?? "Unknown"})`
      );
      if ((item.price ?? 0) < 29.99) {
        console.error(
          `❌ INVALID PRICING: ${item.price ?? 0} for ${item.licenseType ?? "Unknown"}`
        );
      }
    });
    return true;
  }
  return true;
};

// Export the functions
export const emergencyCartReset = emergencyCartResetFn;
export const validateCartPricing = validateCartPricingFn;

// Make these available globally for debugging
if (typeof globalThis !== "undefined") {
  globalThis.emergencyCartReset = emergencyCartResetFn;
  globalThis.validateCartPricing = validateCartPricingFn;
}
