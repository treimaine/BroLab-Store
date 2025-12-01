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
  // Clear all possible cart storage
  localStorage.removeItem("brolab_cart");
  localStorage.removeItem("cart");
  localStorage.removeItem("shopping_cart");

  // Clear any other cart-related keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes("cart") || key.includes("brolab")) {
      localStorage.removeItem(key);
    }
  });

  console.log("🚨 Emergency cart reset completed");

  // Reload the page to ensure clean state
  globalThis.location.reload();
};

// Test current cart pricing
const validateCartPricingFn = (): boolean => {
  const storedCart = localStorage.getItem("brolab_cart");
  if (storedCart) {
    try {
      const cartData = JSON.parse(storedCart) as CartItem[];
      console.log("Current cart data:", cartData);

      cartData.forEach((item: CartItem, index: number) => {
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
    } catch (e) {
      console.error("Cart data corrupted:", e);
      return false;
    }
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
