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

// Test current cart pricing - returns true if all prices are valid, false otherwise
const validateCartPricingFn = (): boolean => {
  const cartItems = storage.getCart();

  if (cartItems.length === 0) {
    console.log("Cart is empty - nothing to validate");
    return true;
  }

  console.log("Current cart data:", cartItems);
  let isValid = true;

  cartItems.forEach((item: CartItem, index: number) => {
    const price = item.price ?? 0;
    const licenseType = item.licenseType ?? "Unknown";

    console.log(`Item ${index}: ${item.title ?? "Unknown"} - ${price} (${licenseType})`);

    if (price < 29.99) {
      console.error(`❌ INVALID PRICING: ${price} for ${licenseType}`);
      isValid = false;
    }
  });

  if (isValid) {
    console.log("✅ All cart prices are valid");
  }

  return isValid;
};

// Export the functions
export const emergencyCartReset = emergencyCartResetFn;
export const validateCartPricing = validateCartPricingFn;

// Make these available globally for debugging
if (typeof globalThis !== "undefined") {
  globalThis.emergencyCartReset = emergencyCartResetFn;
  globalThis.validateCartPricing = validateCartPricingFn;
}
